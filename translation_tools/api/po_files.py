import os
import frappe
import polib
import logging
from frappe import _
from datetime import datetime
import math
from functools import wraps
import re
import tempfile
import subprocess
import shutil
import hashlib
from frappe.utils.password import get_decrypted_password, get_encryption_key, encrypt

import frappe.utils
from .common import get_bench_path
from translation_tools.utils.json_logger import get_json_logger

# from .settings import get_github_token

# Configure logging
LOG_DIR = os.path.join(get_bench_path(), "logs", "translation_tools")
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "po_file_debug.log")

logger = logging.getLogger("translation_tools.api.po_files")
loggerJson = get_json_logger()

# Avoid adding handlers multiple times
if not logger.handlers:
    logger.setLevel(logging.DEBUG)

    # File handler
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )

    logger.addHandler(file_handler)

    # Create console handler with formatting
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
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
    loggerJson.info(f"Starting validate_file_path({path})")

    print(f"Bench path: {bench_path}")
    print(f"Incoming path: {path}")
    # Always join with bench_path, don't trust incoming `path`
    full_path = os.path.abspath(os.path.join(bench_path, path))
    loggerJson.info(f"Full Path: {full_path}")

    print(f"Full path: {full_path}")

    if not full_path.startswith(os.path.abspath(bench_path)):
        loggerJson.info(f"os.path.abspath: {os.path.abspath(bench_path)}")
        loggerJson.info(f"os.path: {os.path}")
        logger.warning(f"Attempt to access path outside bench: {path}")
        raise frappe.PermissionError("Access denied")

    # return os.path.abspath(path)
    return full_path


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
            logger.exception(f"Unexpected error in {func.__name__} {e}")
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
def get_po_file_entries_paginated(
    file_path, page=1, page_size=20, filter_type="all", search_term=""
):
    # Add request tracking
    import time

    request_id = str(time.time())
    logger.info(f"[REQUEST {request_id}] Starting request for {file_path}")

    """
    Return paginated PO file entries based on filters with robust error handling
    """
    logger.info(
        f"Getting paginated entries for {file_path} | Page: {page} | Filter: {filter_type}"
    )

    page = int(page)
    page_size = int(page_size)

    # Validate path is within the bench directory
    full_path = validate_file_path(file_path)

    print(f"full_path get_po_file_page {full_path}")

    if not os.path.exists(full_path):
        logger.error(f"File not found: {full_path}")
        return {"success": False, "error": f"File not found: {file_path}"}

    # Try to safely load the PO file
    try:
        # Check file encoding and handle BOM
        with open(full_path, "rb") as f:
            content = f.read()

        # Check for and remove BOM if present
        if content.startswith(b"\xef\xbb\xbf"):
            logger.info(f"Removing BOM from file {file_path}")
            content = content[3:]

        # Create a temporary file without BOM
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp_path = temp.name
            temp.write(content)

        try:
            # Try to parse the cleaned file
            po = polib.pofile(temp_path)
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        logger.exception(f"Error parsing PO file {file_path}: {str(e)}")
        return {
            "success": False,
            "error": f"Error parsing PO file: {str(e)}",
            "entries": [],
            "stats": {"total": 0, "translated": 0, "untranslated": 0, "percentage": 0},
            "total_entries": 0,
            "total_pages": 0,
        }

    # Apply filters
    filtered_entries = []
    try:
        for index, entry in enumerate(po):
            # Filter by translation status
            if filter_type == "untranslated" and entry.msgstr:
                continue
            if filter_type == "translated" and not entry.msgstr:
                continue

            # Filter by search term
            if (
                search_term
                and search_term.lower() not in entry.msgid.lower()
                and search_term.lower() not in (entry.msgstr or "").lower()
            ):
                continue

            filtered_entries.append((index, entry))
    except Exception as e:
        logger.exception(f"Error filtering entries: {str(e)}")
        return {"success": False, "error": f"Error filtering entries: {str(e)}"}

    # Calculate pagination
    total_entries = len(filtered_entries)
    total_pages = math.ceil(total_entries / page_size) if total_entries > 0 else 1

    # Validate page number
    if page < 1:
        page = 1
    if page > total_pages:
        page = total_pages

    # Get entries for the current page
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_entries)

    try:
        paginated_entries = filtered_entries[start_idx:end_idx]
    except Exception as e:
        logger.exception(f"Error slicing entries: {str(e)}")
        return {"success": False, "error": f"Error fetching page {page}: {str(e)}"}

    # Format entries for the frontend
    formatted_entries = []
    for orig_index, entry in paginated_entries:
        try:
            # Create a truly unique ID using the entry's original index and content
            import hashlib

            # Include original index to guarantee uniqueness
            unique_string = f"{orig_index}-{entry.msgid}"

            entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()

            formatted_entries.append(
                {
                    "id": entry_id,
                    "msgid": entry.msgid,
                    "msgstr": entry.msgstr if hasattr(entry, "msgstr") else "",
                    "is_translated": (
                        bool(entry.msgstr) if hasattr(entry, "msgstr") else False
                    ),
                    "context": entry.msgctxt if hasattr(entry, "msgctxt") else None,
                    "comments": entry.comment if hasattr(entry, "comment") else [],
                    "orig_index": orig_index,  # Include original index for reference
                }
            )
        except Exception as e:
            logger.warning(f"Error formatting entry: {str(e)}")
            # Continue with next entry

    # Get translation stats
    try:
        total = len(po)
        translated = len([e for e in po if hasattr(e, "msgstr") and e.msgstr])
        untranslated = len([e for e in po if not hasattr(e, "msgstr") or not e.msgstr])

        # Calculate percentage
        percentage = round((translated / total * 100) if total > 0 else 0, 1)

        stats = {
            "total": total,
            "translated": translated,
            "untranslated": untranslated,
            "percentage": percentage,
        }

        print(f"stats from backend {stats}")
    except Exception as e:
        logger.exception(f"Error calculating stats: {str(e)}")
        stats = {"total": 0, "translated": 0, "untranslated": 0, "percentage": 0}

    # Try to get metadata
    try:
        metadata = {
            "language": (
                po.metadata.get("Language", "") if hasattr(po, "metadata") else ""
            ),
            "last_translator": (
                po.metadata.get("Last-Translator", "")
                if hasattr(po, "metadata")
                else ""
            ),
            "revision_date": (
                po.metadata.get("PO-Revision-Date", "")
                if hasattr(po, "metadata")
                else ""
            ),
        }
    except Exception as e:
        logger.exception(f"Error extracting metadata: {str(e)}")
        metadata = {}

    result = {
        "success": True,
        "entries": formatted_entries,
        "stats": stats,
        "total_entries": total_entries,
        "total_pages": total_pages,
        "current_page": page,
        "metadata": metadata,
    }

    print(f"result.stats {result['stats']}")

    logger.info(
        f"Returning {len(formatted_entries)} entries for page {page}/{total_pages}"
    )
    logger.info(f"[REQUEST {request_id}] Starting request for {file_path}")
    return result


