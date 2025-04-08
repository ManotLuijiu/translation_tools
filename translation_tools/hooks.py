app_name = "translation_tools"
app_title = "Translation Tools"
app_publisher = "Manot Luijiu"
app_description = "Translate English to Thai in Frappe/ERPNext ecosystem"
app_email = "moocoding@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "translation_tools",
# 		"logo": "/assets/translation_tools/logo.png",
# 		"title": "Translation Tools",
# 		"route": "/translation_tools",
# 		"has_permission": "translation_tools.api.permission.has_app_permission"
# 	}
# ]

# Installation
after_install = "translation_tools.install.after_install"

# Uninstallation
# ------------

before_uninstall = "translation_tools.uninstall.before_uninstall"
after_uninstall = "translation_tools.uninstall.after_uninstall"

# Custom bench commands
# --------------------
commands = [
    "translation_tools.commands.repair_translation_tools"
]
website_route_rules = [{'from_route': '/thai_translation_dashboard/<path:app_path>', 'to_route': 'thai_translation_dashboard'},]

app_include_js = [
    "/assets/translation_tools/thai_translation_dashboard/index.js"
]

# Add page to navbar
get_desk_sidebar_items = [
    {
        "label": "Thai Translation",
        "items": [
            {
                "type": "Page",
                "name": "thai-translation-dash",
                "label": "Thai Translation Dashboard",
                "icon": "translate",
                "description": "AI-powered Thai translation dashboard"
            }
        ]
    }
]