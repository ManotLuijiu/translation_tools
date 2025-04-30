import frappe
from frappe import _
from frappe.model.document import Document
import json


class TranslationToolsSettings(Document):
    default_model_provider: str  # Add this attribute
    openai_model: str  # Ensure this attribute is also defined
    anthropic_model: str  # Ensure this attribute is also defined

    def validate(self):
        # Get cached models
        cached_models = frappe.cache().get_value("ai_translation_models")
        if not cached_models:
            # If no cached models, skip validation to avoid API calls during save
            return

        models_data = json.loads(cached_models)

        # Validate OpenAI model only if provider is OpenAI
        if self.default_model_provider == "openai" and self.openai_model:
            valid_models = models_data.get("openai", [])
            # If we couldn't fetch models, don't validate
            if valid_models and self.openai_model not in valid_models:
                # Allow custom model strings if they start with known prefixes
                prefixes = ["gpt-", "o4-", "chatgpt-"]
                if not any(self.openai_model.startswith(prefix) for prefix in prefixes):
                    models_str = ", ".join([f'"{model}"' for model in valid_models[:5]])
                    if len(valid_models) > 5:
                        models_str += f" and {len(valid_models)-5} more"
                    frappe.throw(
                        _(
                            f'OpenAI Model "{self.openai_model}" is not available. Try one of {models_str}'
                        )
                    )

        # Validate Claude model only if provider is Claude
        if self.default_model_provider == "claude" and self.anthropic_model:
            valid_models = models_data.get("claude", [])
            # If we couldn't fetch models, don't validate
            if valid_models and self.anthropic_model not in valid_models:
                # Allow custom model strings if they start with known prefixes
                if not self.anthropic_model.startswith("claude-"):
                    models_str = ", ".join([f'"{model}"' for model in valid_models])
                    frappe.throw(
                        _(
                            f'Claude Model "{self.anthropic_model}" is not available. Try one of {models_str}'
                        )
                    )
