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


def create_thai_business_workspace():
    """Create the Thai Business Suite workspace if it doesn't exist"""
    # Check again to prevent race conditions
    if frappe.db.exists("Workspace", "Thai Business Suite"):
        workspace = frappe.get_doc("Workspace", "Thai Business Suite")
        logger.info("Using existing Thai Business Suite workspace")
    else:
        workspace = frappe.new_doc("Workspace")
        workspace.name = "Thai Business Suite"
        workspace.set("label", "Thai Business Suite")
        workspace.set("module", "Translation Tools")  # Or another appropriate module
        workspace.set("public", 1)
        workspace.set("is_standard", 0)
        workspace.set("icon", "🇹🇭")  # Thai flag emoji
        workspace.set(
            "content", json.dumps([{"type": "header", "label": "Thai Business Suite"}])
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
    except Exception as e:
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
                        "name": "Translation Tools Settings",
                        "label": "Translation Tools Settings",
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

        # Get the existing Integrations workspace
        integrations_ws = frappe.get_doc("Workspace", "Integrations")

        # First, check if our card already exists
        thai_card_exists = False
        for link in integrations_ws.links:  # type: ignore
            if link.label == "Thai Business Suite" and link.type == "Card Break":
                thai_card_exists = True
                break

        if not thai_card_exists:
            # Add card break for Thai Business Suite
            integrations_ws.append(
                "links",
                {
                    "label": "Thai Business Suite",
                    "type": "Card Break",
                    "link_count": 0,
                    "onboard": 0,
                },
            )

            # Add link to Translation Tools Settings
            integrations_ws.append(
                "links",
                {
                    "label": "Translation Tools Settings",
                    "link_to": "Translation Tools Settings",
                    "link_type": "DocType",
                    "type": "Link",
                    "onboard": 0,
                },
            )

            # Add link to AI Translator page
            integrations_ws.append(
                "links",
                {
                    "label": "AI Translator",
                    "link_to": "thai_translator",
                    "link_type": "Page",
                    "type": "Link",
                    "onboard": 0,
                },
            )

            # Now update the content JSON to include our card
            import json

            # content = []
            # if integrations_ws.content:
            #     content = json.loads(integrations_ws.content)

            try:
                content = (
                    json.loads(getattr(integrations_ws, "content", "[]"))
                    if getattr(integrations_ws, "content", None)
                    else []
                )
            except Exception as e:
                logger.error(f"Error parsing Integrations workspace content: {str(e)}")
                content = []

            # Check if our card already exists in the content
            thai_card_exists_in_content = False
            for item in content:
                if item.get("id") == "thai_trans_card":
                    thai_card_exists_in_content = True
                    break

            if not thai_card_exists_in_content:
                # Add our card to the content
                content.append(
                    {
                        "id": "thai_trans_card",
                        "type": "card",
                        "data": {"card_name": "Thai Business Suite", "col": 4},
                    }
                )

                # Update the content field
                integrations_ws.content = json.dumps(content)  # type: ignore

            # Save the changes
            integrations_ws.save(ignore_permissions=True)
            frappe.db.commit()
            logger.info(
                "Successfully added Thai Business Suite card to Integrations workspace"
            )
        else:
            logger.info(
                "Thai Business Suite card already exists in Integrations workspace"
            )

    except Exception as e:
        logger.error(f"Failed to add to Integrations workspace: {e}")
        # Don't re-raise the exception - better to continue with installation
        # even if this particular step fails
