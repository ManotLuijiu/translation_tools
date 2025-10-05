import frappe
import subprocess
import os
from frappe import _


def run_translation_commands_after_migrate():
    """
    Automatically run translation commands for specified apps after site migration.
    
    This function runs:
    1. Generate POT files
    2. Migrate CSV to PO 
    3. Update PO files
    4. Compile PO to MO files
    
    For apps: m_capital, lending, thai_business_suite
    For locale: th (Thai)
    """
    
    # List of apps that need translation processing
    apps_to_translate = ["m_capital", "lending", "thai_business_suite"]
    locale = "th"  # Thai locale
    
    # Get the bench directory (should be the parent directory of the sites folder)
    bench_path = frappe.utils.get_bench_path()
    
    frappe.logger().info("Starting automatic translation processing after migration...")
    
    try:
        for app in apps_to_translate:
            frappe.logger().info(f"Processing translations for app: {app}")
            
            # Check if app exists in the current bench
            if not _app_exists(app):
                frappe.logger().warning(f"App '{app}' not found in this bench, skipping...")
                continue
            
            # Run translation commands for each app
            commands = [
                f"bench generate-pot-file --app {app}",
                f"bench migrate-csv-to-po --app {app} --locale {locale}",
                f"bench update-po-files --app {app} --locale {locale}",
                f"bench compile-po-to-mo --app {app} --locale {locale}"
            ]
            
            for cmd in commands:
                try:
                    frappe.logger().info(f"Running: {cmd}")
                    result = _run_bench_command(cmd, bench_path)
                    if result["success"]:
                        frappe.logger().info(f"✓ Successfully executed: {cmd}")
                    else:
                        frappe.logger().error(f"✗ Failed to execute: {cmd}")
                        frappe.logger().error(f"Error: {result['error']}")
                        
                except Exception as e:
                    frappe.logger().error(f"Exception while running {cmd}: {str(e)}")
                    continue
        
        frappe.logger().info("Completed automatic translation processing after migration")
        
    except Exception as e:
        frappe.logger().error(f"Error in translation automation: {str(e)}")


def _app_exists(app_name):
    """Check if an app exists in the current bench."""
    try:
        bench_path = frappe.utils.get_bench_path()
        apps_path = os.path.join(bench_path, "apps", app_name)
        return os.path.exists(apps_path)
    except Exception:
        return False


def _run_bench_command(command, bench_path):
    """
    Execute a bench command in the bench directory.
    
    Args:
        command (str): The bench command to execute
        bench_path (str): Path to the bench directory
        
    Returns:
        dict: Result dictionary with success status and output/error
    """
    try:
        # Change to bench directory and run the command
        result = subprocess.run(
            command,
            shell=True,
            cwd=bench_path,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout for each command
        )
        
        if result.returncode == 0:
            return {
                "success": True,
                "output": result.stdout,
                "error": None
            }
        else:
            return {
                "success": False,
                "output": result.stdout,
                "error": result.stderr
            }
            
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": "Command timed out after 5 minutes"
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": str(e)
        }


def run_translation_commands_for_single_app(app_name, locale="th"):
    """
    Run translation commands for a single app.
    
    Args:
        app_name (str): Name of the app to process
        locale (str): Locale code (default: 'th')
    """
    
    if not _app_exists(app_name):
        frappe.throw(_("App '{}' not found in this bench").format(app_name))
    
    bench_path = frappe.utils.get_bench_path()
    
    commands = [
        f"bench generate-pot-file --app {app_name}",
        f"bench migrate-csv-to-po --app {app_name} --locale {locale}",
        f"bench update-po-files --app {app_name} --locale {locale}",
        f"bench compile-po-to-mo --app {app_name} --locale {locale}"
    ]
    
    results = []
    
    for cmd in commands:
        result = _run_bench_command(cmd, bench_path)
        results.append({
            "command": cmd,
            "success": result["success"],
            "output": result["output"],
            "error": result["error"]
        })
    
    return results


def get_apps_needing_translation():
    """
    Get list of apps that have translation files and need processing.
    
    Returns:
        list: List of app names that have translation capabilities
    """
    apps_to_check = ["m_capital", "lending", "thai_business_suite"]
    available_apps = []
    
    for app in apps_to_check:
        if _app_exists(app):
            # Check if app has a locale directory
            bench_path = frappe.utils.get_bench_path()
            locale_path = os.path.join(bench_path, "apps", app, app, "locale")
            if os.path.exists(locale_path):
                available_apps.append(app)
    
    return available_apps