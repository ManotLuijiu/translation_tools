import hashlib
import json
import logging
import os
import random
import re
import subprocess
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import anthropic
import frappe
import openai
import polib
from frappe import _
from frappe.utils import now

from translation_tools.utils.thai_glossary import GLOSSARY

from .common import _get_translation_config, get_bench_path, logger
from .glossary import get_glossary_terms_dict
from .settings import get_translation_settings, get_decrypted_api_keys


@frappe.whitelist()
def translate_text(
    text,
    target_lang="th",
    provider="openai",
    model=None,
    source_lang="en",
    save_history=True,
):
    """Translate text using AI services

    Args:
        text (str): Text to translate
        target_lang (str, optional): Target language code. Defaults to "th".
        provider (str, optional): AI provider (openai/claude). Defaults to "openai".
        model (str, optional): Specific model to use. Defaults to None.
        source_lang (str, optional): Source language code. Defaults to "en".
        save_history (bool, optional): Whether to save translation to history. Defaults to True.

    Returns:
        dict: Translation result with original and translated text
    """
    if not text:
        return {"error": "No text provided"}

    settings = frappe.get_single("Translation Tools Settings")

    if provider == "openai":
        api_key = settings.openai_api_key  # type: ignore
        if not api_key:
            return {"error": "OpenAI API key not configured"}

        used_model = model or settings.openai_model  # type: ignore
        result = _translate_with_openai(text, api_key, used_model)

    elif provider == "anthropic":
        api_key = getattr(settings, "anthropic_api_key", None)
        if not api_key:
            return {"error": "Anthropic API key not configured"}

        used_model = model or getattr(
            settings, "anthropic_model", "default_anthropic_model"
        )
        result = _translate_with_claude(text, api_key, used_model)

    else:
        return {"error": "Invalid provider specified"}

    # Save to history if requested and user is logged in
    if (
        save_history
        and frappe.session.user
        and frappe.session.user != "Guest"
        and not isinstance(result, dict)
    ):
        try:
            save_to_translation_history(
                text, result, source_lang, target_lang, provider, used_model
            )
        except Exception as e:
            frappe.log_error(
                f"Error saving translation history: {e}", "Translation History Error"
            )

    if isinstance(result, dict) and "error" in result:
        return result
    else:
        return {
            "original": text,
            "translated": result,
            "source_language": source_lang,
            "target_language": target_lang,
        }


def save_to_translation_history(
    source_text, translated_text, source_lang, target_lang, provider, model
):
    """Save translation to user's history

    Args:
        source_text (str): Original text
        translated_text (str): Translated text
        source_lang (str): Source language code
        target_lang (str): Target language code
        provider (str): AI provider used
        model (str): Model used
    """
    # Get or create user settings
    if not frappe.db.exists("Translation User Settings", frappe.session.user):
        user_settings = frappe.get_doc(
            {
                "doctype": "Translation User Settings",
                "user": frappe.session.user,
                "enable_notifications": 1,
                "enable_message_tone": 1,
                "preferred_language": target_lang,
            }
        ).insert()
    else:
        if not frappe.session.user or not isinstance(frappe.session.user, str):
            raise ValueError("Invalid user session")
        user_settings = frappe.get_doc("Translation User Settings", frappe.session.user)

    # Add history entry
    user_settings.append(
        "translation_history",
        {
            "source_text": source_text[:1000],  # Limit text length
            "translated_text": translated_text[:1000],  # Limit text length
            "source_language": source_lang,
            "target_language": target_lang,
            "translation_date": now(),
            "provider": provider,
            "model": model,
        },
    )

    user_settings.save()


