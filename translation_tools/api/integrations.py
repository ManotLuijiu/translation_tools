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
        # First, ensure the Page exists for our dashboard
        if not frappe.db.exists("Page", "thai_translator"):
            # Create a page to serve as a bridge to the SPA
            page = frappe.new_doc("Page")
            page.page_name = "thai_translator"
            page.title = "Thai Translation Dashboard"
            page.module = "Translation Tools"
            page.standard = "Yes"
            
            # Create a simple page that redirects to your SPA
            page.script = """
            frappe.pages['thai_translator'].on_page_load = function(wrapper) {
                var page = frappe.ui.make_app_page({
                    parent: wrapper,
                    title: 'Thai Translation Dashboard',
                    single_column: true
                });
                
                // Redirect to the SPA
                window.location.href = '/thai_translation_dashboard';
            };
            """
            
            page.insert(ignore_permissions=True)
            frappe.db.commit()
            
        # Get the workspace and update the entire structure
        workspace = frappe.get_doc("Workspace", "Integrations")
        
        # Check if the link already exists
        link_exists = False
        for link in workspace.links:
            if link.label == "Translation Tools":
                link_exists = True
                break
                
        if not link_exists:
            # Check if Thai Business Suite card exists
            thai_card_exists = False
            for link in workspace.links:
                if link.label == "Thai Business Suite" and link.type == "Card Break":
                    thai_card_exists = True
                    break
                    
            # If Thai Business Suite card doesn't exist, add it
            if not thai_card_exists:
                workspace.append("links", {
                    "label": "Thai Business Suite",
                    "type": "Card Break",
                    "hidden": 0,
                    "is_query_report": 0,
                    "link_count": 0,
                    "onboard": 0,
                    "icon": "🇹🇭"
                })
            
            # Add the Translation Tools link
            workspace.append("links", {
                "label": "Translation Tools",
                "type": "Link",
                "link_to": "thai_translator",
                "link_type": "Page",
                "hidden": 0,
                "is_query_report": 0,
                "link_count": 0,
                "onboard": 0,
                "icon": "🇹🇭"
            })
            
            # Save the workspace
            workspace.save(ignore_permissions=True)
            frappe.db.commit()
            
            # Force clear cache
            frappe.clear_cache()
            
            return {"success": True, "message": "Translation Tools link added"}
        else:
            return {"success": True, "message": "Link already exists"}
            
    except Exception as e:
        frappe.log_error(str(e), "Translation Tools Add")
        frappe.db.rollback()
        return {"success": False, "error": str(e)}

@frappe.whitelist()
def clear_workspace_cache():
    """Manually clear the workspace cache"""
    try:
        # Clear specific cache keys related to workspaces
        frappe.cache().delete_key("workspace_json")
        frappe.cache().delete_key("workspace_data")
        
        # Clear Workspace doctype cache
        frappe.clear_cache(doctype="Workspace")
        
        # Clear specific workspace cache
        frappe.clear_document_cache("Workspace", "Integrations")
        
        return {"success": True, "message": "Cache cleared"}
    except Exception as e:
        return {"success": False, "error": str(e)}