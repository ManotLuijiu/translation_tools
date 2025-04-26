import frappe
from frappe import utils


def update_workspace_icon():
    if frappe.db.exists("Workspace", "Your Workspace"):
        workspace = frappe.get_doc("Workspace", "Your Workspace")
        workspace.icon = "tool"  # type: ignore
        # Force update by setting a timestamp
        workspace.modified = utils.now()
        workspace.save(ignore_permissions=True)
        frappe.db.commit()
