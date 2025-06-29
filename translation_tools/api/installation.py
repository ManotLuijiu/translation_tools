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
    """Run setup operations after app installation"""
    try:
        # Get current site name
        site_name = frappe.local.site
        app_name = "translation_tools"
        installed_apps = frappe.get_installed_apps()

        print(f"✅ Translation Tools installed successfully on {site_name}")
        print("Setting up translation files...")

        # Run translation commands for all apps
        for current_app in installed_apps:
            try:
                print(f"Generating POT file for {current_app}...")
                subprocess.run(
                    f"bench --site {site_name} generate-pot-file --app {current_app}",
                    shell=True,
                    check=True,
                )
                print(f"✅ Generated POT file for {current_app}")
            except Exception as e:
                print(f"⚠️  Could not generate POT file for {current_app}: {str(e)}")

        try:
            subprocess.run(
                f"bench --site {site_name} migrate-csv-to-po --app {app_name} --locale th",
                shell=True,
                check=True,
            )
            print(f"✅ Migrated CSV to PO for {app_name}")
        except Exception as e:
            print(f"⚠️ Could not migrate CSV to PO: {str(e)}")

        try:
            subprocess.run(
                f"bench --site {site_name} update-po-files --app {app_name} --locale th",
                shell=True,
                check=True,
            )
            print(f"✅ Updated PO files for {app_name}")
        except Exception as e:
            print(f"⚠️ Could not update PO files: {str(e)}")

        try:
            subprocess.run(
                f"bench --site {site_name} compile-po-to-mo --app {app_name} --locale th",
                shell=True,
                check=True,
            )
            print(f"✅ Compiled PO to MO for {app_name}")
        except Exception as e:
            print(f"⚠️ Could not compile PO to MO: {str(e)}")

        print("\nTranslation setup completed!")

    except Exception as e:
        print(f"❌ Error during Translation Tools setup: {str(e)}")


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