@frappe.whitelist()
def translate_single_entry(file_path, entry_id, model_provider="openai", model=None):
    """Translate a single entry using AI"""
    full_path = os.path.join(get_bench_path(), file_path)
    if not os.path.exists(full_path):
        frappe.throw(_("File not found: {0}").format(full_path))

    # Create a log file
    log_dir = os.path.join(get_bench_path(), "logs", "ai_translation_logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(
        log_dir,
        f"entry_{os.path.basename(file_path)}_{entry_id}_{now().replace(':', '-')}.log",
    )

    # Set up logging
    file_handler = logging.FileHandler(log_file)
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)

    try:
        # Load the PO file
        po = polib.pofile(full_path)

        # Find the entry by ID (hash)
        entry = None
        for index, potential_entry in enumerate(po):
            unique_string = f"{index}-{potential_entry.msgid}"
            current_hash = hashlib.md5(unique_string.encode("utf-8")).hexdigest()
            if current_hash == entry_id:
                entry = potential_entry
                break

        if entry is None:
            frappe.throw(_("Entry not found"))

        # Get the text to translate
        source_text = entry.msgid if entry is not None else ""
        logger.info(f"Translating entry: {source_text}")

        # Get settings
        settings = get_translation_settings()

        # Use the specified model provider or default
        provider = model_provider or settings.get("default_model_provider", "openai")

        # Use the specified model or default based on provider
        if not model:
            if provider == "openai":
                model = settings.get("default_model", "gpt-4.1-mini-2025-04-14")
            else:
                model = settings.get("default_model", "claude-3-haiku-20240307")

        # Get API keys
        api_key = None
        if provider == "openai":
            api_key = settings.get("openai_api_key")
        else:
            api_key = settings.get("anthropic_api_key")

        if not api_key:
            frappe.throw(_("API key not configured for {0}").format(provider))

        print(f"source_text {source_text}")
        print(f"provider {provider}")
        print(f"model {model}")
        # print(f"temperature {settings.get("temperature")}")

        # Get translation
        translation = call_ai_translation_api(
            source_text=source_text,
            provider=provider,
            model=model,
            api_key=api_key,
            temperature=settings.get("temperature", 0.3),
        )

        logger.info(f"Translation result: {translation}")

        # Automatically save if enabled
        if settings.get("auto_save"):
            # Update the translation
            entry.msgstr = translation  # type: ignore

            # Update metadata
            po.metadata["PO-Revision-Date"] = time.strftime("%Y-%m-%d %H:%M%z")

            # Save the file
            po.save(full_path)

            # Clear cache
            global PO_FILES_CACHE
            PO_FILES_CACHE = None

            # Update PO File record in database
            try:
                if frappe.db.exists("PO File", {"file_path": file_path}):
                    file_doc = frappe.get_doc("PO File", {"file_path": file_path})  # type: ignore
                    if file_doc and hasattr(file_doc, 'translated_entries'):
                        if (
                            entry is not None and not entry.msgstr and translation
                        ):  # If this was previously untranslated
                            # Ensure translated_entries is initialized
                            if file_doc.translated_entries is None:
                                file_doc.translated_entries = 0
                            file_doc.translated_entries += 1  # type: ignore
                            
                            if hasattr(file_doc, 'translation_status') and hasattr(file_doc, 'total_entries'):
                                total_entries = file_doc.total_entries or 0
                                if total_entries > 0:
                                    file_doc.translation_status = int((file_doc.translated_entries / total_entries) * 100)  # type: ignore
                                else:
                                    file_doc.translation_status = 0  # type: ignore
                        file_doc.modified = now()
                        file_doc.save()
                    else:
                        logger.warning("PO File document not found or missing required fields")
            except Exception as doc_error:
                logger.warning(f"Failed to update PO File document: {doc_error}")
                # Continue without failing the translation

            logger.info("Translation automatically saved")

        return {"success": True, "translation": translation, "log_file": log_file}
    except Exception as e:
        logger.error(f"Error translating entry: {e}")
        return {"success": False, "error": str(e), "log_file": log_file}
    finally:
        # Remove file handler
        logger.removeHandler(file_handler)
        file_handler.close()


