import frappe
import os
import json
import polib
from glob import glob
from frappe import _
from frappe.utils import cstr, get_site_path, get_bench_path
import subprocess
import time
import re
from datetime import datetime
from pathlib import Path
import openai
import anthropic
from typing import Dict, List, Any, Optional
from frappe.utils.safe_exec import safe_eval
from translation_tools.utils.translate_po_files import translate_po_file
from translation_tools.utils.thai_glossary import GLOSSARY

# Configure logging
import logging

logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)

# Configuration path
CONFIG_FILE = os.path.join(get_bench_path(), ".erpnext_translate_config")

print("CONFIG_FILE", CONFIG_FILE)
logger.info(f"CONFIG_FILE: {CONFIG_FILE}")


@frappe.whitelist()
def get_po_files():
    """Get a list of all PO files in the Frappe/ERPNext ecosystem"""
    logger.info("Fetching PO files")

    # Get the root apps directory instead of just frappe's parent
    bench_path = get_bench_path()
    apps_path = os.path.join(bench_path, "apps")
    logger.info(f"Apps path: {apps_path}")
    # apps_path = frappe.get_app_path("frappe", "..")
    po_files = []

    # Scan for all .po files in apps
    pattern = os.path.join(apps_path, "*", "**", "*.po")
    for file_path in glob(pattern, recursive=True):
        # Skip translation_tools/translations (to avoid self-translations)
        if "translation_tools/translations" in file_path:
            continue

        rel_path = os.path.relpath(file_path, apps_path)
        app_name = rel_path.split(os.path.sep)[0]
        filename = os.path.basename(file_path)

        po_files.append({"path": file_path, "app": app_name, "filename": filename})

    logger.info(f"Found {len(po_files)} PO files")
    return po_files


