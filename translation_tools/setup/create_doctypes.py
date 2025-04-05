import frappe
from frappe.modules.import_file import import_doc_from_dict


def create_glossary_doctypes():
    """Create DocTypes needed for the Thai Glossary system"""

    # Create ERPNext Module DocType
    if not frappe.db.exists("DocType", "ERPNext Module"):
        # Define the DocType as a dictionary
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
        doc = import_doc_from_dict(module_doctype)
        doc.save()
        print("Created DocType: ERPNext Module")

    # Create Translation Glossary Term DocType
    if not frappe.db.exists("DocType", "Translation Glossary Term"):
        # Define the DocType as a dictionary
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
        doc = import_doc_from_dict(glossary_doctype)
        doc.save()
        print("Created DocType: Translation Glossary Term")
