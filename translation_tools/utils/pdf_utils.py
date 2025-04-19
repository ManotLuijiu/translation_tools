import frappe
import json

# from frappe.utils.pdf import get_pdf_styles as original_get_pdf_styles


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


def get_sarabun_pdf_font_styles():
    """Define Sarabun font styles"""
    return """
    @font-face {
        font-family: "Sarabun";
        src: url("file:///assets/translation_tools/fonts/Sarabun-Regular.ttf") format("truetype");
        font-weight: normal;
        font-style: normal;
    }
    @font-face {
        font-family: "Sarabun";
        src: url("file:///assets/translation_tools/fonts/Sarabun-Bold.ttf") format("truetype");
        font-weight: bold;
        font-style: normal;
    }
    @font-face {
        font-family: "Sarabun";
        src: url("file:///assets/translation_tools/fonts/Sarabun-Italic.ttf") format("truetype");
        font-weight: normal;
        font-style: italic;
    }
    @font-face {
        font-family: "Sarabun";
        src: url("file:///assets/translation_tools/fonts/Sarabun-BoldItalic.ttf") format("truetype");
        font-weight: bold;
        font-style: italic;
    }

    body, * {
        font-family: "Sarabun", sans-serif !important;
    }
    """


def get_pdf_styles():
    """Override global PDF styles to include Sarabun"""
    # return f"<style>{original_get_pdf_styles()}\n{get_custom_pdf_font_styles()}</style>"
    return """
        <style>
            body { font-family: Inter, sans-serif; }
        </style>
    """
