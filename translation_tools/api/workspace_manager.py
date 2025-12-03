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
                    "label": "Print Agent Config",
                    "link_to": "TBS Print Agent Config",
                    "link_type": "DocType",
                },
                {
                    "label": "Print Agent",
                    "link_to": "TBS Print Agent",
                    "link_type": "DocType",
                },
                {
                    "label": "Print Job Queue",
                    "link_to": "TBS Print Job Queue",
                    "link_type": "DocType",
                },
                {
                    "label": "Print Template",
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
            dashboard_content = json.dumps(
                [
                    # Row 1: First 3 KPI cards
                    {
                        "id": "nc_active_items",
                        "type": "number_card",
                        "data": {"number_card_name": "IP Active Items", "col": 4},
                    },
                    {
                        "id": "nc_suppliers",
                        "type": "number_card",
                        "data": {"number_card_name": "Active Suppliers", "col": 4},
                    },
                    {
                        "id": "nc_customers",
                        "type": "number_card",
                        "data": {"number_card_name": "Active Customers", "col": 4},
                    },
                    # Row 2: Next 3 KPI cards
                    {
                        "id": "nc_pending_so",
                        "type": "number_card",
                        "data": {
                            "number_card_name": "IP Pending Sales Orders",
                            "col": 4,
                        },
                    },
                    {
                        "id": "nc_pending_po",
                        "type": "number_card",
                        "data": {
                            "number_card_name": "IP Pending Purchase Orders",
                            "col": 4,
                        },
                    },
                    {
                        "id": "nc_stock_value",
                        "type": "number_card",
                        "data": {"number_card_name": "IP Total Stock Value", "col": 4},
                    },
                    {"id": "spacer_kpi", "type": "spacer", "data": {"col": 12}},
                    # Row 3: Charts (side by side)
                    {
                        "id": "chart_sales",
                        "type": "chart",
                        "data": {"chart_name": "IP Sales Trend", "col": 6},
                    },
                    {
                        "id": "chart_purchase",
                        "type": "chart",
                        "data": {"chart_name": "IP Purchase Trend", "col": 6},
                    },
                    {"id": "spacer_charts", "type": "spacer", "data": {"col": 12}},
                    # Shortcuts header
                    {
                        "id": "shortcuts_header",
                        "type": "header",
                        "data": {
                            "text": '<span class="h4"><b>Shortcuts</b></span>',
                            "col": 12,
                        },
                    },
                    {
                        "id": "sc_delivery",
                        "type": "shortcut",
                        "data": {"shortcut_name": "Delivery Schedule", "col": 3},
                    },
                    {
                        "id": "sc_po_calendar",
                        "type": "shortcut",
                        "data": {
                            "shortcut_name": "PO Delivery Calendar Report",
                            "col": 3,
                        },
                    },
                    {
                        "id": "sc_inter_express",
                        "type": "shortcut",
                        "data": {"shortcut_name": "Inter Express Delivery", "col": 3},
                    },
                    {
                        "id": "sc_inter_express_export",
                        "type": "shortcut",
                        "data": {"shortcut_name": "Inter Express Export", "col": 3},
                    },
                    {
                        "id": "sc_manufacturing",
                        "type": "shortcut",
                        "data": {"shortcut_name": "Manufacturing Order", "col": 3},
                    },
                    {"id": "spacer_shortcuts", "type": "spacer", "data": {"col": 12}},
                    # Cards
                    {
                        "id": "card_masters",
                        "type": "card",
                        "data": {"card_name": "Masters", "col": 4},
                    },
                    {
                        "id": "card_purchasing",
                        "type": "card",
                        "data": {"card_name": "Purchasing", "col": 4},
                    },
                    {
                        "id": "card_stock",
                        "type": "card",
                        "data": {"card_name": "Stock & Inventory", "col": 4},
                    },
                    {
                        "id": "card_sales",
                        "type": "card",
                        "data": {"card_name": "Sales", "col": 4},
                    },
                    {
                        "id": "card_delivery",
                        "type": "card",
                        "data": {"card_name": "Delivery & Logistics", "col": 4},
                    },
                    {
                        "id": "card_manufacturing",
                        "type": "card",
                        "data": {"card_name": "Manufacturing", "col": 4},
                    },
                    {"id": "spacer_cards1", "type": "spacer", "data": {"col": 12}},
                    {
                        "id": "card_dksh",
                        "type": "card",
                        "data": {"card_name": "DKSH Integration", "col": 4},
                    },
                    {
                        "id": "card_hr",
                        "type": "card",
                        "data": {"card_name": "HR & Administration", "col": 4},
                    },
                    {
                        "id": "card_assets",
                        "type": "card",
                        "data": {"card_name": "Assets", "col": 4},
                    },
                    {
                        "id": "card_reports",
                        "type": "card",
                        "data": {"card_name": "Reports", "col": 4},
                    },
                    {
                        "id": "card_manual",
                        "type": "card",
                        "data": {"card_name": "User Manual", "col": 4},
                    },
                ]
            )

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
                    {
                        "label": "Item",
                        "link_to": "Item",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Supplier",
                        "link_to": "Supplier",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Manufacturer",
                        "link_to": "Manufacturer",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Customer",
                        "link_to": "Customer",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "IP Customer Type",
                        "link_to": "IP Customer Type",
                        "link_type": "DocType",
                    },
                    {"label": "UOM", "link_to": "UOM", "link_type": "DocType"},
                    {
                        "label": "Warehouse",
                        "link_to": "Warehouse",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Thai Branch",
                        "link_to": "Thai Branch",
                        "link_type": "DocType",
                    },
                ],
                "Purchasing": [
                    {
                        "label": "Material Request",
                        "link_to": "Material Request",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Purchase Order",
                        "link_to": "Purchase Order",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Purchase Receipt",
                        "link_to": "Purchase Receipt",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Purchase Invoice",
                        "link_to": "Purchase Invoice",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Supplier Quotation",
                        "link_to": "Supplier Quotation",
                        "link_type": "DocType",
                    },
                    {
                        "label": "PO Planned Delivery",
                        "link_to": "PO Planned Delivery",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Supplier Manufacturer Link",
                        "link_to": "Supplier Manufacturer Link",
                        "link_type": "DocType",
                    },
                ],
                "Stock & Inventory": [
                    {
                        "label": "Stock Entry",
                        "link_to": "Stock Entry",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Delivery Schedule",
                        "link_to": "Delivery Schedule",
                        "link_type": "DocType",
                    },
                    {"label": "Batch", "link_to": "Batch", "link_type": "DocType"},
                    {
                        "label": "Stock Reservation",
                        "link_to": "Stock Reservation",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Pick List",
                        "link_to": "Pick List",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Delivery Note",
                        "link_to": "Delivery Note",
                        "link_type": "DocType",
                    },
                ],
                "Sales": [
                    {
                        "label": "Sales Order",
                        "link_to": "Sales Order",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Sales Invoice",
                        "link_to": "Sales Invoice",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Quotation",
                        "link_to": "Quotation",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Item Price",
                        "link_to": "Item Price",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Price List",
                        "link_to": "Price List",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Customer Delivery Schedule",
                        "link_to": "Customer Delivery Schedule",
                        "link_type": "DocType",
                    },
                ],
                "Delivery & Logistics": [
                    {
                        "label": "Inter Express Delivery",
                        "link_to": "Inter Express Delivery",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Inter Express Export",
                        "link_to": "inter-express-export",
                        "link_type": "Page",
                    },
                    {
                        "label": "Inter Express Settings",
                        "link_to": "Inter Express Settings",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Delivery Company",
                        "link_to": "TBS Delivery Company",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Delivery Service",
                        "link_to": "TBS Delivery Service",
                        "link_type": "DocType",
                    },
                ],
                "Manufacturing": [
                    {
                        "label": "Manufacturing Order",
                        "link_to": "Manufacturing Order",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Work Order",
                        "link_to": "Work Order",
                        "link_type": "DocType",
                    },
                    {"label": "BOM", "link_to": "BOM", "link_type": "DocType"},
                    {
                        "label": "Job Card",
                        "link_to": "Job Card",
                        "link_type": "DocType",
                    },
                ],
                "DKSH Integration": [
                    {
                        "label": "DK Sales Import",
                        "link_to": "DK Sales Import",
                        "link_type": "DocType",
                    },
                    {
                        "label": "DK Material Code Mapping",
                        "link_to": "DK Material Code Mapping",
                        "link_type": "DocType",
                    },
                ],
                "HR & Administration": [
                    {
                        "label": "Employee",
                        "link_to": "Employee",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Department",
                        "link_to": "Department",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Designation",
                        "link_to": "Designation",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Leave Application",
                        "link_to": "Leave Application",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Attendance",
                        "link_to": "Attendance",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Expense Claim",
                        "link_to": "Expense Claim",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Training Event",
                        "link_to": "Training Event",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Training Program",
                        "link_to": "Training Program",
                        "link_type": "DocType",
                    },
                    {"label": "Event", "link_to": "Event", "link_type": "DocType"},
                ],
                "Assets": [
                    {"label": "Asset", "link_to": "Asset", "link_type": "DocType"},
                    {
                        "label": "Asset Maintenance",
                        "link_to": "Asset Maintenance",
                        "link_type": "DocType",
                    },
                    {
                        "label": "Asset Repair",
                        "link_to": "Asset Repair",
                        "link_type": "DocType",
                    },
                ],
                "Reports": [
                    {
                        "label": "PO Delivery Calendar Report",
                        "link_to": "PO Delivery Calendar Report",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                    {
                        "label": "Customer Delivery Calendar Report",
                        "link_to": "Customer Delivery Calendar Report",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                    {
                        "label": "Stock Balance",
                        "link_to": "Stock Balance",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                    {
                        "label": "Stock Ledger Report",
                        "link_to": "Stock Ledger",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                    {
                        "label": "Sales Analytics",
                        "link_to": "Sales Analytics",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                    {
                        "label": "Purchase Order Trends",
                        "link_to": "Purchase Order Trends",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                    {
                        "label": "Accounts Receivable",
                        "link_to": "Accounts Receivable",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                    {
                        "label": "Accounts Payable",
                        "link_to": "Accounts Payable",
                        "link_type": "Report",
                        "is_query_report": 1,
                    },
                ],
                "User Manual": [
                    {
                        "label": "Manual Articles",
                        "link_to": "IP Manual Article",
                        "link_type": "DocType",
                        "onboard": 1,
                    },
                    {
                        "label": "Manual Categories",
                        "link_to": "IP Manual Category",
                        "link_type": "DocType",
                    },
                ],
            }

            # Clear existing links and rebuild
            workspace.links = []
            links_added = 0

            for card_name, links in cards.items():
                # Add card break
                workspace.append(
                    "links",
                    {
                        "label": card_name,
                        "type": "Card Break",
                        "hidden": 0,
                        "is_query_report": 0,
                        "link_count": len(links),
                        "onboard": 0,
                    },
                )
                logger.info(f"Processing card '{card_name}' ({len(links)} links)")

                # Add links under card
                for link_data in links:
                    workspace.append(
                        "links",
                        {
                            "label": link_data.get("label"),
                            "link_to": link_data.get("link_to"),
                            "link_type": link_data.get("link_type", "DocType"),
                            "type": "Link",
                            "hidden": 0,
                            "is_query_report": link_data.get("is_query_report", 0),
                            "onboard": link_data.get("onboard", 0),
                        },
                    )
                    links_added += 1
                    logger.info(
                        f"Added link '{link_data.get('label')}' to card '{card_name}'"
                    )

            # Add charts array for workspace
            workspace.charts = []
            workspace.append("charts", {
                "chart_name": "IP Sales Trend",
                "label": "Monthly Sales Trend"
            })
            workspace.append("charts", {
                "chart_name": "IP Purchase Trend",
                "label": "Monthly Purchase Trend"
            })

            # Add number_cards array for workspace
            workspace.number_cards = []
            workspace.append("number_cards", {
                "number_card_name": "IP Monthly Sales",
                "label": "Monthly Sales",
                "color": "Blue"
            })
            workspace.append("number_cards", {
                "number_card_name": "IP Pending Sales Orders",
                "label": "Pending Delivery",
                "color": "Orange"
            })
            workspace.append("number_cards", {
                "number_card_name": "IP Pending Purchase Orders",
                "label": "Pending Receipt",
                "color": "Purple"
            })
            workspace.append("number_cards", {
                "number_card_name": "IP Manufacturing Orders",
                "label": "Active MO",
                "color": "Yellow"
            })
            workspace.append("number_cards", {
                "number_card_name": "IP Total Stock Value",
                "label": "Stock Value",
                "color": "Green"
            })
            workspace.append("number_cards", {
                "number_card_name": "IP Active Items",
                "label": "Active Items",
                "color": "Cyan"
            })

            # Add shortcuts array
            workspace.shortcuts = []
            workspace.append("shortcuts", {
                "label": "PO Delivery Calendar Report",
                "link_to": "PO Delivery Calendar Report",
                "type": "Report",
                "doc_view": "List",
                "color": "Grey",
                "report_ref_doctype": "Purchase Order"
            })
            workspace.append("shortcuts", {
                "label": "Customer Delivery Calendar Report",
                "link_to": "Customer Delivery Calendar Report",
                "type": "Report",
                "doc_view": "List",
                "color": "Purple",
                "report_ref_doctype": "Sales Order"
            })
            workspace.append("shortcuts", {
                "label": "Delivery Schedule",
                "link_to": "Delivery Schedule",
                "type": "DocType",
                "doc_view": "List",
                "color": "Blue",
                "stats_filter": "[]"
            })
            workspace.append("shortcuts", {
                "label": "Inter Express Delivery",
                "link_to": "Inter Express Delivery",
                "type": "DocType",
                "doc_view": "List",
                "color": "Green",
                "stats_filter": "[]"
            })
            workspace.append("shortcuts", {
                "label": "Inter Express Export",
                "link_to": "inter-express-export",
                "type": "Page",
                "doc_view": "",
                "color": "Cyan"
            })
            workspace.append("shortcuts", {
                "label": "Manufacturing Order",
                "link_to": "Manufacturing Order",
                "type": "DocType",
                "doc_view": "List",
                "color": "Orange",
                "stats_filter": "[]"
            })

            workspace.save(ignore_permissions=True)
            frappe.db.commit()

            # Clear workspace cache
            WorkspaceManager.clear_workspace_cache()

            # Fix standard workspace ordering to prevent sidebar reordering issues
            WorkspaceManager.fix_standard_workspace_ordering()

            logger.info(
                f"✅ Inpac Pharma workspace setup complete - {len(cards)} cards, {links_added} links, 2 charts, 6 number cards"
            )
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

    @staticmethod
    def fix_standard_workspace_ordering():
        """
        Fix standard ERPNext workspace ordering to ensure proper sidebar position.
        This method resets standard ERPNext workspaces to their expected sequence_id values.

        Called automatically after workspace setup to prevent ordering issues on deployment.
        """
        # Standard ERPNext workspace ordering (from ERPNext fixtures)
        standard_ordering = {
            "Home": 1.0,
            "Integrations": 20.0,
            "Welcome Workspace": 22.0,
            "Accounting": 30.0,
            "Payables": 31.0,
            "Receivables": 32.0,
            "Financial Reports": 33.0,
            "Buying": 35.0,
            "Selling": 36.0,
            "Stock": 38.0,
            "Assets": 39.0,
            "HR": 40.0,
            "Manufacturing": 47.0,
            "Quality": 48.0,
            "Projects": 49.0,
            "Support": 50.0,
            "Users": 51.0,
            "Website": 52.0,
            "CRM": 56.0,
            "Tools": 57.0,
            "ERPNext Settings": 58.0,
            "Build": 60.0,
        }

        try:
            fixed_count = 0
            for workspace_name, expected_seq in standard_ordering.items():
                if frappe.db.exists("Workspace", workspace_name):
                    current_seq = frappe.db.get_value("Workspace", workspace_name, "sequence_id")
                    if current_seq != expected_seq:
                        frappe.db.set_value("Workspace", workspace_name, "sequence_id", expected_seq)
                        logger.info(f"🔧 Fixed {workspace_name} sequence_id: {current_seq} → {expected_seq}")
                        fixed_count += 1

            if fixed_count > 0:
                frappe.db.commit()
                WorkspaceManager.clear_workspace_cache()
                logger.info(f"✅ Fixed {fixed_count} workspace sequence_id values")

            return {"success": True, "message": f"Fixed {fixed_count} workspace ordering issues"}

        except Exception as e:
            logger.error(f"Error fixing workspace ordering: {str(e)}")
            frappe.db.rollback()
            return {"success": False, "error": str(e)}

    @staticmethod
    def setup_app_workspace_from_config(app_name):
        """
        Setup workspace by reading configuration from Workspace Config DocType.
        This is the dynamic method that replaces hardcoded workspace setup methods.

        Args:
            app_name: The app identifier (e.g., 'inpac_pharma')

        Returns:
            dict: Success/failure status with message
        """
        try:
            logger.info(
                f"🔍 [DEBUG] setup_app_workspace_from_config called with app_name: {app_name}"
            )

            # Check if Workspace Config exists for this app
            if not frappe.db.exists("Workspace Config", app_name):
                logger.info(
                    f"🔍 [DEBUG] No Workspace Config DocType found for: {app_name}"
                )
                # Fallback to hardcoded method if exists (for backward compatibility)
                hardcoded_method = f"setup_{app_name}_workspace"
                if hasattr(WorkspaceManager, hardcoded_method):
                    logger.info(
                        f"🔍 [DEBUG] Fallback to hardcoded method: {hardcoded_method}"
                    )
                    return getattr(WorkspaceManager, hardcoded_method)()
                logger.warning(f"No Workspace Config found for app: {app_name}")
                return {
                    "success": False,
                    "message": f"No Workspace Config found for {app_name}",
                }

            logger.info(
                f"🔍 [DEBUG] Found Workspace Config for: {app_name}, loading document..."
            )
            config = frappe.get_doc("Workspace Config", app_name)

            # Debug: Print all config fields
            logger.info("🔍 [DEBUG] Config loaded:")
            logger.info(f"    - app_name: {config.app_name}")
            logger.info(f"    - workspace_name: {config.workspace_name}")
            logger.info(f"    - module: {config.module}")
            logger.info(f"    - icon: {config.icon}")
            logger.info(f"    - indicator_color: {config.indicator_color}")
            logger.info(f"    - sequence_id: {config.sequence_id}")
            logger.info(f"    - enabled: {config.enabled}")
            logger.info(
                f"    - dashboard_content length: {len(config.dashboard_content or '')}"
            )
            logger.info(f"    - cards count: {len(config.cards or [])}")

            if not config.enabled:
                logger.info(f"🔍 [DEBUG] Config is disabled for: {app_name}")
                return {
                    "success": False,
                    "message": f"Workspace Config disabled for {app_name}",
                }

            workspace_name = config.workspace_name
            logger.info(f"Setting up {workspace_name} workspace from config...")

            # Parse dashboard_content JSON
            dashboard_content = config.dashboard_content or "[]"

            # Check if workspace exists
            if not frappe.db.exists("Workspace", workspace_name):
                logger.info(f"Creating new workspace: {workspace_name}")
                workspace = frappe.new_doc("Workspace")
                workspace.name = workspace_name
                workspace.title = workspace_name
                workspace.label = workspace_name
                workspace.module = config.module or app_name
                workspace.public = 1
                workspace.sequence_id = config.sequence_id or 10.0
                workspace.icon = config.icon or "folder"
                workspace.indicator_color = config.indicator_color or "green"
                workspace.content = dashboard_content
            else:
                logger.info(f"Using existing workspace: {workspace_name}")
                workspace = frappe.get_doc("Workspace", workspace_name)
                # Update workspace properties
                workspace.module = config.module or app_name
                workspace.sequence_id = config.sequence_id or 10.0
                workspace.icon = config.icon or "folder"
                workspace.indicator_color = config.indicator_color or "green"
                workspace.content = dashboard_content

            # Build cards from child table
            workspace.links = []
            links_added = 0
            cards_count = 0

            logger.info(
                f"🔍 [DEBUG] Processing {len(config.cards or [])} cards from config..."
            )

            for card in sorted(config.cards, key=lambda x: x.sequence or 0):
                cards_count += 1
                logger.info(
                    f"🔍 [DEBUG] Card #{cards_count}: {card.card_name} (sequence: {card.sequence})"
                )
                logger.info(
                    f"🔍 [DEBUG]   links_json raw: {card.links_json[:100] if card.links_json else 'None'}..."
                )

                # Parse links_json
                try:
                    links = json.loads(card.links_json) if card.links_json else []
                    logger.info(f"🔍 [DEBUG]   Parsed {len(links)} links from JSON")
                except json.JSONDecodeError as e:
                    logger.warning(
                        f"Invalid JSON in links_json for card {card.card_name}: {e}"
                    )
                    links = []

                # Add card break
                workspace.append(
                    "links",
                    {
                        "label": card.card_name,
                        "type": "Card Break",
                        "hidden": 0,
                        "is_query_report": 0,
                        "link_count": len(links),
                        "onboard": 0,
                    },
                )
                logger.info(f"Processing card '{card.card_name}' ({len(links)} links)")

                # Add links under card
                for link_data in links:
                    workspace.append(
                        "links",
                        {
                            "label": link_data.get("label"),
                            "link_to": link_data.get("link_to"),
                            "link_type": link_data.get("link_type", "DocType"),
                            "type": "Link",
                            "hidden": 0,
                            "is_query_report": link_data.get("is_query_report", 0),
                            "onboard": link_data.get("onboard", 0),
                        },
                    )
                    links_added += 1

            workspace.save(ignore_permissions=True)
            frappe.db.commit()

            # Clear workspace cache
            WorkspaceManager.clear_workspace_cache()

            logger.info(
                f"✅ {workspace_name} workspace setup complete - {cards_count} cards, {links_added} links"
            )
            return {
                "success": True,
                "message": f"{workspace_name} workspace updated with {cards_count} cards and {links_added} links",
            }

        except Exception as e:
            logger.error(
                f"Error setting up workspace from config for {app_name}: {str(e)}"
            )
            frappe.db.rollback()
            return {"success": False, "error": str(e)}

    @staticmethod
    def setup_all_configured_workspaces():
        """
        Setup all enabled workspace configs.
        Called from after_migrate hook to apply all workspace configurations.
        """
        try:
            configs = frappe.get_all(
                "Workspace Config", filters={"enabled": 1}, pluck="app_name"
            )

            if not configs:
                logger.info("No enabled Workspace Config found")
                return {
                    "success": True,
                    "message": "No configs to apply",
                    "results": [],
                }

            results = []
            for app_name in configs:
                result = WorkspaceManager.setup_app_workspace_from_config(app_name)
                results.append({"app": app_name, "result": result})
                logger.info(f"Processed workspace config for: {app_name}")

            return {
                "success": True,
                "message": f"Processed {len(configs)} workspace configs",
                "results": results,
            }

        except Exception as e:
            logger.error(f"Error setting up all configured workspaces: {str(e)}")
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


@frappe.whitelist()
def setup_app_workspace_from_config(app_name):
    """API endpoint to setup any app's workspace from Workspace Config DocType"""
    return WorkspaceManager.setup_app_workspace_from_config(app_name)


@frappe.whitelist()
def setup_all_configured_workspaces():
    """API endpoint to setup all enabled workspace configs"""
    return WorkspaceManager.setup_all_configured_workspaces()


@frappe.whitelist()
def fix_standard_workspace_ordering():
    """API endpoint to fix standard ERPNext workspace sidebar ordering"""
    return WorkspaceManager.fix_standard_workspace_ordering()
