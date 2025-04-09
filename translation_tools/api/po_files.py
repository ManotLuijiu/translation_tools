import os
import frappe
import polib
import logging
from glob import glob
from frappe import _
from datetime import datetime
from .common import get_bench_path, logger

@frappe.whitelist()
def get_cached_po_files():
    """Get a list of all PO files from the database"""
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
            "last_scanned"
        ],
        order_by="app_name, filename"
    )
    
    return po_files

@frappe.whitelist()
def scan_po_files():
    """Scan the filesystem for PO files and update the database"""
    try:
        # Get the bench path
        bench_path = get_bench_path()
        apps_path = os.path.join(bench_path, "apps")

        frappe.log_error(f"Bench path: {bench_path}")
        frappe.log_error(f"Apps path: {apps_path}")
        
        # Count for statistics
        total_files = 0
        new_files = 0
        updated_files = 0
        
        # Scan for all Thai PO files in apps
        pattern = os.path.join(apps_path, "*", "*", "locale", "th.po")
        frappe.log_error(f"Looking for files with pattern: {pattern}")

        # Try listing all the .po files to debug
        all_po_files = glob(os.path.join(apps_path, "**", "*.po"), recursive=True)
        frappe.log_error(f"All PO files found: {len(all_po_files)}")
        for po_file in all_po_files:
            frappe.log_error(f"Found PO file: {po_file}")

        # Continue with your original pattern
        matching_files = glob(pattern, recursive=True)
        frappe.log_error(f"Pattern matched {len(matching_files)} files")

        for file in matching_files:
            frappe.log_error(f"Pattern matched file: {file}")

        for file_path in glob(pattern, recursive=True):
            # Skip translation_tools/translations (to avoid self-translations)
            if "translation_tools/translations" in file_path:
                continue
            
            total_files += 1
            
            rel_path = os.path.relpath(file_path, apps_path)
            app_name = rel_path.split(os.path.sep)[0]
            filename = os.path.basename(file_path)
            
            # Get file stats
            last_modified = os.path.getmtime(file_path)

            # Format in MySQL-compatible datetime format (YYYY-MM-DD HH:MM:SS)
            last_modified_datetime = datetime.fromtimestamp(last_modified).strftime("%Y-%m-%d %H:%M:%S")
            
            # Parse PO file to get translation statistics
            try:
                po = polib.pofile(file_path)
                total = len(po)
                translated = len(po.translated_entries())
                translation_status = int((translated / total) * 100) if total > 0 else 0
                
                # Extract language from metadata or filename
                language = po.metadata.get("Language", "")
                
                # If language is not in metadata, try to determine from filename
                if not language and filename.endswith(".po"):
                    # Extract language from filename (e.g., "th.po" → "th")
                    language = filename.split(".")[-2]
                
                # If still no language, default to "th" since we're scanning Thai files
                if not language:
                    language = "th"

            except Exception as e:
                # Make error message shorter to avoid truncation
                err_msg = str(e)[:50] + "..." if len(str(e)) > 50 else str(e)
                logger.error(f"Error parsing PO file {file_path}: {err_msg}")
                total = 0
                translated = 0
                translation_status = 0
                language = "th"
            
            # Check if file already exists in database
            file_doc = None
            if frappe.db.exists("PO File", {"file_path": file_path}):
                file_doc = frappe.get_doc("PO File", {"file_path": file_path})
                updated_files += 1
            else:
                file_doc = frappe.new_doc("PO File")
                file_doc.file_path = file_path
                new_files += 1
            
            # Update file information
            file_doc.app_name = app_name
            file_doc.filename = filename
            file_doc.language = language
            file_doc.total_entries = total
            file_doc.translated_entries = translated
            file_doc.translation_status = translation_status
            file_doc.last_modified = last_modified_datetime
            file_doc.last_scanned = frappe.utils.now()

            # Print field values for debugging
            frappe.log_error(f"File: {file_path}, Language: {language}, App: {app_name}")
            
            try:
                file_doc.save()
            except Exception as save_error:
                frappe.log_error(f"Error saving PO File {file_path}: {save_error}")
                # Try to get more information about the error
                if hasattr(file_doc, 'as_dict'):
                    frappe.log_error(f"PO File fields: {file_doc.as_dict()}")
        
        frappe.db.commit()
        
        return {
            "success": True,
            "total_files": total_files,
            "new_files": new_files,
            "updated_files": updated_files
        }
        
    except Exception as e:
        # Make error message shorter to avoid truncation in error log
        short_error = str(e)[:100] + "..." if len(str(e)) > 100 else str(e)
        frappe.log_error(f"Error scanning PO files: {short_error}")
        return {"success": False, "error": short_error}

