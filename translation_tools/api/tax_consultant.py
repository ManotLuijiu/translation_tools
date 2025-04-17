import frappe
from frappe import _


@frappe.whitelist()
def get_license_key():
    """Get the tax consultant API license key from settings"""
    try:
        settings = frappe.get_doc("Translation Tools Settings")
        if settings and getattr(settings, "tax_consultant_license_key", None):
            return {
                "license_key": getattr(settings, "tax_consultant_license_key", None)
            }
        else:
            frappe.log_error("Tax consultant license key not configured")
            return {"error": "License key not configured"}
    except Exception as e:
        frappe.log_error(f"Error retrieving tax consultant license key: {str(e)}")
        return {"error": str(e)}