@frappe.whitelist()
def get_po_file_contents(file_path):
    """Get the contents of a PO file with translation status"""
    logger.info(f"Getting PO file contents for {file_path}")

    try:
        po = polib.pofile(file_path)

        # Get file stats
        total_entries = len(po)
        translated = len(po.translated_entries())
        untranslated = len(po.untranslated_entries())
        fuzzy = len(po.fuzzy_entries())

        # Get metadata
        metadata = {
            "Project": po.metadata.get("Project-Id-Version", ""),
            "Language": po.metadata.get("Language", ""),
            "Last-Translator": po.metadata.get("Last-Translator", ""),
            "POT-Creation-Date": po.metadata.get("POT-Creation-Date", ""),
            "PO-Revision-Date": po.metadata.get("PO-Revision-Date", ""),
        }

        # Get a limited number of entries for preview
        entries = []
        max_entries = 100  # Limit the number of entries to prevent large responses
        count = 0

        for entry in po:
            if count >= max_entries:
                break

            entries.append(
                {
                    "msgid": entry.msgid,
                    "msgstr": entry.msgstr,
                    "msgctxt": entry.msgctxt,
                    "is_translated": bool(entry.msgstr),
                    "is_fuzzy": "fuzzy" in entry.flags,
                    "locations": entry.occurrences,
                    "entry_type": (
                        "fuzzy"
                        if "fuzzy" in entry.flags
                        else ("translated" if entry.msgstr else "untranslated")
                    ),
                    "index": count,
                }
            )
            count += 1

        result = {
            "metadata": metadata,
            "statistics": {
                "total": total_entries,
                "translated": translated,
                "untranslated": untranslated,
                "fuzzy": fuzzy,
                "percent_translated": round(
                    (translated / total_entries) * 100 if total_entries > 0 else 0, 2
                ),
            },
            "entries": entries,
            "has_more": count < total_entries,
        }

        logger.info(
            f"Successfully retrieved PO file contents with {len(entries)} entries"
        )
        return result

    except Exception as e:
        logger.error(f"Error getting PO file contents: {str(e)}", exc_info=True)
        frappe.log_error(f"Error getting PO file contents: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def get_glossary_terms():
    """Get all terms from the Translation Glossary"""
    try:
        terms = frappe.get_all(
            "Translation Glossary Term",
            fields=[
                "source_term",
                "thai_translation",
                "context",
                "category",
                "is_approved",
                "module",
            ],
            order_by="source_term",
        )

        # Also get the modules for proper display
        modules = {}
        for module in frappe.get_all("ERPNext Module", fields=["name", "module_name"]):
            modules[module.name] = module.module_name

        return {"terms": terms, "modules": modules}
    except Exception as e:
        logger.error(f"Error getting glossary terms: {str(e)}", exc_info=True)
        frappe.log_error(f"Error getting glossary terms: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def add_glossary_term(
    source_term, thai_translation, context=None, category=None, module=None
):
    """Add a new term to the glossary"""
    try:
        term = frappe.new_doc("Translation Glossary Term")
        term.source_term = source_term
        term.thai_translation = thai_translation

        if context:
            term.context = context
        if category:
            term.category = category
        if module:
            term.module = module

        term.save()
        frappe.db.commit()

        return {"success": True, "message": _("Term added successfully")}
    except Exception as e:
        logger.error(f"Error adding glossary term: {str(e)}", exc_info=True)
        frappe.log_error(f"Error adding glossary term: {str(e)}")
        return {"error": str(e)}


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
                for line in process.stdout:
                    log_f.write(line)
                    log_f.flush()
                    logger.debug(line.strip())

                process.wait()

            # Read results
            translated_po = polib.pofile(temp_file.replace(".po", ".translated.po"))

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
            if os.path.exists(temp_file.replace(".po", ".translated.po")):
                os.remove(temp_file.replace(".po", ".translated.po"))

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


@frappe.whitelist()
def save_translations(file_path, translations):
    """Save translations back to the PO file"""
    try:
        logger.info(f"Saving translations to {file_path}")

        # Check if file exists and is a PO file
        if not os.path.exists(file_path) or not file_path.endswith(".po"):
            return {"error": "Invalid PO file path"}

        # Load the PO file
        po = polib.pofile(file_path)

        # Update entries
        updated_count = 0
        for translation in translations:
            msgid = translation.get("msgid")
            msgstr = translation.get("msgstr")

            if not msgid or not msgstr:
                continue

            # Find corresponding entry
            for entry in po:
                if entry.msgid == msgid:
                    entry.msgstr = msgstr
                    updated_count += 1
                    break

        # Update metadata
        po.metadata["PO-Revision-Date"] = datetime.now().strftime("%Y-%m-%d %H:%M%z")

        # Save the file
        po.save(file_path)

        logger.info(f"Successfully saved {updated_count} translations")
        return {"success": True, "message": f"Updated {updated_count} translations"}

    except Exception as e:
        logger.error(f"Error saving translations: {str(e)}", exc_info=True)
        frappe.log_error(f"Error saving translations: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def save_translation(file_path, index, msgstr):
    """Save a single translation to the PO file"""
    try:
        if not os.path.exists(file_path):
            return {"error": "File not found"}

        po = polib.pofile(file_path)
        po[int(index)].msgstr = msgstr
        po.save()

        return {"success": True, "message": "Translation saved successfully"}
    except Exception as e:
        logger.error(f"Error saving translation: {str(e)}", exc_info=True)
        frappe.log_error(f"Error saving translation: {str(e)}")
        return {"error": str(e)}


@frappe.whitelist()
def start_translation(
    po_file_path, batch_size=10, model_provider="openai", model="gpt-4-1106-preview"
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
    model="gpt-4-1106-preview",
):
    """Background job to translate a PO file."""
    try:
        output_path = translate_po_file(
            po_file_path=po_file_path,
            target_lang="th",
            api_key=api_key,
            model_provider=model_provider,
            model=model,
            batch_size=batch_size,
            temperature=0.3,
            max_tokens=512,
        )

        # Log the output
        logger.info(f"Translation completed: {output_path}")
        frappe.logger().info(f"Translation completed: {output_path}")
    except Exception as e:
        logger.error(f"Translation failed: {str(e)}")
        frappe.logger().error(f"Translation failed: {str(e)}")
        raise


@frappe.whitelist()
def get_translation_settings():
    """Get translation settings"""
    settings = {
        "api_key": "",
        "model_provider": "openai",
        "model": "gpt-4-1106-preview",
        "batch_size": 10,
        "temperature": 0.3,
        "max_tokens": 512,
    }

    # Try to read from config file
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                config_content = f.read()
                # Extract api key - this is safer than directly evaluating the file
                api_key_match = config_content.strip().split("OPENAI_API_KEY=")
                if len(api_key_match) > 1:
                    # The key is present but we'll mask it
                    settings["api_key"] = "********"

                model_provider_match = config_content.strip().split("MODEL_PROVIDER=")
                if len(model_provider_match) > 1:
                    provider = model_provider_match[1].split('"')[1]
                    if provider in ["openai", "claude"]:
                        settings["model_provider"] = provider

                model_match = config_content.strip().split("MODEL=")
                if len(model_match) > 1:
                    model = model_match[1].split('"')[1]
                    settings["model"] = model

                batch_size_match = config_content.strip().split("BATCH_SIZE=")
                if len(batch_size_match) > 1:
                    batch_size = batch_size_match[1].split("\n")[0]
                    settings["batch_size"] = int(batch_size)

                temperature_match = config_content.strip().split("TEMPERATURE=")
                if len(temperature_match) > 1:
                    temperature = temperature_match[1].split("\n")[0]
                    settings["temperature"] = float(temperature)

                max_tokens_match = config_content.strip().split("MAX_TOKENS=")
                if len(max_tokens_match) > 1:
                    max_tokens = max_tokens_match[1].split("\n")[0]
                    settings["max_tokens"] = int(max_tokens)

        except Exception as e:
            frappe.log_error(f"Error reading translation config: {str(e)}")

    return settings


@frappe.whitelist()
def save_translation_settings(
    api_key=None,
    model_provider=None,
    model=None,
    batch_size=None,
    temperature=None,
    max_tokens=None,
):
    """Save translation settings"""
    # Only system manager can change settings
    if not frappe.has_permission("System Manager", "write"):
        frappe.throw("You don't have permission to change settings")

    # Read existing config if it exists
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                for line in f:
                    if "=" in line:
                        key, value = line.strip().split("=", 1)
                        config[key] = value
        except Exception:
            pass

    # Update config with new values
    if api_key and api_key != "********":
        config["OPENAI_API_KEY"] = f'"{api_key}"'

    if model_provider:
        config["MODEL_PROVIDER"] = f'"{model_provider}"'

    if model:
        config["MODEL"] = f'"{model}"'

    if batch_size:
        config["BATCH_SIZE"] = str(int(batch_size))

    if temperature is not None:
        config["TEMPERATURE"] = str(float(temperature))

    if max_tokens:
        config["MAX_TOKENS"] = str(int(max_tokens))

    # Write config back to file
    try:
        with open(CONFIG_FILE, "w") as f:
            for key, value in config.items():
                f.write(f"{key}={value}\n")

        # Make file readable only by the owner
        os.chmod(CONFIG_FILE, 0o600)
        return {"success": True, "message": "Settings saved successfully"}
    except Exception as e:
        frappe.log_error(f"Error saving translation config: {str(e)}")
        return {"error": f"Failed to save settings: {str(e)}"}


@frappe.whitelist()
def save_api_key(api_key, model_provider="openai"):
    """Save the API key in the configuration file."""
    if not frappe.has_permission("Translation Tools", "write"):
        frappe.throw(_("You do not have permission to save API keys"))

    bench_path = get_bench_path()
    config_file = os.path.join(bench_path, ".erpnext_translate_config")

    with open(config_file, "w") as f:
        f.write(f'OPENAI_API_KEY="{api_key}"\n')
        f.write(f'MODEL_PROVIDER="{model_provider}"\n')

    # Set proper permissions
    os.chmod(config_file, 0o600)

    return {"message": "API key saved successfully", "status": "success"}


@frappe.whitelist()
def translate_entry(file_path, msgid, index):
    """Translate a single entry using AI"""
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    # Get API key and model from config
    api_key, model_provider, model = _get_translation_config()

    if not api_key:
        return {"error": "API key not configured"}

    try:
        logger.info(f"Translating single entry with {model_provider} ({model})")

        # Use the appropriate translation service
        if model_provider == "claude":
            translation = _translate_with_claude(api_key, model, msgid)
        else:
            translation = _translate_with_openai(api_key, model, msgid)

        if translation:
            # Update the PO file
            po = polib.pofile(file_path)
            po[int(index)].msgstr = translation
            po.save()

            logger.info("Single entry translation successful")
            return {"success": True, "translation": translation}
        else:
            logger.error("Failed to get translation")
            return {"error": "Failed to get translation"}

    except Exception as e:
        logger.error(f"Error translating entry: {str(e)}", exc_info=True)
        frappe.log_error(f"Error translating entry: {str(e)}")
        return {"error": str(e)}


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


def _get_translation_config():
    """Get translation configuration from file"""
    api_key = None
    model_provider = "openai"
    model = "gpt-4-1106-preview"

    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                for line in f:
                    if "=" in line:
                        key, value = line.strip().split("=", 1)
                        if key == "OPENAI_API_KEY":
                            api_key = value.strip("\"'")
                        elif key == "MODEL_PROVIDER":
                            model_provider = value.strip("\"'")
                        elif key == "MODEL":
                            model = value.strip("\"'")
        except Exception as e:
            logger.error(f"Error reading translation config: {str(e)}", exc_info=True)
            frappe.log_error(f"Error reading translation config: {str(e)}")

    return api_key, model_provider, model


def _translate_with_openai(api_key, model, text):
    """Translate text using OpenAI API"""
    try:
        client = openai.OpenAI(api_key=api_key)

        # Format the glossary
        glossary_text = json.dumps(GLOSSARY, indent=2)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
Only respond with the translated text, nothing else.""",
                },
                {"role": "user", "content": text},
            ],
            temperature=0.3,
        )

        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"OpenAI translation error: {str(e)}")
        return None


def _translate_with_claude(api_key, model, text):
    """Translate text using Anthropic Claude API"""
    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Format the glossary
        glossary_text = json.dumps(GLOSSARY, indent=2)

        response = client.messages.create(
            model=model or "claude-3-haiku-20240307",
            max_tokens=1000,
            temperature=0.3,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate the following from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
Only respond with the translated text, nothing else.

Text to translate: {text}""",
                }
            ],
        )

        return response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Claude translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"Claude translation error: {str(e)}")
        return None


