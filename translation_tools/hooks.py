from . import __version__ as app_version
from frappe import __version__ as frappe_version
from frappe import _

app_name = "translation_tools"
app_title = "Translation Tools"
app_publisher = "Manot Luijiu"
app_description = "Translate English to Thai in Frappe/ERPNext ecosystem"
app_email = "moocoding@gmail.com"
app_license = "mit"
app_icon = "/assets/translation_tools/images/translation_icon.svg"
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

# Custom email provider for Resend
mail_providers = [
    {
        "name": "Resend",
        "module": "resend_integration.resend_provider",
        "class_name": "ResendEmailProvider",
    }
]

# DocType for settings
doctype_js = {
    "Email Account": "public/js/email_account.js",
}

# Configuration options that will be created
default_mail_footer = """
<div style="font-size: small; color: #8d99a6;">
    Sent via <a href="https://resend.com" target="_blank" style="color: #8d99a6;">Resend</a>
</div>
"""

# Desk page for Resend configuration
desk_page = {
    "name": "resend-settings",
    "label": "Resend Settings",
    "icon": "octicon octicon-mail",
    "type": "module",
}

# Installation
after_install = [
    # "translation_tools.patches.default.fix_fixtures_import",
    # "translation_tools.patches.default.add_default_font_to_print_settings",
    "translation_tools.install.after_install",
    # "translation_tools.setup.install_custom_fields.install_custom_fields",
    # "translation_tools.setup.create_doctypes.create_signature_doctype",
    # "translation_tools.setup.create_doctypes.create_settings_page",
    # "translation_tools.patches.migrate_chat_data.execute",
]

after_migrate = "translation_tools.setup.update_workspace.update_icons"

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
    # {"from_route": "/app/thai_translator", "to_route": "/thai_translation_dashboard"},
    # {
    #     "from_route": "/app/thai_translation_dashboard/<path:app_path>",
    #     "to_route": "thai_translation_dashboard",
    # },
    {"from_route": "/tax_consultant", "to_route": "tax_consultant"},
    {"from_route": "/frontend/<path:app_path>", "to_route": "frontend"},
]

# workspace_route_rules = [
#     {
#         "from_route": "integrations",
#         "to_route": "",
#         "apply_on": "update",
#     }
# ]

app_include_head = [
    "<link rel='preconnect' href='https://fonts.googleapis.com'>",
    "<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>",
    "<link href='https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Mitr:wght@200;300;400;500;600;700&family=Noto+Sans+Thai:wght@100..900&family=Pattaya&family=Pridi:wght@200;300;400;500;600;700&family=Prompt:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sarabun:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap' rel='stylesheet'>",
]

# This code below make frappe style break
# app_include_icons = ["images/icons/react-logo.svg"]

# For web pages
website_context = {
    "head_html": """
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Mitr:wght@200;300;400;500;600;700&family=Noto+Sans+Thai:wght@100..900&family=Pattaya&family=Pridi:wght@200;300;400;500;600;700&family=Prompt:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Sarabun:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet">
    """
}

app_include_js = [
    "translation_tools.app.bundle.js",
    "/assets/translation_tools/js/translation_tools.client.js",
    "/assets/translation_tools/js/vfs_fonts.js",
    "/assets/translation_tools/js/utils/JsBarcode.all.min.js",
    "/assets/translation_tools/js/utils/pdfmake.min.js",
    "/assets/translation_tools/js/utils/pdfmake.min.js.map",
    "/assets/translation_tools/js/utils/vfs_fonts.js",
    "/assets/translation_tools/js/font_override.js",
    # "/assets/translation_tools/js/print_designer/thai_fonts_patch.js",
    "chat.bundle.js",
]

app_include_css = [
    "/assets/translation_tools/css/thai_fonts.css",
    "/assets/translation_tools/css/fonts.css",
    # "/assets/translation_tools/css/custom_fonts.css",
    "/assets/translation_tools/css/custom_print.css",
    # "/assets/translation_tools/css/global_fonts.css",
    "chat.bundle.css",
    "translation_tools.bundle.css",
]

web_include_css = [
    "/assets/translation_tools/css/thai_fonts.css",
    # "/assets/translation_tools/css/custom_fonts.css",
    "/assets/translation_tools/css/custom_print.css",
    # "/assets/translation_tools/css/icons.css",
    "chat.bundle.css",
]
web_include_js = ["chat.bundle.js", "translation_tools.app.bundle.js"]

# To specifically target the print designer page
# page_js = {
#     "print_designer": "/assets/translation_tools/js/print_designer/thai_fonts_patch.js"
# }

# Specifically target print formats
print_format_builder_include_css = ["/assets/translation_tools/css/thai_fonts.css"]
print_style = ["/assets/translation_tools/css/thai_fonts.css"]

# This hook may impact to Web app font all pages
# website_theme_scss = "translation_tools/public/scss/website"


