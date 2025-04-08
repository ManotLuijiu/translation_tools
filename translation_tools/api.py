import frappe
import os
import json
import polib
from glob import glob
import threading
from frappe import _
from frappe.utils import cstr, get_site_path, get_bench_path, cint
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
from frappe.utils.background_jobs import enqueue

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

# Cache for PO files list to avoid repetitive expensive file system operations
PO_FILES_CACHE = None
PO_FILES_CACHE_TIMESTAMP = 0
CACHE_EXPIRY = 300  # 5 minutes

@frappe.whitelist()
def get_cached_po_files():
    """Get a list of all PO files from the database"""
    po_files = frappe.get_all(
        "PO File",
        fields=[
            "file_path", 
            "app_name as app", 
            "filename", 
            "language",
            "total_entries", 
            "translated_entries", 
            "translation_status as translated_percentage",
            "last_modified", 
            "last_scanned"
        ],
        order_by="app_name, filename"
    )
    
    return po_files

@frappe.whitelist()
def scan_po_files():
    """Scan the filesystem for PO files and update the database"""
    try:
        # Get the bench path
        bench_path = get_bench_path()
        apps_path = os.path.join(bench_path, "apps")
        
        # Count for statistics
        total_files = 0
        new_files = 0
        updated_files = 0
        
        # Scan for all Thai PO files in apps
        pattern = os.path.join(apps_path, "*", "**", "th.po")
        for file_path in glob(pattern, recursive=True):
            # Skip translation_tools/translations (to avoid self-translations)
            if "translation_tools/translations" in file_path:
                continue
            
            total_files += 1
            
            rel_path = os.path.relpath(file_path, apps_path)
            app_name = rel_path.split(os.path.sep)[0]
            filename = os.path.basename(file_path)
            
            # Get file stats
            last_modified = os.path.getmtime(file_path)
            last_modified_datetime = frappe.utils.convert_utc_to_user_timezone(
                datetime.datetime.fromtimestamp(last_modified)
            ).strftime("%Y-%m-%d %H:%M:%S")
            
            # Parse PO file to get translation statistics
            try:
                po = polib.pofile(file_path)
                total = len(po)
                translated = len(po.translated_entries())
                translation_status = int((translated / total) * 100) if total > 0 else 0
                language = po.metadata.get("Language", "")
            except Exception as e:
                logger.error(f"Error parsing PO file {file_path}: {e}")
                total = 0
                translated = 0
                translation_status = 0
                language = ""
            
            # Check if file already exists in database
            file_doc = None
            if frappe.db.exists("PO File", {"file_path": file_path}):
                file_doc = frappe.get_doc("PO File", {"file_path": file_path})
                updated_files += 1
            else:
                file_doc = frappe.new_doc("PO File")
                file_doc.file_path = file_path
                new_files += 1
            
            # Update file information
            file_doc.app_name = app_name
            file_doc.filename = filename
            file_doc.language = language
            file_doc.total_entries = total
            file_doc.translated_entries = translated
            file_doc.translation_status = translation_status
            file_doc.last_modified = last_modified_datetime
            file_doc.last_scanned = frappe.utils.now()
            
            file_doc.save()
        
        frappe.db.commit()
        
        return {
            "success": True,
            "total_files": total_files,
            "new_files": new_files,
            "updated_files": updated_files
        }
        
    except Exception as e:
        frappe.log_error(f"Error scanning PO files: {e}")
        return {"success": False, "error": str(e)}

def get_bench_path():
    """Get the bench directory path"""
    return os.path.abspath(os.path.join(frappe.utils.get_bench_path()))

# @frappe.whitelist()
# def get_po_files():
#     """Get a list of all PO files in the Frappe/ERPNext ecosystem"""
#     logger.info("Fetching PO files")

#     # Get the root apps directory instead of just frappe's parent
#     bench_path = get_bench_path()
#     apps_path = os.path.join(bench_path, "apps")
#     logger.info(f"Apps path: {apps_path}")
#     # apps_path = frappe.get_app_path("frappe", "..")
#     po_files = []

#     # Scan for all .po files in apps
#     pattern = os.path.join(apps_path, "*", "**", "*.po")
#     for file_path in glob(pattern, recursive=True):
#         # Skip translation_tools/translations (to avoid self-translations)
#         if "translation_tools/translations" in file_path:
#             continue

#         rel_path = os.path.relpath(file_path, apps_path)
#         app_name = rel_path.split(os.path.sep)[0]
#         filename = os.path.basename(file_path)

