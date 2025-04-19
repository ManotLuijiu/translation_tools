import frappe
import json
import os
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def install_custom_fields():
    """Install custom fields for PDF generation"""
    custom_fields_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        # "translation_tools",
        "custom",
        "print_settings.json",
    )

    with open(custom_fields_file, "r") as f:
        custom_fields = json.load(f)

    create_custom_fields(custom_fields)

    # Set default values
    frappe.db.set_value(
        "Print Settings", "Print Settings", "enable_custom_pdf_generator", 1
    )
    frappe.db.set_value(
        "Print Settings", "Print Settings", "preferred_generator", "WeasyPrint"
    )
    frappe.db.set_value("Print Settings", "Print Settings", "default_font", "Sarabun")
    frappe.db.commit()

    print("✅ Success created custom field")


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
