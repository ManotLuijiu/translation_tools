import frappe

# from frappe import _
import frappe.utils
import json

# import requests
from openai import OpenAI
import anthropic


@frappe.whitelist()
def get_available_ai_models():
    """Fetch available models from OpenAI and Anthropic APIs"""
    result = {"openai": [], "claude": [], "error": None}

    settings = frappe.get_single("Translation Tools Settings")

    # Fetch OpenAI models
    try:
        if getattr(settings, "openai_api_key", None):
            client = OpenAI(api_key=settings.openai_api_key)  # type: ignore
            models = client.models.list()

            # openai_models = [
            #     "gpt-4.1-mini-2025-04-14",
            #     "gpt-4.1-2025-04-14",
            #     "chatgpt-4o-latest",
            #     "gpt-4o-mini-2024-07-18",
            #     "o4-mini-2025-04-16",
            # ]

            # Filter for chat models only (adjust filters as needed)
            chat_models = [
                model.id
                for model in models
                if ("gpt" in model.id.lower() or "o4" in model.id.lower())
                and not model.id.endswith("-vision")
            ]

            result["openai"] = sorted(chat_models)

            print(f"result from ai_models.py {result}")

    except Exception as e:
        frappe.log_error(f"Error fetching OpenAI models: {str(e)}")
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
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307",
            ]

            # Optionally, verify models are accessible
            valid_models = []
            for model in claude_models:
                try:
                    # Just check if we can use the model (we'll abort the request immediately)
                    client.messages.create(
                        model=model,
                        max_tokens=1,
                        messages=[{"role": "user", "content": "test"}],
                        timeout=5,
                    )
                    valid_models.append(model)
                except Exception as e:
                    if "model not found" in str(e).lower():
                        continue
                    else:
                        # Other error - add model anyway
                        valid_models.append(model)

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
