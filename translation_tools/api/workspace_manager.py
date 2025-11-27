import frappe
from frappe import _
import json
import logging

logger = logging.getLogger(__name__)


class WorkspaceManager:
    """
    Centralized workspace management for cross-app integration.
    Handles creation and updates of workspaces, especially the Integrations workspace.
    """

    @staticmethod
    def ensure_integrations_workspace():
        """Ensure Integrations workspace exists with proper structure"""
        workspace_name = "Integrations"

        try:
            if not frappe.db.exists("Workspace", workspace_name):
                logger.info("Creating new Integrations workspace")
                workspace = frappe.new_doc("Workspace")
                workspace.name = workspace_name
                workspace.title = workspace_name
                workspace.module = "Integrations"
                workspace.public = 1
                workspace.sequence_id = 20.0
                workspace.icon = "integration"
                workspace.content = WorkspaceManager.get_default_integrations_content()
            else:
                logger.info("Using existing Integrations workspace")
                workspace = frappe.get_doc("Workspace", workspace_name)

            workspace.save(ignore_permissions=True)
            frappe.db.commit()
            return workspace

        except Exception as e:
            logger.error(f"Error ensuring Integrations workspace: {str(e)}")
            frappe.db.rollback()
            raise

    @staticmethod
    def get_default_integrations_content():
        """Get default content structure for Integrations workspace"""
        return json.dumps(
            [
                {
                    "id": "header",
                    "type": "header",
                    "data": {
                        "text": '<span class="h4"><b>Reports & Masters</b></span>',
                        "col": 12,
                    },
                },
                {
                    "id": "backup",
                    "type": "card",
                    "data": {"card_name": "Backup", "col": 4},
                },
                {
                    "id": "google",
                    "type": "card",
                    "data": {"card_name": "Google Services", "col": 4},
                },
                {
                    "id": "auth",
                    "type": "card",
                    "data": {"card_name": "Authentication", "col": 4},
                },
                {
                    "id": "settings",
                    "type": "card",
                    "data": {"card_name": "Settings", "col": 4},
                },
                {
                    "id": "push",
                    "type": "card",
                    "data": {"card_name": "Push Notifications", "col": 4},
                },
            ]
        )

    @staticmethod
    def add_app_to_integrations(workspace, app_name, app_links, card_name=None):
        """Add app links to Integrations workspace under specified card"""
        try:
            # Ensure workspace is loaded with links
            if not hasattr(workspace, "links") or not workspace.links:
                workspace.links = []

            card_name = card_name or app_name

            # Check if card exists
            card_exists = False
            for link in workspace.links:
                if link.label == card_name and link.type == "Card Break":
                    card_exists = True
                    break

            # Add card if it doesn't exist
            if not card_exists:
                workspace.append(
                    "links",
                    {
                        "label": card_name,
                        "type": "Card Break",
                        "hidden": 0,
                        "is_query_report": 0,
                        "link_count": len(app_links),
                        "onboard": 0,
                    },
                )
                logger.info(f"Added card '{card_name}' to Integrations workspace")

            # Add app links
            for link_data in app_links:
                link_exists = False
                for existing_link in workspace.links:
                    if existing_link.label == link_data.get(
                        "label"
                    ) and existing_link.link_to == link_data.get("link_to"):
                        link_exists = True
                        break

                if not link_exists:
                    workspace.append(
                        "links",
                        {
                            "label": link_data.get("label"),
                            "link_to": link_data.get("link_to"),
                            "link_type": link_data.get("link_type", "DocType"),
                            "type": "Link",
                            "hidden": 0,
                            "is_query_report": 0,
                            "onboard": 0,
                        },
                    )
                    logger.info(
                        f"Added link '{link_data.get('label')}' to card '{card_name}'"
                    )

            workspace.save(ignore_permissions=True)
            frappe.db.commit()
            return True

        except Exception as e:
            logger.error(f"Error adding app {app_name} to Integrations: {str(e)}")
            frappe.db.rollback()
            return False

    @staticmethod
    def create_app_workspace(app_name, workspace_config):
        """Create app-specific workspace"""
        try:
            workspace_name = workspace_config.get("name", app_name)

            if not frappe.db.exists("Workspace", workspace_name):
                logger.info(f"Creating new workspace: {workspace_name}")
                workspace = frappe.new_doc("Workspace")
                workspace.name = workspace_name
                workspace.title = workspace_config.get("title", workspace_name)
                workspace.module = workspace_config.get("module", app_name)
                workspace.public = workspace_config.get("public", 1)
                workspace.sequence_id = workspace_config.get("sequence_id", 1.0)
                workspace.icon = workspace_config.get("icon", "folder")

                content = workspace_config.get("content", [])
                if content:
                    workspace.content = (
                        json.dumps(content) if isinstance(content, list) else content
                    )
            else:
                logger.info(f"Updating existing workspace: {workspace_name}")
                workspace = frappe.get_doc("Workspace", workspace_name)

            # Add links if provided
            links = workspace_config.get("links", [])
            if links:
                workspace.links = []
                for link_data in links:
                    workspace.append("links", link_data)

            workspace.save(ignore_permissions=True)
            frappe.db.commit()
            logger.info(f"✅ Workspace '{workspace_name}' created/updated successfully")
            return workspace

        except Exception as e:
            logger.error(f"Error creating workspace {workspace_name}: {str(e)}")
            frappe.db.rollback()
            raise

    @staticmethod
    def setup_translation_tools_links():
        """Setup Translation Tools links in Integrations workspace"""
        try:
            integrations_ws = WorkspaceManager.ensure_integrations_workspace()

            translation_tools_links = [
                {
                    "label": "Translation Tools",
                    "link_to": "thai_translator",
                    "link_type": "Page",
                },
                {
                    "label": "Translation Tools Settings",
                    "link_to": "Translation Tools Settings",
                    "link_type": "DocType",
                },
            ]

            success = WorkspaceManager.add_app_to_integrations(
                integrations_ws,
                "translation_tools",
                translation_tools_links,
                "Thai Business Suite",
            )

            if success:
                logger.info(
                    "✅ Translation Tools links added to Integrations workspace"
                )
                return {"success": True, "message": "Translation Tools links added"}
            else:
                return {
                    "success": False,
                    "message": "Failed to add Translation Tools links",
                }

        except Exception as e:
            logger.error(f"Error setting up Translation Tools links: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def setup_thai_business_suite_links():
        """Setup Thai Business Suite links in Integrations workspace"""
        try:
            integrations_ws = WorkspaceManager.ensure_integrations_workspace()

            thai_business_links = [
                {
                    "label": "Translation Tools",
                    "link_to": "thai_translator",
                    "link_type": "Page",
                },
                {
                    "label": "Translation Tools Settings",
                    "link_to": "Translation Tools Settings",
                    "link_type": "DocType",
                },
                {
                    "label": "Company Retention Settings",
                    "link_to": "Company Retention Settings",
                    "link_type": "DocType",
                },
                {
                    "label": "Thai Overtime Settings",
                    "link_to": "Thai Overtime Settings",
                    "link_type": "DocType",
                },
                {
                    "label": "TBS Print Agent Config",
                    "link_to": "TBS Print Agent Config",
                    "link_type": "DocType",
                },
                {
                    "label": "TBS Print Agent",
                    "link_to": "TBS Print Agent",
                    "link_type": "DocType",
                },
                {
                    "label": "TBS Print Job Queue",
                    "link_to": "TBS Print Job Queue",
                    "link_type": "DocType",
                },
                {
                    "label": "TBS Print Template",
                    "link_to": "TBS Print Template",
                    "link_type": "DocType",
                },
                {
                    "label": "TBS Settings",
                    "link_to": "tbs-settings",
                    "link_type": "Page",
                },
            ]

            success = WorkspaceManager.add_app_to_integrations(
                integrations_ws,
                "thai_business_suite",
                thai_business_links,
                "Thai Business Suite",
            )

            if success:
                logger.info(
                    "✅ Thai Business Suite links added to Integrations workspace"
                )
                return {"success": True, "message": "Thai Business Suite links added"}
            else:
                return {
                    "success": False,
                    "message": "Failed to add Thai Business Suite links",
                }

        except Exception as e:
            logger.error(f"Error setting up Thai Business Suite links: {str(e)}")
            return {"success": False, "error": str(e)}

    @staticmethod
    def clear_workspace_cache():
        """Clear workspace cache to ensure updates are visible"""
        try:
            frappe.cache().delete_key("workspace_json")
            frappe.cache().delete_key("workspace_data")
            frappe.clear_cache(doctype="Workspace")
            frappe.clear_document_cache("Workspace", "Integrations")
            logger.info("✅ Workspace cache cleared")
            return {"success": True, "message": "Cache cleared"}
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
            return {"success": False, "error": str(e)}


# API endpoints for remote calls
@frappe.whitelist()
def ensure_integrations_workspace():
    """API endpoint to ensure Integrations workspace exists"""
    return WorkspaceManager.ensure_integrations_workspace()


@frappe.whitelist()
def setup_translation_tools():
    """API endpoint to setup Translation Tools in Integrations"""
    return WorkspaceManager.setup_translation_tools_links()


@frappe.whitelist()
def setup_thai_business_suite():
    """API endpoint to setup Thai Business Suite in Integrations"""
    return WorkspaceManager.setup_thai_business_suite_links()


@frappe.whitelist()
def clear_workspace_cache():
    """API endpoint to clear workspace cache"""
    return WorkspaceManager.clear_workspace_cache()
