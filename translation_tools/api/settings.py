import os
import frappe
import json
from frappe import _
from frappe.utils import cint
from .common import logger, CONFIG_FILE, get_bench_path

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
    # from frappe.modules.import_file import import_doc_from_dict
    
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
    
    try:
        doc = frappe.get_doc(translation_settings_doctype).insert()
    except Exception as e:
        frappe.log_error(f"Error creating Translation Settings DocType: {str(e)}")
        frappe.log_error(frappe.get_traceback())
    
    # doc = import_doc_from_dict(translation_settings_doctype)
    # doc.save()
    # frappe.db.commit()

@frappe.whitelist()
def get_translation_settings_file():
    """Get translation settings from config file"""
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
def save_translation_settings_file(
    api_key=None,
    model_provider=None,
    model=None,
    batch_size=None,
    temperature=None,
    max_tokens=None,
):
    """Save translation settings to file"""
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