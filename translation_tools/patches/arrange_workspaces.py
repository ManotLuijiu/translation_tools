import frappe


def execute():
    """Arrange workspaces based on installed apps"""
    try:
        # Check if Thai Business Suite is installed
        has_thai_business = "thai_business_suite" in frappe.get_installed_apps()

        if frappe.db.exists("Workspace", "Translation Tools"):
            # Define the values to update
            values = {
                "chart_name": "Translation Status"  # Set this to a non-empty value
            }

            # Set parent_page and sequence_id based on Thai Business Suite presence
            if has_thai_business and frappe.db.exists(
                "Workspace", "Thai Business Suite"
            ):
                values["parent_page"] = "Thai Business Suite"
                values["sequence_id"] = 9
            else:
                values["parent_page"] = ""
                values["sequence_id"] = 99

            # Update the workspace directly
            frappe.db.set_value("Workspace", "Translation Tools", values)
            frappe.db.commit()

    except Exception as e:
        frappe.log_error(f"Failed to arrange Translation Tools workspace: {e}")
