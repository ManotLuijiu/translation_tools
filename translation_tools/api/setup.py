import frappe
# from frappe.modules.import_file import import_doc_from_dict
from frappe.core.doctype.data_import.data_import import import_doc

def create_po_file_doctype():
    """Create PO File DocType if it doesn't exist"""
    if not frappe.db.exists("DocType", "PO File"):
        po_file_doctype = {
            "doctype": "DocType",
            "name": "PO File",
            "module": "Translation Tools",
            "custom": 1,
            "autoname": "field:file_path",
            "fields": [
                {
                    "fieldname": "file_path",
                    "label": "File Path",
                    "fieldtype": "Data",
                    "reqd": 1,
                    "unique": 1
                },
                {
                    "fieldname": "app_name",
                    "label": "App Name",
                    "fieldtype": "Data",
                    "reqd": 1
                },
                {
                    "fieldname": "filename",
                    "label": "Filename",
                    "fieldtype": "Data",
                    "reqd": 1
                },
                {
                    "fieldname": "language",
                    "label": "Language",
                    "fieldtype": "Data",
                    "reqd": 1
                },
                {
                    "fieldname": "total_entries",
                    "label": "Total Entries",
                    "fieldtype": "Int",
                    "default": 0
                },
                {
                    "fieldname": "translated_entries",
                    "label": "Translated Entries",
                    "fieldtype": "Int",
                    "default": 0
                },
                {
                    "fieldname": "translation_status",
                    "label": "Translation Status",
                    "fieldtype": "Percent",
                    "default": 0,
                    "in_list_view": 1
                },
                {
                    "fieldname": "last_modified",
                    "label": "Last Modified",
                    "fieldtype": "Datetime"
                },
                {
                    "fieldname": "last_scanned",
                    "label": "Last Scanned",
                    "fieldtype": "Datetime"
                }
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1
                },
                {
                    "role": "All",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 0
                }
            ]
        }
        
        try:
            frappe.get_doc(po_file_doctype).insert()
        # doc = import_doc(po_file_doctype)
        # doc.save()
            frappe.db.commit()
            print("Created DocType: PO File")
        except Exception as e:
            frappe.log_error(f"Error creating PO File DocType: {str(e)}")
            frappe.log_error(frappe.get_traceback(), "Error creating PO File")

def create_required_doctypes():
    """Create all required DocTypes for the Translation Tools app"""
    # Create PO File DocType
    create_po_file_doctype()
    
    # Create or check for ERPNext Module DocType
    if not frappe.db.exists("DocType", "ERPNext Module"):
        module_doctype = {
            "doctype": "DocType",
            "name": "ERPNext Module",
            "module": "Translation Tools",
            "custom": 1,
            "autoname": "field:module_name",
            "fields": [
                {
                    "fieldname": "module_name",
                    "label": "Module Name",
                    "fieldtype": "Data",
                    "reqd": 1,
                    "unique": 1,
                },
                {
                    "fieldname": "description",
                    "label": "Description",
                    "fieldtype": "Small Text",
                },
                {
                    "fieldname": "priority",
                    "label": "Priority",
                    "fieldtype": "Int",
                    "default": "0",
                },
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1,
                },
                {"role": "All", "read": 1},
            ],
        }

        # Import the DocType
        try:
            frappe.get_doc(module_doctype).insert()
            frappe.db.commit()  # Always commit after insert in setup scripts
            print("Created DocType: ERPNext Module")
        except Exception as e:
            frappe.log_error(f"Error creating ERPNext Module DocType: {str(e)}")
            frappe.log_error(frappe.get_traceback())
            
        # doc = import_doc(module_doctype)
        # doc.save()
    
    # Create or check for Translation Glossary Term DocType
    if not frappe.db.exists("DocType", "Translation Glossary Term"):
        glossary_doctype = {
            "doctype": "DocType",
            "name": "Translation Glossary Term",
            "module": "Translation Tools",
            "custom": 1,
            "autoname": "format:TERM-{source_term:.20}-{####}",
            "fields": [
                {
                    "fieldname": "source_term",
                    "label": "Source Term",
                    "fieldtype": "Data",
                    "reqd": 1,
                    "in_list_view": 1,
                    "in_standard_filter": 1,
                },
                {
                    "fieldname": "thai_translation",
                    "label": "Thai Translation",
                    "fieldtype": "Data",
                    "reqd": 1,
                    "in_list_view": 1,
                },
                {"fieldname": "context", "label": "Context", "fieldtype": "Small Text"},
                {
                    "fieldname": "module",
                    "label": "Module",
                    "fieldtype": "Link",
                    "options": "ERPNext Module",
                    "in_list_view": 1,
                    "in_standard_filter": 1,
                },
                {
                    "fieldname": "category",
                    "label": "Category",
                    "fieldtype": "Select",
                    "options": "Business\nTechnical\nUI\nDate/Time\nStatus",
                    "in_standard_filter": 1,
                },
                {
                    "fieldname": "is_approved",
                    "label": "Is Approved",
                    "fieldtype": "Check",
                    "default": "0",
                    "in_list_view": 1,
                    "in_standard_filter": 1,
                },
                {"fieldname": "notes", "label": "Notes", "fieldtype": "Small Text"},
                {
                    "fieldname": "usage_example",
                    "label": "Usage Example",
                    "fieldtype": "Small Text",
                },
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1,
                },
                {"role": "All", "read": 1},
            ],
        }

        # Import the DocType
        try:
            frappe.get_doc(glossary_doctype).insert()
            frappe.db.commit()  # Always commit after insert in setup scripts
            print("Created DocType: Translation Glossary Term")
        except Exception as e:
            frappe.log_error(f"Error creating Translation Glossary Term DocType: {str(e)}")
            frappe.log_error(frappe.get_traceback())
            
        # doc = import_doc(glossary_doctype)
        # doc.save()
    
    # Create the Translation Settings DocType if it doesn't exist
    from .settings import create_translation_settings_doctype
    if not frappe.db.exists("DocType", "Translation Settings"):
        create_translation_settings_doctype()
        print("Created DocType: Translation Settings")
    
    frappe.db.commit()
    print("All required DocTypes have been created successfully.")

def setup_translation_tools():
     """Initial setup for Translation Tools (safe to run during development)"""
    import logging
    from translation_tools.translation_tools.setup.create_doctypes import create_required_doctypes
    from translation_tools.translation_tools.setup.create_workspace import add_translation_tools_link_to_integrations

    logger = logging.getLogger("translation_tools_setup")
    logger.info("Setting up Translation Tools...")

    try:
        logger.info("Creating required DocTypes...")
        create_required_doctypes()
        print("Translation Tools setup is complete.")
        print("✅ Required DocTypes created.")

        logger.info("Creating translation workspace...")
        add_translation_tools_link_to_integrations()
        frappe.db.commit()
        print("✅ Translation Workspace created.")

        print("🎉 Translation Tools setup is complete.")

    except Exception as e:
        logger.error(f"Setup failed: {e}")
        frappe.db.rollback()
        raise