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
    def setup_inpac_pharma_workspace():
        """Setup Inpac Pharma workspace with all cards and links

        This method is called from inpac_pharma's after_migrate hook
        to ensure the workspace is properly configured on all deployments.
        """
        try:
            workspace_name = "Inpac Pharma"
            logger.info(f"Setting up {workspace_name} workspace...")

            # Define dashboard content with number cards and charts
            # Using col:4 for 3 cards per row (standard Frappe layout)
            dashboard_content = json.dumps([
                # Row 1: First 3 KPI cards
                {"id": "nc_active_items", "type": "number_card", "data": {"number_card_name": "IP Active Items", "col": 4}},
                {"id": "nc_suppliers", "type": "number_card", "data": {"number_card_name": "Active Suppliers", "col": 4}},
                {"id": "nc_customers", "type": "number_card", "data": {"number_card_name": "Active Customers", "col": 4}},
                # Row 2: Next 3 KPI cards
                {"id": "nc_pending_so", "type": "number_card", "data": {"number_card_name": "IP Pending Sales Orders", "col": 4}},
                {"id": "nc_pending_po", "type": "number_card", "data": {"number_card_name": "IP Pending Purchase Orders", "col": 4}},
                {"id": "nc_stock_value", "type": "number_card", "data": {"number_card_name": "IP Total Stock Value", "col": 4}},
                {"id": "spacer_kpi", "type": "spacer", "data": {"col": 12}},
                # Row 3: Charts (side by side)
                {"id": "chart_sales", "type": "chart", "data": {"chart_name": "IP Sales Trend", "col": 6}},
                {"id": "chart_purchase", "type": "chart", "data": {"chart_name": "IP Purchase Trend", "col": 6}},
                {"id": "spacer_charts", "type": "spacer", "data": {"col": 12}},
                # Shortcuts header
                {"id": "shortcuts_header", "type": "header", "data": {"text": '<span class="h4"><b>Shortcuts</b></span>', "col": 12}},
                {"id": "sc_delivery", "type": "shortcut", "data": {"shortcut_name": "Delivery Schedule", "col": 3}},
                {"id": "sc_po_calendar", "type": "shortcut", "data": {"shortcut_name": "PO Delivery Calendar Report", "col": 3}},
                {"id": "sc_inter_express", "type": "shortcut", "data": {"shortcut_name": "Inter Express Delivery", "col": 3}},
                {"id": "sc_manufacturing", "type": "shortcut", "data": {"shortcut_name": "Manufacturing Order", "col": 3}},
                {"id": "spacer_shortcuts", "type": "spacer", "data": {"col": 12}},
                # Cards
                {"id": "card_masters", "type": "card", "data": {"card_name": "Masters", "col": 4}},
                {"id": "card_purchasing", "type": "card", "data": {"card_name": "Purchasing", "col": 4}},
                {"id": "card_stock", "type": "card", "data": {"card_name": "Stock & Inventory", "col": 4}},
                {"id": "card_sales", "type": "card", "data": {"card_name": "Sales", "col": 4}},
                {"id": "card_delivery", "type": "card", "data": {"card_name": "Delivery & Logistics", "col": 4}},
                {"id": "card_manufacturing", "type": "card", "data": {"card_name": "Manufacturing", "col": 4}},
                {"id": "spacer_cards1", "type": "spacer", "data": {"col": 12}},
                {"id": "card_dksh", "type": "card", "data": {"card_name": "DKSH Integration", "col": 4}},
                {"id": "card_hr", "type": "card", "data": {"card_name": "HR & Administration", "col": 4}},
                {"id": "card_assets", "type": "card", "data": {"card_name": "Assets", "col": 4}},
                {"id": "card_reports", "type": "card", "data": {"card_name": "Reports", "col": 4}},
                {"id": "card_manual", "type": "card", "data": {"card_name": "User Manual", "col": 4}},
            ])

            # Check if workspace exists
            if not frappe.db.exists("Workspace", workspace_name):
                logger.info(f"Creating new workspace: {workspace_name}")
                workspace = frappe.new_doc("Workspace")
                workspace.name = workspace_name
                workspace.title = workspace_name
                workspace.label = workspace_name
                workspace.module = "Inpac Pharma"
                workspace.public = 1
                workspace.sequence_id = 17.0
                workspace.icon = "organization"
                workspace.indicator_color = "green"
                workspace.content = dashboard_content
            else:
                logger.info(f"Using existing workspace: {workspace_name}")
                workspace = frappe.get_doc("Workspace", workspace_name)
                # Update content if different
                workspace.content = dashboard_content

            # Define all cards and links for Inpac Pharma
            cards = {
                "Masters": [
                    {"label": "Item", "link_to": "Item", "link_type": "DocType", "onboard": 1},
                    {"label": "Supplier", "link_to": "Supplier", "link_type": "DocType", "onboard": 1},
                    {"label": "Manufacturer", "link_to": "Manufacturer", "link_type": "DocType"},
                    {"label": "Customer", "link_to": "Customer", "link_type": "DocType", "onboard": 1},
                    {"label": "IP Customer Type", "link_to": "IP Customer Type", "link_type": "DocType"},
                    {"label": "UOM", "link_to": "UOM", "link_type": "DocType"},
                    {"label": "Warehouse", "link_to": "Warehouse", "link_type": "DocType"},
                    {"label": "Thai Branch", "link_to": "Thai Branch", "link_type": "DocType"},
                ],
                "Purchasing": [
                    {"label": "Material Request", "link_to": "Material Request", "link_type": "DocType", "onboard": 1},
                    {"label": "Purchase Order", "link_to": "Purchase Order", "link_type": "DocType", "onboard": 1},
                    {"label": "Purchase Receipt", "link_to": "Purchase Receipt", "link_type": "DocType"},
                    {"label": "Purchase Invoice", "link_to": "Purchase Invoice", "link_type": "DocType"},
                    {"label": "Supplier Quotation", "link_to": "Supplier Quotation", "link_type": "DocType"},
                    {"label": "PO Planned Delivery", "link_to": "PO Planned Delivery", "link_type": "DocType"},
                    {"label": "Supplier Manufacturer Link", "link_to": "Supplier Manufacturer Link", "link_type": "DocType"},
                ],
                "Stock & Inventory": [
                    {"label": "Stock Entry", "link_to": "Stock Entry", "link_type": "DocType", "onboard": 1},
                    {"label": "Delivery Schedule", "link_to": "Delivery Schedule", "link_type": "DocType"},
                    {"label": "Batch", "link_to": "Batch", "link_type": "DocType"},
                    {"label": "Stock Reservation", "link_to": "Stock Reservation", "link_type": "DocType"},
                    {"label": "Pick List", "link_to": "Pick List", "link_type": "DocType"},
                    {"label": "Delivery Note", "link_to": "Delivery Note", "link_type": "DocType"},
                ],
                "Sales": [
                    {"label": "Sales Order", "link_to": "Sales Order", "link_type": "DocType", "onboard": 1},
                    {"label": "Sales Invoice", "link_to": "Sales Invoice", "link_type": "DocType", "onboard": 1},
                    {"label": "Quotation", "link_to": "Quotation", "link_type": "DocType"},
                    {"label": "Item Price", "link_to": "Item Price", "link_type": "DocType"},
                    {"label": "Price List", "link_to": "Price List", "link_type": "DocType"},
                    {"label": "Customer Delivery Schedule", "link_to": "Customer Delivery Schedule", "link_type": "DocType"},
                ],
                "Delivery & Logistics": [
                    {"label": "Inter Express Delivery", "link_to": "Inter Express Delivery", "link_type": "DocType", "onboard": 1},
                    {"label": "Inter Express Settings", "link_to": "Inter Express Settings", "link_type": "DocType"},
                    {"label": "TBS Delivery Company", "link_to": "TBS Delivery Company", "link_type": "DocType"},
                    {"label": "TBS Delivery Service", "link_to": "TBS Delivery Service", "link_type": "DocType"},
                ],
                "Manufacturing": [
                    {"label": "Manufacturing Order", "link_to": "Manufacturing Order", "link_type": "DocType", "onboard": 1},
                    {"label": "Work Order", "link_to": "Work Order", "link_type": "DocType"},
                    {"label": "BOM", "link_to": "BOM", "link_type": "DocType"},
                    {"label": "Job Card", "link_to": "Job Card", "link_type": "DocType"},
                ],
                "DKSH Integration": [
                    {"label": "DK Sales Import", "link_to": "DK Sales Import", "link_type": "DocType"},
                    {"label": "DK Material Code Mapping", "link_to": "DK Material Code Mapping", "link_type": "DocType"},
                ],
                "HR & Administration": [
                    {"label": "Employee", "link_to": "Employee", "link_type": "DocType"},
                    {"label": "Department", "link_to": "Department", "link_type": "DocType"},
                    {"label": "Designation", "link_to": "Designation", "link_type": "DocType"},
                    {"label": "Leave Application", "link_to": "Leave Application", "link_type": "DocType"},
                    {"label": "Attendance", "link_to": "Attendance", "link_type": "DocType"},
                    {"label": "Expense Claim", "link_to": "Expense Claim", "link_type": "DocType"},
                    {"label": "Training Event", "link_to": "Training Event", "link_type": "DocType"},
                    {"label": "Training Program", "link_to": "Training Program", "link_type": "DocType"},
                    {"label": "Event", "link_to": "Event", "link_type": "DocType"},
                ],
                "Assets": [
                    {"label": "Asset", "link_to": "Asset", "link_type": "DocType"},
                    {"label": "Asset Maintenance", "link_to": "Asset Maintenance", "link_type": "DocType"},
                    {"label": "Asset Repair", "link_to": "Asset Repair", "link_type": "DocType"},
                ],
                "Reports": [
                    {"label": "PO Delivery Calendar Report", "link_to": "PO Delivery Calendar Report", "link_type": "Report", "is_query_report": 1},
                    {"label": "Stock Balance", "link_to": "Stock Balance", "link_type": "Report", "is_query_report": 1},
                    {"label": "Stock Ledger Report", "link_to": "Stock Ledger", "link_type": "Report", "is_query_report": 1},
                    {"label": "Sales Analytics", "link_to": "Sales Analytics", "link_type": "Report", "is_query_report": 1},
                    {"label": "Purchase Order Trends", "link_to": "Purchase Order Trends", "link_type": "Report", "is_query_report": 1},
                    {"label": "Accounts Receivable", "link_to": "Accounts Receivable", "link_type": "Report", "is_query_report": 1},
                    {"label": "Accounts Payable", "link_to": "Accounts Payable", "link_type": "Report", "is_query_report": 1},
                ],
                "User Manual": [
                    {"label": "Manual Articles", "link_to": "IP Manual Article", "link_type": "DocType", "onboard": 1},
                    {"label": "Manual Categories", "link_to": "IP Manual Category", "link_type": "DocType"},
                ],
            }

            # Clear existing links and rebuild
            workspace.links = []
            links_added = 0

            for card_name, links in cards.items():
                # Add card break
                workspace.append("links", {
                    "label": card_name,
                    "type": "Card Break",
                    "hidden": 0,
                    "is_query_report": 0,
                    "link_count": len(links),
                    "onboard": 0,
                })
                logger.info(f"Processing card '{card_name}' ({len(links)} links)")

                # Add links under card
                for link_data in links:
                    workspace.append("links", {
                        "label": link_data.get("label"),
                        "link_to": link_data.get("link_to"),
                        "link_type": link_data.get("link_type", "DocType"),
                        "type": "Link",
                        "hidden": 0,
                        "is_query_report": link_data.get("is_query_report", 0),
                        "onboard": link_data.get("onboard", 0),
                    })
                    links_added += 1
                    logger.info(f"Added link '{link_data.get('label')}' to card '{card_name}'")

            workspace.save(ignore_permissions=True)
            frappe.db.commit()

            # Clear workspace cache
            WorkspaceManager.clear_workspace_cache()

            logger.info(f"✅ Inpac Pharma workspace setup complete - {len(cards)} cards, {links_added} links")
            return {
                "success": True,
                "message": f"Inpac Pharma workspace updated with {len(cards)} cards and {links_added} links",
            }

        except Exception as e:
            logger.error(f"Error setting up Inpac Pharma workspace: {str(e)}")
            frappe.db.rollback()
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


@frappe.whitelist()
def setup_inpac_pharma_workspace():
    """API endpoint to setup Inpac Pharma workspace - called from inpac_pharma after_migrate"""
    return WorkspaceManager.setup_inpac_pharma_workspace()
