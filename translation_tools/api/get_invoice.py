import frappe
from frappe import _
import json


@frappe.whitelist()
def get_sales_invoice_data(doctype, invoice_name):
    """Get sales invoice data for client-side PDF generation"""
    if not invoice_name or not doctype:
        return None

    invoice = frappe.get_doc(doctype, invoice_name)

    print("invoice", invoice)

    # Prepare data for pdfmake
    data = {
        "name": invoice.name,
        "posting_date": str(invoice.get("posting_date", "")),
        "customer_name": invoice.get("customer_name", ""),
        "grand_total": invoice.get("grand_total", 0),
        "items": [],
    }

    for item in getattr(invoice, "items", []):
        data["items"].append(
            {
                "item_name": item.item_name,
                "qty": item.qty,
                "rate": item.rate,
                "discount_amount": item.discount_amount,
                "amount": item.amount,
            }
        )

    return data
