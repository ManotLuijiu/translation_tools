import frappe
from frappe import _
import os
import polib
from frappe.utils import get_bench_path


def get_site_apps_with_po_files():
    """Get list of site-specific installed apps that have PO files"""
    # Get only apps installed on the current site
    installed_apps = frappe.get_installed_apps()
    
    bench_path = get_bench_path()
    apps_path = os.path.join(bench_path, "apps")
    
    apps_with_po = []
    
    for app_name in installed_apps:
        app_path = os.path.join(apps_path, app_name)
        
        # Verify the app directory exists
        if not os.path.exists(app_path):
            frappe.log_error(f"App '{app_name}' is installed but directory not found: {app_path}")
            continue
            
        # Look for th.po files in the app
        po_files = []
        for root, dirs, files in os.walk(app_path):
            for file in files:
                if file == "th.po":
                    po_files.append(os.path.join(root, file))
        
        # Only include apps that have PO files
        if po_files:
            apps_with_po.append({
                "name": app_name,
                "path": app_path,
                "po_files": po_files
            })
    
    return apps_with_po


@frappe.whitelist()
def get_translation_stats(app=None):
    """Get translation statistics for site-specific installed apps or a specific app"""
    data = []
    site = frappe.local.site

    bench_path = get_bench_path()
    apps_path = os.path.join(bench_path, "apps")

    if app:
        # Check if the specific app is installed on this site
        installed_apps = frappe.get_installed_apps()
        if app not in installed_apps:
            frappe.throw(_("App '{0}' is not installed on site '{1}'. Available apps: {2}").format(
                app, site, ", ".join(installed_apps)
            ))
        apps_with_po = get_site_apps_with_po_files()
        apps_with_po = [a for a in apps_with_po if a["name"] == app]
    else:
        # Get all site-specific apps with PO files
        apps_with_po = get_site_apps_with_po_files()

    frappe.logger().info(f"Processing translation stats for site '{site}' - Apps with PO files: {[a['name'] for a in apps_with_po]}")

    for app_info in apps_with_po:
        app_dir = app_info["name"]
        po_files = app_info["po_files"]

        app_stats = {
            "app": app_dir,
            "total_strings": 0,
            "translated": 0,
            "untranslated": 0,
            "files": [],
            "installed_on_site": True,
            "site": site
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

    frappe.logger().info(f"Returning translation stats for {len(data)} apps on site '{site}'")

    # For backward compatibility, return just the data array by default
    # But also include metadata for debugging/monitoring
    result = data
    
    # Add metadata as a special property that won't break existing consumers
    if hasattr(result, '__dict__'):
        result.__dict__['_metadata'] = {
            "site": site,
            "total_apps": len(data),
            "apps_processed": [app["app"] for app in data]
        }
    
    return result


@frappe.whitelist()
def refresh_po_files():
    """Refresh and scan all PO files"""
    frappe.enqueue(
        "translation_tools.translation_tools.api.translation_status.get_translation_stats",
        queue="long",
        timeout=300,
    )
    return {"message": "PO files scan queued successfully"}
