import frappe


def update_icons():
    # Dictionary mapping workspace names to their icons
    workspace_icons = {
        "Translation Tools": "tool",
        "Thai Business Suite": "organization",
        "ZKTeco Attendance": "users",
        # Add more as needed
    }

    for workspace, icon in workspace_icons.items():
        if frappe.db.exists("Workspace", workspace):
            frappe.db.set_value("Workspace", workspace, "icon", icon)

    frappe.db.commit()


def rebuild_workspace():
    """Delete, rebuild workspaces from JSON, and update icons"""
    import frappe
    import os

    # Dictionary mapping workspace names to their icons
    workspace_icons = {
        "Translation Tools": "tool",
        "Thai Business Suite": "organization",
        "ZKTeco Attendance": "users",
        # Add more as needed
    }

    # Part 1: Rebuild Translation Tools workspace
    if frappe.db.exists("Workspace", "Translation Tools"):
        # Delete the existing workspace
        frappe.delete_doc(
            "Workspace", "Translation Tools", force=True, ignore_permissions=True
        )
        frappe.db.commit()

        print("Deleted workspace success")
        frappe.logger().info("Deleted Translation Tools workspace")

    # Import workspace using a more reliable method
    from frappe.modules import get_module_path, import_file

    # Get the full path to your workspace JSON file
    app_name = "translation_tools"  # Replace with your actual app name
    module_name = "translation_tools"  # Replace with your actual module name

    module_path = get_module_path(module_name)
    workspace_path = os.path.join(
        module_path, "workspace", "translation_tools", "translation_tools.json"
    )

    # Check if file exists before attempting import
    if os.path.exists(workspace_path):
        # Use frappe's import_json to import the workspace
        from frappe.modules.import_file import import_file_by_path

        import_file_by_path(workspace_path, force=True)
        frappe.db.commit()

        print("Rebuild Workspace succeed")

        frappe.logger().info(
            f"Rebuilt Translation Tools workspace from {workspace_path}"
        )
    else:
        frappe.logger().error(f"Workspace file not found at {workspace_path}")

    # Part 2: Update icons for all workspaces
    for workspace, icon in workspace_icons.items():
        if frappe.db.exists("Workspace", workspace):
            frappe.db.set_value("Workspace", workspace, "icon", icon)
            frappe.logger().info(f"Updated {workspace} icon to {icon}")

    frappe.db.commit()
    frappe.logger().info("All workspace icons updated")


# Understanding the Migration Process
# Frappe follows a specific order during migrations:

# Frappe runs schema migrations
# It creates doctypes from JSON files
# It imports fixtures
# Finally, it runs your after_migrate functions in the order you specify
