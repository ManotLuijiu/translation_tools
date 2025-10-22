"""
⚠️  OBSOLETE - DO NOT USE THIS FILE ⚠️

This script has been replaced by the centralized workspace management system:
- New API: translation_tools.api.workspace_manager.WorkspaceManager
- Cross-app support for thai_business_suite and translation_tools
- Persistent workspace links across migrations
- Better error handling and logging

Please use the new API approach instead.
See: test_workspace_consolidation.py for usage examples.

=== DEPRECATED CODE BEGINS (DO NOT USE) ===
"""

import os
import sys
import frappe
from frappe.desk.page.setup_wizard.setup_wizard import (
    make_records,
)  # just to test import


# Step 1: Boot Frappe
def boot_frappe(site_name="moo.localhost"):
    bench_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    sys.path.insert(0, bench_path)
    os.environ["FRAPPE_SITE"] = site_name
    frappe.init(site=site_name)
    frappe.connect()
    print("✅ Frappe booted for site:", site_name)
    print("⚠️  WARNING: This script is obsolete! Use workspace_manager API instead.")


# Step 2: Teardown
def teardown_frappe():
    frappe.destroy()
    print("✅ Frappe connection closed")


# Step 3: Create the workspace
def create_workspace():
    from frappe.desk.doctype.workspace.workspace import save_or_update_workspace

    parent_name = "Thai Business Suite"
    child_name = "Translation Tools"

    # Workspace content
    workspace = {
        "doctype": "Workspace",
        "name": child_name,
        "title": child_name,
        "module": "Translation Tools",
        "parent_page": parent_name,
        "for_user": "",
        "content": [
            {
                "type": "card",
                "label": "Translation",
                "links": [
                    {
                        "type": "DocType",
                        "name": "PO File",
                        "label": "PO Files",
                        "description": "Manage PO files for translation",
                    }
                ],
            },
            {
                "type": "card",
                "label": "Configuration",
                "links": [
                    {
                        "type": "DocType",
                        "name": "Translation Tools Settings",
                        "label": "Translation Tools Settings",
                        "description": "Configure translation API settings",
                    },
                    {
                        "type": "DocType",
                        "name": "Translation Glossary Term",
                        "label": "Glossary",
                        "description": "Manage translation glossary terms",
                    },
                ],
            },
        ],
        "extends_another_page": 0,
        "hide_custom": 0,
        "public": 1,
    }

    try:
        save_or_update_workspace(frappe._dict(workspace))
        print("✅ Workspace created/updated:", child_name)
    except Exception as e:
        print("❌ Error while creating workspace:", e)


# Step 4: Run it
if __name__ == "__main__":
    try:
        boot_frappe("moo.localhost")
        create_workspace()
    finally:
        teardown_frappe()