#         po_files.append({"path": file_path, "app": app_name, "filename": filename})

#     logger.info(f"Found {len(po_files)} PO files")
#     return po_files

@frappe.whitelist()
def translate_po_file(file_path, model_provider="openai", model=None):
    """Translate an entire PO file using AI"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))
    
    # Create a log file
    log_dir = os.path.join(frappe.utils.get_bench_path(), "logs", "translation_logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"translate_{os.path.basename(file_path)}_{frappe.utils.now().replace(':', '-')}.log")
    
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
                model = settings.get("default_model", "gpt-4-1106-preview")
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
            batch = entries_to_translate[i:i + batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}, entries {i+1}-{min(i+batch_size, total_entries)}")
            
            # Translate each entry in the batch
            for entry in batch:
                try:
                    translation = call_ai_translation_api(
                        source_text=entry.msgid,
                        provider=provider,
                        model=model,
                        api_key=api_key,
                        temperature=settings.get("temperature", 0.3)
                    )
                    
                    entry.msgstr = translation
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
            file_doc = frappe.get_doc("PO File", {"file_path": file_path})
            file_doc.translated_entries = len(po.translated_entries())
            file_doc.translation_status = int((file_doc.translated_entries / file_doc.total_entries) * 100) if file_doc.total_entries > 0 else 0
            file_doc.last_modified = frappe.utils.now()
            file_doc.save()
        
        logger.info(f"Translation completed. Translated {translated_count} entries.")
        
        return {
            "success": True,
            "translated_count": translated_count,
            "log_file": log_file
        }
    except Exception as e:
        logger.error(f"Error during translation: {e}")
        return {
            "success": False,
            "error": str(e),
            "log_file": log_file
        }
    finally:
        # Remove file handler
        logger.removeHandler(file_handler)
        file_handler.close()

@frappe.whitelist()
def get_po_file_entries(file_path):
    """Get entries from a PO file"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))
    
    try:
        po = polib.pofile(file_path)
        
        # Get file metadata
        metadata = {
            "language": po.metadata.get("Language", "Unknown"),
            "project": po.metadata.get("Project-Id-Version", "Unknown"),
            "last_updated": po.metadata.get("PO-Revision-Date", "Unknown")
        }
        
        # Process entries
        entries = []
        for i, entry in enumerate(po):
            entries.append({
                "id": str(i),  # Use index as ID
                "msgid": entry.msgid,
                "msgstr": entry.msgstr,
                "is_translated": bool(entry.msgstr),
                "comments": [c for c in entry.comment.split("\n") if c] if entry.comment else [],
                "context": entry.msgctxt
            })
        
        # Calculate statistics
        total = len(po)
        translated = len(po.translated_entries())
        
        return {
            "path": file_path,
            "metadata": metadata,
            "entries": entries,
            "stats": {
                "total": total,
                "translated": translated,
                "untranslated": total - translated,
                "percentage": int((translated / total) * 100) if total > 0 else 0
            }
        }
    except Exception as e:
        frappe.log_error(f"Error parsing PO file: {e}")
        frappe.throw(_("Error parsing PO file: {0}").format(str(e)))

