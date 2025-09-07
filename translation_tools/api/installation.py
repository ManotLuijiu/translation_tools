import os
import sys
import subprocess
import importlib
import frappe
from frappe import _
from frappe.utils import get_site_path
import logging
from packaging import version


def generate_po_file():
    """Smart translation file setup for multi-tenant environment"""
    import os
    import subprocess
    from frappe.utils import get_bench_path
    
    try:
        # Get current site name and bench path
        site_name = frappe.local.site
        bench_path = get_bench_path()
        installed_apps = frappe.get_installed_apps()
        
        print(f"✅ Translation Tools installed successfully on {site_name}")
        print("🔍 Checking translation files for multi-tenant optimization...")
        
        apps_needing_setup = []
        apps_already_setup = []
        
        # Step 1: Check each app for existing translation files
        for current_app in installed_apps:
            app_locale_path = os.path.join(bench_path, "apps", current_app, current_app, "locale")
            main_pot_path = os.path.join(app_locale_path, "main.pot")
            th_po_path = os.path.join(app_locale_path, "th.po")
            
            # Check if both main.pot and th.po exist
            if os.path.exists(main_pot_path) and os.path.exists(th_po_path):
                apps_already_setup.append(current_app)
                print(f"✅ {current_app}: Translation files already exist, skipping bench commands")
            else:
                apps_needing_setup.append(current_app)
                print(f"🔄 {current_app}: Translation files missing, will run bench commands")
        
        print(f"\n📊 Summary: {len(apps_already_setup)} apps already setup, {len(apps_needing_setup)} apps need setup")
        
        # Step 2: Run bench commands only for apps that need them
        if apps_needing_setup:
            print(f"\n🚀 Running bench commands for {len(apps_needing_setup)} apps...")
            
            for current_app in apps_needing_setup:
                print(f"\n📦 Setting up {current_app}...")
                
                try:
                    print(f"  1/4 Generating POT file for {current_app}...")
                    subprocess.run(
                        f"bench generate-pot-file --app {current_app}",
                        shell=True,
                        check=True,
                    )
                    print(f"  ✅ Generated POT file for {current_app}")
                except Exception as e:
                    print(f"  ⚠️ Could not generate POT file for {current_app}: {str(e)}")
                
                try:
                    print(f"  2/4 Migrating CSV to PO for {current_app}...")
                    subprocess.run(
                        f"bench migrate-csv-to-po --app {current_app} --locale th",
                        shell=True,
                        check=True,
                    )
                    print(f"  ✅ Migrated CSV to PO for {current_app}")
                except Exception as e:
                    print(f"  ⚠️ Could not migrate CSV to PO for {current_app}: {str(e)}")
                
                try:
                    print(f"  3/4 Updating PO files for {current_app}...")
                    subprocess.run(
                        f"bench update-po-files --app {current_app} --locale th",
                        shell=True,
                        check=True,
                    )
                    print(f"  ✅ Updated PO files for {current_app}")
                except Exception as e:
                    print(f"  ⚠️ Could not update PO files for {current_app}: {str(e)}")
                
                try:
                    print(f"  4/4 Compiling PO to MO for {current_app}...")
                    subprocess.run(
                        f"bench compile-po-to-mo --app {current_app} --locale th",
                        shell=True,
                        check=True,
                    )
                    print(f"  ✅ Compiled PO to MO for {current_app}")
                except Exception as e:
                    print(f"  ⚠️ Could not compile PO to MO for {current_app}: {str(e)}")
        else:
            print("\n🎉 All apps already have translation files - skipping bench commands!")
        
        # Step 3: GitHub Sync to get latest translated files
        print(f"\n🔄 Syncing th.po files from GitHub repository...")
        try:
            sync_result = sync_translation_files_from_github(installed_apps)
            if sync_result.get("success"):
                stats = sync_result.get("stats", {})
                synced_count = stats.get('synced_files', 0)
                failed_count = len(stats.get('failed_apps', []))
                total_apps = len(installed_apps)
                
                if synced_count > 0:
                    print(f"✅ GitHub sync completed: {synced_count}/{total_apps} apps updated with GitHub versions")
                    if failed_count > 0:
                        print(f"   📝 Note: {failed_count} apps using local versions (not available on GitHub)")
                else:
                    print(f"ℹ️ GitHub sync completed: 0/{total_apps} apps updated")
                    print(f"   📝 All apps using local versions (none available on GitHub)")
            else:
                print(f"⚠️ GitHub sync failed: {sync_result.get('message', 'Unknown error')}")
                print("   All apps will use local translation files")
        except Exception as e:
            print(f"⚠️ GitHub sync failed: {str(e)}")
            print("   All apps will use local translation files")
        
        print("\n🎉 Translation setup completed!")
        
    except Exception as e:
        print(f"❌ Error during Translation Tools setup: {str(e)}")


