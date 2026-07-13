import frappe

# from frappe import _
import frappe.utils
import json
import re
import requests

# import requests
from openai import OpenAI
import anthropic

# Model to pricing URL mapping
# URL pattern: https://developers.openai.com/docs/models/{model-slug}
MODEL_PRICING_URLS = {
    # OpenAI models - slug is everything before the date
    "gpt-4o-mini-2024-07-18": "https://developers.openai.com/docs/models/gpt-4o-mini",
    "gpt-4.1-mini-2025-04-14": "https://developers.openai.com/docs/models/gpt-4.1-mini",
    "gpt-4.1-2025-04-14": "https://developers.openai.com/docs/models/gpt-4.1",
    "chatgpt-4o-latest": "https://developers.openai.com/docs/models/gpt-4o",
    "o4-mini-2025-04-16": "https://developers.openai.com/docs/models/o4-mini",
    "gpt-4o-2024-08-06": "https://developers.openai.com/docs/models/gpt-4o",
    "gpt-4-turbo-2024-04-09": "https://developers.openai.com/docs/models/gpt-4-turbo",
    # Anthropic models
    "claude-3-7-sonnet-20250219": "https://docs.anthropic.com/en/docs/models-overview",
    "claude-3-5-haiku-20241022": "https://docs.anthropic.com/en/docs/models-overview",
    "claude-3-5-sonnet-20241022": "https://docs.anthropic.com/en/docs/models-overview",
    "claude-3-opus-20240229": "https://docs.anthropic.com/en/docs/models-overview",
    "claude-3-haiku-20240307": "https://docs.anthropic.com/en/docs/models-overview",
}


def get_model_pricing_url(model_id: str) -> str:
    """Get the pricing URL for a model using URL template pattern."""
    if model_id in MODEL_PRICING_URLS:
        return MODEL_PRICING_URLS[model_id]
    
    # Try to construct URL from model ID pattern
    # OpenAI: gpt-4.1-mini-2025-04-14 -> https://developers.openai.com/api/docs/models/gpt-4.1-mini
    if model_id.startswith("gpt-") or model_id.startswith("o4-") or model_id.startswith("o3-") or model_id.startswith("chatgpt-"):
        # Extract base model name by removing date suffix
        # Date suffix patterns: 2025-04-14, 2024-07-18, 20250219
        parts = model_id.split("-")
        
        # Check if last part is a date (YYYY or YYYYMMDD format)
        if len(parts) >= 2:
            last_part = parts[-1]
            prev_part = parts[-2] if len(parts) >= 2 else ""
            
            # Pattern: gpt-4.1-mini-2025-04-14 (date with dashes)
            if len(last_part) == 2 and prev_part.isdigit() and len(prev_part) == 4:
                # Remove last 3 parts (year-month-day)
                slug = "-".join(parts[:-3])
            # Pattern: gpt-4o-mini-2024-07-18 (date with dashes)
            elif len(last_part) == 2 and len(prev_part) == 2 and parts[-3].isdigit():
                # Remove last 3 parts
                slug = "-".join(parts[:-3])
            # Pattern: gpt-4.1-mini-20250219 (date without dashes)
            elif len(last_part) == 8 and last_part.isdigit():
                slug = "-".join(parts[:-1])
            else:
                slug = model_id
        else:
            slug = model_id
            
        return f"https://developers.openai.com/api/docs/models/{slug}"
    
    # Anthropic
    if model_id.startswith("claude-"):
        return "https://docs.anthropic.com/en/docs/models-overview"
    
    return "https://developers.openai.com/api/docs/models" 


