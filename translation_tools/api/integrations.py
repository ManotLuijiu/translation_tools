import frappe
from frappe import _
from frappe.utils import get_url


@frappe.whitelist()
def check_translation_tools_link():
    """Check if the Translation Tools link exists in integrations"""
    try:
        # Query for the existence of the Translation Tools link in Workspace Links
        workspace = frappe.get_doc("Workspace", "Integrations")
        for link in workspace.links:
            if link.label == "Translation Tools":
                return {"link_exists": True}

        return {"link_exists": False}
    except Exception as e:
        frappe.log_error(f"Error checking Translation Tools link: {str(e)}")
        return {"error": str(e), "link_exists": False}


@frappe.whitelist()
def add_translation_tools_link_to_integrations():
    """Dynamically add Translation Tools link under 'Thai Business Suite' section in Integrations workspace"""
    try:
        # Fetch the Integrations workspace document
        integrations_workspace = frappe.get_doc("Workspace", "Integrations")

        # Dynamically fetch current site base URL
        base_url = get_url()
        # For SPA, we don't use the /app/ prefix
        new_url = f"{base_url}/thai_translation_dashboard"

        # Check if the Thai Business Suite group exists
        group_exists = False
        for link in integrations_workspace.links:
            if getattr(link, "group_name", "") == "Thai Business Suite":
                group_exists = True
                break

        # Add the group if it doesn't exist
        if not group_exists:
            integrations_workspace.append(
                "links",
                {
                    "label": "Thai Business Suite",
                    "type": "Group",
                    "link_to": "",
                    "icon": "fa-solid fa-briefcase",
                    "dependencies": "",
                    "onboard": 0,
                    "group_name": "Thai Business Suite",
                    "hidden": 0,
                },
            )

        # Check if the link already exists
        link_exists = False
        for link in integrations_workspace.links:
            if link.label == "Translation Tools":
                link_exists = True
                break

        if not link_exists:
            # Add the new Translation Tools link to the Integrations workspace
            integrations_workspace.append(
                "links",
                {
                    "label": "Translation Tools",
                    "type": "Link",
                    "link_to": new_url,
                    "icon": "octicon:globe",
                    "dependencies": "",
                    "onboard": 0,
                    "group_name": "Thai Business Suite",
                    "hidden": 0,
                },
            )

            # Save the changes to the workspace
            integrations_workspace.save()
            frappe.db.commit()

            return {"success": True, "message": "Translation Tools link added"}
        else:
            return {"success": True, "message": "Link already exists"}

    except Exception as e:
        frappe.log_error(f"Error adding Translation Tools link: {str(e)}")
        frappe.db.rollback()
        return {"success": False, "error": str(e)}
