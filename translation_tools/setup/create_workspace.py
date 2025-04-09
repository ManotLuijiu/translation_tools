import frappe
from frappe import _

def create_translation_workspace():
    """Create a workspace for the Thai Translation Dashboard"""
    if frappe.db.exists("Workspace", "Thai Translation"):
        return
    
    workspace = frappe.new_doc("Workspace")
    workspace.name = "Thai Translation"
    workspace.label = "Thai Translation"
    workspace.icon = "translate"
    workspace.category = "Modules"
    workspace.is_hidden = 0
    workspace.module = "Translation Tools"
    workspace.charts = []
    workspace.shortcuts = [
        {
            "icon": "translate",
            "label": _("Translation Dashboard"),
            "type": "URL",
            "url": "/thai_translation_dashboard",
            "description": _("AI-powered Translation Dashboard"),
        }
    ]
    workspace.links = [
        {
            "label": _("Translation Management"),
            "items": [
                {
                    "label": _("PO File"),
                    "type": "DocType",
                    "name": "PO File",
                    "description": _("PO Translation Files")
                },
                {
                    "label": _("Translation Glossary Term"),
                    "type": "DocType",
                    "name": "Translation Glossary Term",
                    "description": _("Thai Translation Glossary")
                }
            ]
        },
    ]
    
    workspace.insert(ignore_permissions=True)
    frappe.db.commit()
    
    print("Created Thai Translation workspace")