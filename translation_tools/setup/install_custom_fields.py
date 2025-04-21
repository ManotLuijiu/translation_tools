import frappe
import json
import os
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

import frappe

def install_custom_fields():
    """Install Custom Fields for PDF generation"""
    
    if not frappe.db.exists("Custom Field", "Print Settings-pdf_generator"):
        # Add PDF generator selector
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Print Settings",
            "fieldname": "pdf_generator",
            "label": "PDF Generator",
            "fieldtype": "Select",
            "insert_after": "print_style",
            "options": "wkhtmltopdf\nWeasyPrint\npdfmake",
            "default": "WeasyPrint",
            "reqd": 1,
            "description": "Select the PDF generator to use for printing"
        }).insert(ignore_permissions=True)
    
    if not frappe.db.exists("Custom Field", "Print Settings-default_font"):
        # Add default font selector
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Print Settings",
            "fieldname": "default_font",
            "label": "Default Font",
            "fieldtype": "Select",
            "insert_after": "pdf_generator",
            "options": "\n".join([
                "Sarabun",
                "Inter",
                "Prompt",
                "Kanit",
                "IBM Plex Sans Thai",
                "Pridi",
                "Mitr"
            ]),
            "default": "Sarabun",
            "description": "Select the default font for printing"
        }).insert(ignore_permissions=True)
    
    # Update Print Format's PDF Generator property setter
    if not frappe.db.exists("Property Setter", {
        "doc_type": "Print Format",
        "field_name": "pdf_generator",
        "property": "options"
    }):
        frappe.get_doc({
            "doctype": "Property Setter",
            "doc_type": "Print Format",
            "field_name": "pdf_generator",
            "property": "options",
            "property_type": "Text",
            "value": "wkhtmltopdf\nWeasyPrint\npdfmake"
        }).insert(ignore_permissions=True)
    
    frappe.db.commit()

# def install_custom_fields():
#     """Install custom fields for PDF generation"""
#     custom_fields_file = os.path.join(
#         os.path.dirname(os.path.abspath(__file__)),
#         "..",
#         # "translation_tools",
#         "custom",
#         "print_settings.json",
#     )

#     with open(custom_fields_file, "r") as f:
#         custom_fields = json.load(f)

#     create_custom_fields(custom_fields)

#     # Set default values
#     frappe.db.set_value(
#         "Print Settings", "Print Settings", "enable_custom_pdf_generator", 1
#     )
#     frappe.db.set_value(
#         "Print Settings", "Print Settings", "preferred_generator", "WeasyPrint"
#     )
#     frappe.db.set_value("Print Settings", "Print Settings", "default_font", "Sarabun")
#     frappe.db.commit()

#     print("✅ Success created custom field")


# def setup_print_font_custom_field():
#     custom_fields = {
#         "Print Settings": [
#             {
#                 "fieldname": "print_font",
#                 "label": "Font Style for Printing",
#                 "fieldtype": "Select",
#                 "options": "Sarabun\nNoto Sans Thai\nIBM Plex Thai",
#                 "insert_after": "print_style",
#                 "description": "Select the font to use for PDF printing",
#             }
#         ]
#     }

#     create_custom_fields(custom_fields)
#     frappe.db.commit()
