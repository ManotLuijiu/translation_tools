import os
import frappe
import polib
import json
import hashlib
import openai
import anthropic
import logging
import tempfile
from .settings import get_translation_settings, get_decrypted_api_keys
from .po_files import (
    push_translation_to_github,
    enhanced_error_handler,
    validate_file_path,
)
from .common import get_bench_path
from .translation import _batch_translate_with_openai, _batch_translate_with_claude
from translation_tools.utils.json_logger import get_json_logger
from frappe.utils import cstr, now

# Configure logging
LOG_DIR = os.path.join(get_bench_path(), "logs", "ai_translation_tools")
os.makedirs(LOG_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOG_DIR, "ai_translation_file_debug.log")

logger = logging.getLogger("translation_tools.api.po_files")
loggerJson = get_json_logger()

# Avoid adding handlers multiple times
if not logger.handlers:
    logger.setLevel(logging.DEBUG)

    # File handler
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    )

    logger.addHandler(file_handler)

    # Create console handler with formatting
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    ch.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    logger.addHandler(ch)


def validate_po_file(file_path):
    """
    Check if a PO file is valid and return its content

    Args:
        file_path (str): Path to the PO file

    Returns:
        tuple: (is_valid, po_object or error_message)
    """
    try:
        # Validate path is within the bench directory
        full_path = validate_file_path(file_path)

        if not os.path.exists(full_path):
            return False, f"File not found: {file_path}"

        # Try reading the file as UTF-8
        with open(full_path, "rb") as f:
            content = f.read()

        # Check for and remove BOM if present
        if content.startswith(b"\xef\xbb\xbf"):
            logger.info(f"Removing BOM from file {file_path}")
            content = content[3:]

        # Create a temporary file without BOM
        with tempfile.NamedTemporaryFile(delete=False) as temp:
            temp_path = temp.name
            temp.write(content)

        try:
            # Try to parse the cleaned file
            po = polib.pofile(temp_path)
            return True, po
        except Exception as e:
            logger.error(f"PO Syntax error in {file_path}: {str(e)}")
            return False, f"Syntax error in po file: {str(e)}"
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    except Exception as e:
        logger.error(f"Error validating PO file {file_path}: {str(e)}")
        return False, str(e)


