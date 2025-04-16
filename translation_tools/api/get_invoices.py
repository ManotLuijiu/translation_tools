import frappe
from frappe import _
import json

@frappe.whitelist()
def get_sales_invoice_data(invoice_name):
    """Get sales invoice data for client-side PDF generation"""
    if not invoice_name:
        return None
        
    invoice = frappe.get_doc("Sales Invoice", invoice_name)
    
    # Prepare data for pdfmake
    data = {
        "name": invoice.name,
        "posting_date": invoice.posting_date,
        "customer_name": invoice.customer_name,
        "grand_total": invoice.grand_total,
        "items": []
    }
    
    for item in invoice.items:
        data["items"].append({
            "item_name": item.item_name,
            "qty": item.qty,
            "rate": item.rate,
            "discount_amount": item.discount_amount,
            "amount": item.amount
        })
    
    return data