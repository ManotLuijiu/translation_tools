import frappe
from frappe import _


def get_context(context):
    context.title = _("Thai Translation Dashboard")
    context.doc_title = _("Thai Translation Dashboard")
    context.no_cache = 1


@frappe.whitelist()
def get_app_version():
    """Get the version of the Translation Tools app"""
    apps = frappe.get_all_apps()
    for app in apps:
        if app == "translation_tools":
            try:
                return frappe.get_attr(f"{app}.__version__")
            except AttributeError:
                return "Unknown"
    return "Unknown"


@frappe.whitelist()
def check_setup_status():
    """
    Check if the required doctypes and settings have been created
    """
    # Check if required doctypes exist
    doctypes = [
        "PO File",
        # "ERPNext Module",
        "Translation Glossary Term",
        "Translation Tools Settings",
    ]

    setup_status = {"complete": True, "missing_doctypes": []}

    for dt in doctypes:
        if not frappe.db.exists("DocType", dt):
            setup_status["complete"] = False
            setup_status["missing_doctypes"].append(dt)

    return setup_status


@frappe.whitelist()
def run_setup():
    """Run the initial setup for the Translation Tools app"""
    if not frappe.has_permission("System Manager", "write"):
        frappe.throw("You don't have permission to run setup")

    try:
        # Import and run setup
        from translation_tools.api.setup import setup_translation_tools

        setup_translation_tools()

        return {"success": True, "message": "Setup completed successfully"}
    except Exception as e:
        frappe.log_error(f"Error in Translation Tools setup: {str(e)}")
        return {"success": False, "error": str(e)}


# @frappe.whitelist()
# def scan_for_po_files():
#     """Run a scan for PO files"""
#     if not frappe.has_permission("Translation Tools", "write"):
#         frappe.throw("You don't have permission to scan for PO files")

#     try:
#         from translation_tools.api.po_files import scan_po_files
#         result = scan_po_files()
#         return result
#     except Exception as e:
#         frappe.log_error(f"Error scanning for PO files: {str(e)}")
#         return {"success": False, "error": str(e)}
