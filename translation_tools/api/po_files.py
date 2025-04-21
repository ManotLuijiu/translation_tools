import os
import frappe
import polib
import logging
from frappe import _
from datetime import datetime
from functools import wraps

import frappe.utils
from .common import get_bench_path

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create console handler with formatting
ch = logging.StreamHandler()
ch.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logger.addHandler(ch)

# Global flag for recursion protection
SCAN_IN_PROGRESS = False
MAX_SCAN_DEPTH = 10  # Prevent infinite directory recursion
BATCH_SIZE = 50  # Number of files to process before commit


def validate_file_path(path):
    """Ensure path is within bench directory"""
    bench_path = get_bench_path()
    if not os.path.abspath(path).startswith(os.path.abspath(bench_path)):
        logger.warning(f"Attempt to access path outside bench: {path}")
        raise frappe.PermissionError("Access denied")


def enhanced_error_handler(func):
    """Decorator for consistent error handling and logging"""

    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            logger.debug(f"Executing {func.__name__}")
            return func(*args, **kwargs)
        except FileNotFoundError as e:
            logger.error(f"File not found in {func.__name__}: {str(e)}")
            return {"success": False, "error": "File not found", "details": str(e)}
        except IOError as e:
            logger.error(f"Invalid PO file in {func.__name__}: {str(e)}")
            return {
                "success": False,
                "error": "Invalid PO file format",
                "details": str(e),
            }
        except Exception as e:
            logger.exception(f"Unexpected error in {func.__name__}")
            return {
                "success": False,
                "error": "Internal server error",
                "traceback": frappe.get_traceback(),
            }

    return wrapper


def setup_logging():
    """Configure logging for this module"""
    handler = logging.StreamHandler()
    handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)


setup_logging()


@frappe.whitelist()
@enhanced_error_handler
def get_po_files():
    """Get a list of all PO files, using cached data if available or scanning the filesystem if needed"""
    logger.info("Fetching PO files")
    try:
        # Try to get cached files first
        po_files = frappe.get_all(
            "PO File",
            filters=[["filename", "in", ["th.po", "th.translated.po"]]],
            fields=[
                "file_path",
                "app_name as app",
                "filename",
                "language",
                "total_entries",
                "translated_entries",
                "translation_status as translated_percentage",
                "last_modified",
                "last_scanned",
            ],
            order_by="app_name, filename",
        )

        # If we have cached files and they're not too old, return them
        if po_files:
            # Check if cache is fresh (less than 1 hour old)
            newest_scan = frappe.get_all(
                "PO File",
                filters=[["filename", "in", ["th.po", "th.translated.po"]]],
                fields=["MAX(last_scanned) as last_scan"],
                limit=1,
            )

            if newest_scan and newest_scan[0].get("last_scan"):
                last_scan_time = newest_scan[0].get("last_scan")
                cache_age = datetime.now() - last_scan_time

                if cache_age.total_seconds() < 3600:  # Less than 1 hour old
                    logger.debug(f"Using {len(po_files)} cached PO files")
                    return po_files

        # If we got here, either no cache or cache is stale
        # Scan the filesystem for PO files
        logger.info("No fresh cache found, scanning filesystem for PO files")
        return scan_and_cache_po_files(filename_patterns=["th.po", "th.translated.po"])

    except Exception as e:
        logger.error(f"Error fetching PO files: {str(e)}", exc_info=True)
        raise


