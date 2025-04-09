import frappe
from frappe import _


@frappe.whitelist()
def check_translation_tools_link():
    """Check if the Translation Tools link exists in integrations"""
    try:
        exists = frappe.db.exists(
            "Workspace Link", {"parent": "Integrations", "label": "Translation Tools"}
        )
        return {"link_exists": bool(exists)}
    except Exception as e:
        frappe.log_error(str(e), "Translation Tools Check")
        return {"error": str(e), "link_exists": False}


@frappe.whitelist()
def add_translation_tools_link_to_integrations():
    """Add Translation Tools link to Integrations workspace"""
    try:
        # First, check if the link already exists
        if frappe.db.exists(
            "Workspace Link", {"parent": "Integrations", "label": "Translation Tools"}
        ):
            return {"success": True, "message": "Link already exists"}

        # Get the next available idx
        max_idx = (
            frappe.db.sql(
                """
            SELECT MAX(idx) FROM `tabWorkspace Link` WHERE parent='Integrations'
        """
            )[0][0]
            or 0
        )

        # Create a new Workspace Link directly
        new_link = frappe.new_doc("Workspace Link")
        new_link.parent = "Integrations"
        new_link.parentfield = "links"
        new_link.parenttype = "Workspace"
        new_link.idx = max_idx + 1
        new_link.label = "Translation Tools"
        new_link.type = "Link"
        new_link.link_to = "/app/thai-translation-dashboard"
        new_link.icon = "🇹🇭"

        # Save with ignoring permissions
        new_link.insert(ignore_permissions=True)
        frappe.db.commit()

        return {"success": True, "message": "Translation Tools link added"}

    except Exception as e:
        frappe.log_error(str(e), "Translation Tools Add")
        frappe.db.rollback()
        return {"success": False, "error": str(e)}
