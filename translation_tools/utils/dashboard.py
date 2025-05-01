import frappe


@frappe.whitelist()
def get_translation_progress():
    """Calculate the percentage of approved translations"""
    try:
        total = frappe.db.count("Translation Glossary Term")
        if not total:
            return 0

        approved = frappe.db.count("Translation Glossary Term", {"is_approved": 1})
        percentage = (approved / total) * 100
        return round(percentage, 1)
    except Exception as e:
        frappe.log_error(f"Error calculating translation progress: {e}")
        return 0
