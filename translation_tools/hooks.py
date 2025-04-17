from . import __version__ as app_version
from frappe import __version__ as frappe_version
from frappe import _

app_name = "translation_tools"
app_title = "Translation Tools"
app_publisher = "Manot Luijiu"
app_description = "Translate English to Thai in Frappe/ERPNext ecosystem"
app_email = "moocoding@gmail.com"
app_license = "mit"
app_icon = "assets/translation_tools/images/translation_icon.svg"
app_color = "#4183c4"  # A nice blue color
guest_title = app_title

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
        "label": "Translation Tools",
    }
}

# Installation
after_install = [
    "translation_tools.install.after_install",
    "chat.patches.migrate_chat_data.execute",
]

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
    {"from_route": "/tax_consultant", "to_route": "tax_consultant"},
]

workspace_route_rules = [
    {
        "from_route": "integrations",
        "to_route": "",
        "apply_on": "update",
    }
]

app_include_head = [
    "<link rel='preconnect' href='https://fonts.googleapis.com'>",
    "<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>",
    "<link href='https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Mitr:wght@200;300;400;500;600;700&family=Noto+Sans+Thai:wght@100..900&family=Pattaya&family=Pridi:wght@200;300;400;500;600;700&family=Prompt:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sarabun:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap' rel='stylesheet'>",
]

# For web pages
website_context = {
    "head_html": """
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Mitr:wght@200;300;400;500;600;700&family=Noto+Sans+Thai:wght@100..900&family=Pattaya&family=Pridi:wght@200;300;400;500;600;700&family=Prompt:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sarabun:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet">
    """
}

app_include_js = [
    # "/assets/translation_tools/thai_translation_dashboard/index.js",
    "translation_tools.app.bundle.js",
    "/assets/translation_tools/js/translation_tools.client.js",
    "/assets/translation_tools/js/pdfmake.min.js",
    "/assets/translation_tools/js/vfs_fonts.js",
    "chat.bundle.js",
]

app_include_css = [
    "/assets/translation_tools/css/tailwind.css",
    "/assets/translation_tools/css/thai_fonts.css",
    "/assets/translation_tools/css/fonts.css",
    "chat.bundle.css",
]

web_include_css = ["/assets/translation_tools/css/thai_fonts.css", "chat.bundle.css"]
web_include_js = ["chat.bundle.js"]

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

# Add the desk page to the desk sidebar
desk_page = {
    "Translation Tools": {
        "category": "Tools",
        "icon": "octicon octicon-graph",
        "label": _("Translation Tools"),
        "module": "Translation Tools",
        "type": "module",
        "_doctype": "Translation Tools Settings",
        "link": "List/Translation Tools Settings",
        "color": "#3498db",
        "onboard": 0,
    }
}

# Fixtures: export workspace so your link stays after migration/restart
fixtures = [
    {"dt": "Workspace", "filters": [["name", "=", "Integrations"]]},
    {"dt": "Page", "filters": [["name", "=", "translation-tools"]]},
]

sounds = [
    {
        "name": "chat-notification",
        "src": "/assets/translation_tools/sounds/chat-notification.mp3",
        "volume": 0.2,
    },
    {
        "name": "chat-message-send",
        "src": "/assets/translation_tools/sounds/chat-message-send.mp3",
        "volume": 0.2,
    },
    {
        "name": "chat-message-receive",
        "src": "/assets/translation_tools/sounds/chat-message-receive.mp3",
        "volume": 0.5,
    },
]

# Override doctype class
override_doctype_class = {
    "Sales Invoice": "translation_tools.translation_tools.override.custom_sales_invoice.CustomSalesInvoice"
}

# Include JS file
doctype_js = {"Sales Invoice": "public/js/sales_invoice.js"}

# Include Thai font files
app_include_fonts = [
    "public/fonts/Sarabun/Sarabun-Regular.ttf",
    "public/fonts/Sarabun/Sarabun-Bold.ttf",
    "public/fonts/Sarabun/Sarabun-Italic.ttf",
    "public/fonts/Sarabun/Sarabun-BoldItalic.ttf",
]

# Set workspace at bottom of public workspace
workspace_order = {
    "Translation Tools": 9999  # Use a very high number to ensure it's at the bottom
}
