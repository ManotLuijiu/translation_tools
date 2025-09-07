# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
MO Files API
Provides API endpoints for managing MO (Machine Object) translation files
"""

import frappe
from translation_tools.tasks.mo_compiler import compile_mo_files_for_all_apps_force, compile_mo_files_for_app


@frappe.whitelist()
def compile_all_mo_files():
    """
    API endpoint to manually compile MO files for all installed apps
    Can be called from the translation dashboard
    """
    try:
        result = compile_mo_files_for_all_apps_force()
        
        if result["success"]:
            return {
                "success": True,
                "message": f"Successfully compiled MO files for {result['compiled_count']} apps",
                "stats": {
                    "compiled_count": result["compiled_count"],
                    "failed_count": result["failed_count"],
                    "total_apps": result["total_apps"]
                }
            }
        else:
            return {
                "success": False,
                "error": "Failed to compile MO files",
                "stats": result
            }
            
    except Exception as e:
        frappe.log_error(f"MO compilation API failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def compile_mo_files_for_specific_app(app_name, force=True):
    """
    API endpoint to compile MO files for a specific app
    
    Args:
        app_name (str): Name of the app to compile
        force (bool): Force compilation even if up to date
    """
    try:
        if not app_name:
            return {
                "success": False,
                "error": "App name is required"
            }
        
        # Validate that the app is installed
        installed_apps = frappe.get_installed_apps()
        if app_name not in installed_apps:
            return {
                "success": False,
                "error": f"App '{app_name}' is not installed on this site"
            }
        
        result = compile_mo_files_for_app(app_name, force=force)
        
        if result["success"]:
            if result["compiled"]:
                return {
                    "success": True,
                    "message": f"Successfully compiled MO files for {app_name}",
                    "reason": result.get("reason", "")
                }
            elif result["skipped"]:
                return {
                    "success": True,
                    "message": f"MO files for {app_name} are already up to date",
                    "reason": result.get("reason", "")
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", f"Failed to compile MO files for {app_name}")
                }
        else:
            return {
                "success": False,
                "error": result.get("error", f"Failed to compile MO files for {app_name}")
            }
            
    except Exception as e:
        frappe.log_error(f"MO compilation API failed for {app_name}: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_mo_compilation_status():
    """
    Get the status of MO files for all installed apps
    Shows which apps need MO compilation
    """
    try:
        from translation_tools.tasks.mo_compiler import needs_mo_compilation
        import os
        from frappe.utils import get_bench_path
        
        installed_apps = frappe.get_installed_apps()
        bench_path = get_bench_path()
        
        apps_status = []
        needs_compilation = 0
        up_to_date = 0
        
        for app_name in installed_apps:
            try:
                app_locale_path = os.path.join(bench_path, "apps", app_name, app_name, "locale")
                
                # Check if locale directory exists
                if not os.path.exists(app_locale_path):
                    apps_status.append({
                        "app": app_name,
                        "status": "no_locale",
                        "message": "No locale directory"
                    })
                    continue
                
                # Look for PO files
                po_files = []
                for filename in os.listdir(app_locale_path):
                    if filename.endswith('.po'):
                        po_files.append(os.path.join(app_locale_path, filename))
                
                if not po_files:
                    apps_status.append({
                        "app": app_name,
                        "status": "no_po_files",
                        "message": "No PO files found"
                    })
                    continue
                
                # Check if MO compilation is needed
                if needs_mo_compilation(app_name, po_files):
                    needs_compilation += 1
                    apps_status.append({
                        "app": app_name,
                        "status": "needs_compilation",
                        "message": f"Needs compilation ({len(po_files)} PO files)"
                    })
                else:
                    up_to_date += 1
                    apps_status.append({
                        "app": app_name,
                        "status": "up_to_date",
                        "message": f"Up to date ({len(po_files)} PO files)"
                    })
                    
            except Exception as e:
                apps_status.append({
                    "app": app_name,
                    "status": "error",
                    "message": f"Error checking status: {str(e)}"
                })
        
        return {
            "success": True,
            "apps_status": apps_status,
            "summary": {
                "total_apps": len(installed_apps),
                "needs_compilation": needs_compilation,
                "up_to_date": up_to_date
            }
        }
        
    except Exception as e:
        frappe.log_error(f"MO status check failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }