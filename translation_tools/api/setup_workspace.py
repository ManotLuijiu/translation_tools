import frappe
from frappe import _
import json
import logging
from frappe.utils import cstr

# Setup logging
logger = logging.getLogger(__name__)


@frappe.whitelist()
def setup_workspace_and_links():
    """
    Set up the workspace structure for Translation Tools:
    1. If thai_business_suite is installed, add translation tools as a link in its workspace
    2. If not, create a Thai Business Suite workspace and add translation tools there
    """
    try:
        # Check if thai_business_suite is installed
        thai_business_installed = "thai_business_suite" in frappe.get_installed_apps()
        logger.info(f"Thai Business Suite installed: {thai_business_installed}")

        # Check if page exists (just for logging purposes)
        if frappe.db.exists("Page", "thai_translator"):
            logger.info("Thai Translator page found")
        else:
            logger.warning(
                "Thai Translator page not found - it should have been created during app installation"
            )

        # Check if Thai Business Suite workspace exists
        workspace_exists = frappe.db.exists("Workspace", "Thai Business Suite")

        if workspace_exists:
            # Workspace exists, just add our link to it
            logger.info("Thai Business Suite workspace exists, adding link...")
            workspace = frappe.get_doc("Workspace", "Thai Business Suite")
            add_translation_link_to_workspace(workspace)
        else:
            # Need to create the workspace
            logger.info("Thai Business Suite workspace not found, creating...")
            create_thai_business_workspace()

        frappe.db.commit()
        logger.info("Workspace setup completed successfully")
        return {
            "success": True,
            "message": "Workspace setup completed successfully",
            "thai_business_installed": thai_business_installed,
        }

    except Exception as e:
        logger.error(f"Error during workspace setup: {str(e)}")
        frappe.log_error(
            frappe.get_traceback(), "Translation Tools Workspace Setup Error"
        )
        return {"success": False, "error": str(e)}


# def create_translator_page():
#     """Create the Thai Translator page if it doesn't exist"""
#     page = frappe.new_doc("Page")
#     page.page_name = "thai_translator"
#     page.title = "Thai Translator"
#     page.module = "Translation Tools"
#     page.standard = "Yes"
#     page.insert(ignore_permissions=True)
#     return page


def create_thai_business_workspace():
    """Create the Thai Business Suite workspace if it doesn't exist"""
    # Check again to prevent race conditions
    if frappe.db.exists("Workspace", "Thai Business Suite"):
        workspace = frappe.get_doc("Workspace", "Thai Business Suite")
        logger.info("Using existing Thai Business Suite workspace")
    else:
        workspace = frappe.new_doc("Workspace")
        workspace.name = "Thai Business Suite"
        workspace.label = "Thai Business Suite"
        workspace.module = "Translation Tools"  # Or another appropriate module
        workspace.public = 1
        workspace.is_standard = 0
        workspace.icon = "🇹🇭"  # Thai flag emoji
        workspace.content = json.dumps(
            [{"type": "header", "label": "Thai Business Suite"}]
        )
        workspace.save(ignore_permissions=True)
        logger.info(f"Created Thai Business Suite workspace: {workspace.name}")

    # Now add our link
    add_translation_link_to_workspace(workspace)
    return workspace


def add_translation_link_to_workspace(workspace):
    """Add Translation Tools link to the specified workspace"""
    # Parse current content
    try:
        content = json.loads(workspace.content) if workspace.content else []
    except:
        logger.error(f"Error parsing workspace content: {str(e)}")
        content = []

    # Check if Translation Tools card exists
    translation_card_exists = False
    for item in content:
        if item.get("type") == "card" and item.get("label") == "Translation Tools":
            translation_card_exists = True

            # Check if link already exists in this card
            link_exists = False
            for link in item.get("links", []):
                if link.get("name") == "thai_translator":
                    link_exists = True
                    break

            # Add link if not exists
            if not link_exists:
                item["links"].append(
                    {
                        "type": "Page",
                        "name": "thai_translator",
                        "label": "Thai Translator",
                        "description": "AI-powered translation tool for Thai language",
                    }
                )
                logger.info(
                    "Added Thai Translator link to existing Translation Tools card"
                )
            else:
                logger.info(
                    "Thai Translator link already exists in Translation Tools card"
                )
            break

    # If card doesn't exist, add it with the link
    if not translation_card_exists:
        content.append(
            {
                "type": "card",
                "label": "Translation Tools",
                "links": [
                    {
                        "type": "Page",
                        "name": "thai_translator",
                        "label": "Thai Translator",
                        "description": "AI-powered translation tool for Thai language",
                    },
                    {
                        "type": "DocType",
                        "name": "Translation Settings",
                        "label": "Translation Settings",
                        "description": "Configure translation API settings",
                    },
                    {
                        "type": "DocType",
                        "name": "Translation Glossary Term",
                        "label": "Glossary",
                        "description": "Manage translation glossary terms",
                    },
                    {
                        "type": "DocType",
                        "name": "PO File",
                        "label": "PO Files",
                        "description": "Manage PO files for translation",
                    },
                ],
            }
        )

        logger.info("Added new Translation Tools card with links")

    # Update workspace content
    workspace.content = json.dumps(content)
    workspace.save(ignore_permissions=True)
    logger.info(f"Updated workspace {workspace.name} with Translation Tools links")


def add_to_integrations_workspace():
    """Add a shortcut/link to the Integrations workspace"""
    logger = logging.getLogger("translation_tools_install")
    logger.info("Adding shortcut to Integrations workspace")

    try:
        # Ensure the workspace exists
        if not frappe.db.exists("Workspace", "Integrations"):
            logger.warning("Integrations workspace not found")
            return

        # Create the link (shortcut) as a child of the workspace
        integrations_ws = frappe.get_doc("Workspace", "Integrations")

        # Avoid adding it multiple times
        existing_links = [l.link_to for l in integrations_ws.links or []]
        if "Translation Settings" in existing_links:
            logger.info(
                "Link to Translation Settings already exists in Integrations workspace"
            )
            return

        integrations_ws.append(
            "links",
            {
                "type": "DocType",
                "link_to": "Translation Settings",
                "label": "Translation Tools Settings",
                "icon": "octicon octicon-globe",  # customize as needed
                "dependencies": "",
            },
        )

        integrations_ws.save(ignore_permissions=True)
        frappe.db.commit()
        logger.info(
            "Successfully added Translation Tools link to Integrations workspace"
        )

    except Exception as e:
        logger.error(f"Failed to add link to Integrations workspace: {e}")
        raise


# In [1]: import frappe
#    ...:
#    ...: doctypes = frappe.get_all("DocType", filters={"module": "Translation Tools"})
#    ...: print("DocTypes in Translation Tools module:")
#    ...: for dt in doctypes:
#    ...:     print(f"- {dt.name}")
#    ...:
# DocTypes in Translation Tools module:
# - PO File
# - Translation Settings
# - Translation Glossary Term
# - ERPNext Module
