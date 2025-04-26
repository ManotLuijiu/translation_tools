import frappe
from frappe.utils.pdf import get_pdf as original_get_pdf
from weasyprint import HTML, CSS
import tempfile
import os


def get_pdf_with_thai_fonts(html, options=None):
    """Generate PDF with WeasyPrint that properly supports Thai fonts"""

    # Add font CSS to HTML
    font_css = """
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap');
    body { font-family: 'Sarabun', sans-serif; }
    """

    html = f"<style>{font_css}</style>{html}"

    # Create temp file for the PDF
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp_path = tmp.name

    # Generate PDF with WeasyPrint
    HTML(string=html).write_pdf(tmp_path, stylesheets=[CSS(string=font_css)])

    # Read the generated PDF
    with open(tmp_path, "rb") as f:
        pdf_content = f.read()

    # Cleanup
    os.unlink(tmp_path)

    return pdf_content
