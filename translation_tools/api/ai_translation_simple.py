import os
import frappe
import polib
import json
import hashlib
import openai
from .settings import get_decrypted_api_keys, get_translation_settings
from .po_files import enhanced_error_handler, validate_file_path
from .common import logger


@frappe.whitelist()
@enhanced_error_handler
def translate_batch_simple(file_path, entry_ids, model_provider="openai", model=None):
    """
    Simple, fast translation without heavy processing
    """
    try:
        logger.info(f"Starting simple translation for {len(entry_ids) if isinstance(entry_ids, list) else 'unknown'} entries")
        
        # Quick validation
        full_path = validate_file_path(file_path)
        if not os.path.exists(full_path):
            return {"success": False, "error": f"File not found: {file_path}"}

        # Load PO file
        po = polib.pofile(full_path)
        logger.info(f"Loaded PO file with {len(po)} entries")

        # Get API keys
        api_keys = get_decrypted_api_keys()
        api_key = api_keys.get("openai_api_key") if model_provider == "openai" else api_keys.get("anthropic_api_key")
        
        if not api_key:
            return {"success": False, "error": f"API key for {model_provider} not found"}

        # Parse entry_ids
        if isinstance(entry_ids, str):
            entry_ids = json.loads(entry_ids)

        # Find entries to translate
        results = {}
        for po_index, entry in enumerate(po):
            if not entry.msgid:
                continue
                
            # Generate entry ID
            unique_string = f"{po_index}-{entry.msgid}"
            entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()
            
            if entry_id in entry_ids:
                logger.info(f"Translating entry {entry_id}: {entry.msgid[:50]}...")
                
                # Simple API call without complex processing
                try:
                    client = openai.OpenAI(api_key=api_key)
                    response = client.chat.completions.create(
                        model=model or "gpt-4o-mini",
                        messages=[
                            {
                                "role": "system",
                                "content": "Translate from English to Thai. Return only the translation."
                            },
                            {"role": "user", "content": entry.msgid}
                        ],
                        temperature=0.3,
                        max_tokens=1000,
                        timeout=30  # 30 second timeout per entry
                    )
                    
                    translation = response.choices[0].message.content.strip()
                    results[entry_id] = translation
                    logger.info(f"Translated entry {entry_id} successfully")
                    
                except Exception as translate_error:
                    logger.error(f"Translation failed for entry {entry_id}: {str(translate_error)}")
                    results[entry_id] = ""

        logger.info(f"Translation completed. Results: {len(results)} entries")
        return {"success": True, "translations": results}

    except Exception as e:
        logger.error(f"Simple translation error: {str(e)}")
        return {"success": False, "error": str(e)}