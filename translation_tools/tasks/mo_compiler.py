# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
MO File Compiler - ASEAN Languages Focus
Integrates with Frappe's native i18n system for efficient translation compilation
Focuses on ASEAN countries: Thailand, Laos, Cambodia, with English support
"""

import os
import frappe
import logging
from frappe.utils import now_datetime, get_bench_path
from frappe.gettext.translate import compile_translations, get_locales
from datetime import datetime, timedelta
import pytz

# Configure logging
logger = logging.getLogger("translation_tools.mo_compiler")

# ASEAN-focused language support
SUPPORTED_ASEAN_LOCALES = ["th", "en", "lo", "km"]  # Thai, English, Lao, Khmer (Cambodia)


def compile_mo_files_for_all_apps():
    """
    Daily task to compile PO files to MO files using Frappe's native system
    Focuses on ASEAN language support with improved performance
    Uses Frappe's multiprocessing compilation instead of subprocess calls
    """
    try:
        # Log the execution time in Bangkok timezone
        bangkok_tz = pytz.timezone('Asia/Bangkok')
        bangkok_time = datetime.now(bangkok_tz)
        
        installed_apps = frappe.get_installed_apps()
        
        logger.info(f"Starting ASEAN-focused MO compilation at {bangkok_time.strftime('%Y-%m-%d %H:%M:%S %Z')} for {len(installed_apps)} apps")
        
        compiled_count = 0
        failed_count = 0
        skipped_count = 0
        
        for app_name in installed_apps:
            try:
                # Use Frappe's native compilation for ASEAN locales
                result = compile_asean_translations_for_app(app_name)
                
                if result["compiled"]:
                    compiled_count += 1
                    logger.info(f"Compiled ASEAN translations for {app_name}: {result['locales_compiled']}")
                elif result["skipped"]:
                    skipped_count += 1
                    logger.debug(f"Skipped {app_name} - no ASEAN translations found or up to date")
                else:
                    failed_count += 1
                    logger.warning(f"Failed to compile ASEAN translations for {app_name}: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Error compiling ASEAN translations for {app_name}: {str(e)}")
        
        # Log summary
        summary_msg = f"ASEAN MO compilation completed: {compiled_count} compiled, {skipped_count} skipped, {failed_count} failed"
        logger.info(summary_msg)
        
        # Only print to console if there were actual changes or errors
        if compiled_count > 0 or failed_count > 0:
            print(f"🇹🇭 {summary_msg}")
        
        return {
            "success": True,
            "compiled_count": compiled_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "total_apps": len(installed_apps),
            "asean_locales": SUPPORTED_ASEAN_LOCALES
        }
        
    except Exception as e:
        error_msg = f"Failed to run ASEAN MO compilation: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg
        }


def compile_asean_translations_for_app(app_name, force=False):
    """
    Compile MO files for ASEAN languages using Frappe's native system
    
    Args:
        app_name (str): Name of the app to compile
        force (bool): Force compilation even if MO files are up to date
        
    Returns:
        dict: Result with success status and details
    """
    try:
        # Get available locales for the app using Frappe's native function
        available_locales = get_locales(app_name)
        
        if not available_locales:
            return {
                "success": True,
                "compiled": False,
                "skipped": True,
                "reason": "No locale files found",
                "locales_compiled": []
            }
        
        # Filter for ASEAN locales only
        asean_locales = [locale for locale in available_locales if locale in SUPPORTED_ASEAN_LOCALES]
        
        if not asean_locales:
            return {
                "success": True,
                "compiled": False,
                "skipped": True,
                "reason": "No ASEAN locale files found",
                "available_locales": available_locales,
                "locales_compiled": []
            }
        
        compiled_locales = []
        failed_locales = []
        
        # Use Frappe's native compilation for each ASEAN locale
        for locale in asean_locales:
            try:
                # Use Frappe's native compile_translations function
                compile_translations(target_app=app_name, locale=locale, force=force)
                compiled_locales.append(locale)
                logger.debug(f"Successfully compiled {locale} for {app_name}")
                
            except Exception as e:
                failed_locales.append({"locale": locale, "error": str(e)})
                logger.error(f"Failed to compile {locale} for {app_name}: {str(e)}")
        
        if compiled_locales:
            return {
                "success": True,
                "compiled": True,
                "skipped": False,
                "reason": f"Compiled {len(compiled_locales)} ASEAN locales",
                "locales_compiled": compiled_locales,
                "locales_failed": failed_locales
            }
        else:
            return {
                "success": False,
                "compiled": False,
                "skipped": False,
                "error": f"All ASEAN locales failed compilation",
                "locales_failed": failed_locales,
                "locales_compiled": []
            }
            
    except Exception as e:
        return {
            "success": False,
            "compiled": False,
            "skipped": False,
            "error": str(e),
            "locales_compiled": []
        }


def compile_mo_files_for_app(app_name, force=False):
    """
    Legacy function - now uses ASEAN-focused compilation
    Maintained for backward compatibility with existing code
    """
    return compile_asean_translations_for_app(app_name, force)


def needs_mo_compilation(app_name, po_files):
    """
    Check if MO files need to be recompiled based on modification times
    
    Args:
        app_name (str): Name of the app
        po_files (list): List of PO file paths
        
    Returns:
        bool: True if compilation is needed
    """
    try:
        # Get the MO file path in sites/assets
        sites_path = frappe.get_site_path("..")
        mo_file_path = os.path.join(sites_path, "assets", "locale", "th", "LC_MESSAGES", f"{app_name}.mo")
        
        # If MO file doesn't exist, compilation is needed
        if not os.path.exists(mo_file_path):
            logger.debug(f"MO file doesn't exist for {app_name}: {mo_file_path}")
            return True
        
        # Get MO file modification time
        mo_mtime = os.path.getmtime(mo_file_path)
        mo_datetime = datetime.fromtimestamp(mo_mtime)
        
        # Check if any PO file is newer than the MO file
        for po_file in po_files:
            if os.path.exists(po_file):
                po_mtime = os.path.getmtime(po_file)
                po_datetime = datetime.fromtimestamp(po_mtime)
                
                if po_datetime > mo_datetime:
                    logger.debug(f"PO file is newer than MO for {app_name}: {po_file}")
                    return True
        
        # Also check if MO file is older than 7 days (force periodic refresh)
        week_ago = datetime.now() - timedelta(days=7)
        if mo_datetime < week_ago:
            logger.debug(f"MO file is older than 7 days for {app_name}, forcing refresh")
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking MO compilation need for {app_name}: {str(e)}")
        # If we can't determine, assume compilation is needed
        return True


@frappe.whitelist()
def force_compile_mo_files():
    """
    API endpoint to force compilation of MO files for all apps
    Can be called from the translation dashboard
    """
    try:
        result = compile_mo_files_for_all_apps_force()
        return {
            "success": True,
            "message": f"Force compiled MO files: {result['compiled_count']} apps processed",
            "data": result
        }
    except Exception as e:
        frappe.log_error(f"Force MO compilation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def compile_mo_files_for_all_apps_force():
    """
    Force compile ASEAN translations for all apps using Frappe's native system
    """
    try:
        installed_apps = frappe.get_installed_apps()
        
        compiled_count = 0
        failed_count = 0
        total_locales_compiled = []
        
        for app_name in installed_apps:
            try:
                result = compile_asean_translations_for_app(app_name, force=True)
                if result["compiled"]:
                    compiled_count += 1
                    if result.get("locales_compiled"):
                        total_locales_compiled.extend([
                            f"{app_name}:{locale}" for locale in result["locales_compiled"]
                        ])
                else:
                    failed_count += 1
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Error force compiling ASEAN translations for {app_name}: {str(e)}")
        
        return {
            "success": True,
            "compiled_count": compiled_count,
            "failed_count": failed_count,
            "total_apps": len(installed_apps),
            "asean_locales": SUPPORTED_ASEAN_LOCALES,
            "locales_compiled": total_locales_compiled
        }
        
    except Exception as e:
        raise Exception(f"Failed to force compile ASEAN translations: {str(e)}")


@frappe.whitelist()
def get_asean_translation_status():
    """
    API endpoint to get ASEAN translation status for all apps
    """
    try:
        installed_apps = frappe.get_installed_apps()
        status_data = []
        
        for app_name in installed_apps:
            try:
                available_locales = get_locales(app_name)
                asean_locales = [locale for locale in available_locales if locale in SUPPORTED_ASEAN_LOCALES]
                
                app_status = {
                    "app": app_name,
                    "available_locales": available_locales,
                    "asean_locales": asean_locales,
                    "has_asean_translations": len(asean_locales) > 0
                }
                status_data.append(app_status)
                
            except Exception as e:
                status_data.append({
                    "app": app_name,
                    "error": str(e),
                    "has_asean_translations": False
                })
        
        return {
            "success": True,
            "supported_locales": SUPPORTED_ASEAN_LOCALES,
            "apps_status": status_data,
            "total_apps": len(installed_apps)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }