"""
Migrate from create_pull_requests checkbox to github_push_mode select field.

This patch:
1. Removes the old create_pull_requests field if it exists
2. Sets default value for the new github_push_mode field
"""

import frappe


def execute():
    """Migrate GitHub push settings from checkbox to select field."""
    try:
        # Check if Translation Tools Settings exists
        if not frappe.db.exists("DocType", "Translation Tools Settings"):
            return

        # Get the settings document
        settings = frappe.get_single("Translation Tools Settings")

        # Check if old field exists and migrate its value
        old_value = None
        if hasattr(settings, "create_pull_requests"):
            old_value = settings.create_pull_requests

        # Set the new field based on old value
        # If create_pull_requests was enabled, set to "Always Create PR"
        # Otherwise, use the default "Auto" mode
        if old_value:
            new_value = "Always Create PR"
        else:
            new_value = "Auto (Dev=Direct, Prod=PR)"

        # Update the settings if github_push_mode field exists
        if hasattr(settings, "github_push_mode"):
            settings.github_push_mode = new_value
            settings.save(ignore_permissions=True)
            frappe.db.commit()

        frappe.logger().info(
            f"Migrated GitHub push mode: old={old_value}, new={new_value}"
        )

    except Exception as e:
        frappe.log_error(f"Error migrating GitHub push mode: {e}")
        # Don't raise - allow migration to continue
