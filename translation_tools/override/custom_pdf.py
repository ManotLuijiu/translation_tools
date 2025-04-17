import frappe
from frappe import _
from weasyprint import HTML
import base64
import os
import tempfile


def get_pdf(html, options=None, output=None):
    """
    Replace the default wkhtmltopdf PDF generation with WeasyPrint

    Args:
        html: HTML content to convert to PDF
        options: Dictionary of PDF options (will be adapted for WeasyPrint)
        output: Output file path (optional)

    Returns:
        PDF content as binary string
    """
    try:
        # Process options for WeasyPrint (adapt wkhtmltopdf options to WeasyPrint)
        weasy_options = {}

        if options:
            # Map common wkhtmltopdf options to WeasyPrint equivalents
            if "margin-top" in options:
                weasy_options["margin_top"] = options["margin-top"].replace("mm", "")
            if "margin-right" in options:
                weasy_options["margin_right"] = options["margin-right"].replace(
                    "mm", ""
                )
            if "margin-bottom" in options:
                weasy_options["margin_bottom"] = options["margin-bottom"].replace(
                    "mm", ""
                )
            if "margin-left" in options:
                weasy_options["margin_left"] = options["margin-left"].replace("mm", "")

            # Handle page size
            if "page-size" in options:
                weasy_options["page_size"] = options["page-size"]

        # Generate PDF using WeasyPrint
        pdf_content = HTML(string=html).write_pdf(**weasy_options)

        # Handle output file if provided
        if output:
            with open(output, "wb") as f:
                if pdf_content is not None:
                    f.write(pdf_content)
                else:
                    raise ValueError("PDF content is None and cannot be written to the file.")

        return pdf_content

    except Exception as e:
        frappe.log_error(
            f"WeasyPrint PDF generation error: {str(e)}", "PDF Generation Error"
        )
        # Fallback to the original method if there's an error
        from frappe.utils.pdf import get_pdf as original_get_pdf

        return original_get_pdf(html, options=options, output=output)
