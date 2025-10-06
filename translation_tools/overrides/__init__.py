"""
Translation Tools Overrides

This module patches Frappe's translation system to support SPA React/TypeScript files.
"""


def setup_translation_override():
    """
    Monkey-patch frappe.translate functions to include SPA translations and ASEAN language filtering.

    This function must be called AFTER frappe.translate is imported.
    It's triggered lazily when translation functions are actually needed.
    """
    try:
        import frappe
        from frappe import translate
        from translation_tools.overrides.translate import (
            write_translations_file,
            rebuild_all_translation_files,
        )

        # Replace Frappe's functions with our enhanced versions
        translate.write_translations_file = write_translations_file
        frappe.translate.write_translations_file = write_translations_file

        translate.rebuild_all_translation_files = rebuild_all_translation_files
        frappe.translate.rebuild_all_translation_files = rebuild_all_translation_files

        print("✅ Translation override installed successfully (SPA support + ASEAN filtering)")
        return True

    except (ImportError, AttributeError) as e:
        # frappe.translate not loaded yet - that's okay, will be patched later
        print(f"⏳ Translation override pending (frappe.translate not loaded): {e}")
        return False
