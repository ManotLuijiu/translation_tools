import frappe
import frappe.defaults

@frappe.whitelist()
def get_preferred_font(company=None):
    """Returns the preferred font for printing
    
    Args:
        company (str, optional): Company name. If not provided, uses user's default company.
    
    Returns:
        str: Font name (defaults to 'Sarabun' if no preference set)
    """
    try:
        if not company:
            company = frappe.defaults.get_user_default("Company") or \
            frappe.defaults.get_global_default("company")
        if company:
            return frappe.db.get_value("Company", company, "default_print_font") or "Sarabun"
        return "Sarabun"
    except Exception as e:
        frappe.log_error(frappe.get_traceback(),"Failed to get preferred font", str(e))
        return "Sarabun"