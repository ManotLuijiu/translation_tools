import frappe
from frappe import _
from frappe.utils import get_url

@frappe.whitelist()
def check_translation_tools_link():
    """Check if the Translation Tools link exists in integrations"""
    try:
        # Query for the existence of the Translation Tools link in integrations workspace
        link_exists = frappe.db.exists("Integration", {"module": "Translation Tools"})
        return {"link_exists": bool(link_exists)}
    except Exception as e:
        frappe.log_error(f"Error checking Translation Tools link: {str(e)}")
        return {"error": str(e)}


def add_translation_tools_link_to_integrations():
    import logging
    logger = logging.getLogger("translation_tools_setup")

    logger.info("Adding Translation Tools link to Integrations...")

    """Dynamically add Translation Tools link under 'Thai Business Suite' section in Integrations workspace"""
    integrations_workspace = frappe.get_doc("Workspace", "Integrations")

    base_url = get_url()  # Dynamically fetch current site base URL
    new_url = f"{base_url}/thai_translation_dashboard"

    existing_links = [l.link_to for l in integrations_workspace.links or []]

    if new_link not in existing_links:
        integrations_workspace.append("links", {
            "label": "Translation Tools",
            "type": "Link",
            "link_to": "new_url",  # Or your desired DocType/Page
            "icon": "octicon:globe",
            "dependencies": "",
            "onboard": 0,
            "group_name": "Thai Business Suite",  # 👈 Group (section) name
            "highlight": 0
        })
        integrations_workspace.save()
        frappe.db.commit()
        print("✅ Translation Tools link added to Integrations workspace.")
    else:
        print("ℹ️ Link already exists in Integrations workspace.")


def create_translation_workspace():
    """Create a workspace for the Thai Translation Dashboard"""
    if frappe.db.exists("Workspace", "Thai Translation"):
        return
    
    workspace = frappe.new_doc("Workspace")
    workspace.name = "Thai Translation"
    workspace.label = "Thai Translation"
    workspace.icon = "translate"
    workspace.category = "Modules"
    workspace.is_hidden = 0
    workspace.module = "Translation Tools"
    workspace.charts = []
    workspace.shortcuts = [
        {
            "icon": "translate",
            "label": _("Translation Dashboard"),
            "type": "URL",
            "url": "/thai_translation_dashboard",
            "description": _("AI-powered Translation Dashboard"),
        }
    ]
    workspace.links = [
        {
            "label": _("Translation Management"),
            "items": [
                {
                    "label": _("PO File"),
                    "type": "DocType",
                    "name": "PO File",
                    "description": _("PO Translation Files")
                },
                {
                    "label": _("Translation Glossary Term"),
                    "type": "DocType",
                    "name": "Translation Glossary Term",
                    "description": _("Thai Translation Glossary")
                }
            ]
        },
    ]
    
    workspace.insert(ignore_permissions=True)
    frappe.db.commit()
    
    print("Created Thai Translation workspace")