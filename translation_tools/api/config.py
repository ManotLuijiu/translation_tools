import frappe
from frappe import _
import json
from translation_tools.utils import (
    get_chat_settings,
    validate_token,
    get_admin_name,
    get_user_settings,
)


@frappe.whitelist(allow_guest=True)
def settings(token):
    """Fetch and return the settings for a chat session.
    Args:
        token (str): The token for the chat session."""

    config = {
        "socketio_port": frappe.conf.socketio_port,
        "user_email": frappe.session.user,
        "is_admin": (
            True
            if frappe.session.data and "user_type" in frappe.session.data
            else False
        ),
        "guest_title": "".join(frappe.get_hooks("guest_title")),
    }

    config = {**config, **get_chat_settings()}

    if config["is_admin"]:
        config["user"] = get_admin_name(config["user_email"])
        config["user_settings"] = get_user_settings()
    else:
        config["user"] = "Guest"
        token_verify = validate_token(token)
        if not token_verify[0]:
            return [False, token_verify[1]]
        config["room"] = token_verify[1]["room"]
        config["user_email"] = token_verify[1]["email"]
        config["is_verified"] = True
    return config


@frappe.whitelist()
def user_settings(settings):
    settings = json.loads(settings)

    if not settings:
        return [False, _("Settings not provided.")]
    if not frappe.db.exists("Chat User Settings", frappe.session.user):
        settings_doc = frappe.get_doc(
            {
                "doctype": "Chat User Settings",
                "user": frappe.session.user,
                "enable_notifications": settings["enable_notifications"],
                "enable_message_tone": settings["enable_message_tone"],
            }
        ).insert()
    else:
        if not frappe.session.user:
            return [False, _("User session is not available.")]
        settings_doc = frappe.get_doc("Chat User Settings", frappe.session.user)

        if "enable_notifications" in settings:
            if "enable_message_tone" in settings:
                settings_doc.db_set(
                    "enable_message_tone", settings["enable_message_tone"]
                )
        if "enable_message_tone" in settings:
            settings_doc.db_set("enable_message_tone", settings["enable_message_tone"])

        settings_doc.save()
