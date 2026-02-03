import frappe
import subprocess
import os
from frappe import _


def run_translation_commands_after_migrate():
    """
    Lightweight translation update after migration.

    This function runs after EVERY migration:
    - Rebuilds CSV files for custom apps (ASEAN languages only)
    - Includes SPA support (.tsx/.jsx extraction)
    - Automatic cleanup of non-ASEAN files

    PO/MO compilation is NOT run during migrate (only during install).
    To manually update PO/MO files:
    - bench update-po-files --app <app> --locale <locale>
    - bench compile-po-to-mo --app <app> --locale <locale>
    """
    frappe.logger().info("Starting CSV translation update after migration...")

    try:
        print("\n🌍 Updating translation CSV files (ASEAN languages)...")

        # Ensure our override is installed before rebuilding
        from translation_tools.overrides import setup_translation_override
        setup_translation_override()

        # Rebuild CSV files (with SPA support and ASEAN filtering)
        from frappe.translate import rebuild_all_translation_files
        rebuild_all_translation_files()

        success_msg = "✅ Translation CSV files updated successfully"
        print(success_msg)
        frappe.logger().info(success_msg)
        print("   📁 Location: apps/*/translations/*.csv")
        print("   🌏 Languages: th, vi, lo, km, my, en, en-US, en-GB")

    except Exception as csv_error:
        error_msg = f"Translation CSV update failed during migration: {str(csv_error)}"
        frappe.logger().warning(error_msg)
        print(f"⚠️ {error_msg}")
        print("   You can manually rebuild later with: bench build-message-files")


def run_full_translation_setup():
    """
    Complete translation setup - runs ONLY during installation.

    This function performs full POT/PO/MO compilation for custom apps:
    1. Generate POT template files
    2. Migrate CSV to PO (if needed)
    3. Update PO files with new strings
    4. Compile PO to MO for runtime

    For apps: Automatically detected custom apps (ManotLuijiu GitHub)
    For locales: th, vi, lo, km, my (ASEAN languages)
    """
    # ASEAN language locales
    asean_locales = ["th", "vi", "lo", "km", "my"]

    # Automatically detect custom apps
    custom_apps_to_translate = get_custom_apps_for_translation()

    # Get the bench directory
    bench_path = frappe.utils.get_bench_path()

    frappe.logger().info("Running full translation setup for custom apps...")
    print("\n📦 Running full translation setup (POT/PO/MO compilation)...")

    try:
        for app in custom_apps_to_translate:
            # Check if app exists in the current bench
            if not _app_exists(app):
                frappe.logger().info(f"App '{app}' not found in this bench, skipping...")
                continue

            print(f"\n  Processing app: {app}")
            frappe.logger().info(f"Processing translations for app: {app}")

            # Delete existing main.pot first (Frappe doesn't update existing POT files)
            pot_path = os.path.join(bench_path, "apps", app, app, "locale", "main.pot")
            if os.path.exists(pot_path):
                os.remove(pot_path)
                print(f"    🗑️  Deleted existing POT file for fresh generation")

            # Process each ASEAN locale
            for locale in asean_locales:
                try:
                    print(f"    Language: {locale}")
                    # Run translation commands for each locale
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

                except Exception as locale_error:
                    frappe.logger().error(f"Error processing locale {locale} for app {app}: {str(locale_error)}")
                    continue

        frappe.logger().info("Completed full translation setup")
        print("✅ Full translation setup complete")

    except Exception as e:
        frappe.logger().error(f"Error in translation setup: {str(e)}")
        print(f"⚠️ Translation setup error: {str(e)}")


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


def get_custom_apps_for_translation():
    """
    Automatically detect custom apps (from ManotLuijiu GitHub) for translation processing.

    Custom apps are identified by:
    1. NOT being core apps (frappe, erpnext, hrms, payments)
    2. Having git remote from https://github.com/ManotLuijiu/* or git@github.com:ManotLuijiu/*

    Returns:
        list: List of custom app names that need translation processing
    """
    import subprocess

    custom_apps = []
    core_apps = ['frappe', 'erpnext', 'hrms', 'payments']

    try:
        # Get all installed apps
        all_apps = frappe.get_installed_apps(_ensure_on_bench=True)

        for app in all_apps:
            # Skip core apps
            if app in core_apps:
                continue

            # Check if app is custom (from ManotLuijiu GitHub)
            if _is_custom_app(app):
                custom_apps.append(app)

    except Exception as e:
        frappe.logger().error(f"Error detecting custom apps: {str(e)}")

    return custom_apps


def _is_custom_app(app):
    """
    Check if an app is a custom app from ManotLuijiu GitHub.

    Args:
        app (str): App name

    Returns:
        bool: True if custom app, False otherwise
    """
    import subprocess

    try:
        bench_path = frappe.utils.get_bench_path()
        app_path = os.path.join(bench_path, "apps", app)

        # Check if it's a git repository
        git_dir = os.path.join(app_path, '.git')
        if not os.path.exists(git_dir):
            return False

        # Get git remote URL
        result = subprocess.run(
            ['git', 'config', '--get', 'remote.origin.url'],
            cwd=app_path,
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return False

        remote_url = result.stdout.strip()

        # Check if remote URL matches ManotLuijiu patterns
        custom_patterns = [
            'https://github.com/ManotLuijiu/',
            'git@github.com:ManotLuijiu/',
        ]

        for pattern in custom_patterns:
            if pattern in remote_url:
                return True

        return False

    except Exception as e:
        frappe.logger().warning(f"Could not determine if {app} is custom app: {str(e)}")
        return False