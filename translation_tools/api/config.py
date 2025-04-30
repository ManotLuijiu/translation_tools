import frappe
from frappe import _
import json
from translation_tools.utils.helper import get_translation_settings

# from frappe.model.document import Document
# from typing import cast


# class TranslationToolsSettings(Document):
#     enable_translation: int
#     default_source_language: str
#     default_target_language: str
#     openai_api_key: str
#     openai_model: str
#     anthropic_api_key: str
#     anthropic_model: str


# def get_translation_settings() -> TranslationToolsSettings:
#     """Return cached Translation Tools Settings."""
#     try:
#         settings = frappe.get_cached_doc("Translation Tools Settings")
#         return cast(TranslationToolsSettings, settings)
#     except Exception:
#         settings = frappe.get_single("Translation Tools Settings")
#         return cast(TranslationToolsSettings, settings)


def safe_get_session_user():
    try:
        if frappe.session and frappe.session.user:
            return frappe.session.user
    except frappe.SessionStopped:
        pass
    return "Guest"


def safe_is_admin(user):
    try:
        return user == "Administrator" or "System Manager" in frappe.get_roles(user)
    except Exception:
        return False


@frappe.whitelist(allow_guest=True)
def settings(token=None):
    """Fetch and return the settings for a translation chat session."""

    user = safe_get_session_user()
    is_admin = safe_is_admin(user)

    config = {
        "socketio_port": frappe.conf.socketio_port,
        "user_email": user,
        "is_admin": is_admin,
        "guest_title": "".join(
            frappe.get_hooks("guest_title") or ["Translation Assistant"]
        ),
    }

    # Add Translation Tools Settings
    try:
        settings = get_translation_settings()

        config["enable_translation"] = settings.enable_translation or 1
        config["default_source_language"] = settings.default_source_language or "en"
        config["default_target_language"] = settings.default_target_language or "th"
        config["has_openai"] = bool(settings.openai_api_key)
        config["has_anthropic"] = bool(settings.anthropic_api_key)
        config["openai_model"] = (
            settings.openai_model or frappe.conf.default_openai_model
        )
        config["anthropic_model"] = (
            settings.anthropic_model or frappe.conf.default_anthropic_model
        )
    except Exception as e:
        frappe.log_error(
            f"Error fetching Translation Tools Settings: {e}",
            "Translation Config Error",
        )
        config["error"] = str(e)

    # For authenticated users - add name and user settings
    if user == "Guest":
        config["user"] = "Guest"
        if token:
            pass  # Handle token validation if needed
    else:
        user_doc = frappe.get_doc("User", user)
        config["user"] = user_doc.full_name or user  # type: ignore

        if frappe.db.exists("Translation User Settings", user):
            user_settings = frappe.get_doc("Translation User Settings", user)
            config["user_settings"] = {
                "enable_notifications": user_settings.enable_notifications,  # type: ignore
                "enable_message_tone": user_settings.enable_message_tone,  # type: ignore
                "preferred_language": user_settings.preferred_language,  # type: ignore
            }
        else:
            config["user_settings"] = {
                "enable_notifications": 1,
                "enable_message_tone": 1,
                "preferred_language": config["default_target_language"],
            }

    return config


@frappe.whitelist()
def user_settings(settings):
    """Update user settings for translation assistant."""

    if not frappe.session.user or frappe.session.user == "Guest":
        return {"success": False, "message": _("Please log in to save settings.")}

    try:
        settings = json.loads(settings) if isinstance(settings, str) else settings

        if not settings:
            return {"success": False, "message": _("Settings not provided.")}

        if not frappe.db.exists("Translation User Settings", frappe.session.user):
            # Create settings document
            settings_doc = frappe.get_doc(
                {
                    "doctype": "Translation User Settings",
                    "user": frappe.session.user,
                    "enable_notifications": settings.get("enable_notifications", 1),
                    "enable_message_tone": settings.get("enable_message_tone", 1),
                    "preferred_language": settings.get("preferred_language", "th"),
                }
            ).insert()
        else:
            settings_doc = frappe.get_doc(
                "Translation User Settings", frappe.session.user
            )

            # Update fields
            for field in [
                "enable_notifications",
                "enable_message_tone",
                "preferred_language",
            ]:
                if field in settings:
                    settings_doc.set(field, settings[field])

            settings_doc.save()

        return {"success": True, "message": _("Settings updated successfully.")}

    except Exception as e:
        frappe.log_error(
            f"Error updating user settings: {e}", "Translation Tools Settings Error"
        )
        return {"success": False, "message": str(e)}
