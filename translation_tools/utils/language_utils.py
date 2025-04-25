import frappe


@frappe.whitelist()
def set_language(language):
    """Set the language for the current user"""
    frappe.db.set_value("User", frappe.session.user, "language", language)
    return {"message": "Language updated successfully"}
