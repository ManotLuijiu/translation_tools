import frappe
import os


def create_thai_tax_invoice_print_format():
    """Create Thai Tax Invoice print format for Sales Invoice"""

    # Get the HTML content
    html_file_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "templates",
        "print_formats",
        "thai_tax_invoice.html",
    )

    with open(html_file_path, "r") as f:
        html_content = f.read()

    # Check if print format already exists
    if frappe.db.exists("Print Format", "Thai Tax Invoice"):
        # Update existing print format
        pf = frappe.get_doc("Print Format", "Thai Tax Invoice")
        pf.set("html", html_content)
        pf.save()
        print("✅ Updated Print Format: Thai Tax Invoice")
    else:
        # Create new print format
        pf = frappe.get_doc(
            {
                "doctype": "Print Format",
                "name": "Thai Tax Invoice",
                "doc_type": "Sales Invoice",
                "custom_format": 1,
                "standard": "No",
                "print_format_type": "Jinja",
                "html": html_content,
                "disabled": 0,
                "module": "Translation Tools",
            }
        )
        pf.insert(ignore_permissions=True)
        print("✅ Created Print Format: Thai Tax Invoice")

    frappe.db.commit()


def create_thai_accounting_voucher_print_format():
    """Create Thai Accounting Voucher print format for Journal Entry"""

    # Get the HTML content
    html_file_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "templates",
        "print_formats",
        "thai_accounting_voucher.html",
    )

    with open(html_file_path, "r") as f:
        html_content = f.read()

    # Check if print format already exists
    if frappe.db.exists("Print Format", "Thai Accounting Voucher"):
        # Update existing print format
        pf = frappe.get_doc("Print Format", "Thai Accounting Voucher")
        pf.html = html_content  # type: ignore
        pf.save()
        print("✅ Updated Print Format: Thai Accounting Voucher")
    else:
        # Create new print format
        pf = frappe.get_doc(
            {
                "doctype": "Print Format",
                "name": "Thai Accounting Voucher",
                "doc_type": "Journal Entry",
                "custom_format": 1,
                "standard": "No",
                "print_format_type": "Jinja",
                "html": html_content,
                "disabled": 0,
                "module": "Translation Tools",
            }
        )
        pf.insert(ignore_permissions=True)
        print("✅ Created Print Format: Thai Accounting Voucher")

    frappe.db.commit()


def set_default_print_formats():
    """Set default print formats for various doctypes"""

    # Set default print format for Journal Entry
    if frappe.db.exists("Print Format", "Thai Accounting Voucher"):
        frappe.db.set_value(
            "DocType",
            "Journal Entry",
            "default_print_format",
            "Thai Accounting Voucher",
        )
        print("✅ Set Thai Accounting Voucher as default for Journal Entry")

    # Set default print format for Sales Invoice
    if frappe.db.exists("Print Format", "Thai Tax Invoice"):
        frappe.db.set_value(
            "DocType", "Sales Invoice", "default_print_format", "Thai Tax Invoice"
        )
        print("✅ Set Thai Tax Invoice as default for Sales Invoice")

    frappe.db.commit()
