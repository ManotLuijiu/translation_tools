import os
import sys
import subprocess
import importlib
import json
import frappe
from frappe import _
from frappe.utils import get_site_path
import logging
from packaging import version


def after_install():
    """Run setup operations after app installation"""
    setup_logging()

    try:
        # Check version for upgrades
        handle_version_upgrade()
        
        # Structure the installation process
        bench_dir = setup_environment()
        check_dependencies()
        run_setup_script(bench_dir)
        setup_frappe_components()

        # Attempt to add to integrations workspace
        try:
            add_to_integrations_workspace()
        
        except Exception as e:
            logger.error(f"Error adding to Integrations workspace: {e}")
            frappe.db.rollback()
            raise

        # Import initial data
        try:    
            import_initial_data()

        except Exception as e:
            logger.error(f"Error Import initial data: {e}")
            raise

        validate_configuration()
        
        # Final notification to users
        show_success_notification()
        
    except Exception as e:
        logger.error(f"Installation failed: {str(e)}")
        handle_installation_error(e)

def setup_logging():
    """Set up detailed logging for the installation process"""
    log_dir = os.path.join(get_site_path(), 'logs')
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    log_file = os.path.join(log_dir, 'translation_tools_install.log')
    
    # Configure logger
    logger = logging.getLogger('translation_tools_install')
    logger.setLevel(logging.DEBUG)
    
    # File handler
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)
    
    # Format
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    
    # Add handler
    logger.addHandler(file_handler)
    
    logger.info("Starting Translation Tools installation")
    return logger

def handle_version_upgrade():
    """Handle app version upgrades"""
    logger = logging.getLogger('translation_tools_install')
    
    # Get current installed version (if any)
    current_version = None
    try:
        # Check if we have a version record
        if frappe.db.exists("DocType", "Translation Tools Settings"):
            settings = frappe.get_doc("Translation Tools Settings")
            current_version = settings.version
    except Exception as e:
        logger.warning(f"Could not get current version: {e}")
    
    # Get new version from app
    try:
        from translation_tools import __version__ as new_version
        logger.info(f"Current version: {current_version}, New version: {new_version}")
        
        if current_version and current_version != new_version:
            logger.info(f"Upgrading from {current_version} to {new_version}")
            
            # Call version-specific upgrade functions
            if version.parse(current_version) < version.parse("0.0.5") and new_version >= version.parse("0.0.5"):
                logger.info("Running upgrade tasks for v0.0.5")
                # Example: run_upgrade_tasks_0_0_5()
            
            # Update version in settings
            if frappe.db.exists("DocType", "Translation Tools Settings"):
                settings = frappe.get_doc("Translation Tools Settings")
                settings.version = new_version
                settings.save()
                logger.info(f"Updated version in settings to {new_version}")
    
    except ImportError:
        logger.warning("Could not determine app version")

def setup_environment():
    """Set up the environment and return the bench directory path"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Setting up environment for Translation Tools")
    
    # Get the bench directory (parent of the sites directory)
    bench_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
    )
    
    logger.info(f"Bench directory: {bench_dir}")
    return bench_dir


def check_dependencies():
    """Check for required Python packages"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Checking dependencies for Translation Tools")
    
    required_packages = [
        ("openai", "1.3.0"),
        ("polib", "1.2.0"),
        ("tqdm", "4.64.0"),
        ("anthropic", "0.5.0")
    ]
    
    missing_packages = []
    
    for package, min_version in required_packages:
        try:
            module = importlib.import_module(package)
            if hasattr(module, "__version__"):
                version = module.__version__
                if version < min_version:
                    missing_packages.append(f"{package}>={min_version} (found {version})")
            else:
                # If we can't determine version, assume it's OK
                pass
        except ImportError:
            missing_packages.append(f"{package}>={min_version} (not installed)")
            subprocess.check_call([sys.executable, "-m", "pip", "install", f"{package}>={min_version}"])
    
    if missing_packages:
        logger.warning(f"Missing dependencies: {', '.join(missing_packages)}")
        frappe.msgprint(
            _("Some dependencies are missing. The setup script will attempt to install them."),
            indicator="yellow"
        )
    else:
        logger.info("All dependencies are satisfied")