@frappe.whitelist()
@enhanced_error_handler  
def translate_batch(file_path, entry_ids, model_provider="openai", model=None):
    """
    Translate a batch of entries at once

    Args:
        file_path (str): Path to the PO file
        entry_ids (list): List of entry IDs to translate
        model_provider (str): AI model provider (openai or claude)
        model (str): Specific model to use

    Returns:
        dict: Dictionary with translation results
    """

    # Add request start time for timeout tracking
    import time
    start_time = time.time()
    
    # Validate path is within the bench directory
    full_path = validate_file_path(file_path)
    logger.info(f"Starting translation batch for file: {full_path}")

    if not os.path.exists(full_path):
        logger.error(f"File not found: {full_path}")
        return {"success": False, "error": f"File not found: {file_path}"}

    # Validate PO file with timeout check
    logger.info("Validating PO file...")
    is_valid, po_result = validate_po_file(file_path)
    if not is_valid:
        logger.error(f"PO file validation failed: {po_result}")
        return {"success": False, "error": po_result}

    # po_result now contains the valid polib object
    po = po_result
    logger.info(f"PO file loaded successfully with {len(po)} entries")

    try:
        # # Try reading the file as UTF-8
        # with open(full_path, "rb") as f:
        #     content = f.read()

        # # Check for and remove BOM if present
        # if content.startswith(b"\xef\xbb\xbf"):
        #     logger.info(f"Removing BOM from file {file_path}")
        #     content = content[3:]

        # # Create a temporary file without BOM
        # with tempfile.NamedTemporaryFile(delete=False) as temp:
        #     temp_path = temp.name
        #     temp.write(content)

        # try:
        #     # Try to parse the cleaned file
        #     po = polib.pofile(temp_path)
        # finally:
        #     # Clean up temp file
        #     if os.path.exists(temp_path):
        #         os.unlink(temp_path)

        # Use the SAME config method as the fast working single entry function
        from .common import _get_translation_config
        from .translation import _translate_with_openai, _translate_with_claude
        
        api_key, actual_provider, actual_model = _get_translation_config()
        
        # Use the working config values or fall back to parameters
        final_provider = model_provider if model_provider else actual_provider
        final_model = model if model else actual_model

        if not api_key:
            return {
                "success": False,
                "error": f"API key not found in configuration",
            }
            
        logger.info(f"Using config: {final_provider} with model {final_model}")

        # Parse entry_ids if it's a string
        if isinstance(entry_ids, str):
            entry_ids = json.loads(entry_ids)
            
        logger.info(f"Processing {len(entry_ids)} requested entry IDs")

        # Get entries to translate
        entries_dict = {}  # Dictionary for batch translation functions
        entries_to_translate = []  # List for result mapping

        logger.info("Building entries list...")
        for po_index, entry in enumerate(po):
            if not isinstance(entry, polib.POEntry) or not entry.msgid:
                continue

            # Generate entry ID using the same method as FrontEnd
            unique_string = f"{po_index}-{entry.msgid}"
            entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()

            if entry_id in entry_ids:
                # Add to the dictionary with po_index as key for batch translation
                entries_dict[po_index] = entry.msgid

                # Add to list for result mapping
                entries_to_translate.append(
                    {
                        "id": entry_id,
                        "po_index": po_index,  # Store index for later retrieval
                        "entry": entry,  # Store the full entry for GitHub push
                        "msgid": entry.msgid,
                        "context": entry.msgctxt if hasattr(entry, "msgctxt") else None,
                    }
                )

        if not entries_to_translate:
            logger.error("No valid entries found for translation")
            return {"success": False, "error": "No valid entries found"}
            
        logger.info(f"Found {len(entries_to_translate)} entries to translate")

        # Create input for translation
        # entries_for_translation = [e["msgid"] for e in entries_to_translate]

        # Use the SAME translation method as the fast working single entry function
        logger.info(f"Starting translation with {final_provider} using {final_model}")
        translation_start_time = time.time()
        
        results = {}
        try:
            # Translate each entry individually using the SAME method as the working function
            for entry_data in entries_to_translate:
                entry_id = entry_data["id"]
                msgid = entry_data["msgid"]
                
                logger.info(f"Translating entry {entry_id}: {msgid[:50]}...")
                
                # Use the EXACT SAME translation functions as the working single entry
                if final_provider == "claude":
                    translation = _translate_with_claude(api_key, final_model, msgid)
                else:
                    translation = _translate_with_openai(api_key, final_model, msgid)
                
                if translation:
                    results[entry_id] = translation
                    logger.info(f"Entry {entry_id} translated successfully")
                else:
                    results[entry_id] = ""
                    logger.warning(f"Entry {entry_id} translation failed")
                
            translation_duration = time.time() - translation_start_time
            logger.info(f"Batch translation completed in {translation_duration:.2f} seconds")
            
        except Exception as ai_error:
            logger.error(f"Translation failed: {str(ai_error)}")
            return {"success": False, "error": f"Translation failed: {str(ai_error)}"}

        # Results are already built in the loop above
        logger.info(f"Returning {len(results)} translations")
        return {"success": True, "translations": results}

    except Exception as e:
        frappe.log_error(f"Batch translation error: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
@enhanced_error_handler
def save_batch_translations(file_path, translations, push_to_github=False):
    """
    Save batch translations to PO file

    Args:
        file_path (str): Path to the PO file
        translations (dict): Dictionary of entry_id -> translation
        push_to_github (bool): Whether to push changes to GitHub

    Returns:
        dict: Result of the operation
    """
    # Validate and load the PO file
    is_valid, po_result = validate_po_file(file_path)

    if not is_valid:
        return {"success": False, "error": po_result}

    # po_result now contains the valid polib object
    po_file = po_result

    try:
        # Parse translations if it's a string
        if isinstance(translations, str):
            translations = json.loads(translations)

        # Convert push_to_github to boolean if it's a string
        if isinstance(push_to_github, str):
            push_to_github = push_to_github.lower() == "true"

        # Load PO file
        full_path = validate_file_path(file_path)
        po_file = polib.pofile(full_path)

        # Update entries
        updated_count = 0
        for po_index, entry in enumerate(po_file):
            if not isinstance(entry, polib.POEntry) or not entry.msgid:
                continue

            # Generate entry ID
            unique_string = f"{po_index}-{entry.msgid}"
            entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()

            # Check if this entry should be updated
            if str(entry_id) in translations:
                new_translation = translations[str(entry_id)]

                # Update entry
                entry.msgstr = new_translation
                updated_count += 1

                # Push to GitHub if requested
                if push_to_github:
                    try:
                        push_translation_to_github(file_path, entry, new_translation)
                    except Exception as github_err:
                        frappe.log_error(
                            f"GitHub push error for entry {entry_id}: {str(github_err)}"
                        )

        # Save the file
        full_path = validate_file_path(file_path)
        po_file.save(full_path)

        # Update metadata
        update_po_metadata(po_file, file_path)

        return {
            "success": True,
            "updated_count": updated_count,
            "github_pushed": push_to_github,
        }

    except Exception as e:
        frappe.log_error(f"Save batch translations error: {str(e)}")
        return {"success": False, "error": str(e)}


# Alternatively, if prefer to do a single GitHub push after all translations:
@frappe.whitelist()
@enhanced_error_handler
def save_batch_translations_with_single_github_push(
    file_path, translations, push_to_github=False
):
    """
    Save batch translations to PO file with a single GitHub push at the end

    Args:
        file_path (str): Path to the PO file
        translations (dict): Dictionary of entry_id -> translation
        push_to_github (bool): Whether to push changes to GitHub

    Returns:
        dict: Result of the operation
    """
    # Validate and load the PO file
    is_valid, po_result = validate_po_file(file_path)

    if not is_valid:
        return {"success": False, "error": po_result}

    # po_result now contains the valid polib object
    po_file = po_result

    try:
        # Parse translations if it's a string
        if isinstance(translations, str):
            translations = json.loads(translations)

        # Convert push_to_github to boolean if it's a string
        if isinstance(push_to_github, str):
            push_to_github = push_to_github.lower() == "true"

        # Load PO file
        po_file = polib.pofile(file_path)

        # Map of entries that will be updated
        updated_entries = []

        # Update entries
        updated_count = 0
        for po_index, entry in enumerate(po_file):
            if not entry.msgid:
                continue

            # Generate entry ID
            unique_string = f"{po_index}-{entry.msgid}"
            entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()

            # Check if this entry should be updated
            if str(entry_id) in translations:
                new_translation = translations[str(entry_id)]

                # Store the entry and translation for later GitHub push
                updated_entries.append({"entry": entry, "translation": new_translation})

                # Update entry
                entry.msgstr = new_translation
                updated_count += 1

        # Save the file
        full_path = validate_file_path(file_path)
        po_file.save(full_path)

        # Update metadata
        update_po_metadata(po_file, file_path)

        # Push to GitHub if requested (a single push for all changes)
        github_result = None
        if push_to_github and updated_entries:
            try:
                # For a batch commit, you might want to create a custom function
                # that handles a batch of entries in a single commit
                github_result = push_batch_to_github(file_path, updated_entries)
            except Exception as github_err:
                frappe.log_error(f"GitHub batch push error: {str(github_err)}")
                github_result = {"success": False, "error": str(github_err)}

        return {
            "success": True,
            "updated_count": updated_count,
            "github": github_result,
        }

    except Exception as e:
        frappe.log_error(f"Save batch translations error: {str(e)}")
        return {"success": False, "error": str(e)}


def push_batch_to_github(file_path, updated_entries):
    """
    Push multiple translation updates to GitHub in a single commit

    Args:
        file_path (str): Path to the PO file
        updated_entries (list): List of dictionaries with entry and translation

    Returns:
        dict: Result of the GitHub push
    """
    try:
        # Get settings
        settings = get_translation_settings()
        api_keys = get_decrypted_api_keys()  # Get actual tokens from secure function

        if not settings.get("github_enable") or not api_keys.get("github_token"):
            return {
                "success": False,
                "error": "GitHub integration not enabled or token not provided",
            }

        if not updated_entries or len(updated_entries) == 0:
            return {"success": False, "error": "No entries to push"}

        # For simplicity, we'll just push the first entry but with a better commit message
        # indicating multiple entries were updated
        first_entry = updated_entries[0]["entry"]
        first_translation = updated_entries[0]["translation"]

        # Custom commit message for batch update
        commit_message = f"Batch translation update: {len(updated_entries)} entries in {file_path.split('/')[-1]}"

        # Call the existing push function with modified parameters
        result = push_translation_to_github(
            file_path,
            first_entry,
            first_translation,
            custom_commit_message=commit_message,
        )

        # Include the result from the push operation
        if result and isinstance(result, dict):
            return {
                "success": result.get("success", True),
                "github_pushed": True,
                "commit_message": commit_message,
                "batch_size": len(updated_entries),
                "details": result,
            }

        return {
            "success": True,
            "github_pushed": True,
            "commit_message": commit_message,
            "batch_size": len(updated_entries),
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


# Helper function to update PO file metadata after translations
def update_po_metadata(po_file, file_path):
    """Update PO file metadata including translation percentage"""
    try:
        # Calculate translation stats
        total = len(po_file)
        translated = len([e for e in po_file if e.msgstr])
        percentage = (translated / total * 100) if total > 0 else 0

        # Update metadata
        po_file.metadata["X-Translated-Percentage"] = str(round(percentage, 2))
        po_file.metadata["PO-Revision-Date"] = now()

        # Save again with updated metadata
        po_file.save(file_path)
    except Exception as e:
        frappe.log_error(f"Error updating PO metadata: {str(e)}")


@frappe.whitelist()
def test_ai_connection(provider="openai"):
    """Test connection to AI service without performing a full translation

    Args:
        provider (str): AI provider to test (openai/claude)

    Returns:
        dict: Connection test result
    """
    # Get settings
    settings = get_translation_settings()
    api_keys = get_decrypted_api_keys()  # Get actual API keys from secure function

    # Use minimal prompt and request minimal tokens
    test_text = "Hello"

    try:
        if provider == "openai":
            api_key = api_keys.get("openai_api_key")
            if not api_key:
                return {"success": False, "error": "OpenAI API key not configured"}

            # Test OpenAI connection with minimal token usage
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use cheapest model for testing
                messages=[{"role": "user", "content": test_text}],
                max_tokens=1,  # Request only 1 token
                temperature=0,
            )
            return {
                "success": True,
                "provider": "openai",
                "model": response.model,
                "message": "Connection to OpenAI successful",
            }

        elif provider == "anthropic":
            api_key = api_keys.get("anthropic_api_key")
            if not api_key:
                return {"success": False, "error": "Anthropic API key not configured"}

            # Test Claude connection with minimal token usage
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-3-haiku-20240307",  # Use cheapest model
                messages=[{"role": "user", "content": test_text}],
                max_tokens=1,  # Request only 1 token
                temperature=0,
            )
            return {
                "success": True,
                "provider": "anthropic",
                "model": response.model,
                "message": "Connection to Anthropic successful",
            }
        else:
            return {"success": False, "error": "Invalid provider specified"}

    except Exception as e:
        return {"success": False, "error": str(e), "provider": provider}


@frappe.whitelist()
def test_all_ai_connections():
    """Test connections to all configured AI providers"""
    results = {}

    # Test OpenAI
    try:
        openai_result = test_ai_connection("openai")
        results["openai"] = openai_result
    except Exception as e:
        results["openai"] = {"success": False, "error": str(e)}

    # Test Claude
    try:
        anthropic_result = test_ai_connection("anthropic")
        results["anthropic"] = anthropic_result
    except Exception as e:
        results["anthropic"] = {"success": False, "error": str(e)}

    # Return overall status
    results["all_successful"] = results.get("openai", {}).get(
        "success", False
    ) and results.get("anthropic", {}).get("success", False)

    return results
