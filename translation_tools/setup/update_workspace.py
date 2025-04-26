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