def run_setup_script(bench_dir):
    """Run the setup.sh script"""
    logger = logging.getLogger('translation_tools_install')
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
            description=_("Running setup script...")
        )

    except Exception:
        pass
    
    # Capture the output of the setup script for logging
    process = subprocess.Popen(
        [setup_script],
        cwd=bench_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True
    )
    
    stdout, stderr = process.communicate()

    if process.returncode != 0:
        logger.error(f"Setup script failed with return code {process.returncode}")
        raise Exception(f"Setup script failed with {process.returncode}")
    else:
        logger.info("Setup script executed successfully")
        logger.debug(f"Setup script output: {stdout}")


    
    # if process.returncode == 0:
    #     logger.info("Setup script executed successfully")
    #     logger.debug(f"Setup script output: {stdout}")
    # else:
    #     logger.error(f"Setup script failed with return code {process.returncode}")
    #     logger.error(f"Setup script error output: {stderr}")
    #     raise Exception(f"Setup script failed: {stderr}")


def check_module_exists(module_path, function_name):
    """Check if a module and function exist"""
    logger = logging.getLogger('translation_tools_install')
    
    try:
        module = importlib.import_module(module_path)
        if hasattr(module, function_name):
            return True
        logger.error(f"Function {function_name} not found in module {module_path}")
        return False
    except ImportError as e:
        logger.error(f"Module {module_path} not found: {e}")
        return False