def sync_translation_files_from_github(installed_apps):
    """
    Sync th.po files from GitHub repository for better translations
    GitHub repo: https://github.com/ManotLuijiu/erpnext-thai-translation.git
    """
    import requests
    import os
    from frappe.utils import get_bench_path
    
    try:
        bench_path = get_bench_path()
        github_base_url = "https://raw.githubusercontent.com/ManotLuijiu/erpnext-thai-translation/main"
        
        stats = {
            "synced_files": 0,
            "updated_apps": 0,
            "failed_apps": []
        }
        
        for app_name in installed_apps:
            try:
                # Try to download th.po file from GitHub for this app
                github_file_url = f"{github_base_url}/{app_name}/locale/th.po"
                
                print(f"  📥 Checking GitHub for {app_name}/locale/th.po...")
                
                try:
                    response = requests.get(github_file_url, timeout=30)
                    
                    if response.status_code == 200:
                        # Validate that we got actual PO file content, not HTML error page
                        content = response.text.strip()
                        if content and ('msgid' in content or 'msgstr' in content or content.startswith('#')):
                            # File exists on GitHub and contains valid PO content
                            local_locale_dir = os.path.join(bench_path, "apps", app_name, app_name, "locale")
                            local_th_po_path = os.path.join(local_locale_dir, "th.po")
                            
                            # Create locale directory if it doesn't exist
                            os.makedirs(local_locale_dir, exist_ok=True)
                            
                            # Write the GitHub content to local file
                            with open(local_th_po_path, 'w', encoding='utf-8') as f:
                                f.write(content)
                            
                            stats["synced_files"] += 1
                            stats["updated_apps"] += 1
                            print(f"  ✅ Synced {app_name}/locale/th.po from GitHub ({len(content)} chars)")
                        else:
                            print(f"  ⚠️ GitHub returned invalid PO content for {app_name} - keeping local version")
                    
                    elif response.status_code == 404:
                        print(f"  ℹ️ No th.po file available on GitHub for {app_name} - using local version")
                    
                    elif response.status_code == 403:
                        print(f"  ⚠️ GitHub API rate limit or access denied for {app_name} - using local version")
                    
                    else:
                        print(f"  ⚠️ GitHub error {response.status_code} for {app_name} - using local version")
                        
                except requests.exceptions.Timeout:
                    print(f"  ⚠️ GitHub request timeout for {app_name} - using local version")
                    
                except requests.exceptions.ConnectionError:
                    print(f"  ⚠️ GitHub connection error for {app_name} - using local version")
                    
                except requests.exceptions.RequestException as req_err:
                    print(f"  ⚠️ GitHub request failed for {app_name}: {str(req_err)} - using local version")
                    
            except Exception as e:
                stats["failed_apps"].append(app_name)
                print(f"  ❌ Unexpected error syncing {app_name}: {str(e)} - using local version")
        
        # Determine appropriate success message
        if stats["synced_files"] > 0:
            message = f"Synced {stats['synced_files']} files for {stats['updated_apps']} apps from GitHub"
        else:
            message = f"No files synced from GitHub - using local versions for {len(installed_apps)} apps"
        
        return {
            "success": True,
            "message": message,
            "stats": stats
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"GitHub sync failed: {str(e)}",
            "stats": {"synced_files": 0, "updated_apps": 0, "failed_apps": []}
        }


def get_bench_dir():
    """Find the bench directory regardless of which module calls this function"""
    from frappe.utils import get_bench_path

    return get_bench_path()


def setup_logging():
    """Set up detailed logging for the installation process"""
    log_dir = os.path.join(get_site_path(), "logs")
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    log_file = os.path.join(log_dir, "translation_tools_install.log")

    # Configure logger
    logger = logging.getLogger("translation_tools_install")
    logger.setLevel(logging.DEBUG)

    # File handler
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)

    # Format
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    file_handler.setFormatter(formatter)

    # Add handler
    logger.addHandler(file_handler)

    logger.info("Starting Translation Tools installation")
    return logger


