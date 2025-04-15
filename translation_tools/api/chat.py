import frappe
from frappe import _
import json
from translation_tools.translation_tools.api.translation import translate_text


@frappe.whitelist()
def process_message(message, room=None):
    """Process a chat message, potentially translating it

    Args:
        message (str): The chat message
        room (str, optional): Chat room ID. Defaults to None.

    Returns:
        dict: Processed message with translations if applicable
    """
    try:
        data = json.loads(message) if isinstance(message, str) else message

        msg_text = data.get("content", "")
        if not msg_text:
            return {"error": "No message content provided"}

        # Get user settings and translation settings
        target_lang = get_user_preferred_language()
        source_lang = "en"  # Default source language

        # Check if this is a translation request
        is_translation_request = False
        translation_lang = None

        # Check for translation command like "/translate:th"
        if msg_text.startswith("/translate"):
            is_translation_request = True
            parts = msg_text.split(":", 1)
            if len(parts) > 1:
                translation_lang = parts[1].strip()
                msg_text = parts[1].strip()
            else:
                # Use the rest of the message for translation
                msg_text = msg_text[10:].strip()

        # Check for specific language commands
        for lang_cmd, lang_code in [
            ("/toth", "th"),  # Thai
            ("/toja", "ja"),  # Japanese
            ("/tozh", "zh-CN"),  # Chinese
            ("/toko", "ko"),  # Korean
            ("/tovi", "vi"),  # Vietnamese
            ("/toes", "es"),  # Spanish
            ("/tofr", "fr"),  # French
            ("/tode", "de"),  # German
        ]:
            if msg_text.startswith(lang_cmd):
                is_translation_request = True
                translation_lang = lang_code
                msg_text = msg_text[len(lang_cmd) :].strip()
                break

        response = {
            "sender": data.get("sender"),
            "room": room or data.get("room"),
            "content": msg_text,
        }

        # If this is a translation request, translate the message
        if is_translation_request:
            result = translate_text(
                msg_text,
                target_lang=translation_lang or target_lang,
                source_lang=source_lang,
                save_history=True,
            )

            if "error" in result:
                response["error"] = result["error"]
            else:
                response["content"] = result["translated"]
                response["original_text"] = result["original"]
                response["is_translation"] = True
                response["source_language"] = result["source_language"]
                response["target_language"] = result["target_language"]

        return response

    except Exception as e:
        frappe.log_error(
            f"Error processing chat message: {e}", "Translation Chat Error"
        )
        return {"error": str(e)}


def get_user_preferred_language():
    """Get the preferred language for the current user"""
    if not frappe.session.user or frappe.session.user == "Guest":
        # Default to Thai for guests
        return "th"

    # Check if user has settings
    if frappe.db.exists("Translation User Settings", frappe.session.user):
        preferred_lang = frappe.db.get_value(
            "Translation User Settings", frappe.session.user, "preferred_language"
        )
        return preferred_lang or "th"
    else:
        # Get system default
        default_lang = frappe.db.get_single_value(
            "Translation Tools Settings", "default_target_language"
        )
        return default_lang or "th"