def scan_and_cache_po_files(filename_patterns=None):
    """Scan filesystem for PO files and cache the results"""

    po_files = []
    bench_path = get_bench_path()
    apps_path = os.path.join(bench_path, "apps")

    for app in os.listdir(apps_path):
        app_path = os.path.join(apps_path, app)
        if os.path.isdir(app_path):
            for root, dirs, files in os.walk(app_path):
                for file in files:
                    # Apply filename patterns if provided
                    should_process = False
                    if file.endswith(".po"):
                        if not filename_patterns:
                            should_process = True
                        else:
                            for pattern in filename_patterns:
                                if file == pattern:
                                    should_process = True
                                    break

                    if should_process:
                        file_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_path, bench_path)

                        # Parse PO file to get statistics
                        try:
                            po_data = parse_po_file(file_path)

                            # Create or update cache entry
                            update_po_file_cache(
                                rel_path,
                                app,
                                file,
                                po_data["language"],
                                po_data["total_entries"],
                                po_data["translated_entries"],
                                po_data["translation_status"],
                            )

                            po_files.append(
                                {
                                    "file_path": rel_path,
                                    "app": app,
                                    "filename": file,
                                    "language": po_data["language"],
                                    "total_entries": po_data["total_entries"],
                                    "translated_entries": po_data["translated_entries"],
                                    "translated_percentage": po_data[
                                        "translation_status"
                                    ],
                                    "last_modified": datetime.fromtimestamp(
                                        os.path.getmtime(file_path)
                                    ),
                                    "last_scanned": datetime.now(),
                                }
                            )
                        except Exception as e:
                            logger.error(f"Error processing {file_path}: {str(e)}")

    logger.debug(f"Scanned and found {len(po_files)} PO files")
    return po_files


def update_po_file_cache(
    file_path,
    app_name,
    filename,
    language,
    total_entries,
    translated_entries,
    translation_status,
):
    """Create or update a PO file cache entry"""
    existing = frappe.db.exists("PO File", {"file_path": file_path})

    if existing:
        frappe.db.set_value(
            "PO File",
            existing,
            {
                "total_entries": total_entries,
                "translated_entries": translated_entries,
                "translation_status": translation_status,
                "last_scanned": datetime.now(),
            },
        )
    else:
        doc = frappe.get_doc(
            {
                "doctype": "PO File",
                "file_path": file_path,
                "app_name": app_name,
                "filename": filename,
                "language": language,
                "total_entries": total_entries,
                "translated_entries": translated_entries,
                "translation_status": translation_status,
                "last_scanned": datetime.now(),
            }
        )
        doc.insert()


def parse_po_file(file_path):
    """Parse a PO file and return statistics"""
    import polib

    po = polib.pofile(file_path)
    total = len(po)
    translated = len(po.translated_entries())

    # Get language from PO file metadata
    language = po.metadata.get("Language", "unknown")

    # Calculate translation status percentage
    translation_status = 0
    if total > 0:
        translation_status = round((translated / total) * 100, 2)

    return {
        "language": language,
        "total_entries": total,
        "translated_entries": translated,
        "translation_status": translation_status,
    }


@frappe.whitelist()
@enhanced_error_handler
def get_cached_po_files():
    """Get a list of all PO files from the database"""
    logger.info("Fetching cached PO files from database")
    try:
        po_files = frappe.get_all(
            "PO File",
            fields=[
                "file_path",
                "app_name as app",
                "filename",
                "language",
                "total_entries",
                "translated_entries",
                "translation_status as translated_percentage",
                "last_modified",
                "last_scanned",
            ],
            order_by="app_name, filename",
        )
        logger.debug(f"Found {len(po_files)} cached PO files")

        return po_files
    except Exception as e:
        logger.error(f"Error fetching cached PO files: {str(e)}", exc_info=True)
        raise


def process_po_file(file_path, apps_path):
    """Process individual PO file and return metadata"""
    try:
        if not os.path.isfile(file_path):
            logger.warning(f"Path is not a file: {file_path}")
            return None

        rel_path = os.path.relpath(file_path, apps_path)
        app_name = rel_path.split(os.path.sep)[0]
        filename = os.path.basename(file_path)

        # Get file stats
        last_modified = os.path.getmtime(file_path)
        last_modified_datetime = datetime.fromtimestamp(last_modified).strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        # Parse PO file
        po = polib.pofile(file_path)
        total = len(po)
        translated = len(po.translated_entries())
        translation_status = int((translated / total) * 100) if total > 0 else 0
        language = po.metadata.get("Language", "th")

        return {
            "app_name": app_name,
            "filename": filename,
            "language": language,
            "total_entries": total,
            "translated_entries": translated,
            "translation_status": translation_status,
            "last_modified": last_modified_datetime,
            "last_scanned": frappe.utils.nowtime(),
            "file_path": file_path,
        }
    except Exception as e:
        logger.error(f"Error processing {file_path}", exc_info=True)
        return None


