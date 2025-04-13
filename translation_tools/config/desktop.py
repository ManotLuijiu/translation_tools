from frappe import _

def get_data():
    return [
        {
            "module_name": "Translation Tools",
            "color": "blue",
            "icon": "assets/translation_tools/images/translation_icon.svg",
            "label": _("Translation Tools"),
            "type": "module",
            "description": _("AI-powered tools for translating English to Thai")
        }
    ]