import frappe
from frappe.utils.pdf import get_pdf as original_get_pdf
import subprocess
import tempfile
import os


def get_pdf_with_thai_fonts(html, options=None, output=None):
    """Generate PDF with better error handling for Thai fonts using multiple engines"""
    options = options or {}

    # Check system load
    try:
        import os

        load1, load5, load15 = os.getloadavg()
        if load1 > 2.0:  # Arbitrary threshold
            frappe.log_error(
                f"System load high ({load1}), using wkhtmltopdf instead of WeasyPrint"
            )
            options["pdf_generator"] = "wkhtmltopdf"
    except:
        pass

    # Get the actual generator (use WeasyPrint if explicitly set in custom code)
    pdf_generator = options.get("pdf_generator", "wkhtmltopdf")
    use_weasyprint = pdf_generator == "weasyprint"

    # Force a valid generator recognized by Frappe for type checking
    if use_weasyprint:
        options["pdf_generator"] = (
            "wkhtmltopdf"  # Use a valid value for Frappe's type system
        )

    # Add Thai font support to the HTML
    font_css = """
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
    body, td, tr, div, p, span, h1, h2, h3, h4, h5, h6 { font-family: 'Sarabun', sans-serif !important; }
    """

    if "<!DOCTYPE html>" in html or "<html" in html:
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

    # Use WeasyPrint if specified
    if use_weasyprint:
        try:
            from weasyprint import HTML, CSS

            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as pdf_file:
                pdf_path = pdf_file.name

            # Generate PDF with WeasyPrint
            HTML(string=html).write_pdf(pdf_path, stylesheets=[CSS(string=font_css)])

            # Read the generated PDF
            with open(pdf_path, "rb") as f:
                pdf_content = f.read()

            # Cleanup
            os.unlink(pdf_path)

            frappe.log_error("WeasyPrint PDF generation successful")
            return pdf_content
        except Exception as e:
            frappe.log_error(f"WeasyPrint PDF generation failed: {str(e)}")
            # Fall back to the original method

    # If not using WeasyPrint or it failed, use the original method
    try:
        return original_get_pdf(html, options, output)
    except Exception as e:
        frappe.log_error(f"Original PDF generation failed: {str(e)}")
        raise