@frappe.whitelist()
@enhanced_error_handler
def scan_po_files():
    """Scan the filesystem for PO files and update the database"""
    global SCAN_IN_PROGRESS
    if SCAN_IN_PROGRESS:
        logger.warning("Recursion detected in scan_po_files")
        return {"success": False, "error": "Scan already in progress"}

    SCAN_IN_PROGRESS = True
    logger.info("Starting scan for PO files")

    try:
        # Get the bench path
        bench_path = get_bench_path()
        apps_path = os.path.join(bench_path, "apps")

        if not os.path.exists(apps_path):
            logger.error(f"Apps path does not exist: {apps_path}")
            return {"success": False, "error": "Apps path does not exist"}

        # Statistics
        stats = {
            "total_files": 0,
            "new_files": 0,
            "updated_files": 0,
            "failed_files": 0,
        }

        # Find all app directories
        app_dirs = [
            d
            for d in os.listdir(apps_path)
            if os.path.isdir(os.path.join(apps_path, d))
        ]
        logger.debug(f"Found {len(app_dirs)} app directories")

        # Find all th.po files
        matching_files = []

        # Manually look for th.po files in each app
        for app in app_dirs:
            locale_path = os.path.join(apps_path, app, app, "locale")
            th_po_path = os.path.join(locale_path, "th.po")

            # Check if the file exists
            if os.path.exists(th_po_path):
                matching_files.append(th_po_path)
        logger.info(f"Found {len(matching_files)} PO files to process")

        # Process files in batches
        for i, file_path in enumerate(matching_files):
            if "translation_tools/translations" in file_path:
                continue

            stats["total_files"] += 1
            logger.debug(f"Processing file {i + 1}/{len(matching_files)}: {file_path}")

            file_data = process_po_file(file_path, apps_path)
            if not file_data:
                stats["failed_files"] += 1
                continue

            # Check if file already exists in database
            existing_file = frappe.get_value(
                "PO File", {"file_path": file_path}, "name"
            )
            if existing_file:
                # Update existing record
                frappe.db.set_value(
                    "PO File", existing_file, file_data, update_modified=True
                )
                stats["updated_files"] += 1
            else:
                # Create new record
                file_data.update({"doctype": "PO File"})
                frappe.get_doc(file_data).insert(ignore_permissions=True)
                stats["new_files"] += 1

            # Commit every BATCH_SIZE files to avoid long transactions
            # Commit periodically to avoid long transactions
            if i > 0 and i % BATCH_SIZE == 0:
                frappe.db.commit()
                logger.info(f"Committed {BATCH_SIZE} files to the database")
                logger.debug(f"Committed {i} files so far")

        frappe.db.commit()  # Final commit
        logger.info(
            f"Scan completed: {stats['total_files']} total, "
            f"{stats['new_files']} new, {stats['updated_files']} updated, "
            f"{stats['failed_files']} failed"
        )
        return {"success": True, **stats}

    except Exception as e:
        logger.exception("Critical error during scan")
        frappe.db.rollback()
        return {
            "success": False,
            "error": f"Critical error during scan {str(e)}",
            "details": str(e),
            "traceback": frappe.get_traceback(),
        }
    finally:
        SCAN_IN_PROGRESS = False
        logger.info("Scan completed, reset SCAN_IN_PROGRESS flag")