@frappe.whitelist()
def translate_po_file(file_path, model_provider="openai", model=None):
    """Translate an entire PO file using AI"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))

    # Create a log file
    log_dir = os.path.join(get_bench_path(), "logs", "translation_logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(
        log_dir,
        f"translate_{os.path.basename(file_path)}_{now().replace(':', '-')}.log",
    )

    # Set up logging
    file_handler = logging.FileHandler(log_file)
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)

    try:
        logger.info(f"Starting translation of {file_path}")

        # Load the PO file
        po = polib.pofile(file_path)

        # Get settings
        settings = get_translation_settings()

        # Use the specified model provider or default
        provider = model_provider or settings.get("default_model_provider", "openai")

        # Use the specified model or default based on provider
        if not model:
            if provider == "openai":
                model = settings.get("default_model", "gpt-4.1-mini-2025-04-14")
            else:
                model = settings.get("default_model", "claude-3-haiku")

        # Get API keys
        api_key = None
        if provider == "openai":
            api_key = settings.get("openai_api_key")
        else:
            api_key = settings.get("anthropic_api_key")

        if not api_key:
            frappe.throw(_("API key not configured for {0}").format(provider))

        # Get entries to translate
        entries_to_translate = [entry for entry in po if not entry.msgstr]
        total_entries = len(entries_to_translate)
        translated_count = 0

        logger.info(f"Found {total_entries} entries to translate")

        # Batch size from settings
        batch_size = settings.get("batch_size", 10)

        # Process in batches
        for i in range(0, total_entries, batch_size):
            batch = entries_to_translate[i : i + batch_size]
            logger.info(
                f"Processing batch {i//batch_size + 1}, entries {i+1}-{min(i+batch_size, total_entries)}"
            )

            # Translate each entry in the batch
            for entry in batch:
                try:
                    translation = call_ai_translation_api(
                        source_text=entry.msgid,
                        provider=provider,
                        model=model,
                        api_key=api_key,
                        temperature=settings.get("temperature", 0.3),
                    )

                    entry.msgstr = translation  # type: ignore
                    translated_count += 1
                    logger.info(f"Translated: '{entry.msgid}' → '{translation}'")
                except Exception as e:
                    logger.error(f"Error translating entry: {e}")

            # Save progress after each batch
            po.metadata["PO-Revision-Date"] = time.strftime("%Y-%m-%d %H:%M%z")
            po.save(file_path)
            logger.info(f"Saved progress after batch {i//batch_size + 1}")

            # Sleep between batches to avoid rate limiting
            if i + batch_size < total_entries:
                time.sleep(2)

        # Update PO File record in database
        if frappe.db.exists("PO File", {"file_path": file_path}):
            file_name = frappe.db.get_value("PO File", {"file_path": file_path}, "name")
            if not file_name:
                frappe.throw(_("PO File not found for the given file path"))
            if isinstance(file_name, str):
                file_doc = frappe.get_doc("PO File", file_name)
            else:
                frappe.throw(_("Invalid file name: {0}").format(file_name))
            if hasattr(file_doc, "translated_entries"):
                if hasattr(file_doc, "translated_entries"):
                    if hasattr(file_doc, "translated_entries"):
                        file_doc.translated_entries = len([entry for entry in po if entry.msgstr])  # type: ignore
                    else:
                        logger.warning(
                            "The 'translated_entries' attribute does not exist in the 'PO File' doctype."
                        )
                else:
                    logger.warning(
                        "The 'translated_entries' attribute does not exist in the 'PO File' doctype."
                    )
            else:
                logger.warning(
                    "The 'translated_entries' attribute does not exist in the 'PO File' doctype."
                )
            if hasattr(file_doc, "translation_status"):
                file_doc.translation_status = (  # type: ignore
                    int(
                        (
                            getattr(file_doc, "translated_entries", 0)
                            / getattr(file_doc, "total_entries", 1)
                        )
                        * 100
                    )
                    if hasattr(file_doc, "total_entries")
                    and getattr(file_doc, "total_entries", 0) > 0
                    else 0
                )
            else:
                logger.warning(
                    "The 'translation_status' attribute does not exist in the 'PO File' doctype."
                )
            file_doc.modified = now()
            file_doc.save()

        logger.info(f"Translation completed. Translated {translated_count} entries.")

        return {
            "success": True,
            "translated_count": translated_count,
            "log_file": log_file,
        }
    except Exception as e:
        logger.error(f"Error during translation: {e}")
        return {"success": False, "error": str(e), "log_file": log_file}
    finally:
        # Remove file handler
        logger.removeHandler(file_handler)
        file_handler.close()


@frappe.whitelist()
def start_translation(
    po_file_path,
    batch_size=10,
    model_provider="openai",
    model="gpt-4.1-mini-2025-04-14",
):
    """Start the translation process for a PO file."""
    if not frappe.has_permission("Translation Tools", "write"):
        frappe.throw(_("You do not have permission to use the translation tools"))

    if not os.path.exists(po_file_path):
        frappe.throw(_("PO file not found: {0}").format(po_file_path))

    # Get the API key from configuration
    api_key, saved_provider, saved_model = _get_translation_config()

    if not api_key:
        frappe.throw(_("API key not found in configuration. Please set it up first."))

    # Create a background job for translation
    frappe.enqueue(
        translate_po_file_background,
        queue="long",
        timeout=3600,
        po_file_path=po_file_path,
        api_key=api_key,
        batch_size=int(batch_size),
        model_provider=model_provider,
        model=model,
    )

    return {"message": "Translation started in the background", "status": "success"}


def translate_po_file_background(
    po_file_path,
    api_key,
    batch_size=10,
    model_provider="openai",
    model="gpt-4.1-mini-2025-04-14",
):
    """Background job to translate a PO file."""
    try:
        output_path = translate_po_file(
            file_path=po_file_path, model_provider=model_provider, model=model
        )

        # Log the output
        logger.info(f"Translation completed: {output_path}")
        frappe.logger().info(f"Translation completed: {output_path}")
    except Exception as e:
        logger.error(f"Translation failed: {str(e)}")
        frappe.logger().error(f"Translation failed: {str(e)}")
        raise


@frappe.whitelist()
def translate_batch(file_path, indices):
    """Translate multiple entries in a batch"""
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    # Convert indices to integers
    indices = [int(i) for i in json.loads(indices)]

    # Get API key and model from config
    api_key, model_provider, model = _get_translation_config()

    if not api_key:
        return {"error": "API key not configured"}

    try:
        logger.info(
            f"Batch translating {len(indices)} entries with {model_provider} ({model})"
        )

        # Get the entries to translate
        po = polib.pofile(file_path)
        entries_to_translate = {}
        for idx in indices:
            if idx < len(po):
                entries_to_translate[idx] = po[idx].msgid

        # Use the appropriate translation service for batch
        if model_provider == "claude":
            translations = _batch_translate_with_claude(
                api_key, model, entries_to_translate
            )
        else:
            translations = _batch_translate_with_openai(
                api_key, model, entries_to_translate
            )

        # Update the PO file with translations
        for idx, translation in translations.items():
            po[idx].msgstr = translation

        po.save()

        logger.info(f"Batch translation successful for {len(translations)} entries")
        return {"success": True, "translations": translations}

    except Exception as e:
        logger.error(f"Error in batch translation: {str(e)}", exc_info=True)
        frappe.log_error(f"Error in batch translation: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def test_translation_api():
    """Test endpoint to check if translation API is working"""
    try:
        # Get API key and model from config
        api_key, model_provider, model = _get_translation_config()
        
        if not api_key:
            return {"error": "API key not configured"}
            
        # Test with a simple translation
        test_text = "Hello World"
        logger.info(f"Testing translation API with: {test_text}")
        
        if model_provider == "claude":
            translation = _translate_with_claude(api_key, model, test_text)
        else:
            translation = _translate_with_openai(api_key, model, test_text)
            
        if translation:
            return {"success": True, "test_text": test_text, "translation": translation, "provider": model_provider, "model": model}
        else:
            return {"error": "Translation failed"}
            
    except Exception as e:
        logger.error(f"Test translation error: {str(e)}", exc_info=True)
        return {"error": f"Test failed: {str(e)}"}


@frappe.whitelist()
def translate_entry(file_path, msgid, entry_id):
    """Translate a single entry using AI"""
    full_path = os.path.join(get_bench_path(), file_path)
    if not os.path.exists(full_path):
        return {"error": "File not found"}

    # Get API key and model from config
    api_key, model_provider, model = _get_translation_config()

    if not api_key:
        return {"error": "API key not configured"}

    try:
        logger.info(f"Translating single entry with {model_provider} ({model})")
        logger.info(f"Text to translate: {msgid}")

        # Use the appropriate translation service with timeout handling
        if model_provider == "claude":
            translation = _translate_with_claude(api_key, model, msgid)
        else:
            translation = _translate_with_openai(api_key, model, msgid)
            
        logger.info(f"Translation result: {translation}")
        logger.info(f"Translation result repr: {repr(translation)}")
        logger.info(f"Translation result type: {type(translation)}")

        if translation:
            # Update the PO file
            po = polib.pofile(full_path)
            entry_found = False
            for i, entry in enumerate(po):
                unique_string = f"{i}-{entry.msgid}"
                current_hash = hashlib.md5(unique_string.encode("utf-8")).hexdigest()
                if current_hash == entry_id:
                    entry.msgstr = translation
                    entry_found = True
                    break
            if entry_found:
                po.save(full_path)
            else:
                return {"error": "Entry not found"}

            logger.info("Single entry translation successful")
            # Log the final translation being returned
            logger.info(f"Final translation being returned: {translation}")
            logger.info(f"Final translation repr: {repr(translation)}")
            
            # Ensure proper UTF-8 encoding for Thai characters
            frappe.response.charset = 'utf-8'
            frappe.response.headers['Content-Type'] = 'application/json; charset=utf-8'
            
            response_data = {"success": True, "translation": translation}
            logger.info(f"Response data: {response_data}")
            logger.info(f"Response data repr: {repr(response_data)}")
            
            return response_data
        else:
            logger.error("Failed to get translation")
            return {"error": "Failed to get translation"}

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error translating entry: {error_msg}", exc_info=True)
        frappe.log_error(f"Error translating entry: {error_msg}")
        
        # Handle timeout errors specifically
        if "timeout" in error_msg.lower() or "timed out" in error_msg.lower():
            return {"error": "Translation request timed out. Please try again."}
        elif "api" in error_msg.lower() and ("key" in error_msg.lower() or "auth" in error_msg.lower()):
            return {"error": "API authentication failed. Please check your API key configuration."}
        else:
            return {"error": f"Translation failed: {error_msg}"}


@frappe.whitelist()
def translate_entries(
    file_path, entries, model="gpt-4", model_provider="openai", temperature=0.3
):
    """
    Translate a batch of entries using AI
    entries: list of dictionaries with msgid and other details
    """
    try:
        logger.info(
            f"Translating {len(entries)} entries with {model_provider} ({model})"
        )

        # Get API key from config
        api_key, saved_model_provider, saved_model = _get_translation_config()

        # Use provided parameters or fall back to saved config
        model_provider = model_provider or saved_model_provider
        model = model or saved_model

        if not api_key:
            logger.error("API key not found in config file")
            return {"error": "API key not found in .erpnext_translate_config file"}

        # Prepare command
        translate_script = os.path.join(
            frappe.get_app_path("translation_tools"), "utils", "translate_po_files.py"
        )

        # Create a temporary file with the entries to translate
        temp_po = polib.POFile()
        temp_po.metadata = {
            "Project-Id-Version": "Translation Dashboard",
            "POT-Creation-Date": datetime.now().strftime("%Y-%m-%d %H:%M%z"),
            "PO-Revision-Date": datetime.now().strftime("%Y-%m-%d %H:%M%z"),
            "Language": "th",
            "MIME-Version": "1.0",
            "Content-Type": "text/plain; charset=utf-8",
            "Content-Transfer-Encoding": "8bit",
        }

        for entry_data in entries:
            entry = polib.POEntry(
                msgid=entry_data.get("msgid", ""),
                msgstr=entry_data.get("msgstr", ""),
                occurrences=entry_data.get("locations", []),
                msgctxt=entry_data.get("msgctxt"),
            )
            temp_po.append(entry)

        # Save temporary PO file
        temp_file = os.path.join(get_bench_path(), "translation_temp.po")
        temp_po.save(temp_file)

        # Start translation process with logging
        try:
            logger.info(f"Starting translation process for {len(temp_po)} entries")

            # Run translation script
            cmd = [
                "python",
                translate_script,
                f"--api-key={api_key}",
                f"--model-provider={model_provider}",
                f"--model={model}",
                f"--temperature={temperature}",
                "--batch-size=5",  # Small batch for testing
                temp_file,
            ]

            logger.debug(f"Running command: {' '.join(cmd)}")

            # Create log file for detailed output
            log_file = os.path.join(get_bench_path(), "translation_log.txt")
            with open(log_file, "w") as log_f:
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )

                # Log in real time
                for line in process.stdout:  # type: ignore
                    log_f.write(line)
                    log_f.flush()
                    logger.debug(line.strip())

                process.wait()

            # Read results from the modified original file
            translated_po = polib.pofile(temp_file)

            # Parse results
            results = []
            for i, entry in enumerate(translated_po):
                results.append(
                    {
                        "msgid": entry.msgid,
                        "msgstr": entry.msgstr,
                        "is_translated": bool(entry.msgstr),
                    }
                )

            # Clean up
            if os.path.exists(temp_file):
                os.remove(temp_file)

            logger.info(
                f"Translation completed successfully for {len(results)} entries"
            )

            # Return the results and log file path
            return {
                "success": True,
                "message": f"Translated {len(results)} entries",
                "results": results,
                "log_file": log_file,
            }

        except Exception as e:
            logger.error(f"Error during translation process: {str(e)}", exc_info=True)
            frappe.log_error(f"Error during translation process: {str(e)}")

            # Try to extract additional information from logs
            log_content = ""
            if os.path.exists(log_file):
                with open(log_file, "r") as log_f:
                    log_content = log_f.read()

            return {
                "error": str(e),
                "logs": log_content,
                "log_file": log_file if os.path.exists(log_file) else None,
            }

    except Exception as e:
        logger.error(f"Error in translate_entries: {str(e)}", exc_info=True)
        frappe.log_error(f"Error in translate_entries: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def get_translation_logs(log_file=None):
    """Get the translation logs"""
    try:
        if not log_file:
            log_file = os.path.join(get_bench_path(), "translation_log.txt")

        if os.path.exists(log_file):
            with open(log_file, "r") as f:
                logs = f.read()

            # Parse logs to understand translation issues
            api_calls = re.findall(r"API call .*", logs)
            api_responses = re.findall(r"Raw response: .*", logs)
            errors = re.findall(r"Error .*: .*", logs)

            return {
                "success": True,
                "logs": logs,
                "analysis": {
                    "api_calls": len(api_calls),
                    "api_responses": len(api_responses),
                    "errors": errors,
                },
            }
        else:
            return {"error": "Log file not found"}
    except Exception as e:
        logger.error(f"Error getting translation logs: {str(e)}", exc_info=True)
        frappe.log_error(f"Error getting translation logs: {str(e)}")
        return {"error": str(e)}


def analyze_logs(logs):
    """Analyze translation logs for common patterns and issues"""
    analysis = {"api_calls": 0, "api_responses": 0, "errors": []}

    # Count API calls
    api_calls = re.findall(r"API call", logs)
    analysis["api_calls"] = len(api_calls)

    # Count responses
    responses = re.findall(r"Raw response:", logs)
    analysis["api_responses"] = len(responses)

    # Detect errors
    error_patterns = [
        r"Error during translation: (.*?)(?=\n|$)",
        r"OpenAI API error: (.*?)(?=\n|$)",
        r"JSON parsing error: (.*?)(?=\n|$)",
        r"Unexpected error: (.*?)(?=\n|$)",
    ]

    for pattern in error_patterns:
        errors = re.findall(pattern, logs)
        analysis["errors"].extend(errors)

    return analysis


def call_ai_translation_api(source_text, provider, model, api_key, temperature=0.3):
    """Call the AI translation API"""
    if provider == "openai":
        import openai

        client = openai.OpenAI(api_key=api_key)

        # Prepare glossary context with timeout protection
        try:
            glossary_terms = get_glossary_terms_dict()
            glossary_context = ""
            if glossary_terms:
                glossary_context = "Use these specific term translations:\n" + json.dumps(
                    glossary_terms, indent=2
                )
        except Exception as glossary_error:
            logger.warning(f"Failed to load glossary for call_ai_translation_api: {glossary_error}")
            glossary_context = ""

        # Create the prompt
        system_message = f"""
        You are an expert translator specializing in technical and software localization.
        Translate the following text from English to Thai.
        {glossary_context}
        
        Ensure proper tone and formality appropriate for business software.
        Preserve any formatting placeholders like {{% s }}, {{ }}, or {{0}}.
        For technical terms not in the glossary, you may keep them in English if that's conventional.
        Return only the translation, without any explanations or notes.
        """

        # Make the API call
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": source_text},
            ],
            temperature=temperature,
            timeout=60,
        )

        raw_translation = response.choices[0].message.content.strip()  # type: ignore
        
        # Fix OpenAI's inconsistent Unicode escape sequence output
        # First check if response already contains Thai characters (Unicode range: \u0E00-\u0E7F)
        import re
        thai_pattern = re.compile(r'[\u0E00-\u0E7F]')
        
        # If already contains Thai characters, return as-is
        if thai_pattern.search(raw_translation):
            logger.info(f"call_ai_translation_api response already contains Thai: {raw_translation[:100]}...")
            return raw_translation
        
        # If contains Unicode escape sequences, decode them
        try:
            if raw_translation and '\\u' in raw_translation:
                import codecs
                decoded_translation = codecs.decode(raw_translation, 'unicode_escape')
                logger.info(f"Decoded call_ai_translation_api Unicode escapes: {decoded_translation[:100]}...")
                return decoded_translation
            else:
                return raw_translation
        except Exception as decode_error:
            logger.warning(f"Failed to decode call_ai_translation_api Unicode escapes: {decode_error}")
            return raw_translation

    elif provider == "claude":
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        # Prepare glossary context with timeout protection
        try:
            glossary_terms = get_glossary_terms_dict()
            glossary_context = ""
            if glossary_terms:
                glossary_context = "Use these specific term translations:\n" + json.dumps(
                    glossary_terms, indent=2
                )
        except Exception as glossary_error:
            logger.warning(f"Failed to load glossary for call_ai_translation_api: {glossary_error}")
            glossary_context = ""

        # Create the prompt
        prompt = f"""
        You are an expert translator specializing in technical and software localization.
        Translate the following text from English to Thai.
        {glossary_context}
        
        Ensure proper tone and formality appropriate for business software.
        Preserve any formatting placeholders like {{% s }}, {{ }}, or {{0}}.
        For technical terms not in the glossary, you may keep them in English if that's conventional.
        Return only the translation, without any explanations or notes.
        
        Text to translate:
        {source_text}
        """

        # Make the API call
        response = client.messages.create(
            model=model,
            max_tokens=2000,  # Increased to match OpenAI calls for consistency
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}],
            timeout=60,
        )

        raw_translation = response.content[0].text.strip()  # type: ignore
        
        # Fix Claude's inconsistent Unicode escape sequence output
        # First check if response already contains Thai characters (Unicode range: \u0E00-\u0E7F)
        import re
        thai_pattern = re.compile(r'[\u0E00-\u0E7F]')
        
        # If already contains Thai characters, return as-is
        if thai_pattern.search(raw_translation):
            logger.info(f"call_ai_translation_api Claude response already contains Thai: {raw_translation[:100]}...")
            return raw_translation
        
        # If contains Unicode escape sequences, decode them
        try:
            if raw_translation and '\\u' in raw_translation:
                import codecs
                decoded_translation = codecs.decode(raw_translation, 'unicode_escape')
                logger.info(f"Decoded call_ai_translation_api Claude Unicode escapes: {decoded_translation[:100]}...")
                return decoded_translation
            else:
                return raw_translation
        except Exception as decode_error:
            logger.warning(f"Failed to decode call_ai_translation_api Claude Unicode escapes: {decode_error}")
            return raw_translation

    else:
        frappe.throw(_("Unsupported model provider: {0}").format(provider))


def _translate_with_openai(api_key, model, text):
    """Translate text using OpenAI API"""
    try:
        client = openai.OpenAI(api_key=api_key)

        # Format the glossary with timeout protection
        try:
            glossary_terms = get_glossary_terms_dict()
            glossary_text = json.dumps(glossary_terms, indent=2)
        except Exception as glossary_error:
            logger.warning(f"Failed to load glossary: {glossary_error}")
            glossary_terms = {}
            glossary_text = "{}"

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {{0}}.
Only respond with the translated text, nothing else.""",
                },
                {"role": "user", "content": text},
            ],
            temperature=0.3,
            max_tokens=2000,  # CRITICAL FIX: Allow enough tokens for long translations
            timeout=60,
        )

        raw_translation = response.choices[0].message.content.strip()  # type: ignore
        
        # Log the raw response from OpenAI
        logger.info(f"Raw OpenAI response: {raw_translation}")
        logger.info(f"Raw OpenAI response repr: {repr(raw_translation)}")
        
        # Fix OpenAI's inconsistent Unicode escape sequence output
        # First check if response already contains Thai characters (Unicode range: \u0E00-\u0E7F)
        import re
        thai_pattern = re.compile(r'[\u0E00-\u0E7F]')
        
        # If already contains Thai characters, return as-is
        if thai_pattern.search(raw_translation):
            logger.info(f"OpenAI response already contains Thai characters: {raw_translation[:100]}...")
            return raw_translation
        
        # If contains Unicode escape sequences, decode them
        try:
            if raw_translation and '\\u' in raw_translation:
                import codecs
                decoded_translation = codecs.decode(raw_translation, 'unicode_escape')
                logger.info(f"Decoded OpenAI Unicode escapes: {decoded_translation[:100]}...")
                return decoded_translation
            else:
                return raw_translation
        except Exception as decode_error:
            logger.warning(f"Failed to decode OpenAI Unicode escapes: {decode_error}")
            return raw_translation
    except Exception as e:
        logger.error(f"OpenAI translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"OpenAI translation error: {str(e)}")
        return None


def _translate_with_claude(api_key, model, text):
    """Translate text using Anthropic Claude API"""
    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Format the glossary with timeout protection
        try:
            glossary_terms = get_glossary_terms_dict()
            glossary_text = json.dumps(glossary_terms, indent=2)
        except Exception as glossary_error:
            logger.warning(f"Failed to load glossary: {glossary_error}")
            glossary_terms = {}
            glossary_text = "{}"

        response = client.messages.create(
            model=model or "claude-3-haiku-20240307",
            max_tokens=2000,  # Increased to match OpenAI fix
            temperature=0.3,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate the following from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {{0}}.
Only respond with the translated text, nothing else.

Text to translate: {text}""",
                }
            ],
        )

        raw_translation = response.content[0].text.strip()  # type: ignore
        
        # Fix Claude's inconsistent Unicode escape sequence output
        # First check if response already contains Thai characters (Unicode range: \u0E00-\u0E7F)
        import re
        thai_pattern = re.compile(r'[\u0E00-\u0E7F]')
        
        # If already contains Thai characters, return as-is
        if thai_pattern.search(raw_translation):
            logger.info(f"Claude response already contains Thai characters: {raw_translation[:100]}...")
            return raw_translation
        
        # If contains Unicode escape sequences, decode them
        try:
            if raw_translation and '\\u' in raw_translation:
                import codecs
                decoded_translation = codecs.decode(raw_translation, 'unicode_escape')
                logger.info(f"Decoded Claude Unicode escapes: {decoded_translation[:100]}...")
                return decoded_translation
            else:
                return raw_translation
        except Exception as decode_error:
            logger.warning(f"Failed to decode Claude Unicode escapes, using raw: {decode_error}")
            return raw_translation
    except Exception as e:
        logger.error(f"Claude translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"Claude translation error: {str(e)}")
        return None


def _batch_translate_with_openai(api_key, model, entries, temperature=0.3):
    """Translate multiple entries using OpenAI API"""
    try:
        client = openai.OpenAI(api_key=api_key)

        # Format the glossary with timeout protection
        try:
            glossary_terms = get_glossary_terms_dict()
            glossary_text = json.dumps(glossary_terms, indent=2)
        except Exception as glossary_error:
            logger.warning(f"Failed to load glossary: {glossary_error}")
            glossary_terms = {}
            glossary_text = "{}"

        # Build a message with all entries
        entries_list = [f"Entry {idx}: {text}" for idx, text in entries.items()]
        entries_text = "\n\n".join(entries_list)
        
        # Log entry details for debugging
        logger.info(f"Translating {len(entries)} entries via OpenAI")
        logger.debug(f"Entries to translate: {entries_list}")

        # Get the temperature from settings if available
        settings = get_translation_settings()
        temp = settings.get("temperature", temperature)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate the following entries from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {{0}}.
For each entry, respond with 'Entry X: [Thai translation]' where X is the entry number.
IMPORTANT: Translate the ENTIRE text for each entry, not just the first line or title.""",
                },
                {"role": "user", "content": entries_text},
            ],
            temperature=temp,
            max_tokens=4000,  # Increase token limit for longer translations
            timeout=120,  # Add 2-minute timeout to prevent hanging
        )

        # Parse the response to extract translations
        response_text = response.choices[0].message.content
        translations = {}
        
        # Log the full response for debugging
        logger.info(f"Full OpenAI response: {response_text}")

        # Improved parsing: handle multi-line translations
        if response_text:
            # Split by "Entry " to get each entry's response
            entry_blocks = response_text.split("Entry ")[1:]  # Skip the first empty part
            
            for block in entry_blocks:
                try:
                    # Find the first colon to separate entry number from translation
                    colon_index = block.find(":")
                    if colon_index == -1:
                        continue
                        
                    entry_part = block[:colon_index].strip()
                    translation = block[colon_index + 1:].strip()
                    
                    # Extract entry index
                    try:
                        idx = int(entry_part)
                        if idx in entries and translation:
                            translations[idx] = translation
                            logger.info(f"Parsed entry {idx}: {translation[:100]}...")
                    except ValueError:
                        continue
                        
                except Exception as e:
                    logger.error(f"Error parsing OpenAI response block: {e}")
                    continue

        return translations
    except Exception as e:
        logger.error(f"OpenAI batch translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"OpenAI batch translation error: {str(e)}")
        return {}


def _batch_translate_with_claude(api_key, model, entries, temperature=0.3):
    """Translate multiple entries using Anthropic Claude API"""
    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Format the glossary with timeout protection
        try:
            glossary_terms = get_glossary_terms_dict()
            glossary_text = json.dumps(glossary_terms, indent=2)
        except Exception as glossary_error:
            logger.warning(f"Failed to load glossary: {glossary_error}")
            glossary_terms = {}
            glossary_text = "{}"

        # Build a message with all entries
        entries_list = [f"Entry {idx}: {text}" for idx, text in entries.items()]
        entries_text = "\n\n".join(entries_list)

        # Get the temperature from settings if available
        settings = get_translation_settings()
        temp = settings.get("temperature", temperature)

        response = client.messages.create(
            model=model or "claude-3-haiku-20240307",
            max_tokens=4000,  # Increase token limit for longer translations
            temperature=temp,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate the following entries from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {{0}}.
For each entry, respond with 'Entry X: [Thai translation]' where X is the entry number.
IMPORTANT: Translate the ENTIRE text for each entry, not just the first line or title.

{entries_text}""",
                }
            ],
        )

        # Parse the response to extract translations
        response_text = response.content[0].text  # type: ignore
        translations = {}
        
        # Log the full response for debugging
        logger.info(f"Full Claude response: {response_text}")

        # Improved parsing: handle multi-line translations
        if response_text:
            # Split by "Entry " to get each entry's response
            entry_blocks = response_text.split("Entry ")[1:]  # Skip the first empty part
            
            for block in entry_blocks:
                try:
                    # Find the first colon to separate entry number from translation
                    colon_index = block.find(":")
                    if colon_index == -1:
                        continue
                        
                    entry_part = block[:colon_index].strip()
                    translation = block[colon_index + 1:].strip()
                    
                    # Extract entry index
                    try:
                        idx = int(entry_part)
                        if idx in entries and translation:
                            translations[idx] = translation
                            logger.info(f"Parsed Claude entry {idx}: {translation[:100]}...")
                    except ValueError:
                        continue
                        
                except Exception as e:
                    logger.error(f"Error parsing Claude response block: {e}")
                    continue

        logger.info(
            f"Claude translated {len(translations)} entries out of {len(entries)}"
        )

        # If we didn't get all translations, log the issue
        if len(translations) < len(entries):
            logger.warning(
                f"Claude only translated {len(translations)} out of {len(entries)} entries"
            )
            logger.debug(f"Claude response: {response_text[:500]}...")

        return translations
    except Exception as e:
        logger.error(f"Claude batch translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"Claude batch translation error: {str(e)}")
        return {}
        logger.error(f"Claude batch translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"Claude batch translation error: {str(e)}")
        return {}
