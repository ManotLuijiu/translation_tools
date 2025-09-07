# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
Bulk ASEAN Translation API
One-click automation for generating ASEAN translations across all installed apps
Uses official Frappe bench commands for translation workflow
"""

import os
import subprocess
import frappe
import logging
from frappe.utils import now_datetime, get_bench_path
from datetime import datetime
import pytz

# Configure logging
logger = logging.getLogger("translation_tools.bulk_translation")

# ASEAN-focused language support
SUPPORTED_ASEAN_LOCALES = ["th", "vi", "lo", "km"]  # Thai, Vietnamese, Lao, Khmer (Cambodia)


@frappe.whitelist()
def generate_all_apps_asean_translations(force_regenerate_pot=False):
    """
    One-click ASEAN translation generation for ALL installed apps
    Supports: Thai (th), Vietnamese (vi), Lao (lo), Khmer (km)
    
    Workflow using official Frappe bench commands:
    1. bench generate-pot-file --app {app} (if force_regenerate_pot=True)
    2. bench update-po-files --app {app} --locale {locale}
    3. bench compile-po-to-mo --app {app} --locale {locale}
    
    Args:
        force_regenerate_pot (bool): Whether to regenerate POT files first
        
    Returns:
        dict: Results with app-by-app status
    """
    try:
        # Log the execution time in Bangkok timezone
        bangkok_tz = pytz.timezone('Asia/Bangkok')
        bangkok_time = datetime.now(bangkok_tz)
        
        logger.info(f"Starting bulk ASEAN translation generation at {bangkok_time.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        
        installed_apps = frappe.get_installed_apps()
        results = []
        
        for app_name in installed_apps:
            try:
                app_result = process_app_asean_translations(app_name, force_regenerate_pot)
                results.append(app_result)
                
            except Exception as e:
                logger.error(f"Error processing {app_name}: {str(e)}")
                results.append({
                    "app": app_name,
                    "status": "error",
                    "error": str(e),
                    "has_pot": False,
                    "asean_translations": []
                })
        
        # Summary statistics
        total_apps = len(results)
        processed_apps = len([r for r in results if r["status"] == "completed"])
        skipped_apps = len([r for r in results if r["status"] == "skipped_no_pot"])
        error_apps = len([r for r in results if r["status"] == "error"])
        
        summary = {
            "success": True,
            "timestamp": bangkok_time.isoformat(),
            "total_apps": total_apps,
            "processed_apps": processed_apps,
            "skipped_apps": skipped_apps,
            "error_apps": error_apps,
            "apps_results": results,
            "asean_locales": SUPPORTED_ASEAN_LOCALES
        }
        
        logger.info(f"Bulk ASEAN translation completed: {processed_apps}/{total_apps} apps processed")
        return summary
        
    except Exception as e:
        logger.error(f"Bulk ASEAN translation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


def process_app_asean_translations(app_name, force_regenerate_pot=False):
    """
    Process ASEAN translations for a single app using official bench commands
    
    Args:
        app_name (str): Name of the app to process
        force_regenerate_pot (bool): Whether to regenerate POT file first
        
    Returns:
        dict: App processing results
    """
    app_result = {
        "app": app_name,
        "status": "pending",
        "has_pot": False,
        "pot_regenerated": False,
        "asean_translations": [],
        "error": None
    }
    
    try:
        # Step 1: Check if POT file exists or generate it
        pot_path = get_app_pot_path(app_name)
        app_result["has_pot"] = os.path.exists(pot_path)
        
        if force_regenerate_pot or not app_result["has_pot"]:
            pot_result = generate_pot_file(app_name)
            app_result["pot_regenerated"] = pot_result["success"]
            app_result["has_pot"] = pot_result["success"]
            
            if not app_result["has_pot"]:
                app_result["status"] = "skipped_no_pot"
                app_result["error"] = "No translatable strings found or POT generation failed"
                return app_result
        
        # Step 2: Generate PO files for all ASEAN locales
        for locale in SUPPORTED_ASEAN_LOCALES:
            translation_result = {
                "locale": locale,
                "po_updated": False,
                "mo_compiled": False,
                "error": None
            }
            
            try:
                # Update PO files using bench update-po-files
                po_result = update_po_files(app_name, locale)
                translation_result["po_updated"] = po_result["success"]
                
                if po_result["success"]:
                    # Compile PO to MO using bench compile-po-to-mo
                    mo_result = compile_po_to_mo(app_name, locale)
                    translation_result["mo_compiled"] = mo_result["success"]
                else:
                    translation_result["error"] = po_result.get("error", "PO update failed")
                    
            except Exception as e:
                translation_result["error"] = str(e)
                logger.error(f"Error processing {locale} for {app_name}: {str(e)}")
            
            app_result["asean_translations"].append(translation_result)
        
        # Determine overall app status
        successful_translations = [t for t in app_result["asean_translations"] if t["po_updated"] and t["mo_compiled"]]
        if len(successful_translations) > 0:
            app_result["status"] = "completed"
        else:
            app_result["status"] = "error"
            app_result["error"] = "No ASEAN translations were successfully generated"
        
        return app_result
        
    except Exception as e:
        app_result["status"] = "error"
        app_result["error"] = str(e)
        return app_result


def get_app_pot_path(app_name):
    """Get the POT file path for an app"""
    bench_path = get_bench_path()
    return os.path.join(bench_path, "apps", app_name, app_name, "locale", "main.pot")


def generate_pot_file(app_name):
    """
    Generate POT file using bench generate-pot-file
    Official command: bench generate-pot-file --app {app_name}
    """
    try:
        bench_path = get_bench_path()
        cmd = ["bench", "generate-pot-file", "--app", app_name]
        
        result = subprocess.run(
            cmd, 
            cwd=bench_path, 
            capture_output=True, 
            text=True, 
            timeout=120
        )
        
        if result.returncode == 0:
            logger.info(f"POT file generated for {app_name}")
            return {"success": True, "output": result.stdout}
        else:
            logger.error(f"POT generation failed for {app_name}: {result.stderr}")
            return {"success": False, "error": result.stderr}
            
    except Exception as e:
        logger.error(f"POT generation error for {app_name}: {str(e)}")
        return {"success": False, "error": str(e)}


def update_po_files(app_name, locale):
    """
    Update PO files using bench update-po-files
    Official command: bench update-po-files --app {app_name} --locale {locale}
    """
    try:
        bench_path = get_bench_path()
        cmd = ["bench", "update-po-files", "--app", app_name, "--locale", locale]
        
        result = subprocess.run(
            cmd, 
            cwd=bench_path, 
            capture_output=True, 
            text=True, 
            timeout=60
        )
        
        if result.returncode == 0:
            logger.debug(f"PO file updated for {app_name}:{locale}")
            return {"success": True, "output": result.stdout}
        else:
            logger.error(f"PO update failed for {app_name}:{locale}: {result.stderr}")
            return {"success": False, "error": result.stderr}
            
    except Exception as e:
        logger.error(f"PO update error for {app_name}:{locale}: {str(e)}")
        return {"success": False, "error": str(e)}


def compile_po_to_mo(app_name, locale):
    """
    Compile PO to MO using bench compile-po-to-mo
    Official command: bench compile-po-to-mo --app {app_name} --locale {locale}
    """
    try:
        bench_path = get_bench_path()
        cmd = ["bench", "compile-po-to-mo", "--app", app_name, "--locale", locale]
        
        result = subprocess.run(
            cmd, 
            cwd=bench_path, 
            capture_output=True, 
            text=True, 
            timeout=60
        )
        
        if result.returncode == 0:
            logger.debug(f"MO file compiled for {app_name}:{locale}")
            return {"success": True, "output": result.stdout}
        else:
            logger.error(f"MO compilation failed for {app_name}:{locale}: {result.stderr}")
            return {"success": False, "error": result.stderr}
            
    except Exception as e:
        logger.error(f"MO compilation error for {app_name}:{locale}: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_apps_translation_status():
    """
    Get current ASEAN translation status for all installed apps
    """
    try:
        installed_apps = frappe.get_installed_apps()
        status_data = []
        
        for app_name in installed_apps:
            app_status = {
                "app": app_name,
                "has_pot": os.path.exists(get_app_pot_path(app_name)),
                "asean_locales_status": []
            }
            
            # Check existing PO and MO files for each ASEAN locale
            for locale in SUPPORTED_ASEAN_LOCALES:
                bench_path = get_bench_path()
                po_path = os.path.join(bench_path, "apps", app_name, app_name, "locale", f"{locale}.po")
                mo_path = os.path.join(bench_path, "sites", "assets", "locale", locale, "LC_MESSAGES", f"{app_name}.mo")
                
                locale_status = {
                    "locale": locale,
                    "has_po": os.path.exists(po_path),
                    "has_mo": os.path.exists(mo_path),
                    "po_size": os.path.getsize(po_path) if os.path.exists(po_path) else 0,
                    "mo_size": os.path.getsize(mo_path) if os.path.exists(mo_path) else 0
                }
                app_status["asean_locales_status"].append(locale_status)
            
            status_data.append(app_status)
        
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


@frappe.whitelist() 
def migrate_csv_to_po_bulk(csv_source_path=None):
    """
    Bulk migrate CSV files to PO format for all apps (if CSV files exist)
    Official command: bench migrate-csv-to-po --app {app_name} --locale {locale}
    
    Note: This is for legacy systems that used CSV translation files
    """
    try:
        installed_apps = frappe.get_installed_apps()
        results = []
        
        for app_name in installed_apps:
            app_result = {
                "app": app_name,
                "csv_migrations": []
            }
            
            for locale in SUPPORTED_ASEAN_LOCALES:
                # Check if CSV file exists
                bench_path = get_bench_path()
                csv_path = os.path.join(bench_path, "apps", app_name, app_name, "translations", f"{locale}.csv")
                
                if os.path.exists(csv_path):
                    try:
                        cmd = ["bench", "migrate-csv-to-po", "--app", app_name, "--locale", locale]
                        result = subprocess.run(
                            cmd, 
                            cwd=bench_path, 
                            capture_output=True, 
                            text=True, 
                            timeout=60
                        )
                        
                        migration_result = {
                            "locale": locale,
                            "success": result.returncode == 0,
                            "output": result.stdout if result.returncode == 0 else result.stderr
                        }
                        
                    except Exception as e:
                        migration_result = {
                            "locale": locale,
                            "success": False,
                            "error": str(e)
                        }
                else:
                    migration_result = {
                        "locale": locale,
                        "success": False,
                        "error": "No CSV file found"
                    }
                
                app_result["csv_migrations"].append(migration_result)
            
            results.append(app_result)
        
        return {
            "success": True,
            "apps_results": results
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }