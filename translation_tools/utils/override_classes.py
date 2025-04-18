import frappe
from frappe.utils.pdf import get_pdf
from frappe.core.doctype.print_format.print_format import PrintFormat
from translation_tools.translation_tools.server_pdf_generator import (
    WeasyPrintPDFGenerator,
)


class CustomPrintFormat(PrintFormat):
    def get_pdf(
        self,
        name,
        print_format=None,
        doc=None,
        no_letterhead=0,
        language=None,
        letterhead=None,
    ):
        html = self.get_html(
            name, print_format, doc, no_letterhead, language, letterhead
        )

        if frappe.db.get_single_value("Print Settings", "enable_custom_pdf_generator"):
            return WeasyPrintPDFGenerator(html).get_pdf()
        else:
            return get_pdf(html)
