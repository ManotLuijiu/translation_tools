import json
import re

import frappe
import frappe.sessions
from frappe import _
import frappe.utils
import frappe.website
import frappe.website.utils

no_cache = 1

SCRIPT_TAG_PATTERN = re.compile(r"\<script[^<]*\</script\>")
CLOSING_SCRIPT_TAG_PATTERN = re.compile(r"</script\>")


def get_context(context):
    if frappe.session.user == "Guest":
        boot = frappe.website.utils.get_boot_data()
    else:
        try:
            boot = frappe.sessions.get()
        except Exception as e:
            raise frappe.SessionBootFailed from e

    # Load translations into boot context (critical for SPA i18n)
    from frappe.boot import load_translations
    load_translations(boot)

    # Remove redirect - it causes inconsistent refresh behavior
    # frappe.local.response["type"] = "redirect"
    # frappe.local.response["location"] = "/thai_translation_dashboard"

    boot_json = frappe.as_json(boot, indent=None, separators=(",", ":"))  # type: ignore
    boot_json = SCRIPT_TAG_PATTERN.sub("", boot_json)

    boot_json = CLOSING_SCRIPT_TAG_PATTERN.sub("", boot_json)
    boot_json = json.dumps(boot_json)

    context.update(
        # {"build_version": frappe.utils.get_build_version(), "boot": boot_json}
        {"build_version": frappe.utils.get_build_version(), "boot": boot_json}
    )

    favicon = frappe.get_website_settings("favicon")

    context["icon_32"] = (
        favicon or "/assets/translation_tools/manifest/favicon-96x96.png"
    )
    context["icon_16"] = (
        favicon or "/assets/translation_tools/manifest/favicon-96x96.png"
    )
    context["apple_touch_icon"] = (
        favicon or "/assets/translation_tools/manifest/apple-touch-icon.png"
    )
    context["mask_icon"] = (
        favicon or "/assets/translation_tools/manifest/safari-pinned-tab.svg"
    )
    context["sitename"] = boot.get("sitename")

    return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
    if not frappe.conf.developer_mode:
        frappe.throw(_("This method is only meant for developer mode"))
    return json.loads(get_boot())


def get_boot():
    try:
        boot = frappe.sessions.get()
    except Exception as e:
        raise frappe.SessionBootFailed from e

    # Load translations into boot context (critical for SPA i18n)
    from frappe.boot import load_translations
    load_translations(boot)

    boot_json = frappe.as_json(boot, indent=None, separators=(",", ":"))  # type: ignore
    boot_json = SCRIPT_TAG_PATTERN.sub("", boot_json)

    boot_json = CLOSING_SCRIPT_TAG_PATTERN.sub("", boot_json)
    boot_json = json.dumps(boot_json)

    return boot_json
