"""
Fix incorrect app_sync_settings in GitHub Sync Settings.

Issues fixed:
1. m_capital has wrong source_path (cloud_file_manager/th.po instead of m_capital/th.po)
2. crm and tbs_external_storage are missing source_path and target_path
"""

import frappe
import json


def execute():
    """Fix app_sync_settings with incorrect or missing paths."""
    try:
        if not frappe.db.exists("DocType", "GitHub Sync Settings"):
            return

        settings = frappe.get_single("GitHub Sync Settings")

        if not hasattr(settings, "app_sync_settings") or not settings.app_sync_settings:
            frappe.logger().info("No app_sync_settings to fix")
            return

        app_settings = json.loads(settings.app_sync_settings)
        modified = False

        # Fix m_capital - wrong source_path
        if "m_capital" in app_settings:
            if app_settings["m_capital"].get("source_path") == "cloud_file_manager/th.po":
                app_settings["m_capital"]["source_path"] = "m_capital/th.po"
                frappe.logger().info("Fixed m_capital source_path")
                modified = True

        # Fix apps missing source_path and target_path
        apps_to_fix = {
            "crm": {
                "locale": "th",
                "source_path": "crm/th.po",
                "target_path": "apps/crm/crm/locale/th.po",
            },
            "tbs_external_storage": {
                "locale": "th",
                "source_path": "tbs_external_storage/th.po",
                "target_path": "apps/tbs_external_storage/tbs_external_storage/locale/th.po",
            },
        }

        for app_name, fix_data in apps_to_fix.items():
            if app_name in app_settings:
                current = app_settings[app_name]
                # Check if missing required fields
                if not current.get("source_path") or not current.get("target_path"):
                    app_settings[app_name].update(fix_data)
                    frappe.logger().info(f"Fixed {app_name} paths")
                    modified = True

        if modified:
            settings.app_sync_settings = json.dumps(app_settings)
            settings.save(ignore_permissions=True)
            frappe.db.commit()
            frappe.logger().info("Successfully fixed app_sync_settings")
        else:
            frappe.logger().info("No fixes needed for app_sync_settings")

    except Exception as e:
        frappe.log_error(f"Error fixing app_sync_settings: {e}")


@frappe.whitelist()
def fix_app_sync_settings():
    """Whitelist function to manually trigger the fix."""
    execute()
    return {"success": True, "message": "App sync settings fixed"}
