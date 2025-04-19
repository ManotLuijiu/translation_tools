import frappe

def execute():
    if not frappe.db.exists("Custom Field", "Print Settings-default_font"):
        frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Print Settings",
            "fieldname": "default_font",
            "label": "Default Font",
            "fieldtype": "Select",
            "insert_after": "pdf_page_size",
            "options": "\n".join([
                "Sarabun",
                "Inter",
                "Prompt",
                "Kanit",
                "IBM Plex Sans Thai",
                "Pridi",
                "Mitr"
            ]),
            "default": "Sarabun"
        }).insert()
