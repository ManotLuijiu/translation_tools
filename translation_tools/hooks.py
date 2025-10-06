from . import __version__ as app_version
from frappe import __version__ as frappe_version
from frappe import _

app_name = "translation_tools"
app_title = "Translation Tools"
app_publisher = "Manot Luijiu"
app_description = "Translate text to ASEAN languages in Frappe/ERPNext ecosystem"
app_email = "moocoding@gmail.com"
app_license = "mit"
app_icon = "/assets/translation_tools/images/translation_icon.svg"
app_color = "#4183c4"  # A nice blue color
guest_title = app_title

# Desktop Sections
# -------------------
# Define your desktop sections
desktop_icons = ["Translation Tools"]

required_apps = ["payments", "print_designer"]

# Modules Definition
# -----------------
modules = {
    "Translation Tools": {
        "color": "blue",
        "icon": "/assets/translation_tools/images/translation_icon.svg",  # Consistent absolute path
        "type": "module",
        "label": "Translation Tools",
    }
}

# Desk page configuration removed - redundant with desk_page definition below

# Boot session for client-side data injection
boot_session = "translation_tools.boot.boot_session"

# Installation
after_install = [
    "translation_tools.install.after_install",
    "translation_tools.setup.github_sync_defaults.check_and_setup_if_needed",
    "translation_tools.overrides.setup_translation_override",  # Install SPA translation support
    # "translation_tools.patches.default.fix_fixtures_import",
    # "translation_tools.patches.default.add_default_font_to_print_settings",
    # "translation_tools.setup.install_custom_fields.install_custom_fields",
    # "translation_tools.setup.create_doctypes.create_signature_doctype",
    # "translation_tools.setup.create_doctypes.create_settings_page",
    # "translation_tools.patches.migrate_chat_data.execute",
]

# Migration
after_migrate = [
    "translation_tools.setup.update_workspace.rebuild_workspace",
    "translation_tools.utils.migration_translations.run_translation_commands_after_migrate"
]

# Uninstallation
# ------------

before_uninstall = "translation_tools.uninstall.before_uninstall"
after_uninstall = "translation_tools.uninstall.after_uninstall"

# Custom bench commands
# --------------------
commands = [
    "translation_tools.commands.compile_mo_files",
    "translation_tools.commands.update_translations"
]

website_route_rules = [
    {
        "from_route": "/asean_translation_dashboard/<path:app_path>",
        "to_route": "asean_translation_dashboard",
    },
    {
        "from_route": "/thai_translation_dashboard/<path:app_path>",
        "to_route": "thai_translation_dashboard",
    },
    {
        "from_route": "/thai_translation_dashboard",
        "to_route": "thai_translation_dashboard",
    }
]

app_include_js = [
    "translation_tools.app.bundle.js",
]

# app_include_css = [
#     "fonts.bundle.css",
#     # "translation_tools.bundle.css",
# ]


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
                "description": "AI-powered ASEAN translation dashboard",
            }
        ],
    }
]

# Desk page configuration for Translation Tools
desk_page = {
    "Translation Tools": {
        "category": "Tools",
        "icon": "tool",
        "label": _("Translation Tools"),
        "module": "Translation Tools",
        "type": "module",
        "_doctype": "Translation Tools Settings",
        "link": "List/Translation Tools Settings",
        "color": "#4183c4",  # Consistent with app_color
        "onboard": 0,
    }
}


# Fixtures: export workspace so your link stays after migration/restart
fixtures = [
    {"doctype": "Workspace", "filters": [["name", "=", "Integrations"]]},
    # {"doctype": "Language", "filters": [["name", "in", ["en", "th"]]]},
    # {"dt": "Workspace", "filters": [["name", "=", "Integrations"]]},
    # {"dt": "Number Card", "filters": [["module", "=", "Translation Tools"]]},
    # {"dt": "Dashboard Chart", "filters": [["module", "=", "Translation Tools"]]},
    # {"doctype": "Workspace", "filters": [["name", "=", "Translation Tools"]]},
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

# Include Thai font files
# app_include_fonts = [
#     "public/fonts/Sarabun/Sarabun-Regular.ttf",
#     "public/fonts/Sarabun/Sarabun-Bold.ttf",
#     "public/fonts/Sarabun/Sarabun-Italic.ttf",
#     "public/fonts/Sarabun/Sarabun-BoldItalic.ttf",
# ]

# Set workspace at bottom of public workspace
workspace_order = {
    "Translation Tools": 99  # Use a very high number to ensure it's at the bottom
}

scheduler_events = {
    # Translation Schedule automation - runs every minute
    "cron": {
        "* * * * *": [
            "translation_tools.tasks.translation_scheduler.check_and_run_scheduled_tasks"
        ],
        # Midnight Bangkok time operations (17:00 UTC)
        # Note: MO compilation removed - redundant with Frappe's native bench build-message-files
        "0 17 * * *": [
            "translation_tools.tasks.github_auto_sync.check_and_run_auto_sync"
        ]
    },
    # Daily tasks
    "daily": [
        "translation_tools.api.ai_models.get_available_ai_models",
        "translation_tools.tasks.translation_scheduler.cleanup_old_logs",
        # GitHub sync runs via cron at specific time, not needed here
    ],
    # Hourly safety check for missed schedules
    "hourly": [
        "translation_tools.tasks.translation_scheduler.run_missed_schedules",
        "translation_tools.api.po_files.auto_refresh_stale_po_files"
    ],
    # Daily long-running tasks
    "daily_long": [
        "translation_tools.tasks.translation_scheduler.run_daily_translation_workflows"
    ]
}
