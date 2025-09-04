# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
POT File Generation API
Handles generation of POT (Portable Object Template) files for translation workflow
"""

import os
import frappe
import subprocess
import logging
from frappe import _
from frappe.utils import now_datetime
from frappe.utils.background_jobs import enqueue
from datetime import datetime
import json

from .common import get_bench_path

# Configure logging
logger = logging.getLogger("translation_tools.api.pot_generation")


@frappe.whitelist()
def get_installed_apps():
    """
    Get list of installed Frappe apps that can have POT files generated.
    
    Returns:
        dict: List of apps with metadata
    """
    try:
        bench_path = get_bench_path()
        apps_path = os.path.join(bench_path, "apps")
        
        apps = []
        if os.path.exists(apps_path):
            for app_name in os.listdir(apps_path):
                app_path = os.path.join(apps_path, app_name)
                if not os.path.isdir(app_path) or app_name.startswith('.'):
                    continue
                
                # Check if it's a valid Frappe app
                app_module_path = os.path.join(app_path, app_name)
                hooks_py = os.path.join(app_path, app_name, "hooks.py")
                
                if os.path.exists(app_module_path) and os.path.exists(hooks_py):
                    # Get existing POT file info
                    pot_file = os.path.join(app_module_path, "locale", "main.pot")
                    pot_exists = os.path.exists(pot_file)
                    pot_modified = None
                    pot_entries = 0
                    
                    if pot_exists:
                        try:
                            import polib
                            pot = polib.pofile(pot_file)
                            pot_entries = len(pot)
                            pot_modified = datetime.fromtimestamp(os.path.getmtime(pot_file))
                        except:
                            pass
                    
                    apps.append({
                        "name": app_name,
                        "path": app_path,
                        "has_pot": pot_exists,
                        "pot_entries": pot_entries,
                        "pot_last_modified": pot_modified.isoformat() if pot_modified else None,
                        "is_frappe_app": True
                    })
        
        # Sort apps - common ones first
        common_apps = ['frappe', 'erpnext', 'hrms', 'translation_tools']
        sorted_apps = []
        
        for common in common_apps:
            app = next((a for a in apps if a['name'] == common), None)
            if app:
                sorted_apps.append(app)
                apps.remove(app)
        
        sorted_apps.extend(sorted(apps, key=lambda x: x['name']))
        
        return {
            "success": True,
            "apps": sorted_apps,
            "total_apps": len(sorted_apps)
        }
        
    except Exception as e:
        logger.error(f"Error getting installed apps: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "apps": []
        }


@frappe.whitelist()
def generate_pot_file(app_name, force_regenerate=False):
    """
    Generate POT file for a specific app using bench generate-pot-file command.
    
    Args:
        app_name: Name of the Frappe app
        force_regenerate: Whether to regenerate if POT file already exists
        
    Returns:
        dict: Result of POT generation
    """
    try:
        # Validate app exists
        bench_path = get_bench_path()
        app_path = os.path.join(bench_path, "apps", app_name)
        
        if not os.path.exists(app_path):
            return {
                "success": False,
                "error": f"App '{app_name}' not found"
            }
        
        # Check if POT file already exists
        pot_file = os.path.join(app_path, app_name, "locale", "main.pot")
        pot_file_exists = os.path.exists(pot_file)
        
        # Always run the complete Thai translation workflow, but skip POT generation if file exists and force_regenerate=False
        skip_pot_generation = pot_file_exists and not force_regenerate
        
        # Execute bench generate-pot-file command (only if needed)
        if not skip_pot_generation:
            cmd = f"cd {bench_path} && bench generate-pot-file --app {app_name}"
            logger.info(f"Executing command: {cmd}")
            
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout or "Unknown error"
                logger.error(f"POT generation failed for {app_name}: {error_msg}")
                return {
                    "success": False,
                    "error": f"Command failed: {error_msg}",
                    "command": cmd
                }
        else:
            logger.info(f"Skipping POT generation for {app_name} - file already exists")
        
        # Run additional Thai translation commands (in correct order)
        additional_commands = [
            f"cd {bench_path} && bench update-po-files --app {app_name} --locale th",  # Create/update th.po from main.pot
            f"cd {bench_path} && bench migrate-csv-to-po --app {app_name} --locale th",  # Migrate old CSV translations
            f"cd {bench_path} && bench compile-po-to-mo --app {app_name} --locale th"   # Compile to binary
        ]
        
        command_results = []
        for additional_cmd in additional_commands:
            try:
                logger.info(f"Executing additional command: {additional_cmd}")
                additional_result = subprocess.run(
                    additional_cmd,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=120  # 2 minute timeout for each
                )
                command_results.append({
                    "command": additional_cmd,
                    "success": additional_result.returncode == 0,
                    "output": additional_result.stdout,
                    "error": additional_result.stderr if additional_result.returncode != 0 else None
                })
                if additional_result.returncode != 0:
                    logger.warning(f"Additional command failed for {app_name}: {additional_result.stderr}")
            except Exception as e:
                logger.warning(f"Additional command error for {app_name}: {str(e)}")
                command_results.append({
                    "command": additional_cmd,
                    "success": False,
                    "error": str(e)
                })
        
        # Verify POT file was created
        if not os.path.exists(pot_file):
            return {
                "success": False,
                "error": f"POT file was not created at expected location: {pot_file}"
            }
        
        # Get statistics about generated POT file
        try:
            import polib
            pot = polib.pofile(pot_file)
            entries_count = len(pot)
            
            return {
                "success": True,
                "message": f"POT {'generation skipped (file exists)' if skip_pot_generation else 'file generated successfully'} for '{app_name}' - Thai translation workflow completed",
                "pot_file": pot_file,
                "entries_count": entries_count,
                "command_output": result.stdout if not skip_pot_generation else "POT generation skipped - file already exists",
                "additional_commands": command_results,
                "generated_at": now_datetime().isoformat()
            }
            
        except Exception as e:
            logger.warning(f"Could not read generated POT file: {str(e)}")
            return {
                "success": True,
                "message": f"POT file generated for '{app_name}' but could not read statistics",
                "pot_file": pot_file,
                "command_output": result.stdout,
                "additional_commands": command_results,
                "generated_at": now_datetime().isoformat()
            }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": f"POT generation timed out for '{app_name}' (5 minutes)"
        }
    except Exception as e:
        logger.error(f"Error generating POT file for {app_name}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def generate_pot_files_batch(app_names, force_regenerate=False):
    """
    Generate POT files for multiple apps as a background job.
    
    Args:
        app_names: List of app names or "all" for all apps
        force_regenerate: Whether to regenerate existing POT files
        
    Returns:
        dict: Job information
    """
    try:
        if app_names == "all":
            # Get all installed apps
            apps_result = get_installed_apps()
            if not apps_result["success"]:
                return apps_result
            app_names = [app["name"] for app in apps_result["apps"]]
        
        if not isinstance(app_names, list):
            app_names = [app_names]
        
        # Enqueue background job
        job_id = f"pot_generation_{now_datetime().strftime('%Y%m%d_%H%M%S')}"
        
        enqueue(
            execute_batch_pot_generation,
            queue='long',
            timeout=1800,  # 30 minutes
            job_name=f"POT Generation: {', '.join(app_names[:3])}{'...' if len(app_names) > 3 else ''}",
            app_names=app_names,
            force_regenerate=force_regenerate,
            batch_job_id=job_id  # Renamed to avoid conflict with Frappe's job_id
        )
        
        return {
            "success": True,
            "message": f"POT generation started for {len(app_names)} apps",
            "job_id": job_id,
            "apps_count": len(app_names)
        }
        
    except Exception as e:
        logger.error(f"Error starting batch POT generation: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def execute_batch_pot_generation(app_names, force_regenerate=False, batch_job_id=None):
    """
    Background job to generate POT files for multiple apps.
    
    Args:
        app_names: List of app names
        force_regenerate: Whether to regenerate existing POT files
        batch_job_id: Optional job identifier (renamed to avoid Frappe conflicts)
    """
    results = []
    total_apps = len(app_names)
    job_id = batch_job_id  # For internal use, keep the original variable name
    
    try:
        logger.info(f"Starting batch POT generation for {total_apps} apps")
        
        for i, app_name in enumerate(app_names):
            try:
                logger.info(f"Processing app {i+1}/{total_apps}: {app_name}")
                
                # Update progress in cache
                progress = {
                    "current_app": app_name,
                    "completed": i,
                    "total": total_apps,
                    "percentage": (i / total_apps) * 100,
                    "status": "processing"
                }
                
                if job_id:
                    frappe.cache().set_value(f"pot_generation_progress_{job_id}", json.dumps(progress), expires_in_sec=3600)
                
                # Generate POT for this app
                result = generate_pot_file(app_name, force_regenerate)
                result["app_name"] = app_name
                results.append(result)
                
                if result["success"]:
                    logger.info(f"Successfully generated POT for {app_name}")
                else:
                    logger.error(f"Failed to generate POT for {app_name}: {result.get('error', 'Unknown error')}")
                
            except Exception as e:
                logger.error(f"Error processing app {app_name}: {str(e)}")
                results.append({
                    "app_name": app_name,
                    "success": False,
                    "error": str(e)
                })
        
        # Final progress update
        final_progress = {
            "completed": total_apps,
            "total": total_apps,
            "percentage": 100,
            "status": "completed",
            "results": results
        }
        
        if job_id:
            frappe.cache().set_value(f"pot_generation_progress_{job_id}", json.dumps(final_progress), expires_in_sec=3600)
        
        # Log summary
        successful = len([r for r in results if r["success"]])
        failed = total_apps - successful
        
        logger.info(f"Batch POT generation completed. Success: {successful}, Failed: {failed}")
        
        return results
        
    except Exception as e:
        logger.error(f"Critical error in batch POT generation: {str(e)}")
        
        # Update progress with error
        if job_id:
            error_progress = {
                "status": "error",
                "error": str(e),
                "completed": len(results),
                "total": total_apps
            }
            frappe.cache().set_value(f"pot_generation_progress_{job_id}", json.dumps(error_progress), expires_in_sec=3600)
        
        raise


@frappe.whitelist()
def get_pot_generation_progress(**kwargs):
    """
    Get progress of a batch POT generation job.
    
    Args:
        job_id: Job identifier (optional, can be passed as kwargs)
        
    Returns:
        dict: Progress information
    """
    try:
        # Extract job_id from kwargs or form_dict
        job_id = kwargs.get('job_id') or frappe.form_dict.get('job_id')
        
        # Handle missing or empty job_id
        if not job_id:
            return {
                "success": False,
                "error": "Job ID is required"
            }
        
        progress_key = f"pot_generation_progress_{job_id}"
        progress_json = frappe.cache().get_value(progress_key)
        
        if not progress_json:
            return {
                "success": False,
                "error": "Job not found or expired"
            }
        
        progress = json.loads(progress_json)
        return {
            "success": True,
            "progress": progress
        }
        
    except Exception as e:
        logger.error(f"Error getting POT generation progress: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def enhanced_scan_with_pot_generation(apps=None, generate_pot=True, force_regenerate=False):
    """
    Enhanced scan that optionally generates POT files before scanning PO files.
    
    Args:
        apps: List of apps to process or None for all apps
        generate_pot: Whether to generate POT files first
        force_regenerate: Whether to regenerate existing POT files
        
    Returns:
        dict: Combined result of POT generation and PO file scanning
    """
    try:
        result = {
            "success": True,
            "pot_generation": None,
            "po_scan": None
        }
        
        if generate_pot:
            # Generate POT files first
            logger.info("Starting POT generation before scanning")
            
            pot_result = generate_pot_files_batch(
                apps if apps else "all",
                force_regenerate=force_regenerate
            )
            
            result["pot_generation"] = pot_result
            
            if not pot_result["success"]:
                result["success"] = False
                result["error"] = f"POT generation failed: {pot_result.get('error', 'Unknown error')}"
                return result
        
        # Now scan for PO files
        from .po_files import scan_po_files
        logger.info("Starting PO file scan")
        
        po_result = scan_po_files()
        result["po_scan"] = po_result
        
        if not po_result.get("success", True):
            result["success"] = False
            result["error"] = f"PO scan failed: {po_result.get('error', 'Unknown error')}"
        
        return result
        
    except Exception as e:
        logger.error(f"Error in enhanced scan: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }