import frappe

# from frappe import _
import frappe.utils
import json

# import requests
from openai import OpenAI
import anthropic


@frappe.whitelist()
def get_available_ai_models():
    """Return static OpenAI models and verified Anthropic models"""
    result = {
        "openai": [
            {"id": "gpt-4.1-mini-2025-04-14", "label": "GPT-4.1 mini"},
            {"id": "gpt-4.1-2025-04-14", "label": "GPT-4.1"},
            {"id": "chatgpt-4o-latest", "label": "ChatGPT-4o"},
            {"id": "gpt-4o-mini-2024-07-18", "label": "GPT-4o mini"},
            {"id": "o4-mini-2025-04-16", "label": "o4-mini"},
        ],
        "claude": [],
        "error": None,
    }

    settings = frappe.get_single("Translation Tools Settings")

    # Fetch OpenAI models
    # try:
    #     if getattr(settings, "openai_api_key", None):
    #         client = OpenAI(api_key=settings.openai_api_key)  # type: ignore
    #         models = client.models.list()

    #         chat_models = []
    #         for model in models:
    #             model_id = model.id
    #             if (
    #                 "gpt" in model_id.lower()
    #                 or "o4" in model_id.lower()
    #                 or "chatgpt" in model_id.lower()
    #             ) and not model_id.endswith("-vision"):
    #                 label = format_openai_label(model_id)
    #                 chat_models.append({"id": model_id, "label": label})

    #         result["openai"] = sorted(chat_models, key=lambda m: m["id"])

    #         print(f"result from ai_models.py {result}")

    # except Exception as e:
    #     frappe.log_error(f"Error fetching OpenAI models: {str(e)}")
    # Don't fail completely, just log the error and continue

    # Fetch Anthropic models
    try:
        if getattr(settings, "anthropic_api_key", None):
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)  # type: ignore

            # Anthropic doesn't have a direct list models API, so we'll use their recommended models
            # You can update this list periodically or check their docs
            claude_models = [
                "claude-3-7-sonnet-20250219",
                "claude-3-5-haiku-20241022",
                "claude-3-5-sonnet-20241022",
                "claude-3-opus-20240229",
                "claude-3-haiku-20240307",
            ]

            # Optionally, verify models are accessible
            valid_models = []
            for model in claude_models:
                try:
                    # quick check to validate model
                    client.messages.create(
                        model=model,
                        max_tokens=1,
                        messages=[{"role": "user", "content": "test"}],
                        timeout=5,
                    )
                    valid_models.append(
                        {"id": model, "label": format_claude_label(model)}
                    )
                except Exception as e:
                    if "model not found" not in str(e).lower():
                        valid_models.append(
                            {"id": model, "label": format_claude_label(model)}
                        )

            result["claude"] = valid_models

            print(f"result from ai_models.py {result}")

    except Exception as e:
        frappe.log_error(f"Error fetching Anthropic models: {str(e)}")

    # Add a cache timestamp
    result["last_updated"] = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

    # Cache the results to avoid frequent API calls
    cache_key = "ai_translation_models"
    frappe.cache().set_value(
        cache_key, json.dumps(result), expires_in_sec=86400
    )  # Cache for 24 hours

    print(f"last result from ai_models.py {result}")
    return result


@frappe.whitelist()
def get_cached_models():
    """Get cached models or fetch fresh ones"""
    cache_key = "ai_translation_models"
    cached_data = frappe.cache().get_value(cache_key)

    print(f"cached_data {cached_data}")

    if cached_data:
        return json.loads(cached_data)
    else:
        return get_available_ai_models()


# --- Helper functions for friendly names ---


def format_openai_label(model_id: str) -> str:
    if model_id.startswith("gpt-4o"):
        return "GPT-4 Omni" if "mini" not in model_id else "GPT-4o Mini"
    if "gpt-4.1" in model_id:
        return "GPT-4.1" if "mini" not in model_id else "GPT-4.1 Mini"
    if "gpt-3.5" in model_id:
        return "GPT-3.5"
    if model_id.startswith("gpt-4"):
        return "GPT-4"
    if model_id.startswith("chatgpt-4o"):
        return "ChatGPT-4o" if "mini" not in model_id else "ChatGPT-4o Mini"
    if "o4" in model_id:
        return "OpenAI v4 (Mini)"
    return model_id


def format_claude_label(model_id: str) -> str:
    if "opus" in model_id:
        return "Claude 3 Opus"
    if "sonnet" in model_id:
        return "Claude 3 Sonnet"
    if "claude-3-7-sonnet" in model_id:
        return "Claude 3.7 Sonnet"
    if "haiku" in model_id:
        return "Claude 3 Haiku"
    return model_id.replace("-", " ").title()
