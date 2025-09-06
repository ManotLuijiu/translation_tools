import frappe

def execute():
    """Add app_sync_settings field to GitHub Sync Settings"""
    
    try:
        # Check if field already exists
        if frappe.db.exists("DocField", {"parent": "GitHub Sync Settings", "fieldname": "app_sync_settings"}):
            print("ℹ️ Field app_sync_settings already exists")
            return
        
        # Get the doctype
        doctype = frappe.get_doc("DocType", "GitHub Sync Settings")
        
        # Check if field already exists in the doctype fields list
        field_exists = False
        for field in doctype.fields:
            if field.fieldname == "app_sync_settings":
                field_exists = True
                break
        
        if not field_exists:
            # Add new field
            doctype.append("fields", {
                "fieldname": "app_sync_settings",
                "fieldtype": "Long Text",
                "label": "App Sync Settings (JSON)",
                "hidden": 1,
                "description": "JSON storage for per-app auto-sync settings",
                "insert_after": "target_language"
            })
            
            doctype.save()
            frappe.db.commit()
            frappe.clear_cache(doctype="GitHub Sync Settings")
            print("✅ Added app_sync_settings field to GitHub Sync Settings")
        else:
            print("ℹ️ Field app_sync_settings already exists in DocType")
            
    except Exception as e:
        print(f"❌ Error adding app_sync_settings field: {str(e)}")
        # Log error but don't raise to avoid breaking migration
        frappe.log_error(f"Error in add_app_sync_settings_field patch: {str(e)}")