def fetch_openai_model_pricing():
    """
    Fetch latest pricing from OpenAI public documentation pages.
    Updates OPENAI_MODEL_PRICING dict with latest prices.
    Returns dict with pricing info for all models.
    """
    import requests as req
    
    logger = frappe.logger("translation_tools")
    
    # Model to URL mapping for pricing pages
    model_urls = {
        "gpt-4o-mini-2024-07-18": "https://developers.openai.com/docs/models/gpt-4o-mini",
        "gpt-4.1-mini-2025-04-14": "https://developers.openai.com/docs/models/gpt-4.1-mini",
        "gpt-4.1-2025-04-14": "https://developers.openai.com/docs/models/gpt-4.1",
        "chatgpt-4o-latest": "https://developers.openai.com/docs/models/gpt-4o",
        "o4-mini-2025-04-16": "https://developers.openai.com/docs/models/o4-mini",
        "gpt-4o-2024-08-06": "https://developers.openai.com/docs/models/gpt-4o",
    }
    
    fetched_pricing = {}
    
    for model_id, url in model_urls.items():
        try:
            response = req.get(url, timeout=15)
            if response.status_code == 200:
                html = response.text
                
                # Strategy: Find "Input" text, then find the next $X.XX price after it
                # Then find "Output" text, then find the next $X.XX price after it
                
                input_price = None
                output_price = None
                
                # Find all occurrences of "Input" and get the first $ price after each
                input_positions = [m.start() for m in re.finditer(r'\bInput\b', html)]
                for pos in input_positions:
                    # Look for price in next 300 chars
                    chunk = html[pos:pos+300]
                    prices = re.findall(r'\$([0-9.]+)', chunk)
                    for p in prices:
                        val = float(p)
                        # Reasonable input price (< $50)
                        if val < 50:
                            input_price = val
                            break
                    if input_price:
                        break
                
                # Find all occurrences of "Output" and get the first $ price after each
                output_positions = [m.start() for m in re.finditer(r'\bOutput\b', html)]
                for pos in output_positions:
                    # Look for price in next 300 chars
                    chunk = html[pos:pos+300]
                    prices = re.findall(r'\$([0-9.]+)', chunk)
                    for p in prices:
                        val = float(p)
                        # Reasonable output price (< $100)
                        if val < 100:
                            output_price = val
                            break
                    if output_price:
                        break
                
                if input_price and output_price:
                    # Update global pricing dict
                    if model_id in OPENAI_MODEL_PRICING:
                        OPENAI_MODEL_PRICING[model_id]["input"] = input_price
                        OPENAI_MODEL_PRICING[model_id]["output"] = output_price
                    
                    fetched_pricing[model_id] = {
                        "input": input_price,
                        "output": output_price,
                        "url": url,
                    }
                    logger.info(f"Fetched pricing for {model_id}: Input=${input_price}, Output=${output_price}")
                else:
                    logger.warning(f"Could not extract complete prices for {model_id}: Input={input_price}, Output={output_price}")
        except Exception as e:
            logger.warning(f"Failed to fetch pricing for {model_id}: {e}")
    
    return fetched_pricing


# Model pricing per 1M tokens (input + output combined) - Updated 2025
# Source: https://openai.com/api/docs/models/pricing
OPENAI_MODEL_PRICING = {
    "gpt-4o-mini-2024-07-18": {"input": 0.15, "output": 0.60, "label": "GPT-4o mini (2024-07-18)"},
    "gpt-4.1-mini-2025-04-14": {"input": 0.40, "output": 1.60, "label": "GPT-4.1 mini (2025-04-14)"},
    "gpt-4.1-2025-04-14": {"input": 2.00, "output": 8.00, "label": "GPT-4.1 (2025-04-14)"},
    "chatgpt-4o-latest": {"input": 2.50, "output": 10.00, "label": "ChatGPT-4o"},
    "o4-mini-2025-04-16": {"input": 1.10, "output": 4.40, "label": "o4-mini (2025-04-16)"},
    "gpt-4o-2024-08-06": {"input": 2.50, "output": 10.00, "label": "GPT-4o (2024-08-06)"},
}

# Claude pricing per 1M tokens
CLAUDE_MODEL_PRICING = {
    "claude-3-7-sonnet-20250219": {"input": 3.00, "output": 15.00, "label": "Claude 3.7 Sonnet"},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00, "label": "Claude 3.5 Haiku"},
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00, "label": "Claude 3.5 Sonnet"},
    "claude-3-opus-20240229": {"input": 15.00, "output": 75.00, "label": "Claude 3 Opus"},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25, "label": "Claude 3 Haiku"},
}

TOKENS_PER_WORD = 1.5
AVG_WORDS_PER_ENTRY = 10
AVG_TOKENS_PER_ENTRY = AVG_WORDS_PER_ENTRY * TOKENS_PER_WORD


