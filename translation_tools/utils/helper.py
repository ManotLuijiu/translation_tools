import frappe
from frappe.model.document import Document
from typing import cast


class TranslationToolsSettings(Document):
    enable_translation: int
    default_source_language: str
    default_target_language: str
    openai_api_key: str
    openai_model: str
    anthropic_api_key: str
    anthropic_model: str


def get_translation_settings() -> TranslationToolsSettings:
    """Return cached Translation Tools Settings or default settings if not found."""
    try:
        settings = frappe.get_cached_doc("Translation Tools Settings")
        return cast(TranslationToolsSettings, settings)
    except frappe.DoesNotExistError:
        # Return default settings when document not found
        frappe.log_error("Translation Tools Settings not found.", "Cache Error")
        return TranslationToolsSettings(
            enable_translation=1,
            default_source_language="en",
            default_target_language="th",
            openai_api_key="",
            openai_model="gpt-4-1106-preview",
            anthropic_api_key="",
            anthropic_model="claude-3-haiku-20240307",
        )
    except Exception as e:
        frappe.log_error(
            f"Unexpected error fetching Translation Tools Settings: {e}", "Cache Error"
        )
        raise Exception(
            "An unexpected error occurred while fetching Translation Tools Settings."
        )