def _batch_translate_with_openai(api_key, model, entries):
    """Translate multiple entries using OpenAI API"""
    try:
        client = openai.OpenAI(api_key=api_key)

        # Format the glossary
        glossary_text = json.dumps(GLOSSARY, indent=2)

        # Build a message with all entries
        entries_list = [f"Entry {idx}: {text}" for idx, text in entries.items()]
        entries_text = "\n\n".join(entries_list)

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate the following entries from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
For each entry, respond with 'Entry X: [Thai translation]' where X is the entry number.""",
                },
                {"role": "user", "content": entries_text},
            ],
            temperature=0.3,
        )

        # Parse the response to extract translations
        response_text = response.choices[0].message.content
        translations = {}

        for line in response_text.split("\n"):
            if line.startswith("Entry "):
                try:
                    parts = line.split(":", 1)
                    entry_part = parts[0].strip()
                    translation = parts[1].strip() if len(parts) > 1 else ""

                    idx = int(entry_part.replace("Entry ", ""))
                    if idx in entries:
                        translations[idx] = translation
                except Exception:
                    continue

        return translations
    except Exception as e:
        logger.error(f"OpenAI batch translation error: {str(e)}", exc_info=True)
        frappe.log_error(f"OpenAI batch translation error: {str(e)}")
        return {}


def _batch_translate_with_claude(api_key, model, entries):
    """Translate multiple entries using Anthropic Claude API"""
    try:
        client = anthropic.Anthropic(api_key=api_key)

        # Format the glossary
        glossary_text = json.dumps(GLOSSARY, indent=2)

        # Build a message with all entries
        entries_list = [f"Entry {idx}: {text}" for idx, text in entries.items()]
        entries_text = "\n\n".join(entries_list)

        response = client.messages.create(
            model=model or "claude-3-haiku-20240307",
            max_tokens=2000,
            temperature=0.3,
            messages=[
                {
                    "role": "user",
                    "content": f"""You are an expert translator specializing in technical and software localization.
Translate the following entries from English to Thai.
For Thai language translations, use these specific term translations:
{glossary_text}

Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
For each entry, respond with 'Entry X: [Thai translation]' where X is the entry number.

{entries_text}""",
                }
            ],
        )

        # Parse the response to extract translations
        response_text = response.content[0].text
        translations = {}

        for line in response_text.split("\n"):
            if line.startswith("Entry "):
                try:
                    parts = line.split(":", 1)
                    entry_part = parts[0].strip()
                    translation = parts[1].strip() if len(parts) > 1 else ""

                    idx = int(entry_part.replace("Entry ", ""))
                    if idx in entries:
                        translations[idx] = translation
                except Exception as e:
                    logger.error(
                        f"Error parsing Claude response line: {line}, error: {str(e)}"
                    )
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