@frappe.whitelist()
def refresh_model_pricing():
    """Manually refresh pricing from OpenAI docs"""
    try:
        fetched = fetch_openai_model_pricing()
        return {
            "success": True, 
            "message": f"Pricing updated for {len(fetched)} models",
            "fetched": fetched
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# Model to URL mapping for pricing pages (used by both fetch and display)
MODEL_PRICING_URLS = {
    "openai": {
        "gpt-4o-mini-2024-07-18": "https://developers.openai.com/docs/models/gpt-4o-mini",
        "gpt-4.1-mini-2025-04-14": "https://developers.openai.com/docs/models/gpt-4.1-mini",
        "gpt-4.1-2025-04-14": "https://developers.openai.com/docs/models/gpt-4.1",
        "chatgpt-4o-latest": "https://developers.openai.com/docs/models/gpt-4o",
        "o4-mini-2025-04-16": "https://developers.openai.com/docs/models/o4-mini",
        "gpt-4o-2024-08-06": "https://developers.openai.com/docs/models/gpt-4o",
    },
    "anthropic": {
        "claude-3-7-sonnet-20250219": "https://docs.anthropic.com/en/docs/models-overview",
        "claude-3-5-haiku-20241022": "https://docs.anthropic.com/en/docs/models-overview",
        "claude-3-5-sonnet-20241022": "https://docs.anthropic.com/en/docs/models-overview",
        "claude-3-opus-20240229": "https://docs.anthropic.com/en/docs/models-overview",
        "claude-3-haiku-20240307": "https://docs.anthropic.com/en/docs/models-overview",
    },
}


@frappe.whitelist()
def get_model_pricing_info(model_provider="openai", model_id=None):
    """
    Get pricing info for a specific model including the source URL.
    Returns pricing details and the URL where pricing was fetched from.
    """
    result = {
        "success": True,
        "model_id": model_id,
        "model_provider": model_provider,
        "pricing_url": None,
        "input_price": 0,
        "output_price": 0,
        "total_per_1m": 0,
        "label": model_id or "Unknown",
    }
    
    if not model_id:
        return result
    
    # Get URL
    if model_provider == "openai":
        pricing_url = MODEL_PRICING_URLS.get("openai", {}).get(model_id)
        pricing = OPENAI_MODEL_PRICING.get(model_id, {})
    else:
        pricing_url = MODEL_PRICING_URLS.get("anthropic", {}).get(model_id)
        pricing = CLAUDE_MODEL_PRICING.get(model_id, {})
    
    result["pricing_url"] = pricing_url
    result["input_price"] = pricing.get("input", 0)
    result["output_price"] = pricing.get("output", 0)
    result["total_per_1m"] = pricing.get("input", 0) + pricing.get("output", 0)
    result["label"] = pricing.get("label", model_id)
    
    return result


@frappe.whitelist()
def get_api_balance_and_estimation(model_provider="openai", model=None):
    """
    Get API balance and cost estimation.
    Balance is from Translation Tools Settings (manual input).
    Pricing from static table.
    """
    result = {
        "success": True,
        "balance": 0,
        "currency": "USD",
        "model": model or "gpt-4o-mini-2024-07-18",
        "model_label": "GPT-4o mini",
        "cost_per_entry_usd": 0,
        "estimated_entries": 0,
        "estimated_words": 0,
        "avg_words_per_entry": AVG_WORDS_PER_ENTRY,
        "avg_tokens_per_entry": AVG_TOKENS_PER_ENTRY,
        "tokens_per_word": TOKENS_PER_WORD,
        "cost_per_million_tokens": 0,
        "error": None,
    }

    try:
        settings = frappe.get_single("Translation Tools Settings")
        
        # Get manual balance from settings
        if model_provider == "openai":
            balance = getattr(settings, "openai_balance_usd", 0) or 0
        else:
            balance = getattr(settings, "anthropic_balance_usd", 0) or 0
        
        result["balance"] = float(balance) if balance else 0
        
        # Get pricing for the model
        if model_provider == "openai":
            pricing = OPENAI_MODEL_PRICING.get(model) or OPENAI_MODEL_PRICING.get("gpt-4o-mini-2024-07-18")
        else:
            pricing = CLAUDE_MODEL_PRICING.get(model) or CLAUDE_MODEL_PRICING.get("claude-3-5-haiku-20241022")
        
        if pricing:
            result["model_label"] = pricing.get("label", model or "Unknown")
            input_cost = pricing.get("input", 0)
            output_cost = pricing.get("output", 0)
            cost_per_million = input_cost + output_cost
            result["cost_per_million_tokens"] = cost_per_million
            
            # Estimate cost per entry (assuming ~15 tokens average)
            cost_per_entry = (AVG_TOKENS_PER_ENTRY / 1_000_000) * cost_per_million
            result["cost_per_entry_usd"] = cost_per_entry
            
            # Estimate entries from balance
            if cost_per_entry > 0:
                result["estimated_entries"] = int(balance / cost_per_entry)
                result["estimated_words"] = result["estimated_entries"] * AVG_WORDS_PER_ENTRY
        
    except Exception as e:
        result["success"] = False
        result["error"] = str(e)
        frappe.log_error(f"get_api_balance_and_estimation error: {str(e)}")
    
    return result


def get_base_model(model_id):
    """Extract base model name by removing date suffix.
    Pattern 1: YYYY-MM-DD (e.g., gpt-4.1-mini-2025-04-14 -> gpt-4.1-mini)
    Pattern 2: YYYYMMDD (e.g., gpt-4o-mini-20240718 -> gpt-4o-mini)
    """
    match = re.match(r'^(.+)-\d{4}-\d{2}-\d{2}$', model_id)
    if match:
        return match.group(1)
    match = re.match(r'^(.+)-(\d{8})$', model_id)
    if match:
        return match.group(1)
    return model_id


def group_models_by_base(models_list):
    """Group models by base name (alias + snapshot as ONE item).
    
    Returns a list where each item represents one base model:
    - `id`: alias id (or snapshot id if no alias exists)
    - `label`: alias label (or snapshot label if no alias)
    - `snapshot`: snapshot id (None if no snapshot)
    - `cost_per_million`, `input_cost`, `output_cost`: from alias (or snapshot if no alias)
    - `is_recommended`: whether the base model is in the recommended list
    
    Sorted by base name.
    """
    groups = {}
    for m in models_list:
        base = get_base_model(m["id"])
        if base not in groups:
            groups[base] = {"alias": None, "snapshot": None}
        
        # Check if this is a snapshot (has date suffix)
        if m["id"] != base:
            # It's a snapshot
            if groups[base]["snapshot"] is None or m["id"] > groups[base]["snapshot"]["id"]:
                groups[base]["snapshot"] = m
        else:
            # It's an alias
            groups[base]["alias"] = m
    
    result = []
    for base, group in sorted(groups.items()):
        # Prefer alias as primary; fallback to snapshot
        primary = group["alias"] or group["snapshot"]
        if not primary:
            continue
        snapshot_id = group["snapshot"]["id"] if group["snapshot"] else None
        # Only include models that have a snapshot (alias + snapshot pair)
        if not snapshot_id:
            continue
        result.append({
            "id": primary["id"],
            "label": primary["label"],
            "snapshot": snapshot_id,
            "cost_per_million": primary.get("cost_per_million"),
            "input_cost": primary.get("input_cost"),
            "output_cost": primary.get("output_cost"),
            "pricing_url": primary.get("pricing_url"),
            "is_recommended": primary.get("is_recommended", False),
            "has_known_pricing": primary.get("has_known_pricing", False),
        })
    return result


@frappe.whitelist()
def get_available_ai_models():
    """Get available AI models from OpenAI API"""
    from frappe.utils.password import get_decrypted_password
    """
    Return available OpenAI models from the API with pricing info.
    Returns two lists: recommended (for translation) and all models.
    """
    result = {
        "openai": [],
        "openai_recommended": [],
        "claude": [],
        "claude_recommended": [],
        "error": None,
    }

    # Recommended models for translation (cheap, fast, no need for frontier models)
    # Exact base model names (lowercase) - these are the ONLY models shown as recommended
    RECOMMENDED_OPENAI_MODELS = [
        "gpt-4o-mini",
        "gpt-4.1-mini",
        "gpt-5-mini",
        "gpt-5-nano",
        "gpt-5",
        "gpt-5.1",
    ]
    
    # Map lowercase base model to proper label
    MODEL_LABEL_MAP = {
        "gpt-4o-mini": "GPT-4o mini",
        "gpt-4.1-mini": "GPT-4.1 mini",
        "gpt-4.1": "GPT-4.1",
        "gpt-4o": "GPT-4o",
        "gpt-5-mini": "GPT-5 mini",
        "gpt-5-nano": "GPT-5 nano",
        "gpt-5": "GPT-5",
        "gpt-5.1": "GPT-5.1",
        "chatgpt-4o": "ChatGPT-4o",
        "o4-mini": "o4-mini",
        # Aliases without "mini" suffix
        "gpt-4": "GPT-4",
        "gpt-3.5-turbo": "GPT-3.5 Turbo",
    }
    
    def get_model_label(model_id):
        """Get proper label for a model.
        - Alias (no date): 'GPT-4.1 mini'
        - Snapshot (with date): 'GPT-4.1 mini (2025-04-14)'
        """
        import re
        # Check if model_id has date suffix (snapshot)
        match = re.match(r'^(.+)-(\d{4}-\d{2}-\d{2})$', model_id)
        if match:
            # This is a snapshot with date
            base = match.group(1)
            date = match.group(2)
            base_label = MODEL_LABEL_MAP.get(base, base.replace('-', ' ').title())
            return f"{base_label} ({date})"
        
        # This is an alias (no date)
        return MODEL_LABEL_MAP.get(model_id, model_id.replace('-', ' ').title())
    
    # Get decrypted API key using Frappe's built-in decryption
    openai_api_key = get_decrypted_password(
        "Translation Tools Settings",
        "Translation Tools Settings",
        "openai_api_key",
        raise_exception=False,
    ) or ""

    # Fetch OpenAI models from API - shows ALL models user has access to
    try:
        if openai_api_key:
            client = OpenAI(api_key=openai_api_key)
            models = client.models.list()

            chat_models = []
            recommended_models = []
            
            # Extract base model name by removing date suffix
            import re

            # Filter out non-translation models (legacy, embeddings, audio, images, etc.)
            EXCLUDED_PATTERNS = [
                r'^gpt-3\.5',       # Legacy GPT-3.5
                r'^babbage',        # Legacy
                r'^davinci',        # Legacy
                r'^tts-',           # Text-to-speech
                r'^whisper',        # Speech-to-text
                r'^text-embedding', # Embeddings
                r'^gpt-image',      # Image generation
                r'^gpt-audio',      # Audio models
                r'^gpt-realtime',   # Realtime
                r'^omni-moderation', # Content moderation
                r'^sora',           # Video generation
                r'^chatgpt-image',  # Image
                r'^ft:',            # Fine-tuned (user-specific)
                r'codex',           # Code-specific models
                r'transcribe',      # Transcription (anywhere in name)
                r'-tts(\b|$)',      # TTS variants (end of string or word boundary)
                r'search-api',      # Search API
                r'search-preview',  # Search preview
            ]

            def is_translation_model(model_id):
                return not any(re.search(p, model_id) for p in EXCLUDED_PATTERNS)

            for model in models:
                model_id = model.id

                # Skip non-translation models
                if not is_translation_model(model_id):
                    continue

                base_model = get_base_model(model_id)
                is_recommended = base_model in RECOMMENDED_OPENAI_MODELS
                
                # Get pricing from our static table - try exact match first
                pricing = OPENAI_MODEL_PRICING.get(model_id, None)
                
                if pricing:
                    cost_per_million = pricing["input"] + pricing["output"]
                    model_info = {
                        "id": model_id,
                        "label": pricing.get("label") or get_model_label(model_id),
                        "cost_per_million": cost_per_million,
                        "input_cost": pricing["input"],
                        "output_cost": pricing["output"],
                        "pricing_url": get_model_pricing_url(model_id),
                        "has_known_pricing": True,
                        "is_recommended": is_recommended,
                    }
                else:
                    # No known pricing - use default estimate with proper label
                    model_info = {
                        "id": model_id,
                        "label": get_model_label(model_id),
                        "cost_per_million": 1.0,  # Default estimate
                        "input_cost": 0.30,
                        "output_cost": 0.70,
                        "pricing_url": get_model_pricing_url(model_id),
                        "has_known_pricing": False,
                        "is_recommended": is_recommended,
                    }
                
                chat_models.append(model_info)
                if is_recommended:
                    recommended_models.append(model_info)
            
            # Group models by base name (alias + snapshot as ONE item)
            result["openai"] = group_models_by_base(chat_models)
            result["openai_recommended"] = group_models_by_base(recommended_models)

    except Exception as e:
        error_msg = f"Error fetching OpenAI models: {str(e)}"
        frappe.log_error(error_msg)
        result["error"] = error_msg
        # Fallback to static list - only GPT-4o mini and GPT-4.1 mini as recommended
        fallback_models = [
            {"id": "gpt-4o-mini", "snapshot": "gpt-4o-mini-2024-07-18", "label": "GPT-4o mini", "cost_per_million": 0.75, "input_cost": 0.15, "output_cost": 0.60, "pricing_url": get_model_pricing_url("gpt-4o-mini-2024-07-18"), "is_recommended": True},
            {"id": "gpt-4.1-mini", "snapshot": "gpt-4.1-mini-2025-04-14", "label": "GPT-4.1 mini", "cost_per_million": 2.0, "input_cost": 0.40, "output_cost": 1.60, "pricing_url": get_model_pricing_url("gpt-4.1-mini-2025-04-14"), "is_recommended": True},
        ]
        result["openai"] = fallback_models
        result["openai_recommended"] = fallback_models

    # Fetch Anthropic models
    try:
        if getattr(settings, "anthropic_api_key", None):
            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)  # type: ignore

            claude_models = [
                "claude-3-7-sonnet-20250219",
                "claude-3-5-haiku-20241022",
                "claude-3-5-sonnet-20241022",
                "claude-3-opus-20240229",
                "claude-3-haiku-20240307",
            ]

            valid_models = []
            for model in claude_models:
                try:
                    client.messages.create(
                        model=model,
                        max_tokens=1,
                        messages=[{"role": "user", "content": "test"}],
                        timeout=5,
                    )
                    pricing = CLAUDE_MODEL_PRICING.get(model, None)
                    if pricing:
                        cost_per_million = pricing["input"] + pricing["output"]
                        valid_models.append({
                            "id": model,
                            "label": pricing["label"],
                            "cost_per_million": cost_per_million,
                            "input_cost": pricing["input"],
                            "output_cost": pricing["output"],
                            "pricing_url": get_model_pricing_url(model),
                        })
                except Exception:
                    pass

            result["claude"] = sorted(
                valid_models,
                key=lambda m: m.get("cost_per_million") or 999999
            )

    except Exception as e:
        frappe.log_error(f"Error fetching Anthropic models: {str(e)}")

    result["last_updated"] = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

    # Cache for 24 hours
    cache_key = "ai_translation_models"
    frappe.cache().set_value(cache_key, json.dumps(result), expires_in_sec=86400)

    return result


