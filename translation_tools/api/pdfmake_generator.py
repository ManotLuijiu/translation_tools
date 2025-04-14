import frappe
from frappe import _
from frappe.www.printview import get_rendered_template


@frappe.whitelist()
def get_print_data(doc_type, doc_name, print_format=None, lang=None):
    """Return printable data for frontend PDFMake"""
    doc = frappe.get_doc(doc_type, doc_name)
    html = get_rendered_template(doc_type, doc_name, print_format, doc)

    return {
        "doc_type": doc_type,
        "doc_name": doc_name,
        "html": html,
        "metadata": {"title": doc.get("title") or f"{doc_type} - {doc_name}", "lang": lang or frappe.local.lang},
    }
