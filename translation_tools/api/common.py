import os
import frappe
import logging
from frappe.utils import get_bench_path

# Setup logger
logger = logging.getLogger(__name__)

# Configuration path
CONFIG_FILE = os.path.join(get_bench_path(), ".erpnext_translate_config")

# Cache for PO files list to avoid repetitive expensive file system operations
PO_FILES_CACHE = None
PO_FILES_CACHE_TIMESTAMP = 0
CACHE_EXPIRY = 300  # 5 minutes


def get_bench_path():
    """Get the absolute path to the Frappe bench directory"""
    # Use frappe's utility function instead of recursively calling this function
    from frappe.utils import get_bench_path as frappe_get_bench_path

    return frappe_get_bench_path()


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
