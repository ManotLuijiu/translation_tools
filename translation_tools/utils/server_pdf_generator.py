import frappe
import os
import json
from frappe.utils import cstr, add_to_date, now
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration
from frappe.utils.pdf import get_file_data_from_writer
from PyPDF2 import PdfReader, PdfWriter


class WeasyPrintPDFGenerator:
    def __init__(self, html, options=None):
        self.html = html
        self.options = options or {}

    def _get_header_html(self):
        return self.options.get("header_html") or ""

    def _get_footer_html(self):
        return self.options.get("footer_html") or ""

    def _get_pdf_content(self, html):
        font_config = FontConfiguration()
        base_url = frappe.utils.get_url()

        # Add custom Sarabun font CSS
        font_css = CSS(
            string="""
            @font-face {
                font-family: 'Sarabun';
                src: url('/assets/translation_tools/fonts/Sarabun/Sarabun-Regular.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
            @font-face {
                font-family: 'Sarabun';
                src: url('/assets/translation_tools/fonts/Sarabun/Sarabun-Bold.ttf') format('truetype');
                font-weight: bold;
                font-style: normal;
            }
            body {
                font-family: 'Sarabun', sans-serif;
            }
        """
        )

        return HTML(string=html, base_url=base_url).render(
            font_config=font_config, stylesheets=[font_css]
        )

    def get_pdf(self):
        output = PdfWriter()

        # Generate main content
        main_doc = self._get_pdf_content(self.html)
        main_file = main_doc.write_pdf()
        output.append(PdfReader(main_file))

        # Return the combined PDF
        return get_file_data_from_writer(output)
