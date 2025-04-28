from frappe import _


def get_data():
    return [
        {
            "module_name": "Translation Tools",
            "category": "Modules",
            "color": "#0984e3",
            "icon": "fa fa-language",
            "label": _("Translation Tools"),
            "type": "module",
            "description": _("AI-powered tools for translating English to Thai"),
        }
    ]
