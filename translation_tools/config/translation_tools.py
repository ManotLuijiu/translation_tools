from frappe import _


def get_data():
    return [
        {
            "label": _("Translation Tools"),
            "icon": "fa fa-language",
            "items": [
                {
                    "type": "doctype",
                    "name": "Translation Tools Settings",
                    "label": _("Settings"),
                    "description": _("Settings AI API Key"),
                    "onboard": 1,
                },
                {
                    "type": "doctype",
                    "name": "Translation Glossary Term",
                    "label": _("Glossary Term"),
                    "description": _("Manage Glossary Term"),
                    # Not displayed on dropdown list action but on page after click on module
                    "onboard": 0,
                },
            ],
        }
    ]
