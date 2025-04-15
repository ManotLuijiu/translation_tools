import frappe
from frappe import _
from frappe.utils.pdf import get_pdf
from frappe.utils import get_site_name


@frappe.whitelist()
def get_print_data(doc_type, doc_name, print_format=None):
    """Get document data for PDF generation"""
    try:
        # Check permissions
        if not frappe.has_permission(doc_type, "read", doc_name):
            frappe.throw(_("Not permitted to read this document"))

        # Get the document
        doc = frappe.get_doc(doc_type, doc_name)

        # Get print settings
        print_settings = frappe.get_doc("Print Settings", "Print Settings")

        # Get the HTML content
        html = frappe.get_print(doc_type, doc_name, print_format=print_format, doc=doc)

        # Metadata for the PDF
        metadata = {
            "title": f"{doc_type} {doc_name}",
            "doctype": doc_type,
            "docname": doc_name,
            "print_format": print_format,
            "letter_head": print_settings.letter_head,  # type: ignore
            "company": doc.get("company", "") if hasattr(doc, "company") else "",
            "site_name": get_site_name(
                frappe.local.request.host if frappe.local.request else ""
            ),
        }

        return {"html": html, "metadata": metadata}

    except Exception as e:
        frappe.log_error(
            message=f"Error getting print data: {str(e)}", title="PDF Make Error"
        )
        return {"error": str(e)}
