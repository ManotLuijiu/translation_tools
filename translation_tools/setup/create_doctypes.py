import frappe
from frappe.modules.import_file import import_doc_from_dict  # type: ignore


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


def create_po_file_doctypes():
    """Create DocTypes needed for the PO file tracking system"""
    from frappe.modules.import_file import import_doc_from_dict  # type: ignore

    # Create PO File DocType
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
                    "unique": 1,
                },
                {
                    "fieldname": "app_name",
                    "label": "App Name",
                    "fieldtype": "Data",
                    "reqd": 1,
                },
                {
                    "fieldname": "filename",
                    "label": "Filename",
                    "fieldtype": "Data",
                    "reqd": 1,
                },
                {
                    "fieldname": "language",
                    "label": "Language",
                    "fieldtype": "Data",
                },
                {
                    "fieldname": "total_entries",
                    "label": "Total Entries",
                    "fieldtype": "Int",
                    "default": "0",
                },
                {
                    "fieldname": "translated_entries",
                    "label": "Translated Entries",
                    "fieldtype": "Int",
                    "default": "0",
                },
                {
                    "fieldname": "last_modified",
                    "label": "Last Modified",
                    "fieldtype": "Datetime",
                },
                {
                    "fieldname": "translation_status",
                    "label": "Translation Status",
                    "fieldtype": "Percent",
                    "default": "0",
                },
                {
                    "fieldname": "last_scanned",
                    "label": "Last Scanned",
                    "fieldtype": "Datetime",
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
                {
                    "role": "All",
                    "read": 1,
                },
            ],
        }

        doc = import_doc_from_dict(po_file_doctype)
        doc.save()
        frappe.db.commit()
        print("Created DocType: PO File")


def create_signature_doctype():
    """Create DocType for storing user signatures"""
    if not frappe.db.exists("DocType", "User Signature"):
        user_signature_doctype = {
            "doctype": "DocType",
            "name": "User Signature",
            "module": "Translation Tools",
            "custom": 1,
            "autoname": "field:user",
            "fields": [
                {
                    "fieldname": "user",
                    "label": "User",
                    "fieldtype": "Link",
                    "options": "User",
                    "unique": 1,
                    "reqd": 1,
                },
                {
                    "fieldname": "user_full_name",
                    "label": "User Full Name",
                    "fieldtype": "Data",
                    "fetch_from": "user.full_name",
                    "read_only": 1,
                },
                {
                    "fieldname": "signature_section",
                    "label": "Signature",
                    "fieldtype": "Section Break",
                },
                {
                    "fieldname": "signature_image",
                    "label": "Signature Image",
                    "fieldtype": "Attach Image",
                    "description": "Upload your signature image (PNG format recommended)",
                },
                {"fieldname": "signature_column", "fieldtype": "Column Break"},
                {
                    "fieldname": "signature_preview",
                    "label": "Signature Preview",
                    "fieldtype": "HTML",
                    "options": '<img src="{{ doc.signature_image }}" style="max-height: 100px;">',
                },
                {
                    "fieldname": "signature_url",
                    "label": "Signature URL",
                    "fieldtype": "Data",
                    "read_only": 1,
                    "hidden": 1,
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
                {"role": "All", "read": 1, "write": 1, "create": 1, "if_owner": 1},
            ],
        }

        doc = import_doc_from_dict(user_signature_doctype)
        doc.save()
        frappe.db.commit()
        print("✅ Created DocType: User Signature")


def create_settings_page():
    """Create Settings DocType for Translation Tools"""
    if not frappe.db.exists("DocType", "Translation Tools Settings"):
        settings_doctype = {
            "doctype": "DocType",
            "name": "Translation Tools Settings",
            "module": "Translation Tools",
            "custom": 1,
            "issingle": 1,
            "fields": [
                {
                    "fieldname": "pdf_settings_section",
                    "label": "PDF Settings",
                    "fieldtype": "Section Break",
                },
                {
                    "fieldname": "default_font",
                    "label": "Default Font",
                    "fieldtype": "Select",
                    "options": "Sarabun\nNoto Sans Thai\nIBM Plex Thai",
                    "default": "Sarabun",
                },
                {
                    "fieldname": "signature_path",
                    "label": "Signature Storage Path",
                    "fieldtype": "Data",
                    "description": "Path where signature files will be stored (relative to site public folder)",
                    "default": "files/signatures",
                },
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1,
                }
            ],
        }

        doc = import_doc_from_dict(settings_doctype)
        doc.save()
        frappe.db.commit()
        print("✅ Created DocType: Translation Tools Settings")