@frappe.whitelist()
@enhanced_error_handler
def find_next_untranslated_entry(file_path, current_page=1, page_size=20):
    """
    Find the next page containing untranslated entries and return the first untranslated entry ID
    with robust error handling
    """
    logger.info(
        f"Finding next untranslated entry from {file_path} | Current page: {current_page}"
    )

    current_page = int(current_page)
    page_size = int(page_size)

    # Validate path is within the bench directory
    full_path = validate_file_path(file_path)

    print(f"full_path find_next_un {full_path}")

    if not os.path.exists(full_path):
        logger.error(f"File not found: {full_path}")
        return {"success": False, "error": f"File not found: {file_path}"}

    # Try to safely load the PO file
    try:
        # Check file encoding and handle BOM
        with open(full_path, "rb") as f:
            content = f.read()

        # Check for and remove BOM if present
        if content.startswith(b"\xef\xbb\xbf"):
            logger.info(f"Removing BOM from file {file_path}")
            content = content[3:]

        # Create a temporary file without BOM
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp_path = temp.name
            temp.write(content)

        try:
            # Try to parse the cleaned file
            po = polib.pofile(temp_path)
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        logger.exception(f"Error parsing PO file {file_path}: {str(e)}")
        return {
            "success": False,
            "error": f"Error parsing PO file: {str(e)}",
            "found": False,
        }

    # Find all untranslated entries
    try:
        untranslated = []
        for i, entry in enumerate(po):
            if not hasattr(entry, "msgstr") or not entry.msgstr:
                # Store both the entry and its index in the original file
                untranslated.append((i, entry))
    except Exception as e:
        logger.exception(f"Error finding untranslated entries: {str(e)}")
        return {
            "success": False,
            "error": f"Error finding untranslated entries: {str(e)}",
            "found": False,
        }

    if not untranslated:
        logger.info("No untranslated entries found")
        return {"success": True, "found": False}

    # Calculate what page each entry would be on
    start_idx = current_page * page_size  # Start searching from the next page

    try:
        # Find the index of the first untranslated entry after the current page
        for po_index, entry in untranslated:
            if po_index >= start_idx:
                # Calculate what page this entry is on
                entry_page = math.floor(po_index / page_size) + 1

                # Create a unique ID for the entry
                import hashlib

                unique_string = f"{po_index}-{entry.msgid}"
                entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()

                logger.info(
                    f"Found untranslated entry on page {entry_page}, entry ID: {entry_id}"
                )
                return {
                    "success": True,
                    "found": True,
                    "page": entry_page,
                    "entry_id": entry_id,
                    "entry_index": po_index,
                    "comments": (
                        entry.comment if hasattr(entry, "comment") else []
                    ),  # Ensure comments are properly handled
                }

        # If we reach here, we found untranslated entries, but they're on earlier pages
        # In this case, start from the beginning
        po_index, entry = untranslated[0]
        entry_page = math.floor(po_index / page_size) + 1

        # Create a unique ID for the entry
        import hashlib

        unique_string = f"{po_index}-{entry.msgid}"
        entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()

        # entry_id = hashlib.md5(entry.msgid.encode("utf-8")).hexdigest()[:16]

        logger.info(
            f"Wrapping back to first untranslated entry on page {entry_page}, entry ID: {entry_id}"
        )
        return {
            "success": True,
            "found": True,
            "page": entry_page,
            "entry_id": entry_id,
            "entry_index": po_index,
            "comments": (
                entry.comment if hasattr(entry, "comment") else []
            ),  # Ensure comments are properly handled
        }
    except Exception as e:
        logger.exception(f"Error determining next untranslated entry: {str(e)}")
        return {
            "success": False,
            "error": f"Error determining next untranslated entry: {str(e)}",
            "found": False,
        }


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
        logger.error(f"Error processing {file_path} {e}", exc_info=True)
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
        logger.error(f"File not found: {resolved_path} file_path {file_path}")
        frappe.throw(_("File not found: {0}").format(resolved_path))

    try:
        logger.info(f"Reading PO file entries: {resolved_path}")
        po = polib.pofile(resolved_path)

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
        logger.exception(f"Error parsing PO file: {file_path} {str(e)}", exc_info=True)
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
                        else "translated" if entry.msgstr else "untranslated"
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
def save_translation(file_path, entry_id, translation, push_to_github=False):
    """
    Save a single translation to local file and optionally push to Github
    Args:
        file_path (str): Path to the PO file (standardized format)
        entry_id (int): Index of the entry to translate
        translation (str): The translated text
        push_to_github (bool): Whether to also push to GitHub
    """

    loggerJson.info("Start save translation")
    original_path = file_path
    resolved_path = validate_file_path(file_path)

    logger.info(f"resolved_path: {resolved_path}")
    print(f"resolved_path {resolved_path}")
    print(f"Original file path: {file_path}")
    print(f"Resolved file path: {resolved_path}")

    loggerJson.debug(validate_file_path)
    logger.debug(f"validate_file_path {validate_file_path}")
    logger.debug(f"translation {translation}")
    logger.debug(f"entry_id {entry_id}")
    logger.debug(f"validate_file_path {validate_file_path}")

    print(f"file_path: {file_path}")
    print(f"entry_id: {entry_id}")
    print(f"translation: {translation}")
    print(f"validate_file_path {validate_file_path}")

    if not os.path.exists(resolved_path):
        logger.error(f"File not found: {resolved_path}")
        frappe.throw(_("File not found: {0}").format(resolved_path))

    try:
        logger.info(f"Saving translation for entry {entry_id} in {resolved_path}")
        # Load the PO file
        po = polib.pofile(resolved_path)

        # Find the entry - handle both numeric indices and hash IDs
        entry = None
        orig_index = None

        # Find the entry by ID (index)
        # index = int(entry_id)

        # if index < 0 or index >= len(po):
        #     logger.warning(f"Entry ID out of range: {index}")
        #     frappe.log_error(f"Invalid entry ID: {entry_id}")
        #     frappe.throw(_("Invalid entry ID"))

        # Update translation
        # entry = po[index]

        for index, potential_entry in enumerate(po):
            # Match the hash generation from get_po_file_entries_paginated
            unique_string = f"{index}-{potential_entry.msgid}"
            current_hash = hashlib.md5(unique_string.encode("utf-8")).hexdigest()

            if current_hash == entry_id:
                entry = potential_entry
                orig_index = index
                logger.info(f"Found entry by hash at index {index}")
                break

        if entry is None:
            logger.warning(f"Entry with ID {entry_id} not found")
            frappe.throw(_("Invalid entry ID or entry not found"))

        # Check if this is a new translation (i.e., previously untranslated)
        was_untranslated = entry is not None and not entry.msgstr

        # Update the translation
        if entry is not None:
            entry.msgstr = translation
        else:
            logger.warning(f"Entry is None for entry_id: {entry_id}")
            frappe.throw(_("Invalid entry ID or entry not found"))

        # Update metadata
        po.metadata["PO-Revision-Date"] = datetime.now().strftime("%Y-%m-%d %H:%M%z")

        # Save the file
        po.save(resolved_path)
        logger.info(
            f"Successfully saved translation for entry {entry_id} (index {orig_index}) to local file"
        )

        # Update database if needed
        print(f"Access database {original_path}")
        if was_untranslated and translation:
            if frappe.db.exists("PO File", {"original_path": original_path}):
                file_name = frappe.get_value(
                    "PO File", {"original_path": original_path}, "name"
                )

                print(f"file_name in DB: {file_name}")
                if file_name:
                    file_doc = frappe.get_doc("PO File", str(file_name))

                    print(f"file_doc in DB: {file_doc}")
                    print(f"file_doc.name in DB: {file_doc.name}")
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
                    logger.debug(f"Updated database record for {original_path}")

        # Push to Github if requested
        github_result = {"github_pushed": False}
        if push_to_github:
            github_result = push_translation_to_github(file_path, entry, translation)

        logger.info(f"Successfully saved translation for entry {entry_id}")
        result = {"success": True, "github": github_result}
        return result

    except Exception as e:
        logger.exception(
            f"Error saving translation for entry {entry_id}", exc_info=True
        )
        frappe.log_error(f"Error saving translation: {e}")
        raise