@frappe.whitelist()
@enhanced_error_handler
def get_po_file_entries(file_path):
    """Get entries from a PO file"""
    resolved_path = validate_file_path(file_path)

    print(f"Original file path: {file_path}")
    print(f"Resolved file path: {resolved_path}")

    if not os.path.exists(resolved_path):
        logger.error(f"File not found: {resolved_path}")
        frappe.throw(_("File not found: {0}").format(resolved_path))

    try:
        logger.info(f"Reading PO file entries: {file_path}")
        po = polib.pofile(file_path)

        # Get file metadata
        metadata = {
            "language": po.metadata.get("Language", "Unknown"),
            "project": po.metadata.get("Project-Id-Version", "Unknown"),
            "last_updated": po.metadata.get("PO-Revision-Date", "Unknown"),
        }

        # Process entries
        entries = []
        for i, entry in enumerate(po):
            entries.append(
                {
                    "id": str(i),  # Use index as ID
                    "msgid": entry.msgid,
                    "msgstr": entry.msgstr,
                    "is_translated": bool(entry.msgstr),
                    "comments": (
                        [c for c in entry.comment.split("\n") if c]
                        if entry.comment
                        else []
                    ),
                    "context": entry.msgctxt,
                }
            )

        # Calculate statistics
        total = len(po)
        translated = len(po.translated_entries())

        logger.debug(f"Returning {len(entries)} entries from {file_path}")

        return {
            "path": file_path,
            "metadata": metadata,
            "entries": entries,
            "stats": {
                "total": total,
                "translated": translated,
                "untranslated": total - translated,
                "percentage": int((translated / total) * 100) if total > 0 else 0,
            },
        }
    except Exception as e:
        logger.exception(f"Error parsing PO file: {file_path}", exc_info=True)
        raise


@frappe.whitelist()
@enhanced_error_handler
def get_po_file_contents(file_path, limit=100, offset=0):
    """Get paginated entries from a PO file"""

    validate_file_path(file_path)

    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        frappe.throw(_("File not found: {0}").format(file_path))

    try:
        logger.info(f"Reading PO file contents: {file_path}")
        # Load the PO file
        po = polib.pofile(file_path)

        # Extract metadata
        metadata = po.metadata

        # Calculate statistics
        total = len(po)
        translated = len(po.translated_entries())
        fuzzy = len(po.fuzzy_entries())
        untranslated = total - translated - fuzzy

        # Process entries with pagination
        start_idx = int(offset)
        end_idx = start_idx + int(limit)
        has_more = total > end_idx

        # Ensure we don't exceed the number of entries
        entries = []
        for i, entry in enumerate(po[start_idx:end_idx], start=start_idx):
            entries.append(
                {
                    "msgid": entry.msgid,
                    "msgstr": entry.msgstr,
                    "is_translated": bool(entry.msgstr),
                    "is_fuzzy": "fuzzy" in entry.flags,
                    "entry_type": (
                        "fuzzy"
                        if "fuzzy" in entry.flags
                        else "translated"
                        if entry.msgstr
                        else "untranslated"
                    ),
                }
            )
        logger.debug(f"Returning {len(entries)} entries from {file_path}")

        return {
            "metadata": metadata,
            "statistics": {
                "total": total,
                "translated": translated,
                "untranslated": untranslated,
                "fuzzy": fuzzy,
                "percent_translated": (
                    int((translated / total) * 100) if total > 0 else 0
                ),
            },
            "entries": entries,
            "has_more": has_more,
        }
    except Exception as e:
        logger.error(f"Error reading PO file contents: {file_path}", exc_info=True)
        frappe.log_error(f"Error processing PO file: {e}")
        raise


