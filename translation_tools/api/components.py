import frappe
import os
import logging
from frappe import _

def setup_frappe_components():
    """Set up Frappe components like pages, doctypes, and workspaces"""
    logger = logging.getLogger('translation_tools_install')
    logger.info("Setting up Frappe components")
    
    from translation_tools.api.installation import check_module_exists
    
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
        }
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
    
    from translation_tools.api.installation import check_module_exists
    
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
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..")
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