@frappe.whitelist()
def get_po_file_contents(file_path, limit=100, offset=0):
    """Get contents of a PO file including metadata and statistics"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))
    
    try:
        # Load the PO file
        po = polib.pofile(file_path)
        
        # Extract metadata
        metadata = po.metadata
        
        # Calculate statistics
        total = len(po)
        translated = len(po.translated_entries())
        fuzzy = len(po.fuzzy_entries())
        untranslated = total - translated - fuzzy
        
        # Process entries with pagination
        entries = []
        start_idx = int(offset)
        end_idx = start_idx + int(limit)
        has_more = total > end_idx
        
        for i, entry in enumerate(po):
            if i < start_idx:
                continue
            if i >= end_idx:
                break
                
            entries.append({
                "msgid": entry.msgid,
                "msgstr": entry.msgstr,
                "is_translated": bool(entry.msgstr),
                "is_fuzzy": "fuzzy" in entry.flags,
                "entry_type": "fuzzy" if "fuzzy" in entry.flags else "translated" if entry.msgstr else "untranslated"
            })
        
        return {
            "metadata": metadata,
            "statistics": {
                "total": total,
                "translated": translated,
                "untranslated": untranslated,
                "fuzzy": fuzzy,
                "percent_translated": int((translated / total) * 100) if total > 0 else 0
            },
            "entries": entries,
            "has_more": has_more
        }
    except Exception as e:
        frappe.log_error(f"Error processing PO file: {e}")
        frappe.throw(_("Error processing PO file: {0}").format(str(e)))


@frappe.whitelist()
def get_glossary_terms():
    """Get all glossary terms"""
    return frappe.get_all(
        "Translation Glossary Term",
        fields=["name", "source_term", "thai_translation", "context", "category", "module", "is_approved"],
        order_by="source_term"
    )

def get_glossary_terms_dict():
    """Get glossary terms as a dictionary for AI context"""
    terms = get_glossary_terms()
    return {term.source_term: term.thai_translation for term in terms if term.is_approved}

@frappe.whitelist()
def add_glossary_term(term):
    """Add a new glossary term"""
    term_data = frappe._dict(term) if isinstance(term, dict) else frappe._dict(json.loads(term))
    
    doc = frappe.new_doc("Translation Glossary Term")
    doc.source_term = term_data.source_term
    doc.thai_translation = term_data.thai_translation
    
    if term_data.context:
        doc.context = term_data.context
    
    if term_data.category:
        doc.category = term_data.category
    
    if term_data.module:
        doc.module = term_data.module
    
    doc.is_approved = cint(term_data.is_approved)
    
    doc.insert()
    frappe.db.commit()
    
    return {"success": True, "name": doc.name}

@frappe.whitelist()
def update_glossary_term(term_name, updates):
    """Update a glossary term"""
    updates_data = frappe._dict(updates) if isinstance(updates, dict) else frappe._dict(json.loads(updates))
    
    doc = frappe.get_doc("Translation Glossary Term", term_name)
    
    # Update fields
    if "source_term" in updates_data:
        doc.source_term = updates_data.source_term
    
    if "thai_translation" in updates_data:
        doc.thai_translation = updates_data.thai_translation
    
    if "context" in updates_data:
        doc.context = updates_data.context
    
    if "category" in updates_data:
        doc.category = updates_data.category
    
    if "module" in updates_data:
        doc.module = updates_data.module
    
    if "is_approved" in updates_data:
        doc.is_approved = cint(updates_data.is_approved)
    
    doc.save()
    frappe.db.commit()
    
    return {"success": True}

@frappe.whitelist()
def delete_glossary_term(term_name):
    """Delete a glossary term"""
    frappe.delete_doc("Translation Glossary Term", term_name)
    frappe.db.commit()
    
    return {"success": True}

@frappe.whitelist()
def get_erpnext_modules():
    """Get all ERPNext modules"""
    return frappe.get_all(
        "ERPNext Module",
        fields=["name", "module_name", "description"],
        order_by="module_name"
    )

@frappe.whitelist()
def get_translation_settings():
    """Get translation settings"""
    settings = frappe._dict({
        "default_model_provider": "openai",
        "default_model": "gpt-4-1106-preview",
        "openai_api_key": frappe.db.get_single_value("Translation Settings", "openai_api_key") or "",
        "anthropic_api_key": frappe.db.get_single_value("Translation Settings", "anthropic_api_key") or "",
        "batch_size": cint(frappe.db.get_single_value("Translation Settings", "batch_size") or 10),
        "temperature": float(frappe.db.get_single_value("Translation Settings", "temperature") or 0.3),
        "auto_save": cint(frappe.db.get_single_value("Translation Settings", "auto_save") or 0),
        "preserve_formatting": cint(frappe.db.get_single_value("Translation Settings", "preserve_formatting") or 1)
    })
    
    return settings

@frappe.whitelist()
def save_translation_settings(settings):
    """Save translation settings"""
    settings_data = frappe._dict(settings) if isinstance(settings, dict) else frappe._dict(json.loads(settings))
    
    # Check if Translation Settings doctype exists, create if not
    if not frappe.db.exists("DocType", "Translation Settings"):
        create_translation_settings_doctype()
    
    # Get or create the settings doc
    if not frappe.db.exists("Translation Settings", "Translation Settings"):
        doc = frappe.new_doc("Translation Settings")
        doc.name = "Translation Settings"
    else:
        doc = frappe.get_doc("Translation Settings", "Translation Settings")
    
    # Update settings
    doc.default_model_provider = settings_data.get("default_model_provider", "openai")
    doc.default_model = settings_data.get("default_model", "gpt-4-1106-preview")
    
    if "openai_api_key" in settings_data:
        doc.openai_api_key = settings_data.openai_api_key
    
    if "anthropic_api_key" in settings_data:
        doc.anthropic_api_key = settings_data.anthropic_api_key
    
    doc.batch_size = cint(settings_data.get("batch_size", 10))
    doc.temperature = float(settings_data.get("temperature", 0.3))
    doc.auto_save = cint(settings_data.get("auto_save", 0))
    doc.preserve_formatting = cint(settings_data.get("preserve_formatting", 1))
    
    doc.save()
    frappe.db.commit()
    
    return {"success": True}

def create_translation_settings_doctype():
    """Create the Translation Settings DocType"""
    from frappe.modules.import_file import import_doc_from_dict
    
    # Create Translation Settings DocType
    translation_settings_doctype = {
        "doctype": "DocType",
        "name": "Translation Settings",
        "module": "Translation Tools",
        "custom": 1,
        "issingle": 1,
        "fields": [
            {
                "fieldname": "default_model_provider",
                "label": "Default Model Provider",
                "fieldtype": "Select",
                "options": "openai\nclaude",
                "default": "openai"
            },
            {
                "fieldname": "default_model",
                "label": "Default Model",
                "fieldtype": "Data",
                "default": "gpt-4-1106-preview"
            },
            {
                "fieldname": "openai_api_key",
                "label": "OpenAI API Key",
                "fieldtype": "Password",
            },
            {
                "fieldname": "anthropic_api_key",
                "label": "Anthropic API Key",
                "fieldtype": "Password",
            },
            {
                "fieldname": "batch_size",
                "label": "Batch Size",
                "fieldtype": "Int",
                "default": "10"
            },
            {
                "fieldname": "temperature",
                "label": "Temperature",
                "fieldtype": "Float",
                "default": "0.3"
            },
            {
                "fieldname": "auto_save",
                "label": "Auto-save Translations",
                "fieldtype": "Check",
                "default": "0"
            },
            {
                "fieldname": "preserve_formatting",
                "label": "Preserve Formatting",
                "fieldtype": "Check",
                "default": "1"
            }
        ],
        "permissions": [
            {
                "role": "System Manager",
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 1,
                "permlevel": 0
            }
        ]
    }
    
    doc = import_doc_from_dict(translation_settings_doctype)
    doc.save()
    frappe.db.commit()

@frappe.whitelist()
def translate_single_entry(file_path, entry_id, model_provider="openai", model=None):
    """Translate a single entry using AI"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))

    # Create a log file
    log_dir = os.path.join(frappe.utils.get_bench_path(), "logs", "translation_logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, f"entry_{os.path.basename(file_path)}_{entry_id}_{frappe.utils.now().replace(':', '-')}.log")
    
    # Set up logging
    file_handler = logging.FileHandler(log_file)
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)
    
    try:
        # Load the PO file
        po = polib.pofile(file_path)
        
        # Find the entry by ID (index)
        index = int(entry_id)
        if index < 0 or index >= len(po):
            frappe.throw(_("Invalid entry ID"))
        
        entry = po[index]
        
        # Get the text to translate
        source_text = entry.msgid
        logger.info(f"Translating entry: {source_text}")
        
        # Get settings
        settings = get_translation_settings()
        
        # Use the specified model provider or default
        provider = model_provider or settings.get("default_model_provider", "openai")
        
        # Use the specified model or default based on provider
        if not model:
            if provider == "openai":
                model = settings.get("default_model", "gpt-4-1106-preview")
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
        
        # Get translation
        translation = call_ai_translation_api(
            source_text=source_text,
            provider=provider,
            model=model,
            api_key=api_key,
            temperature=settings.get("temperature", 0.3)
        )

        logger.info(f"Translation result: {translation}")
        
        # Automatically save if enabled
        if settings.get("auto_save"):
            # Update the translation
            entry.msgstr = translation
            
            # Update metadata
            po.metadata["PO-Revision-Date"] = time.strftime("%Y-%m-%d %H:%M%z")
            
            # Save the file
            po.save(file_path)
            
            # Clear cache
            global PO_FILES_CACHE
            PO_FILES_CACHE = None

            # Update PO File record in database
            if frappe.db.exists("PO File", {"file_path": file_path}):
                file_doc = frappe.get_doc("PO File", {"file_path": file_path})
                if not entry.msgstr and translation:  # If this was previously untranslated
                    file_doc.translated_entries += 1
                    file_doc.translation_status = int((file_doc.translated_entries / file_doc.total_entries) * 100) if file_doc.total_entries > 0 else 0
                file_doc.last_modified = frappe.utils.now()
                file_doc.save()
            
            logger.info("Translation automatically saved")
        
        return {
            "success": True, 
            "translation": translation,
            "log_file": log_file
        }
    except Exception as e:
        logger.error(f"Error translating entry: {e}")
        return {
            "success": False,
            "error": str(e),
            "log_file": log_file
        }
    finally:
        # Remove file handler
        logger.removeHandler(file_handler)
        file_handler.close()