@frappe.whitelist()
@enhanced_error_handler
def save_translation(file_path, entry_id, translation):
    """Save a single translation"""
    validate_file_path(file_path)

    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        frappe.throw(_("File not found: {0}").format(file_path))

    try:
        logger.info(f"Saving translation for entry {entry_id} in {file_path}")
        # Load the PO file
        po = polib.pofile(file_path)

        # Find the entry by ID (index)
        index = int(entry_id)

        if index < 0 or index >= len(po):
            logger.warning(f"Entry ID out of range: {index}")
            frappe.log_error(f"Invalid entry ID: {entry_id}")
            frappe.throw(_("Invalid entry ID"))

        # Update translation
        entry = po[index]

        # Check if this is a new translation (i.e., previously untranslated)
        was_untranslated = not entry.msgstr

        # Update the translation
        entry.msgstr = translation

        # Update metadata
        po.metadata["PO-Revision-Date"] = datetime.now().strftime("%Y-%m-%d %H:%M%z")

        # Save the file
        po.save(file_path)

        # Update database if needed
        if was_untranslated and translation:
            if frappe.db.exists("PO File", {"file_path": file_path}):
                file_name = frappe.get_value(
                    "PO File", {"file_path": file_path}, "name"
                )
                if file_name:
                    file_doc = frappe.get_doc("PO File", str(file_name))
                    translated_entries = (
                        frappe.db.get_value(
                            "PO File", file_doc.name, "translated_entries"
                        )
                        or 0
                    )
                    frappe.db.set_value(
                        "PO File",
                        file_doc.name,
                        "translated_entries",
                        (
                            int(translated_entries)
                            if isinstance(translated_entries, (int, float))
                            else 0
                        )
                        + 1,
                    )
                    total_entries = (
                        frappe.db.get_value("PO File", file_doc.name, "total_entries")
                        or 0
                    )
                    translation_status = (
                        int(
                            (
                                (
                                    int(translated_entries)
                                    if isinstance(translated_entries, (int, float))
                                    else 0
                                )
                                + 1
                            )
                            / (
                                int(total_entries)
                                if isinstance(total_entries, (int, float))
                                and total_entries > 0
                                else 1
                            )
                            * 100
                        )
                        if isinstance(total_entries, (int, float)) and total_entries > 0
                        else 0
                    )
                    frappe.db.set_value(
                        "PO File",
                        file_doc.name,
                        "translation_status",
                        translation_status,
                    )
                    frappe.db.set_value(
                        "PO File", file_doc.name, "last_modified", frappe.utils.now()
                    )
                    logger.debug(f"Updated database record for {file_path}")

        logger.info(f"Successfully saved translation for entry {entry_id}")
        return {"success": True}
    except Exception as e:
        logger.exception(
            f"Error saving translation for entry {entry_id}", exc_info=True
        )
        frappe.log_error(f"Error saving translation: {e}")
        raise


@frappe.whitelist()
@enhanced_error_handler
def save_translations(file_path, translations):
    """Save multiple translations at once"""
    validate_file_path(file_path)

    if not os.path.exists(file_path) or not file_path.endswith(".po"):
        logger.error(f"Invalid PO file path: {file_path}")
        return {"error": "Invalid PO file path"}

    try:
        logger.info(f"Saving translations to {file_path}")

        # Load the PO file
        po = polib.pofile(file_path)
        updated_count = 0

        # Update entries
        for translation in translations:
            msgid = translation.get("msgid")
            msgstr = translation.get("msgstr")

            if not msgid or not msgstr:
                continue

            # Find corresponding entry
            for entry in po:
                if entry.msgid == msgid:
                    entry.msgstr = msgstr
                    updated_count += 1
                    break

        # Update metadata
        po.metadata["PO-Revision-Date"] = datetime.now().strftime("%Y-%m-%d %H:%M%z")

        # Save the file
        po.save(file_path)

        logger.info(f"Successfully saved {updated_count} translations")
        return {"success": True, "message": f"Updated {updated_count} translations"}

    except Exception as e:
        logger.error(f"Error saving translations: {str(e)}", exc_info=True)
        frappe.log_error(f"Error saving translations: {str(e)}")
        raise
