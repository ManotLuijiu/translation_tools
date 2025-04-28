import frappe
import os
from frappe.utils import get_site_path
from frappe.utils.pdf import get_wkhtmltopdf_version, get_print_format_styles
import json

print(f"pdf_utils.py wkhtmltopdf version: {get_wkhtmltopdf_version}")


def get_print_style_with_thai(style=None, print_format=None):
    """Override get_print_style to add Thai font support"""
    from frappe.www.printview import get_print_style as original_get_print_style

    # Get the original style
    original_style = original_get_print_style(style, print_format)

    # Add Thai font support
    thai_font_css = """
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    body, td, tr, div, p, span, h1, h2, h3, h4, h5, h6 {
        font-family: 'Sarabun', sans-serif !important;
    }
    """

    return original_style + thai_font_css


def get_pdf_styles():
    """Add Thai font support to PDF styles"""
    # Try different approaches to get the original styles
    try:
        # First attempt - direct import
        from frappe.utils.pdf import get_pdf_styles as original_get_styles  # type: ignore

        styles = original_get_styles()
    except (ImportError, AttributeError):
        try:
            # Second attempt - get_print_style function from printview
            from frappe.www.printview import get_print_style

            styles = get_print_style(style=None, print_format=None)
        except (ImportError, AttributeError):
            # Fallback to an empty string if we can't find the original styles
            styles = ""
            frappe.log_error("Could not find original PDF styles")

    # Add Thai font support
    thai_font_css = """
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
    
    body, td, tr, div, p, span, h1, h2, h3, h4, h5, h6 {
        font-family: 'Sarabun', sans-serif !important;
    }
    """

    return styles + thai_font_css


# from frappe.utils.pdf import get_pdf_styles as original_get_pdf_styles


# def get_pdf_generator_settings():
#     """Get PDF generator settings for use in Jinja templates"""
#     settings = {
#         "enable_custom_pdf_generator": frappe.db.get_single_value(
#             "Print Settings", "enable_custom_pdf_generator"
#         )
#         or 0,
#         "preferred_generator": frappe.db.get_single_value(
#             "Print Settings", "preferred_generator"
#         )
#         or "WeasyPrint",
#         "default_font": frappe.db.get_single_value("Print Settings", "default_font")
#         or "Sarabun",
#     }
#     return json.dumps(settings)


# def get_sarabun_pdf_font_styles():
#     """Define Sarabun font styles"""
#     return """
#     @font-face {
#         font-family: "Sarabun";
#         src: url("file:///assets/translation_tools/fonts/Sarabun-Regular.ttf") format("truetype");
#         font-weight: normal;
#         font-style: normal;
#     }
#     @font-face {
#         font-family: "Sarabun";
#         src: url("file:///assets/translation_tools/fonts/Sarabun-Bold.ttf") format("truetype");
#         font-weight: bold;
#         font-style: normal;
#     }
#     @font-face {
#         font-family: "Sarabun";
#         src: url("file:///assets/translation_tools/fonts/Sarabun-Italic.ttf") format("truetype");
#         font-weight: normal;
#         font-style: italic;
#     }
#     @font-face {
#         font-family: "Sarabun";
#         src: url("file:///assets/translation_tools/fonts/Sarabun-BoldItalic.ttf") format("truetype");
#         font-weight: bold;
#         font-style: italic;
#     }

#     body, * {
#         font-family: "Sarabun", sans-serif !important;
#     }
#     """


# def get_pdf_styles():
#     """Override global PDF styles to include Sarabun"""
#     print_settings = frappe.get_doc("Print Settings", "Print Settings")
#     font = print_settings.get("default_font", "Sarabun")

#     # Get the base path for fonts
#     site_path = get_site_path()

#     print("site_path", site_path)

#     # return f"<style>{original_get_pdf_styles()}\n{get_custom_pdf_font_styles()}</style>"
#     # Return custom CSS
#     return f"""
#     @font-face {{
#         font-family: '{font}';
#         src: url('/assets/translation_tools/fonts/{font}/{font}-Regular.ttf') format('truetype');
#         font-weight: normal;
#         font-style: normal;
#     }}

#     @font-face {{
#         font-family: '{font}';
#         src: url('/assets/translation_tools/fonts/{font}/{font}-Bold.ttf') format('truetype');
#         font-weight: bold;
#         font-style: normal;
#     }}

#     @font-face {{
#         font-family: '{font}';
#         src: url('/assets/translation_tools/fonts/{font}/{font}-Italic.ttf') format('truetype');
#         font-weight: normal;
#         font-style: italic;
#     }}

#     @font-face {{
#         font-family: '{font}';
#         src: url('/assets/translation_tools/fonts/{font}/{font}-BoldItalic.ttf') format('truetype');
#         font-weight: bold;
#         font-style: italic;
#     }}

#     body {{
#         font-family: '{font}', sans-serif;
#     }}

#     .print-format {{
#         font-family: '{font}', sans-serif;
#     }}

#     .tw-text-base {{
#         font-size: 1rem;
#         line-height: 1.5rem;
#     }}

#     .tw-font-bold {{
#         font-weight: bold;
#     }}
#     """


def get_pdf_generator_settings():
    """Get PDF generator settings for Jinja templates"""
    print_settings = frappe.get_doc("Print Settings", "Print Settings")
    return {
        "generator": print_settings.get("pdf_generator", "WeasyPrint"),
        "font": print_settings.get("default_font", "Sarabun"),
    }


def get_sarabun_pdf_font_styles():
    """Return font style definitions for pdfmake"""
    return json.dumps(
        {
            "Sarabun": {
                "normal": "/assets/translation_tools/fonts/Sarabun/Sarabun-Regular.ttf",
                "bold": "/assets/translation_tools/fonts/Sarabun/Sarabun-Bold.ttf",
                "italics": "/assets/translation_tools/fonts/Sarabun/Sarabun-Italic.ttf",
                "bolditalics": "/assets/translation_tools/fonts/Sarabun/Sarabun-BoldItalic.ttf",
            },
            "Prompt": {
                "normal": "/assets/translation_tools/fonts/Prompt/Prompt-Regular.ttf",
                "bold": "/assets/translation_tools/fonts/Prompt/Prompt-Bold.ttf",
                "italics": "/assets/translation_tools/fonts/Prompt/Prompt-Italic.ttf",
                "bolditalics": "/assets/translation_tools/fonts/Prompt/Prompt-BoldItalic.ttf",
            },
            "Kanit": {
                "normal": "/assets/translation_tools/fonts/Kanit/Kanit-Regular.ttf",
                "bold": "/assets/translation_tools/fonts/Kanit/Kanit-Bold.ttf",
                "italics": "/assets/translation_tools/fonts/Kanit/Kanit-Italic.ttf",
                "bolditalics": "/assets/translation_tools/fonts/Kanit/Kanit-BoldItalic.ttf",
            },
        }
    )