@frappe.whitelist()
def get_po_file_entries(file_path):
    """Get entries from a PO file"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))
    
    try:
        po = polib.pofile(file_path)
        
        # Get file metadata
        metadata = {
            "language": po.metadata.get("Language", "Unknown"),
            "project": po.metadata.get("Project-Id-Version", "Unknown"),
            "last_updated": po.metadata.get("PO-Revision-Date", "Unknown")
        }
        
        # Process entries
        entries = []
        for i, entry in enumerate(po):
            entries.append({
                "id": str(i),  # Use index as ID
                "msgid": entry.msgid,
                "msgstr": entry.msgstr,
                "is_translated": bool(entry.msgstr),
                "comments": [c for c in entry.comment.split("\n") if c] if entry.comment else [],
                "context": entry.msgctxt
            })
        
        # Calculate statistics
        total = len(po)
        translated = len(po.translated_entries())
        
        return {
            "path": file_path,
            "metadata": metadata,
            "entries": entries,
            "stats": {
                "total": total,
                "translated": translated,
                "untranslated": total - translated,
                "percentage": int((translated / total) * 100) if total > 0 else 0
            }
        }
    except Exception as e:
        frappe.log_error(f"Error parsing PO file: {e}")
        frappe.throw(_("Error parsing PO file: {0}").format(str(e)))

@frappe.whitelist()
def get_po_file_contents(file_path, limit=100, offset=0):
    """Get contents of a PO file including metadata and statistics"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))
    
    try:
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
        entries = []
        start_idx = int(offset)
        end_idx = start_idx + int(limit)
        has_more = total > end_idx
        
        for i, entry in enumerate(po):
            if i < start_idx:
                continue
            if i >= end_idx:
                break
                
            entries.append({
                "msgid": entry.msgid,
                "msgstr": entry.msgstr,
                "is_translated": bool(entry.msgstr),
                "is_fuzzy": "fuzzy" in entry.flags,
                "entry_type": "fuzzy" if "fuzzy" in entry.flags else "translated" if entry.msgstr else "untranslated"
            })
        
        return {
            "metadata": metadata,
            "statistics": {
                "total": total,
                "translated": translated,
                "untranslated": untranslated,
                "fuzzy": fuzzy,
                "percent_translated": int((translated / total) * 100) if total > 0 else 0
            },
            "entries": entries,
            "has_more": has_more
        }
    except Exception as e:
        frappe.log_error(f"Error processing PO file: {e}")
        frappe.throw(_("Error processing PO file: {0}").format(str(e)))

@frappe.whitelist()
def save_translation(file_path, entry_id, translation):
    """Save a translation to a PO file and update database stats"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))
    
    try:
        # Load the PO file
        po = polib.pofile(file_path)
        
        # Find the entry by ID (index)
        index = int(entry_id)
        if index < 0 or index >= len(po):
            frappe.throw(_("Invalid entry ID"))
        
        entry = po[index]
        
        # Check if this is a new translation (i.e., previously untranslated)
        was_untranslated = not entry.msgstr
        
        # Update the translation
        entry.msgstr = translation
        
        # Update metadata
        po.metadata["PO-Revision-Date"] = datetime.now().strftime("%Y-%m-%d %H:%M%z")
        
        # Save the file
        po.save(file_path)
        
        # Update database stats if this is a new translation
        if was_untranslated and translation:
            if frappe.db.exists("PO File", {"file_path": file_path}):
                file_doc = frappe.get_doc("PO File", {"file_path": file_path})
                file_doc.translated_entries += 1
                file_doc.translation_status = int((file_doc.translated_entries / file_doc.total_entries) * 100) if file_doc.total_entries > 0 else 0
                file_doc.last_modified = frappe.utils.now()
                file_doc.save()
        
        return {"success": True}
    except Exception as e:
        frappe.log_error(f"Error saving translation: {e}")
        frappe.throw(_("Error saving translation: {0}").format(str(e)))

@frappe.whitelist()
def save_translations(file_path, translations):
    """Save translations back to the PO file"""
    try:
        logger.info(f"Saving translations to {file_path}")

        # Check if file exists and is a PO file
        if not os.path.exists(file_path) or not file_path.endswith(".po"):
            return {"error": "Invalid PO file path"}

        # Load the PO file
        po = polib.pofile(file_path)

        # Update entries
        updated_count = 0
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
        return {"error": str(e)}