def add_to_integrations_workspace():
    """Add a shortcut/link to the Integrations workspace"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Adding shortcut to Integrations workspace")

    try:
        # Ensure the workspace exists
        if not frappe.db.exists("Workspace", "Integrations"):
            logger.warning("Integrations workspace not found")
            return

        # Create the link (shortcut) as a child of the workspace
        integrations_ws = frappe.get_doc("Workspace", "Integrations")

        # Avoid adding it multiple times
        existing_links = [l.link_to for l in integrations_ws.links or []]
        if "Translation Tools Settings" in existing_links:
            logger.info("Link to Translation Tools Settings already exists in Integrations workspace")
            return

        integrations_ws.append("links", {
            "type": "DocType",
            "link_to": "Translation Tools Settings",
            "label": "Translation Tools Settings",
            "icon": "octicon octicon-globe",  # customize as needed
            "dependencies": "",
        })

        integrations_ws.save(ignore_permissions=True)
        frappe.db.commit()
        logger.info("Successfully added Translation Tools link to Integrations workspace")

    except Exception as e:
        logger.error(f"Failed to add link to Integrations workspace: {e}")

def setup_frappe_components():
    """Set up Frappe components like pages, doctypes, and workspaces"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Setting up Frappe components")
    
    components = [
        {
            "module_path": "translation_tools.translation_tools.setup.create_page",
            "function_name": "create_translation_page",
            "description": "Creating translation page"
        },
        {
            "module_path": "translation_tools.translation_tools.setup.create_doctypes",
            "function_name": "create_glossary_doctypes",
            "description": "Creating glossary doctypes"
        },
        {
            "module_path": "translation_tools.translation_tools.setup.create_doctypes",
            "function_name": "create_po_file_doctypes",
            "description": "Creating PO file doctypes"
        },
        # {
        #     "module_path": "translation_tools.translation_tools.setup.create_workspace",
        #     "function_name": "create_translation_workspace",
        #     "description": "Creating translation workspace"
        # }
    ]
    
    # Total number of components for progress tracking
    total_components = len(components)
    
    for i, component in enumerate(components):
        try:
            # Check if module exists
            if not check_module_exists(component["module_path"], component["function_name"]):
                logger.error(f"Skipping {component['description']} due to missing module")
                continue
            
            # Show progress
            try:
                frappe.publish_progress(
                    percent=20 + (i * 60 // total_components),
                    title=_("Installing Translation Tools"),
                    description=_(component["description"])
                )
            except Exception:
                pass
            
            # Import and execute the function
            module = importlib.import_module(component["module_path"])
            function = getattr(module, component["function_name"])
            function()
            
            logger.info(f"Completed: {component['description']}")
            
        except Exception as e:
            logger.error(f"Error in {component['description']}: {e}")
            frappe.db.rollback()
            raise


def import_initial_data():
    """Import initial data like glossary terms and scan PO files"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Importing initial data")
    
    try:
        # Import default glossary
        try:
            frappe.publish_progress(
                percent=80,
                title=_("Installing Translation Tools"),
                description=_("Importing default Thai glossary...")
            )
        except Exception:
            pass
        
        if check_module_exists("translation_tools.translation_tools.setup.import_default_glossary", "import_default_glossary_terms"):
            from translation_tools.translation_tools.setup.import_default_glossary import import_default_glossary_terms
            glossary_result = import_default_glossary_terms()
            logger.info(f"Imported {glossary_result} default glossary terms")
        
        # Initial scan of PO files
        try:
            frappe.publish_progress(
                percent=90,
                title=_("Installing Translation Tools"),
                description=_("Scanning PO files...")
            )
        except Exception:
            pass
        
        if check_module_exists("translation_tools.translation_tools.api", "scan_po_files"):
            from translation_tools.translation_tools.api.po_files import scan_po_files

            try:
                scan_result = scan_po_files()
            except Exception as e:
                logger.error(f"Error scanning PO files: {e}")
                scan_result = {"success": False, "error": str(e)}

            if scan_result.get("success"):
                logger.info(f"Found {scan_result['total_files']} PO files")
            else:
                logger.error(f"Error scanning PO files: {scan_result.get('error')}")
    
    except Exception as e:
        logger.error(f"Error importing initial data: {e}")
        # Don't rollback here - we want to keep any successful imports
        # Just log the error and continue


def validate_configuration():
    """Validate that the app is properly configured"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Validating Translation Tools configuration")
    
    config_issues = []
    
    # Check for API key configuration
    bench_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
    )
    config_file = os.path.join(bench_dir, ".erpnext_translate_config")
    
    if not os.path.exists(config_file):
        config_issues.append(_("API key configuration file not found. Translation features may not work."))
        logger.warning("API key configuration file not found")
    else:
        # Check if config file contains API key
        with open(config_file, 'r') as f:
            config_content = f.read()
            if "OPENAI_API_KEY" not in config_content and "ANTHROPIC_API_KEY" not in config_content:
                config_issues.append(_("No API keys found in configuration file."))
                logger.warning("No API keys found in configuration file")
    
    # Check if DocTypes were created
    required_doctypes = ["PO File", "Translation Glossary Term", "ERPNext Module"]
    missing_doctypes = []
    
    for doctype in required_doctypes:
        if not frappe.db.exists("DocType", doctype):
            missing_doctypes.append(doctype)
    
    if missing_doctypes:
        config_issues.append(_("Missing required DocTypes: {0}").format(", ".join(missing_doctypes)))
        logger.warning(f"Missing required DocTypes: {', '.join(missing_doctypes)}")
    
    # Check if Workspace was created
    # if not frappe.db.exists("Workspace", "Thai Translation"):
    #     config_issues.append(_("Thai Translation workspace not found."))
    #     logger.warning("Thai Translation workspace not found")
    
    # Write validation results to log
    if config_issues:
        logger.warning(f"Configuration validation issues: {len(config_issues)}")
        for issue in config_issues:
            logger.warning(f"- {issue}")
        
        # Show warning to user
        issues_html = "<ul>" + "".join([f"<li>{issue}</li>" for issue in config_issues]) + "</ul>"
        frappe.msgprint(
            _("Translation Tools was installed, but with some configuration issues:") + issues_html,
            title=_("Configuration Warning"),
            indicator="yellow"
        )
    else:
        logger.info("Configuration validation passed")


