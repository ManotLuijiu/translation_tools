# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
MO File Compiler
Handles compilation of PO files to MO files for runtime translation usage
"""

import os
import subprocess
import frappe
import logging
from frappe.utils import now_datetime, get_bench_path
from datetime import datetime, timedelta
import pytz

# Configure logging
logger = logging.getLogger("translation_tools.mo_compiler")


def compile_mo_files_for_all_apps():
    """
    Daily task to compile PO files to MO files for all installed apps
    Scheduled to run at midnight Bangkok time (17:00 UTC)
    This ensures translations are up-to-date even when PO files are modified externally
    """
    try:
        # Log the execution time in Bangkok timezone
        bangkok_tz = pytz.timezone('Asia/Bangkok')
        bangkok_time = datetime.now(bangkok_tz)
        
        installed_apps = frappe.get_installed_apps()
        bench_path = get_bench_path()
        
        logger.info(f"Starting daily MO compilation at {bangkok_time.strftime('%Y-%m-%d %H:%M:%S %Z')} for {len(installed_apps)} apps")
        
        compiled_count = 0
        failed_count = 0
        skipped_count = 0
        
        for app_name in installed_apps:
            try:
                result = compile_mo_files_for_app(app_name, force=False)
                if result["compiled"]:
                    compiled_count += 1
                    logger.info(f"Compiled MO files for {app_name}")
                elif result["skipped"]:
                    skipped_count += 1
                    logger.debug(f"Skipped {app_name} - MO files up to date")
                else:
                    failed_count += 1
                    logger.warning(f"Failed to compile MO files for {app_name}: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Error compiling MO files for {app_name}: {str(e)}")
        
        # Log summary
        summary_msg = f"MO compilation completed: {compiled_count} compiled, {skipped_count} skipped, {failed_count} failed"
        logger.info(summary_msg)
        
        # Only print to console if there were actual changes or errors
        if compiled_count > 0 or failed_count > 0:
            print(f"🔄 {summary_msg}")
        
        return {
            "success": True,
            "compiled_count": compiled_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "total_apps": len(installed_apps)
        }
        
    except Exception as e:
        error_msg = f"Failed to run daily MO compilation: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg
        }


def compile_mo_files_for_app(app_name, force=False):
    """
    Compile MO files for a specific app
    
    Args:
        app_name (str): Name of the app to compile
        force (bool): Force compilation even if MO files are up to date
        
    Returns:
        dict: Result with success status and details
    """
    try:
        bench_path = get_bench_path()
        app_locale_path = os.path.join(bench_path, "apps", app_name, app_name, "locale")
        
        # Check if locale directory exists
        if not os.path.exists(app_locale_path):
            return {
                "success": True,
                "compiled": False,
                "skipped": True,
                "reason": "No locale directory found"
            }
        
        # Look for PO files
        po_files = []
        for filename in os.listdir(app_locale_path):
            if filename.endswith('.po'):
                po_files.append(os.path.join(app_locale_path, filename))
        
        if not po_files:
            return {
                "success": True,
                "compiled": False,
                "skipped": True,
                "reason": "No PO files found"
            }
        
        # Check if compilation is needed (unless forced)
        if not force and not needs_mo_compilation(app_name, po_files):
            return {
                "success": True,
                "compiled": False,
                "skipped": True,
                "reason": "MO files are up to date"
            }
        
        # Run the bench command to compile MO files
        cmd = f"bench compile-po-to-mo --app {app_name} --locale th"
        if force:
            cmd += " --force"
        
        logger.debug(f"Running: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=bench_path)
        
        if result.returncode == 0:
            return {
                "success": True,
                "compiled": True,
                "skipped": False,
                "reason": f"Compiled {len(po_files)} PO files to MO"
            }
        else:
            error_msg = result.stderr or result.stdout or "Unknown error"
            return {
                "success": False,
                "compiled": False,
                "skipped": False,
                "error": error_msg.strip()
            }
            
    except Exception as e:
        return {
            "success": False,
            "compiled": False,
            "skipped": False,
            "error": str(e)
        }


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
    Force compile MO files for all apps (used by API endpoint)
    """
    try:
        installed_apps = frappe.get_installed_apps()
        
        compiled_count = 0
        failed_count = 0
        
        for app_name in installed_apps:
            try:
                result = compile_mo_files_for_app(app_name, force=True)
                if result["compiled"]:
                    compiled_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Error force compiling MO files for {app_name}: {str(e)}")
        
        return {
            "success": True,
            "compiled_count": compiled_count,
            "failed_count": failed_count,
            "total_apps": len(installed_apps)
        }
        
    except Exception as e:
        raise Exception(f"Failed to force compile MO files: {str(e)}")