@frappe.whitelist()
def get_cached_models():
    """Get cached models or fetch fresh ones - always fetch fresh from API"""
    # Always fetch fresh models from API to ensure we have the latest
    return get_available_ai_models()


def format_openai_label(model_id: str) -> str:
    if model_id.startswith("gpt-4o"):
        return "GPT-4 Omni" if "mini" not in model_id else "GPT-4o Mini"
    if "gpt-4.1" in model_id:
        return "GPT-4.1" if "mini" not in model_id else "GPT-4.1 Mini"
    if "gpt-3.5" in model_id:
        return "GPT-3.5 Turbo"
    if model_id.startswith("gpt-4"):
        return "GPT-4"
    if model_id.startswith("o4"):
        return "o4-mini" if "mini" in model_id else "o4"
    return model_id


def format_claude_label(model_id: str) -> str:
    if "claude-3-7" in model_id:
        return "Claude 3.7 Sonnet"
    if "claude-3-5-sonnet" in model_id:
        return "Claude 3.5 Sonnet"
    if "claude-3-5-haiku" in model_id:
        return "Claude 3.5 Haiku"
    if "claude-3-opus" in model_id:
        return "Claude 3 Opus"
    if "claude-3-haiku" in model_id:
        return "Claude 3 Haiku"
    return model_id
