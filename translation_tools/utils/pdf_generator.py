import frappe
import os
import tempfile
from weasyprint import HTML, CSS
from frappe.utils import get_url, get_files_path


class WeasyPrintGenerator:
    def __init__(self, html, options=None):
        self.html = html
        self.options = options or {}

    def get_pdf(self, html=None, options=None):
        """Generate PDF using WeasyPrint"""
        if html:
            self.html = html
        if options:
            self.options.update(options)

        self.temp_files = []
        output_file = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        self.temp_files.append(output_file.name)

        # Add custom CSS if provided
        stylesheets = []
        if self.options.get("css"):
            css_file = tempfile.NamedTemporaryFile(suffix=".css", delete=False)
            css_file.write(self.options["css"].encode("utf-8"))
            css_file.close()
            self.temp_files.append(css_file.name)
            stylesheets.append(CSS(filename=css_file.name))

        # Generate PDF with WeasyPrint
        HTML(string=self.html).write_pdf(output_file.name, stylesheets=stylesheets)

        with open(output_file.name, "rb") as pdf_file:
            pdf_content = pdf_file.read()

        # Clean up temporary files
        self.cleanup_temporary_files()

        return pdf_content

    def cleanup_temporary_files(self):
        """Clean up temporary files created during PDF generation"""
        for file_path in self.temp_files:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except (OSError, IOError):
                    # Log the error but don't raise an exception
                    frappe.log_error(f"Error removing temporary file: {file_path}")

    def get_file_name(self, doctype, docname):
        """Generate a filename for the PDF"""
        return f"{doctype}_{docname}.pdf"

    def save_pdf(self, doctype, docname, save_path=None):
        """Save the PDF to disk"""
        pdf_content = self.get_pdf()

        if not save_path:
            save_path = get_files_path()

        file_name = self.get_file_name(doctype, docname)
        file_path = os.path.join(save_path, file_name)

        with open(file_path, "wb") as f:
            f.write(pdf_content)

        return file_path

    def attach_pdf_to_doc(self, doctype, docname, file_name=None):
        """Attach the generated PDF to a document"""
        pdf_content = self.get_pdf()

        if not file_name:
            file_name = self.get_file_name(doctype, docname)

        # Create a File document
        file_doc = frappe.get_doc(
            {
                "doctype": "File",
                "file_name": file_name,
                "attached_to_doctype": doctype,
                "attached_to_name": docname,
                "content": pdf_content,
                "is_private": 1,
            }
        )
        file_doc.insert()

        return file_doc

    def get_pdf_with_letterhead(
        self, doctype, docname, print_format=None, letterhead=None
    ):
        """Generate PDF with letterhead for a specific document"""
        # Get the HTML content with letterhead
        html = frappe.get_print(
            doctype=doctype,
            name=docname,
            print_format=print_format,
            letterhead=letterhead,
        )

        return self.get_pdf(html=html)

    def convert_html_to_pdf(self, html_string, options=None):
        """Convert any HTML string to PDF"""
        return self.get_pdf(html=html_string, options=options)
