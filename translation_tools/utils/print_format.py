import frappe
from frappe.utils.pdf import get_pdf
from frappe.utils.print_format import download_pdf as original_download_pdf


@frappe.whitelist()
def download_pdf_with_options(
    doctype,
    name,
    format=None,
    doc=None,
    no_letterhead=None,
    language=None,
    letterhead=None,
    key=None,
):
    """Modified download_pdf to support all PDF generators including WeasyPrint"""

    # Check which PDF generator is requested
    pdf_generator = frappe.form_dict.get("pdf_generator", "wkhtmltopdf")

    # Get the HTML content
    from frappe.www.printview import (
        get_print_format_doc,
        get_rendered_template,
        validate_key,
    )

    if key:
        validate_key(key, doctype)

    if isinstance(language, str):
        frappe.local.lang = language

    if isinstance(doc, str):
        doc = frappe.parse_json(doc)

    html = frappe.get_print(
        doctype,
        name,
        format,
        doc=doc,
        no_letterhead=int(no_letterhead) if no_letterhead is not None else 0,
        letterhead=letterhead,
    )

    # Configure options based on the generator
    options = {"pdf_generator": pdf_generator}

    # For WeasyPrint, use our custom function
    if pdf_generator == "weasyprint":
        from translation_tools.utils.pdf import get_pdf_with_thai_fonts

        pdf_data = get_pdf_with_thai_fonts(html, options)
    else:
        # For wkhtmltopdf and chrome, use the original function but add Thai fonts
        # Add Thai font CSS to the HTML
        font_css = """
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        body, td, tr, div, p, span, h1, h2, h3, h4, h5, h6 { font-family: 'Sarabun', sans-serif !important; }
        """

        if isinstance(html, str) and ("<!DOCTYPE html>" in html or "<html" in html):
            # Full HTML document - inject css into the head
            if "<head>" in html:
                html = html.replace("<head>", f"<head><style>{font_css}</style>")
            else:
                html = html.replace(
                    "<html", f"<html><head><style>{font_css}</style></head>"
                )
        else:
            # Fragment - add style tag at the beginning
            html = f"<style>{font_css}</style>{html}"

        # Use the original function with modified HTML
        from frappe.utils.pdf import get_pdf

        pdf_data = get_pdf(html, options)

    # Set the response
    frappe.local.response.filename = "{name}.pdf".format(
        name=name.replace(" ", "-").replace("/", "-")
    )
    frappe.local.response.filecontent = pdf_data
    frappe.local.response.type = "pdf"
