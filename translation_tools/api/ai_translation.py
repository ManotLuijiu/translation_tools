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
from translation_tools.utils.json_logger import get_json_logger
from frappe.utils import now

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

        # Get API keys from secure Translation Tools Settings
        from .translation import _translate_with_openai, _translate_with_claude

        api_keys = get_decrypted_api_keys()
        settings = get_translation_settings()

        # Use the working config values or fall back to parameters
        final_provider = (
            model_provider
            if model_provider
            else settings.get("default_model_provider", "openai")
        )
        final_model = model if model else settings.get("default_model", "gpt-4o-mini")

        # Get the appropriate API key based on provider
        if final_provider == "openai":
            api_key = api_keys.get("openai_api_key")
        elif final_provider in ["anthropic", "claude"]:
            api_key = api_keys.get("anthropic_api_key")
        else:
            api_key = None

        if not api_key:
            return {
                "success": False,
                "error": "API key not found in configuration. Please configure it in Translation Tools Settings.",
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
            logger.info(
                f"Batch translation completed in {translation_duration:.2f} seconds"
            )

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

        # Load PO file (use validated full path to avoid polib treating relative path as PO content)
        full_path = validate_file_path(file_path)
        po_file = polib.pofile(full_path)

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
                "user_email": result.get("user_email"),
                "user_name": result.get("user_name"),
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


# ─── Auto Mode Job Orchestration ────────────────────────────────────────────────


def _get_untranslated_entry_ids(file_path):
    """
    Return all untranslated entry IDs for a PO file.

    Returns:
        list: List of entry_id strings (empty if file fully translated or not found)
    """
    full_path = validate_file_path(file_path)
    if not os.path.exists(full_path):
        return []

    try:
        po = polib.pofile(full_path)
        untranslated = []
        for po_index, entry in enumerate(po):
            if not isinstance(entry, polib.POEntry) or not entry.msgid:
                continue
            if entry.msgstr and entry.msgstr.strip():
                continue  # already translated
            unique_string = f"{po_index}-{entry.msgid}"
            entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()
            untranslated.append(entry_id)
        return untranslated
    except Exception:
        return []


def _save_chunk_to_po(file_path, translations: dict, github_branch=None):
    """
    Save a dict of {entry_id: translation} to the PO file.
    Does NOT push to GitHub.

    Returns:
        int: Number of entries saved
    """
    full_path = validate_file_path(file_path)
    try:
        po = polib.pofile(full_path)
        saved = 0
        for po_index, entry in enumerate(po):
            if not isinstance(entry, polib.POEntry) or not entry.msgid:
                continue
            unique_string = f"{po_index}-{entry.msgid}"
            entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()
            if entry_id in translations:
                entry.msgstr = translations[entry_id]
                saved += 1
        if saved > 0:
            po.save(full_path)
            update_po_metadata(po, full_path)
        return saved
    except Exception as e:
        logger.error(f"_save_chunk_to_po failed: {e}")
        return 0


def _final_github_push(file_path, github_branch=None, updated_count=0):
    """
    Push the entire saved PO file to GitHub.
    Creates a fresh polib object, saves, then pushes.

    Returns:
        dict: Push result
    """
    try:
        full_path = validate_file_path(file_path)
        # Re-save the file to ensure it's up-to-date
        po = polib.pofile(full_path)
        po.save(full_path)
        update_po_metadata(po, full_path)

        from .po_files import push_translation_to_github

        result = push_translation_to_github(
            file_path,
            entry=None,
            translation=None,
            custom_commit_message=(
                f"Auto Mode: batch translation of {updated_count} entries"
            ),
            github_branch=github_branch,
        )
        return result
    except Exception as e:
        logger.error(f"_final_github_push failed: {e}")
        return {"success": False, "error": str(e)}


def _run_auto_mode_chunk(
    job_id, chunk_entry_ids, chunk_size, model_provider, model, api_key, github_branch
):
    """
    Process a single chunk: translate → save.
    Returns (translations dict, error or None).
    """
    from .translation import _translate_with_openai, _translate_with_claude

    full_path = validate_file_path(
        job_id
    )  # job_id holds file_path for this internal call
    try:
        po = polib.pofile(full_path)
    except Exception as e:
        return {}, str(e)

    # Build msgid lookup
    msgid_map = {}
    for po_index, entry in enumerate(po):
        if not isinstance(entry, polib.POEntry) or not entry.msgid:
            continue
        unique_string = f"{po_index}-{entry.msgid}"
        entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()
        if entry_id in chunk_entry_ids:
            msgid_map[entry_id] = entry.msgid

    translations = {}
    errors = []
    skipped_thai = []
    for entry_id, msgid in msgid_map.items():
        try:
            if model_provider == "claude":
                result = _translate_with_claude(api_key, model, msgid)
            else:
                result = _translate_with_openai(api_key, model, msgid)
            
            # Handle new return format with skipped flag
            if isinstance(result, dict):
                if result.get("skipped"):
                    # Already Thai - copy as-is (already translated)
                    translations[entry_id] = result.get("text", msgid)
                    skipped_thai.append(entry_id)
                    logger.info(f"Skipped Thai entry: {entry_id[:8]}...")
                elif result.get("text"):
                    translations[entry_id] = result["text"]
            elif result:
                # Legacy: result is just the translated text string
                translations[entry_id] = result
        except Exception as e:
            errors.append(f"{entry_id}: {e}")

    if skipped_thai:
        logger.info(f"Chunk: {len(skipped_thai)} entries skipped (already Thai)")
    if errors:
        logger.warning(f"Chunk errors ({len(errors)}): {errors[:3]}")

    return translations, None


@frappe.whitelist()
def start_auto_mode_job(
    file_path,
    push_to_github=False,
    github_branch=None,
    model_provider="openai",
    model=None,
    max_chunk_size=20,
    max_entries=None,  # NEW: Limit total entries to process
    english_only=True,  # NEW: Skip Thai/mixed entries
):
    """
    Start an Auto Mode job for a file. Creates a job record and queues
    background processing.

    Args:
        file_path (str): Path to the PO file
        push_to_github (bool): Whether to push to GitHub at end
        github_branch (str): Branch to push to
        model_provider (str): AI provider (openai / claude)
        model (str): Model name
        max_chunk_size (int): Max entries per chunk (default 20)
        max_entries (int): Maximum total entries to translate (None = all)

    Returns:
        dict: {success, job_id, total_untranslated, planned_chunk_count}
    """
    try:
        # Get untranslated entry IDs
        all_entry_ids = _get_untranslated_entry_ids(file_path)
        if not all_entry_ids:
            return {
                "success": False,
                "error": "No untranslated entries found in this file.",
            }
        
        # Filter English-only if requested
        if english_only:
            from .translation import contains_substantial_thai
            english_entry_ids = []
            # Use validate_and_parse_po_file to handle BOM and encoding
            success, po_or_error = validate_and_parse_po_file(file_path)
            if not success:
                logger.error(f"English-only filter: {po_or_error}")
            else:
                po = po_or_error
                for po_index, entry in enumerate(po):
                    if not isinstance(entry, polib.POEntry) or not entry.msgid or entry.is_translated():
                        continue
                    unique_string = f"{po_index}-{entry.msgid}"
                    entry_id = hashlib.md5(unique_string.encode("utf-8")).hexdigest()
                    if entry_id in all_entry_ids and not contains_substantial_thai(entry.msgid):
                        english_entry_ids.append(entry_id)
            all_entry_ids = english_entry_ids
        
        # Limit entries if max_entries is specified
        entry_ids = all_entry_ids[:max_entries] if max_entries else all_entry_ids

        # Resolve model
        settings = get_translation_settings()
        final_model = model or settings.get("default_model", "gpt-4o-mini")

        # Create DocType job record
        job = frappe.get_doc(
            {
                "doctype": "Auto Mode Job",
                "job_id": frappe.generate_hash(length=10),
                "status": "running",
                "file_path": file_path,
                "total_untranslated": len(entry_ids),
                "translated_count": 0,
                "saved_count": 0,
                "skipped_count": 0,
                "failed_entry_ids": "[]",
                "current_chunk_size": max_chunk_size,
                "planned_entry_ids": json.dumps(entry_ids),
                "push_to_github": push_to_github,
                "github_branch": github_branch,
                "model_provider": model_provider,
                "model": final_model,
                "max_chunk_size": max_chunk_size,
                "started_at": frappe.utils.now(),
                "updated_at": frappe.utils.now(),
            }
        )
        job.insert(ignore_permissions=True)
        job_id = job.name

        # Enqueue background processing
        frappe.enqueue(
            "translation_tools.api.ai_translation._auto_mode_worker",
            job_id=job_id,
            queue="default",
            timeout=7200,  # 2 hours max
        )

        return {
            "success": True,
            "job_id": job_id,
            "total_untranslated": len(entry_ids),
            "total_available": len(all_entry_ids),
            "remaining_after": len(all_entry_ids) - len(entry_ids),
            "planned_chunk_count": (len(entry_ids) + max_chunk_size - 1)
            // max_chunk_size,
            "planned_initial_chunk_size": max_chunk_size,
        }
    except Exception as e:
        logger.error(f"start_auto_mode_job failed: {e}")
        return {"success": False, "error": str(e)}


def _auto_mode_worker(job_id):
    """
    Background worker that processes all chunks for a job.
    Updates the DocType record after each chunk for checkpoint persistence.
    """

    try:
        job = frappe.get_doc("Auto Mode Job", job_id)
    except Exception:
        logger.error(f"_auto_mode_worker: job {job_id} not found")
        return

    # Load settings
    api_keys = get_decrypted_api_keys()
    api_key = None
    if job.model_provider == "claude":
        api_key = api_keys.get("anthropic_api_key")
    else:
        api_key = api_keys.get("openai_api_key")

    if not api_key:
        _set_job_status(job, "failed", last_error="No API key found")
        return

    # Parse planned entry IDs
    try:
        remaining_ids = json.loads(job.planned_entry_ids or "[]")
    except Exception:
        remaining_ids = []

    try:
        failed_ids = json.loads(job.failed_entry_ids or "[]")
    except Exception:
        failed_ids = []

    skipped_ids = []
    translations_batch = {}
    chunk_sizes = [job.max_chunk_size or 20]

    full_path = validate_file_path(job.file_path)

    while remaining_ids:
        # Check for cancellation / pause
        job.reload()
        if job.status in ("cancelled", "paused"):
            # Save progress so far
            if translations_batch:
                saved = _save_chunk_to_po(job.file_path, translations_batch)
                job.translated_count += len(translations_batch)
                job.saved_count += saved
                job.updated_at = frappe.utils.now()
                job.save(ignore_permissions=True)
            return

        chunk_size = chunk_sizes[-1]
        job.current_chunk_size = chunk_size
        job.updated_at = frappe.utils.now()

        # Take next chunk
        chunk_ids = remaining_ids[:chunk_size]

        # Translate chunk
        chunk_translations, err = _run_auto_mode_chunk(
            job_id=job.file_path,  # reuse _run_auto_mode_chunk with file_path
            chunk_entry_ids=set(chunk_ids),
            chunk_size=chunk_size,
            model_provider=job.model_provider,
            model=job.model,
            api_key=api_key,
            github_branch=None,  # don't push per-chunk
        )

        if err or not chunk_translations:
            # Adaptive fallback
            if chunk_size > 1:
                next_size = max(1, chunk_size // 2)
                chunk_sizes.append(next_size)
                logger.info(
                    f"Chunk failed at size {chunk_size}, retrying with {next_size}"
                )
                job.last_error = f"Retry with chunk size {next_size}"
                continue
            else:
                # Single entry failed — skip it
                skipped_ids.append(chunk_ids[0])
                remaining_ids = remaining_ids[1:]
                logger.warning(
                    f"Skipping entry {chunk_ids[0]} after irrecoverable error"
                )
                continue
        else:
            # Save this chunk
            saved = _save_chunk_to_po(job.file_path, chunk_translations)

            # Remove processed IDs from remaining
            processed = set(chunk_translations.keys())
            remaining_ids = [eid for eid in remaining_ids if eid not in processed]

            # Update job record
            job.translated_count += len(chunk_translations)
            job.saved_count += saved
            job.updated_at = frappe.utils.now()
            job.last_error = None
            job.save(ignore_permissions=True)
            frappe.db.commit()

            logger.info(
                f"[AutoMode {job_id}] chunk saved: {len(chunk_translations)} entries. "
                f"Progress: {job.translated_count}/{job.total_untranslated}"
            )

    # All done — final GitHub push if requested
    final_push_result = None
    if job.push_to_github:
        logger.info(f"[AutoMode {job_id}] Starting final GitHub push")
        final_push_result = _final_github_push(
            job.file_path,
            github_branch=job.github_branch,
            updated_count=job.saved_count,
        )
        logger.info(f"[AutoMode {job_id}] Final push result: {final_push_result}")

    # Mark completed
    job.status = "completed" if not skipped_ids else "completed_with_skips"
    job.skipped_count = len(skipped_ids)
    job.failed_entry_ids = json.dumps(skipped_ids)
    job.completed_at = frappe.utils.now()
    job.final_push_result = json.dumps(final_push_result) if final_push_result else "{}"
    job.updated_at = frappe.utils.now()
    job.save(ignore_permissions=True)
    frappe.db.commit()
    logger.info(f"[AutoMode {job_id}] Job completed with status: {job.status}")


def _set_job_status(job, status, last_error=None):
    """Helper to update job status and save."""
    job.status = status
    if last_error is not None:
        job.last_error = last_error
    job.updated_at = frappe.utils.now()
    if status in ("completed", "failed", "cancelled"):
        job.completed_at = frappe.utils.now()
    try:
        job.save(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        logger.error(f"_set_job_status error: {e}")


@frappe.whitelist()
def get_auto_mode_job_status(job_id):
    """
    Return current progress for an Auto Mode job.

    Returns:
        dict: Job status fields
    """
    try:
        job = frappe.get_doc("Auto Mode Job", job_id)
        return {
            "success": True,
            "job_id": job.name,
            "status": job.status,
            "file_path": job.file_path,
            "total_untranslated": job.total_untranslated,
            "translated_count": job.translated_count,
            "saved_count": job.saved_count,
            "skipped_count": job.skipped_count,
            "failed_entry_ids": json.loads(job.failed_entry_ids or "[]"),
            "current_chunk_size": job.current_chunk_size,
            "push_to_github": job.push_to_github,
            "github_branch": job.github_branch,
            "last_error": job.last_error,
            "final_push_result": json.loads(job.final_push_result or "{}"),
            "started_at": job.started_at,
            "updated_at": job.updated_at,
            "completed_at": job.completed_at,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def pause_auto_mode_job(job_id):
    """Pause a running job. Safe to call from paused/cancelled jobs."""
    try:
        job = frappe.get_doc("Auto Mode Job", job_id)
        if job.status == "running":
            job.status = "paused"
            job.updated_at = frappe.utils.now()
            job.save(ignore_permissions=True)
            frappe.db.commit()
        return {"success": True, "status": job.status}
    except Exception as e:
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def resume_auto_mode_job(job_id):
    """
    Resume a paused job. Re-queues the background worker.
    Worker reads remaining IDs from planned_entry_ids minus already-saved.
    """
    try:
        job = frappe.get_doc("Auto Mode Job", job_id)
        if job.status != "paused":
            return {"success": False, "error": f"Cannot resume: job is {job.status}"}

        # Compute remaining IDs (all planned minus successfully saved)
        all_ids = set(json.loads(job.planned_entry_ids or "[]"))
        saved_ids = set(json.loads(job.failed_entry_ids or "[]"))  # failed = skipped
        # We need to track which IDs were actually saved
        # Re-scan the PO file for currently translated entries
        remaining = _get_untranslated_entry_ids(job.file_path)
        # Remaining IDs are the ones NOT yet saved
        saved_count = job.total_untranslated - len(remaining)
        job.translated_count = saved_count
        job.saved_count = saved_count
        job.status = "running"
        job.updated_at = frappe.utils.now()
        job.save(ignore_permissions=True)
        frappe.db.commit()

        # Re-enqueue
        frappe.enqueue(
            "translation_tools.api.ai_translation._auto_mode_worker",
            job_id=job_id,
            queue="default",
            timeout=7200,
        )

        return {"success": True, "status": job.status, "saved_count": saved_count}
    except Exception as e:
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def cancel_auto_mode_job(job_id):
    """Cancel a running or paused job. Worker checks status and stops gracefully."""
    try:
        job = frappe.get_doc("Auto Mode Job", job_id)
        if job.status in ("completed", "completed_with_skips", "failed", "cancelled"):
            return {"success": True, "status": job.status}
        job.status = "cancelled"
        job.updated_at = frappe.utils.now()
        job.save(ignore_permissions=True)
        frappe.db.commit()
        return {"success": True, "status": job.status}
    except Exception as e:
        return {"success": False, "error": str(e)}