def show_success_notification():
    """Show a success notification to administrators"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Installation completed successfully")
    
    # Complete progress bar
    try:
        frappe.publish_progress(
            percent=100,
            title=_("Installing Translation Tools"),
            description=_("Installation complete!")
        )
    except Exception:
        pass
    
    # Create a notification for all admins
    try:
        admin_role = frappe.db.get_value("Role", {"name": "Administrator"})
        if admin_role:
            notification = frappe.new_doc("Notification Log")
            notification.subject = _("Translation Tools Installed")
            notification.for_role = "Administrator"
            notification.type = "Alert"
            notification.email_content = _("""
            <p>Translation Tools has been successfully installed!</p>
            <p>You can access it from the workspace sidebar under <strong>Thai Translation</strong>.</p>
            <p>For help and documentation, please refer to the README.md file in the app directory.</p>
            """)
            notification.insert(ignore_permissions=True)
            logger.info("Created success notification for administrators")
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
    
    # Show success message in the UI
    frappe.msgprint(
        _("""
        <div style="text-align: center;">
            <h4 style="color: #38A169;">Translation Tools Installed Successfully!</h4>
            <p>You can access the Thai Translation Dashboard from the sidebar under <strong>Thai Translation</strong>.</p>
            <p>For help, please refer to the README.md file in the app directory.</p>
        </div>
        """),
        title=_("Installation Complete"),
        indicator="green"
    )


def handle_installation_error(error):
    """Handle installation errors gracefully"""
    logger = logging.getLogger('translation_tools_install')
    logger.error(f"Error during Translation Tools setup: {error}")
    
    # Get the bench directory
    bench_dir = os.path.abspath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
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


logger.info("Installation process completed successfully.")

    # try:
    #     # Get the bench directory (parent of the sites directory)
    #     bench_dir = os.path.abspath(
    #         os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
    #     )

    #     print(f"bench_dir: {bench_dir}")

    #     # Path to the setup script
    #     setup_script = os.path.join(
    #         bench_dir, "apps", "translation_tools", "translation_tools", "setup.sh"
    #     )

    #     print(f"setup_script_dir: {setup_script}")

    #     # Make the script executable
    #     subprocess.check_call(["chmod", "+x", setup_script])

    #     # Execute the setup script
    #     subprocess.check_call([setup_script], cwd=bench_dir)

    #     print("✅ Translation Tools setup completed successfully")

    #     # In your after_install function:
    #     from translation_tools.translation_tools.setup.create_page import create_translation_page
    #     create_translation_page()

    #     # Create necessary doctypes
    #     from translation_tools.translation_tools.setup.create_doctypes import create_glossary_doctypes, create_po_file_doctypes
    #     create_glossary_doctypes()
    #     create_po_file_doctypes()

    #     # Create workspace
    #     from translation_tools.translation_tools.setup.create_workspace import create_translation_workspace
    #     create_translation_workspace()

    #     # Import default glossary
    #     print("Importing default Thai glossary...")
    #     from translation_tools.translation_tools.setup.import_default_glossary import import_default_glossary_terms
    #     glossary_result = import_default_glossary_terms()
    #     print(f"Imported {glossary_result} default glossary terms")

    #     # Initial scan of PO files
    #     print("Starting initial scan of PO files...")
    #     from translation_tools.translation_tools.api import scan_po_files
    #     scan_result = scan_po_files()
    #     if scan_result.get("success"):
    #         print(f"Found {scan_result['total_files']} PO files")
    #     else:
    #         print(f"Error scanning PO files: {scan_result.get('error')}")

    # except Exception as e:
    #     print(f"❌ Error during Translation Tools setup: {str(e)}")
    #     print(
    #         "Please run the setup script manually: ./apps/translation_tools/translation_tools/setup.sh"
    #     )

    #     # Print instruction for manual setup
    #     print("\n")
    #     print("=" * 80)
    #     print("Translation Tools has been installed successfully!")
    #     print("=" * 80)
    #     print("\nTo complete setup, please run:")
    #     print(f"\n    cd {bench_dir}")
    #     print("    ./apps/translation_tools/translation_tools/setup.sh")
    #     print("\nThis will install required dependencies and configure your API keys.")
    #     print("=" * 80)