# build_config = {"esbuild": {"target": "es2018"}}

# Override navbar template
# website_template_path = {
#     "includes/navbar/navbar.html": "templates/includes/navbar/navbar.html"
# }

# jenv = {
#     "methods": [
#         "get_pdf_generator_settings:translation_tools.translation_tools.utils.pdf_utils.get_pdf_generator_settings",
#         "get_sarabun_pdf_font_styles:translation_tools.translation_tools.utils.pdf_utils.get_sarabun_pdf_font_styles",
#     ]
# }

# Add Sarabun to print format
# print_format_map = {"font": "Sarabun"}

# Desk sidebar item
get_desk_sidebar_items = [
    {
        "label": "Integrations",  # Will appear under "Integrations"
        "items": [
            {
                "type": "Page",
                "name": "translation-tools",  # This must match the Page doctype name
                "label": "Translation Tools",
                "icon": "tool",  # Optional: use Frappe icon names
                "description": "AI-powered Thai translation dashboard",
            }
        ],
    }
]

# Add the desk page to the desk sidebar
desk_page = {
    "Translation Tools": {
        "category": "Tools",
        "icon": "tool",
        "label": _("Translation Tools"),
        "module": "Translation Tools",
        "type": "module",
        "_doctype": "Translation Tools Settings",
        "link": "List/Translation Tools Settings",
        "color": "#3498db",
        "onboard": 0,
    }
}

# doc_events = {
#     "Print Format": {"before_save": "translation_tools.print_format.before_save"},
#     "Quotation": {
#         "validate": "translation_tools.utils.thai_in_words.set_in_words_thai"
#     },
#     "Sales Invoice": {
#         "validate": "translation_tools.utils.thai_in_words.set_in_words_thai"
#     },
#     "Purchase Invoice": {
#         "validate": "translation_tools.utils.thai_in_words.set_in_words_thai"
#     },
#     "Delivery Note": {
#         "validate": "translation_tools.utils.thai_in_words.set_in_words_thai"
#     },
# }


# Fixtures: export workspace so your link stays after migration/restart
fixtures = [
    {"doctype": "Workspace", "filters": [["name", "=", "Integrations"]]},
    {"doctype": "Language", "filters": [["name", "in", ["en", "th"]]]},
    # {"dt": "Workspace", "filters": [["name", "=", "Integrations"]]},
    # {"dt": "Number Card", "filters": [["module", "=", "Translation Tools"]]},
    # {"dt": "Dashboard Chart", "filters": [["module", "=", "Translation Tools"]]},
    # {"dt": "Workspace", "filters": [["name", "=", "Translation Tools"]]},
    # {"dt": "Page", "filters": [["name", "=", "translation-tools"]]},
    # {"dt": "Custom Field", "filters": [["dt", "in", ["Print Settings", "Company"]]]},
    # {
    #     "doctype": "Property Setter",
    #     "filters": [
    #         ["doc_type", "=", "Print Format"],
    #         ["field_name", "=", "pdf_generator"],
    #         ["property", "=", "options"],
    #     ],
    # },
]

# doctype_js = {
#      "Print Format": "public/js/print_format.js",
#     "Print Format": "/assets/translation_tools/js/print_format.js"
# }

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
# override_doctype_class = {
#     # "Sales Invoice": "translation_tools.override.custom_sales_invoice.CustomSalesInvoice",
#     "Print Format": "translation_tools.override.print_format.CustomPrintFormat",
# }

# Override the default PDF styles
# override_whitelisted_methods = {
#     # "frappe.utils.pdf.get_pdf_styles": "translation_tools.utils.pdf_utils.get_pdf_styles",
#     # "frappe.www.printview.get_print_style": "translation_tools.utils.pdf_utils.get_print_style_with_thai",
#     "frappe.utils.pdf.get_pdf": "translation_tools.utils.pdf.get_pdf_with_thai_fonts",
#     # "frappe.www.printview.get_html_and_style": "translation_tools.utils.print_view.get_html_and_style_with_thai_support",
#     # "frappe.utils.print_format.download_pdf": "translation_tools.utils.print_format.download_pdf_with_options",
#     # "frappe.client.validate_link": "translation_tools.override.client.validate_link_optimized",
# }

# Include JS file
# doctype_js = {"Sales Invoice": "public/js/sales_invoice.js"}

# Include Thai font files
app_include_fonts = [
    "public/fonts/Sarabun/Sarabun-Regular.ttf",
    "public/fonts/Sarabun/Sarabun-Bold.ttf",
    "public/fonts/Sarabun/Sarabun-Italic.ttf",
    "public/fonts/Sarabun/Sarabun-BoldItalic.ttf",
]

# Set workspace at bottom of public workspace
workspace_order = {
    "Translation Tools": 99  # Use a very high number to ensure it's at the bottom
}

scheduler_events = {
    "daily": ["translation_tools.api.ai_models.get_available_ai_models"]
}
