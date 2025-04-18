import frappe
import json


def get_pdf_generator_settings():
    """Get PDF generator settings for use in Jinja templates"""
    settings = {
        "enable_custom_pdf_generator": frappe.db.get_single_value(
            "Print Settings", "enable_custom_pdf_generator"
        )
        or 0,
        "preferred_generator": frappe.db.get_single_value(
            "Print Settings", "preferred_generator"
        )
        or "WeasyPrint",
        "default_font": frappe.db.get_single_value("Print Settings", "default_font")
        or "Sarabun",
    }
    return json.dumps(settings)
