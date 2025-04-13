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

# Module configuration for Desk
# ------------------
app_icon = "assets/translation_tools/images/translation_icon.svg"
app_color = "#4183c4"  # A nice blue color
app_title = "Translation Tools"
app_email = "moocoding@gmail.com"
app_license = "MIT"

# Desktop Sections
# -------------------
# Define your desktop sections
desktop_icons = ["Translation Tools"]

# Modules Definition
# -----------------
modules = {
    "Translation Tools": {
        "color": "blue",
        "icon": "assets/translation_tools/images/translation_icon.svg",
        "type": "module",
        "label": "Translation Tools"
    }
}

# Installation
after_install = "translation_tools.install.after_install"

# Uninstallation
# ------------

before_uninstall = "translation_tools.uninstall.before_uninstall"
after_uninstall = "translation_tools.uninstall.after_uninstall"

# Custom bench commands
# --------------------
commands = [
    "translation_tools.commands.repair_translation_tools",
    "translation_tools.commands.open_translation_dashboard",
]

website_route_rules = [
    {
        "from_route": "/thai_translation_dashboard/<path:app_path>",
        "to_route": "thai_translation_dashboard",
    },
]

workspace_route_rules = [
    {
        "from_route": "integrations",
        "to_route": "",
        "apply_on": "update",
    }
]

app_include_js = [
    # "/assets/translation_tools/thai_translation_dashboard/index.js",
    "translation_tools.app.bundle.js",
]

app_include_css = [
    "/assets/translation_tools/css/tailwind.css"
]

# Desk sidebar item
get_desk_sidebar_items = [
    {
        "label": "Integrations",  # Will appear under "Integrations"
        "items": [
            {
                "type": "Page",
                "name": "translation-tools",  # This must match the Page doctype name
                "label": "Translation Tools",
                "icon": "translate",  # Optional: use Frappe icon names
                "description": "AI-powered Thai translation dashboard",
            }
        ],
    }
]

# Fixtures: export workspace so your link stays after migration/restart
fixtures = [
    {
        "dt": "Workspace",
        "filters": [
            ["name", "=", "Integrations"]
        ]
    },
    {
        "dt": "Page",
        "filters": [
            ["name", "=", "translation-tools"]
        ]
    }
]
