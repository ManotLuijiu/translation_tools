import frappe

def create_translation_page():
    """Create a page for the Thai Translation Dashboard"""
    if frappe.db.exists("Page", "thai-translation-dashboard"):
        return
    
    page = frappe.new_doc("Page")
    page.page_name = "thai-translation-dashboard"
    page.title = "Thai Translation Dashboard"
    page.module = "Translation Tools"
    page.standard = "Yes"
    
    page.insert(ignore_permissions=True)
    frappe.db.commit()
    
    print("Created Thai Translation Dashboard page")