def call_ai_translation_api(source_text, provider, model, api_key, temperature=0.3):
    """Call the AI translation API"""
    if provider == "openai":
        import openai
        client = openai.OpenAI(api_key=api_key)
        
        # Prepare glossary context
        glossary_terms = get_glossary_terms_dict()
        glossary_context = ""
        if glossary_terms:
            glossary_context = "Use these specific term translations:\n" + json.dumps(glossary_terms, indent=2)
        
        # Create the prompt
        system_message = f"""
        You are an expert translator specializing in technical and software localization.
        Translate the following text from English to Thai.
        {glossary_context}
        
        Ensure proper tone and formality appropriate for business software.
        Preserve any formatting placeholders like {{%s}}, {{}}, or {{0}}.
        For technical terms not in the glossary, you may keep them in English if that's conventional.
        Return only the translation, without any explanations or notes.
        """
        
        # Make the API call
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": source_text}
            ],
            temperature=temperature
        )
        
        return response.choices[0].message.content.strip()
    
    elif provider == "claude":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        
        # Prepare glossary context
        glossary_terms = get_glossary_terms_dict()
        glossary_context = ""
        if glossary_terms:
            glossary_context = "Use these specific term translations:\n" + json.dumps(glossary_terms, indent=2)
        
        # Create the prompt
        prompt = f"""
        You are an expert translator specializing in technical and software localization.
        Translate the following text from English to Thai.
        {glossary_context}
        
        Ensure proper tone and formality appropriate for business software.
        Preserve any formatting placeholders like {{%s}}, {{}}, or {{0}}.
        For technical terms not in the glossary, you may keep them in English if that's conventional.
        Return only the translation, without any explanations or notes.
        
        Text to translate:
        {source_text}
        """
        
        # Make the API call
        response = client.messages.create(
            model=model,
            max_tokens=1000,
            temperature=temperature,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text.strip()
    
    else:
        frappe.throw(_("Unsupported model provider: {0}").format(provider))

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

def analyze_logs(logs):
    """Analyze translation logs for common patterns and issues"""
    analysis = {
        "api_calls": 0,
        "api_responses": 0,
        "errors": []
    }
    
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
        r"Unexpected error: (.*?)(?=\n|$)"
    ]
    
    for pattern in error_patterns:
        errors = re.findall(pattern, logs)
        analysis["errors"].extend(errors)
    
    return analysis

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
def save_translation(file_path, entry_id, translation):
    """Save a translation to a PO file and update database stats"""
    if not os.path.exists(file_path):
        frappe.throw(_("File not found: {0}").format(file_path))
    
    try:
        # Load the PO file
        po = polib.pofile(file_path)
        
        # Find the entry by ID (index)
        index = int(entry_id)
        if index < 0 or index >= len(po):
            frappe.throw(_("Invalid entry ID"))
        
        entry = po[index]
        
        # Check if this is a new translation (i.e., previously untranslated)
        was_untranslated = not entry.msgstr
        
        # Update the translation
        entry.msgstr = translation
        
        # Update metadata
        po.metadata["PO-Revision-Date"] = time.strftime("%Y-%m-%d %H:%M%z")
        
        # Save the file
        po.save(file_path)
        
        # Update database stats if this is a new translation
        if was_untranslated and translation:
            if frappe.db.exists("PO File", {"file_path": file_path}):
                file_doc = frappe.get_doc("PO File", {"file_path": file_path})
                file_doc.translated_entries += 1
                file_doc.translation_status = int((file_doc.translated_entries / file_doc.total_entries) * 100) if file_doc.total_entries > 0 else 0
                file_doc.last_modified = frappe.utils.now()
                file_doc.save()
        
        return {"success": True}
    except Exception as e:
        frappe.log_error(f"Error saving translation: {e}")
        frappe.throw(_("Error saving translation: {0}").format(str(e)))

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
