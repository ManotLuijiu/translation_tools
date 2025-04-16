# File: your_app/your_app/override/custom_sales_invoice.py
import frappe
from frappe.utils.pdf import get_pdf
from frappe import _
from erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice
from weasyprint import HTML
import os
import base64

class CustomSalesInvoice(SalesInvoice):
    def on_submit(self):
        super(CustomSalesInvoice, self).on_submit()
        self.generate_and_attach_pdf()
    
    def generate_and_attach_pdf(self):
        """Generate PDF using WeasyPrint and attach to document"""
        try:
            # Get the print format
            print_format = frappe.db.get_value("Print Format", 
                {"doc_type": "Sales Invoice", "default_print_format": 1}, "name")
            if not print_format:
                print_format = "Standard"
            
            # Render the HTML template
            html = frappe.get_print(self.doctype, self.name, print_format, doc=self)
            
            # Generate PDF with WeasyPrint
            pdf_content = HTML(string=html).write_pdf()
            
            # Save PDF to Frappe File
            file_name = f"{self.name}_invoice.pdf"
            
            # Check if the file already exists
            existing_file = frappe.get_all("File", 
                filters={"file_name": file_name, "attached_to_name": self.name}, 
                fields=["name"])
            
            if existing_file:
                # Update existing file
                file_doc = frappe.get_doc("File", existing_file[0].name)
                file_doc.file_size = len(pdf_content)
                file_doc.content = base64.b64encode(pdf_content).decode('utf-8')
                file_doc.save(ignore_permissions=True)
            else:
                # Create new file
                file_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": file_name,
                    "attached_to_doctype": self.doctype,
                    "attached_to_name": self.name,
                    "is_private": 1,
                    "content": base64.b64encode(pdf_content).decode('utf-8'),
                })
                file_doc.insert(ignore_permissions=True)
                
            frappe.msgprint(_("Invoice PDF has been attached to this document"))
            
        except Exception as e:
            frappe.log_error(f"Failed to generate PDF for {self.name}: {str(e)}", 
                            "PDF Generation Error")
            frappe.msgprint(_("Failed to generate PDF. Please check the error log."))