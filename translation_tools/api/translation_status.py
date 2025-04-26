import frappe
from frappe import _
import os
import polib
from frappe.utils import get_bench_path


@frappe.whitelist()
def get_translation_stats(app=None):
    """Get translation statistics for all apps or a specific app"""
    data = []

    bench_path = get_bench_path()
    apps_path = os.path.join(bench_path, "apps")

    app_dirs = [app] if app else os.listdir(apps_path)

    for app_dir in app_dirs:
        app_path = os.path.join(apps_path, app_dir)
        if not os.path.isdir(app_path):
            continue

        # Look for th.po files in the app
        po_files = []
        for root, dirs, files in os.walk(app_path):
            for file in files:
                if file == "th.po":
                    po_files.append(os.path.join(root, file))

        # If no th.po files found, skip to next app
        if not po_files:
            continue

        app_stats = {
            "app": app_dir,
            "total_strings": 0,
            "translated": 0,
            "untranslated": 0,
            "files": [],
        }

        for po_file in po_files:
            try:
                rel_path = os.path.relpath(po_file, apps_path)
                po = polib.pofile(po_file)

                total_strings = len(po)
                translated = len(po.translated_entries())
                untranslated = len(po.untranslated_entries())
                percentage = (
                    (translated / total_strings * 100) if total_strings > 0 else 0
                )

                # Get last updated date from PO file header
                last_updated = None
                for key, value in po.metadata.items():
                    if key == "PO-Revision-Date":
                        try:
                            # Extract the date part from the PO-Revision-Date
                            last_updated = value.split()[0]
                        except:
                            pass

                file_stats = {
                    "file_path": rel_path,
                    "total_strings": total_strings,
                    "translated": translated,
                    "untranslated": untranslated,
                    "percentage": percentage,
                    "last_updated": last_updated,
                }

                app_stats["total_strings"] += total_strings
                app_stats["translated"] += translated
                app_stats["untranslated"] += untranslated
                app_stats["files"].append(file_stats)

            except Exception as e:
                frappe.log_error(f"Error processing PO file {po_file}: {str(e)}")
                continue

        if app_stats["total_strings"] > 0:
            app_stats["percentage"] = (
                app_stats["translated"] / app_stats["total_strings"]
            ) * 100
            data.append(app_stats)

    # Sort by app name
    data.sort(key=lambda x: x["app"])

    return data


@frappe.whitelist()
def refresh_po_files():
    """Refresh and scan all PO files"""
    frappe.enqueue(
        "translation_tools.translation_tools.api.translation_status.get_translation_stats",
        queue="long",
        timeout=300,
    )
    return {"message": "PO files scan queued successfully"}
