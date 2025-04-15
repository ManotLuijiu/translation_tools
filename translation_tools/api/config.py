# File: translation_tools/translation_tools/api/config.py
import frappe
from frappe import _
import json


@frappe.whitelist(allow_guest=True)
def settings(token=None):
    """Fetch and return the settings for a translation chat session."""

    config = {
        "socketio_port": frappe.conf.socketio_port,
        "user_email": frappe.session.user,
        "is_admin": frappe.session.user == "Administrator"
        or "System Manager" in frappe.get_roles(),
        "guest_title": "".join(
            frappe.get_hooks("guest_title") or ["Translation Assistant"]
        ),
    }

    # Add translation settings
    try:
        # Get general settings
        config["enable_translation"] = (
            frappe.db.get_single_value(
                "Translation Tools Settings", "enable_translation"
            )
            or 1
        )
        config["default_source_language"] = (
            frappe.db.get_single_value(
                "Translation Tools Settings", "default_source_language"
            )
            or "en"
        )
        config["default_target_language"] = (
            frappe.db.get_single_value(
                "Translation Tools Settings", "default_target_language"
            )
            or "th"
        )

        # Get provider settings (without exposing API keys)
        config["has_openai"] = bool(
            frappe.db.get_single_value("Translation Tools Settings", "openai_api_key")
        )
        config["has_anthropic"] = bool(
            frappe.db.get_single_value(
                "Translation Tools Settings", "anthropic_api_key"
            )
        )
        config["openai_model"] = (
            frappe.db.get_single_value("Translation Tools Settings", "openai_model")
            or "gpt-4-1106-preview"
        )
        config["anthropic_model"] = (
            frappe.db.get_single_value("Translation Tools Settings", "anthropic_model")
            or "claude-3-haiku-20240307"
        )
    except Exception as e:
        frappe.log_error(
            f"Error fetching translation settings: {e}", "Translation Config Error"
        )
        config["error"] = str(e)

    # For authenticated users - add name and user settings
    if not frappe.session.user or frappe.session.user == "Guest":
        config["user"] = "Guest"
        if token:
            # Handle token validation if needed
            # This is where you'd use validate_token if implemented
            pass
    else:
        # Get user name
        user_doc = frappe.get_doc("User", frappe.session.user)
        config["user"] = user_doc.full_name or frappe.session.user  # type: ignore

        # Get user settings if they exist
        if frappe.db.exists("Translation User Settings", frappe.session.user):
            user_settings = frappe.get_doc(
                "Translation User Settings", frappe.session.user
            )
            config["user_settings"] = {
                "enable_notifications": user_settings.enable_notifications,  # type: ignore
                "enable_message_tone": user_settings.enable_message_tone,  # type: ignore
                "preferred_language": user_settings.preferred_language,  # type: ignore
            }
        else:
            # Default user settings
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
            f"Error updating user settings: {e}", "Translation Settings Error"
        )
        return {"success": False, "message": str(e)}