def push_translation_to_github(
    file_path, entry=None, translation=None, custom_commit_message=None
):
    """
    Push a translation PO file to GitHub, handling existing repositories properly

    Args:
        file_path (str): Path to the PO file to push
        entry (polib.POEntry, optional): Specific entry being translated, for commit message
        translation (str, optional): New translation, for commit message
    """
    # Get the token
    token_result = get_github_token()

    # Check if token was retrieved successfully
    if not token_result.get("success"):
        return {
            "github_pushed": False,
            "error": token_result.get("error", "token_error"),
        }

    # Extract the token from successful result
    github_token = token_result.get("token")

    # Get GitHub repo URL
    try:
        repo_url = frappe.db.get_single_value(
            "Translation Tools Settings", "github_repo"
        )
        if not repo_url:
            repo_url = "https://github.com/ManotLuijiu/erpnext-thai-translation.git"
    except Exception as e:
        frappe.log_error(str(e), "Failed to get GitHub repo URL")
        repo_url = "https://github.com/ManotLuijiu/erpnext-thai-translation.git"

    # Create token URL
    if isinstance(repo_url, str) and isinstance(github_token, str):
        token_url = repo_url.replace("https://", f"https://{github_token}@")
    else:
        raise TypeError("repo_url and github_token must be strings")

    try:
        # Extract app name and language from file_path
        parts = file_path.split("/")
        app_name = parts[1] if len(parts) > 1 else "unknown"
        if "apps" in parts and parts.index("apps") + 1 < len(parts):
            app_name = parts[parts.index("apps") + 1]

        language = os.path.basename(file_path).split(".")[0]

        # Full path to the local PO file
        abs_file_path = os.path.join(frappe.get_site_path("../.."), file_path)
        if not os.path.exists(abs_file_path):
            return {
                "github_pushed": False,
                "error": f"Source file not found: {file_path}",
            }

        # Create a temporary directory
        with tempfile.TemporaryDirectory() as temp_dir:
            logger.info(f"Working in temporary directory: {temp_dir}")

            # Check if repo exists by trying to clone it
            repo_exists = False
            try:
                # Try to clone the existing repository
                subprocess.run(
                    ["git", "clone", str(token_url), str(temp_dir)],
                    check=True,
                    capture_output=True,
                    text=True,
                )
                repo_exists = True
                logger.info("Successfully cloned existing repository")
            except subprocess.CalledProcessError as e:
                if "Repository not found" in e.stderr or "not found" in e.stderr:
                    # Repository doesn't exist yet
                    logger.info("Repository doesn't exist, will create a new one")
                    repo_exists = False

                    # Initialize new repository
                    subprocess.run(["git", "init"], cwd=temp_dir, check=True)
                    logger.info("Initialized new git repository")

                    # Create README file
                    readme_path = os.path.join(temp_dir, "README.md")
                    with open(readme_path, "w") as f:
                        f.write("# ERPNext Thai Translation\n\n")
                        f.write(
                            "Automatic translations for ERPNext in Thai language.\n\n"
                        )
                        f.write("Generated by Translation Tools App.")

                    # Add remote
                    subprocess.run(
                        ["git", "remote", "add", "origin", str(token_url)],
                        cwd=temp_dir,
                        check=True,
                    )
                else:
                    # Some other error occurred
                    logger.error(f"Error cloning repository: {e.stderr}")
                    return {
                        "github_pushed": False,
                        "error": f"Error accessing repository: {e.stderr}",
                    }

            # Set user info
            user_email = frappe.session.user or "translation-tools@example.com"
            user_name = (
                frappe.db.get_value("User", frappe.session.user, "full_name")
                or "Translation Tools"
            )

            subprocess.run(
                ["git", "config", "user.email", str(user_email)],
                cwd=temp_dir,
                check=True,
            )
            subprocess.run(
                ["git", "config", "user.name", str(user_name)], cwd=temp_dir, check=True
            )

            # Create app directory if it doesn't exist
            app_dir = os.path.join(temp_dir, app_name)
            os.makedirs(app_dir, exist_ok=True)

            # Path to the PO file in the repo
            repo_po_path = os.path.join(app_dir, f"{language}.po")

            # Copy the entire PO file directly
            shutil.copy(abs_file_path, repo_po_path)
            logger.info(f"Copied PO file to repository: {repo_po_path}")

            # Add .gitignore if it doesn't exist
            gitignore_path = os.path.join(temp_dir, ".gitignore")
            if not os.path.exists(gitignore_path):
                with open(gitignore_path, "w") as f:
                    f.write(".git-credentials\n")
                    f.write("*.pyc\n")
                    f.write("__pycache__/\n")
                    f.write(".DS_Store\n")

            # Stage files
            subprocess.run(
                ["git", "add", ".gitignore", app_dir], cwd=temp_dir, check=True
            )
            # Add README.md if it's a new repo
            if not repo_exists:
                subprocess.run(["git", "add", "README.md"], cwd=temp_dir, check=True)

            logger.info("Added files to git staging")

            # Check if there are changes to commit
            status_result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=temp_dir,
                check=True,
                capture_output=True,
                text=True,
            )

            if not status_result.stdout.strip():
                logger.info("No changes to commit")
                return {
                    "github_pushed": True,
                    "message": _(
                        "No changes needed, translations are already up to date"
                    ),
                }

            # Prepare commit message - using custom message if provided
            if custom_commit_message:
                # Use the provided custom message
                commit_message = custom_commit_message
            elif entry and translation:
                # If we have specific entry info, create a detailed message
                msg_id = (
                    entry.msgid[:50] + "..." if len(entry.msgid) > 50 else entry.msgid
                )
                commit_message = (
                    f"Update translation for {app_name}/{language}: {msg_id}"
                )
            else:
                # Otherwise use a generic message
                commit_message = f"Update translations for {app_name}/{language}"

            # Commit changes
            subprocess.run(
                ["git", "commit", "-m", commit_message], cwd=temp_dir, check=True
            )
            logger.info(f"Committed changes: {commit_message}")

            # Set branch to main if it's a new repo
            if not repo_exists:
                subprocess.run(
                    ["git", "branch", "-M", "main"], cwd=temp_dir, check=True
                )
                logger.info("Set branch to main")

            # Push changes - if new repo use -u to set upstream
            try:
                if repo_exists:
                    # For existing repo
                    result = subprocess.run(
                        ["git", "push", "origin", "HEAD"],  # Push current branch
                        cwd=temp_dir,
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                else:
                    # For new repo
                    result = subprocess.run(
                        ["git", "push", "-u", "origin", "main"],
                        cwd=temp_dir,
                        check=True,
                        capture_output=True,
                        text=True,
                    )

                logger.info(f"Push output: {result.stdout}")
                logger.info("Successfully pushed to GitHub")

                return {
                    "github_pushed": True,
                    "message": _("Successfully pushed translations to GitHub"),
                    "app": app_name,
                    "language": language,
                    "commit_message": commit_message,
                }
            except subprocess.CalledProcessError as e:
                error_msg = e.stderr if hasattr(e, "stderr") else str(e)
                logger.error(f"Failed to push to GitHub: {error_msg}")

                if "Authentication failed" in error_msg:
                    return {
                        "github_pushed": False,
                        "error": "GitHub authentication failed. Please check your token.",
                    }
                elif "push protection" in error_msg or "secret" in error_msg:
                    return {
                        "github_pushed": False,
                        "error": "GitHub security blocked the push. Please manually create the repository first.",
                    }
                else:
                    return {
                        "github_pushed": False,
                        "error": f"Failed to push to GitHub: {error_msg}",
                    }
    except Exception as e:
        import traceback

        logger.exception(f"Error pushing to GitHub: {str(e)}")
        return {
            "github_pushed": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


@frappe.whitelist()
@enhanced_error_handler
def save_github_token(token, github_repo=None):
    """
    Save GitHub token to Translation Tools Settings with encryption

    Args:
        token (str): GitHub personal access token
        repo_url (str, optional): GitHub repository URL. Defaults to None.

    Returns:
        dict: Operation result with success status
    """

    try:
        # Check permissions
        if not frappe.has_permission("Translation Tools Settings", "write"):
            return {
                "success": False,
                "error": _(
                    "You don't have permission to modify Translation Tools Settings"
                ),
            }

        # Check if doctype exists
        if not frappe.db.exists("DocType", "Translation Tools Settings"):
            return {
                "success": False,
                "error": _(
                    "Translation Tools Settings doctype does not exist. Please contact administrator."
                ),
            }

        # Get or create the settings document
        settings = frappe.get_single("Translation Tools Settings")

        # Enable Github integration
        settings.enable_github = 1  # type: ignore

        # Set repository URL (use parameter or keep existing)
        if github_repo:
            settings.github_repo = github_repo  # type: ignore
        elif not settings.github_repo:  # type: ignore
            # Set default only if not already set
            settings.github_repo = (  # type: ignore
                "https://github.com/ManotLuijiu/erpnext-thai-translation.git"  # type: ignore
            )

        # Store token - the field should be set up as a Password type field
        # which will handle encryption automatically
        settings.github_token = token  # type: ignore

        print(f"settings from save_github_token {settings}")

        # Log without revealing token
        frappe.logger().info(f"Updating GitHub settings for user {frappe.session.user}")

        # Save document
        settings.save()
        frappe.db.commit()

        return {"success": True, "message": _("GitHub token saved successfully")}
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Failed to save Github token")
        return {"success": False, "error": str(e), "traceback": frappe.get_traceback()}


def get_github_token():
    """
    Retrieve the GitHub token from settings and decrypt it

    Returns:
        dict: Result containing token or error information
    """
    try:
        # Check if doctype exists
        if not frappe.db.exists("DocType", "Translation Tools Settings"):
            return {"success": False, "error": "missing_settings"}

        # Check if GitHub integration is enabled
        github_enabled = frappe.db.get_single_value(
            "Translation Tools Settings", "github_enable"
        )
        if not github_enabled:
            return {"success": False, "error": "github_disabled"}

        # Check if token exists
        try:
            # Try to get the settings document
            # settings = frappe.get_cached_doc("Translation Tools Settings")

            # if not settings.github_enable:  # type: ignore
            #     return {"success": False, "error": "github_disabled"}

            # if not settings.github_token:  # type: ignore
            #     return {"success": False, "error": "missing_token"}

            # Get the decrypted token
            token = get_decrypted_password(
                "Translation Tools Settings",
                "Translation Tools Settings",
                "github_token",
                raise_exception=False,
            )

            if not token:
                return {"success": False, "error": "missing_token"}

            return {"success": True, "token": token}

        except frappe.DoesNotExistError:
            # Handle case where settings document doesn't exist
            return {"success": False, "error": "missing_settings"}
        except Exception as e:
            # Handle specific password not found errors
            return {"success": False, "error": "missing_token", "details": str(e)}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Failed to retrieve GitHub token")
        return {"success": False, "error": "token_error", "details": str(e)}


@frappe.whitelist()
@enhanced_error_handler
def save_translations(file_path, translations):
    """Save multiple translations at once"""
    resolved_path = validate_file_path(file_path)

    logger.info(f"resolved_path: {resolved_path}")
    print(f"resolved_path ${resolved_path}")

    if not os.path.exists(resolved_path) or not file_path.endswith(".po"):
        logger.error(f"Invalid PO file path: {resolved_path}")
        return {"error": "Invalid PO file path"}

    try:
        logger.info(f"Saving translations to {resolved_path}")

        # Load the PO file
        po = polib.pofile(resolved_path)
        updated_count = 0

        # Update entries
        for translation in translations:
            msgid = translation.get("msgid")
            msgstr = translation.get("msgstr")

            print(f"msgid: {msgid}")
            print(f"msgstr: {msgstr}")

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
        po.save(resolved_path)

        logger.info(f"Successfully saved {updated_count} translations")
        return {"success": True, "message": f"Updated {updated_count} translations"}

    except Exception as e:
        logger.error(f"Error saving translations: {str(e)}", exc_info=True)
        frappe.log_error(f"Error saving translations: {str(e)}")
        raise


@frappe.whitelist()
@enhanced_error_handler
def repair_po_file(file_path):
    """
    Attempt to repair common issues in a PO file

    Args:
        file_path (str): Path to the PO file

    Returns:
        dict: Repair result
    """
    resolved_path = validate_file_path(file_path)

    if not os.path.exists(resolved_path):
        return {"success": False, "error": "File not found"}

    try:
        # Create backup
        backup_path = f"{resolved_path}.bak"
        shutil.copy2(resolved_path, backup_path)

        # Read file content
        with open(resolved_path, "rb") as f:
            content = f.read()

        # Remove BOM if present
        if content.startswith(b"\xef\xbb\xbf"):
            content = content[3:]

        # Try to detect encoding issues and fix them
        try:
            content_str = content.decode("utf-8", errors="replace")

            # Fix common syntax issues
            # 1. Ensure each msgid has a corresponding msgstr
            lines = content_str.split("\n")
            fixed_lines = []
            i = 0

            while i < len(lines):
                line = lines[i]
                fixed_lines.append(line)

                if line.startswith('msgid "') and i + 1 < len(lines):
                    if not lines[i + 1].startswith('msgstr "'):
                        # Missing msgstr, add empty one
                        fixed_lines.append('msgstr ""')

                i += 1

            # Write fixed content back to file
            with open(resolved_path, "w", encoding="utf-8") as f:
                f.write("\n".join(fixed_lines))

            # Verify if the file is now valid
            try:
                po = polib.pofile(resolved_path)
                return {
                    "success": True,
                    "message": "PO file repaired successfully",
                    "backup_path": backup_path,
                }
            except Exception as e:
                # If still invalid, restore backup
                shutil.copy2(backup_path, resolved_path)
                return {
                    "success": False,
                    "error": f"Repair attempt failed: {str(e)}",
                    "message": "Original file restored from backup",
                }

        except UnicodeDecodeError:
            # Try with different encodings
            encodings = ["latin1", "cp1252", "iso-8859-1"]

            for encoding in encodings:
                try:
                    content_str = content.decode(encoding)

                    # Write as UTF-8
                    with open(resolved_path, "w", encoding="utf-8") as f:
                        f.write(content_str)

                    # Verify if valid
                    try:
                        po = polib.pofile(resolved_path)
                        return {
                            "success": True,
                            "message": f"PO file encoding converted from {encoding} to UTF-8",
                            "backup_path": backup_path,
                        }
                    except:
                        continue

                except:
                    continue

            # If we get here, all repair attempts failed
            shutil.copy2(backup_path, resolved_path)
            return {
                "success": False,
                "error": "Could not repair file - encoding issues detected",
                "message": "Original file restored from backup",
            }

    except Exception as e:
        return {"success": False, "error": str(e)}