def handle_version_upgrade():
    """Handle app version upgrades"""
    logger = logging.getLogger("translation_tools_install")

    # Get current installed version (if any)
    current_version = None
    try:
        # Check if we have a version record
        if frappe.db.exists("DocType", "Translation Tools Settings"):
            settings = frappe.get_doc("Translation Tools Settings")
            current_version = getattr(settings, "version", None)
    except Exception as e:
        logger.warning(f"Could not get current version: {e}")

    # Get new version from app
    try:
        from translation_tools import __version__ as new_version

        logger.info(f"Current version: {current_version}, New version: {new_version}")

        if current_version and current_version != new_version:
            logger.info(f"Upgrading from {current_version} to {new_version}")

            # Call version-specific upgrade functions
            if version.parse(current_version) < version.parse(
                "0.0.5"
            ) and version.parse(new_version) >= version.parse("0.0.5"):
                logger.info("Running upgrade tasks for v0.0.5")
                # Example: run_upgrade_tasks_0_0_5()

            # Update version in settings
            if frappe.db.exists("DocType", "Translation Tools Settings"):
                settings = frappe.get_doc("Translation Tools Settings")
                settings.db_set("version", new_version)
                settings.save()
                logger.info(f"Updated version in settings to {new_version}")

    except ImportError:
        logger.warning("Could not determine app version")


def setup_environment():
    """Set up the environment and return the bench directory path"""
    logger = logging.getLogger("translation_tools_install")
    logger.info("Setting up environment for Translation Tools")

    # Get the bench directory (parent of the sites directory)
    bench_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..")
    )

    logger.info(f"Bench directory: {bench_dir}")
    return bench_dir


def check_dependencies():
    """Check for required Python packages"""
    logger = logging.getLogger("translation_tools_install")
    logger.info("Checking dependencies for Translation Tools")

    required_packages = [
        ("openai", "1.3.0"),
        ("polib", "1.2.0"),
        ("tqdm", "4.64.0"),
        ("anthropic", "0.5.0"),
    ]

    missing_packages = []

    for package, min_version in required_packages:
        try:
            module = importlib.import_module(package)
            if hasattr(module, "__version__"):
                version = module.__version__
                if version < min_version:
                    missing_packages.append(
                        f"{package}>={min_version} (found {version})"
                    )
            else:
                # If we can't determine version, assume it's OK
                pass
        except ImportError:
            missing_packages.append(f"{package}>={min_version} (not installed)")
            subprocess.check_call(
                [sys.executable, "-m", "pip", "install", f"{package}>={min_version}"]
            )

    if missing_packages:
        logger.warning(f"Missing dependencies: {', '.join(missing_packages)}")
        frappe.msgprint(
            _(
                "Some dependencies are missing. The setup script will attempt to install them."
            ),
            indicator="yellow",
        )
    else:
        logger.info("All dependencies are satisfied")


def run_setup_script(bench_dir):
    """Run the setup.sh script"""
    logger = logging.getLogger("translation_tools_install")
    logger.info("Running setup script")

    # Path to the setup script
    setup_script = os.path.join(
        bench_dir, "apps", "translation_tools", "translation_tools", "setup.sh"
    )

    # Make the script executable
    subprocess.check_call(["chmod", "+x", setup_script])

    # Execute the setup script
    try:
        frappe.publish_progress(
            percent=10,
            title=_("Installing Translation Tools"),
            description=_("Running setup script..."),
        )
    except Exception:
        pass

    # Capture the output of the setup script for logging
    process = subprocess.Popen(
        [setup_script],
        cwd=bench_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True,
    )

    stdout, stderr = process.communicate()

    if process.returncode != 0:
        logger.error(f"Setup script failed with return code {process.returncode}")
        raise Exception(f"Setup script failed with {process.returncode}")
    else:
        logger.info("Setup script executed successfully")
        logger.debug(f"Setup script output: {stdout}")


def check_module_exists(module_path, function_name):
    """Check if a module and function exist"""
    logger = logging.getLogger("translation_tools_install")

    try:
        module = importlib.import_module(module_path)
        if hasattr(module, function_name):
            return True
        logger.error(f"Function {function_name} not found in module {module_path}")
        return False
    except ImportError as e:
        logger.error(f"Module {module_path} not found: {e}")
        return False


def handle_installation_error(error):
    """Handle installation errors gracefully"""
    logger = logging.getLogger("translation_tools_install")
    logger.error(f"Error during Translation Tools setup: {error}")

    # Get the bench directory
    bench_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..")
    )

    # Log detailed error information
    import traceback

    stack_trace = traceback.format_exc()
    logger.error(f"Stack trace: {stack_trace}")

    # Show error message to user
    error_msg = f"""
    <div style="color: red; font-weight: bold;">Error during Translation Tools setup</div>
    <p>{str(error)}</p>
    <p>Please run the setup script manually:</p>
    <pre>cd {bench_dir}
    ./apps/translation_tools/translation_tools/setup.sh</pre>
    <p>This will install required dependencies and configure your API keys.</p>
    <p>Check the log file at ./logs/translation_tools_install.log for more details.</p>
    """

    frappe.msgprint(error_msg, title=_("Setup Error"), indicator="red")
