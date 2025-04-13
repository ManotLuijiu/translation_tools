import frappe
from frappe.translate import get_translations_from_apps

@frappe.whitelist()
def get_translations_by_lang(lang):
    """Return combined translations from all apps for the given language."""
    try:
        translations = get_translations_from_apps(lang)
        return translations
    except Exception as e:
        frappe.log_error(f"Error in get_translations_by_lang: {str(e)}", "Translation Error")
        return {"error": f"Could not fetch translations for {lang}: {str(e)}"}
