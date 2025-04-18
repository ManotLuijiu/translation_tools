import frappe
import json
import os
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def install_custom_fields():
    """Install custom fields for PDF generation"""
    custom_fields_file = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), 
        "..", "translation_tools", "custom", "print_settings.json"
    )
    
    with open(custom_fields_file, 'r') as f:
        custom_fields = json.load(f)
    
    create_custom_fields(custom_fields)
    
    # Set default values
    frappe.db.set_value("Print Settings", "Print Settings", "enable_custom_pdf_generator", 1)
    frappe.db.set_value("Print Settings", "Print Settings", "preferred_generator", "WeasyPrint")
    frappe.db.set_value("Print Settings", "Print Settings", "default_font", "Sarabun")
    frappe.db.commit()