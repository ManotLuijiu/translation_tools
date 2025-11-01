import frappe
import os

# Import reorganized functions
from translation_tools.api.installation import (
    setup_logging,
    handle_version_upgrade,
    setup_environment,
    check_dependencies,
    run_setup_script,
    handle_installation_error,
    generate_po_file,
)
from translation_tools.api.components import (
    setup_frappe_components,
    import_initial_data,
    validate_configuration,
)
from translation_tools.api.notifications import show_success_notification

from translation_tools.api.resend_integration import (
    update_email_service_options,
    create_sample_email_account,
)

from translation_tools.api.token_config import setup_token_system

# from translation_tools.api.setup_workspace import (
#     setup_workspace_and_links,
#     add_to_integrations_workspace,
# )


def after_install():
    """Run setup operations after app installation"""
    logger = setup_logging()
    # arrange_workspaces()

    try:
        # create_translation_tools_workspace()

        if frappe.db.exists("Workspace", "Translation Tools"):
            doc = frappe.get_doc("Workspace", "Translation Tools")
            doc.sequence_id = 99  # type: ignore
            doc.save(ignore_permissions=True)
            frappe.db.commit()

        print("Setting up Resend Integration...")

        # Add Resend to the service options in Email Account
        update_email_service_options()

        # Create sample Email Account for Resend if not exists
        create_sample_email_account()
        
        setup_token_system()

        print("Resend Integration setup complete!")

        # Check version for upgrades
        handle_version_upgrade()

        # Add WeasyPrint
        # add_weasyprint()

        # Structure the installation process
        bench_dir = setup_environment()
        check_dependencies()
        run_setup_script(bench_dir)
        setup_frappe_components()

        # Add custom fields
        # from translation_tools.setup.install_custom_fields import install_custom_fields

        # install_custom_fields()

        # print("✅ Custom PDF generator setup completed successfully")

        # Set up custom print theme
        # from translation_tools.utils.custom_theme import (
        #     create_sarabun_theme,
        # )

        # create_sarabun_theme()

        # Override print CSS
        # from translation_tools.utils.override_print_css import override_print_css

        # override_print_css()

        # Set up custom fonts
        # from translation_tools.setup.setup_fonts import setup_sarabun_font

        # setup_sarabun_font()

        # print("✅ Sarabun font setup completed successfully")

        # Import initial data
        try:
            import_initial_data()
        except Exception as e:
            logger.error(f"Error importing initial data: {e}")
            # Continue installation

        validate_configuration()

        # Final notification to users
        show_success_notification()
        
        # Styled success message
        show_installation_success_message()

        # Generate PO file
        generate_po_file()

        # Complete translation setup (POT/PO/MO) - only runs during install
        try:
            logger.info("Setting up complete translation workflow (CSV, POT, PO, MO)...")
            print("\n🌍 Setting up complete translation workflow...")

            # Step 1: Ensure our override is installed before rebuilding
            from translation_tools.overrides import setup_translation_override
            setup_translation_override()

            # Step 2: Rebuild CSV files (with SPA support and ASEAN filtering)
            from frappe.translate import rebuild_all_translation_files
            rebuild_all_translation_files()

            print("✅ CSV files generated successfully (ASEAN languages)")

            # Step 3: Run full PO/MO compilation for custom apps
            from translation_tools.utils.migration_translations import run_full_translation_setup
            run_full_translation_setup()

            success_msg = "✅ Translation system setup complete (CSV, POT, PO, MO)"
            print(success_msg)
            logger.info(success_msg)
            print("   📁 CSV files: apps/*/translations/*.csv")
            print("   📁 PO files: apps/*/locale/*.po")
            print("   📁 MO files: sites/assets/locale/*/LC_MESSAGES/*.mo")
            print("   📝 Next: Review translation files and add translations where needed")

        except Exception as csv_error:
            error_msg = f"Translation setup failed during installation: {str(csv_error)}"
            logger.warning(error_msg)
            print(f"⚠️ {error_msg}")
            print("   You can manually rebuild later with: bench build-message-files")

        # Sync glossary terms from GitHub to populate dashboard number cards
        try:
            logger.info("Syncing glossary terms from GitHub repository...")
            print("Syncing glossary terms from GitHub repository...")
            
            from translation_tools.api.sync_public_glossary import sync_glossary_from_public_github
            
            sync_result = sync_glossary_from_public_github()
            
            if sync_result.get("success"):
                stats = sync_result.get("stats", {})
                success_msg = f"✅ Glossary sync successful: {stats.get('added', 0)} terms added, {stats.get('updated', 0)} updated"
                print(success_msg)
                logger.info(success_msg)
                
                # Get final counts for user
                total_terms = stats.get('added', 0) + stats.get('updated', 0)
                dashboard_msg = f"📊 Dashboard number cards will now display {total_terms} glossary terms"
                print(dashboard_msg)
                logger.info(dashboard_msg)
            else:
                error_msg = f"⚠️ Glossary sync failed: {sync_result.get('message', 'Unknown error')}"
                print(error_msg)
                print("   You can manually sync from GitHub using the 'Sync from GitHub' button in the dashboard")
                logger.warning(error_msg)
                
        except Exception as sync_error:
            error_msg = f"Glossary sync failed during installation: {str(sync_error)}"
            logger.warning(error_msg)
            print(f"⚠️ {error_msg}")
            print("   You can manually sync from GitHub using the 'Sync from GitHub' button in the dashboard")

    except Exception as e:
        logger.error(f"Installation failed: {str(e)}")
        handle_installation_error(e)


def create_translation_tools_workspace():
    """Delete the Translation Tools workspace so it will be recreated from JSON"""
    try:
        # Check if workspace exists
        if frappe.db.exists("Workspace", "Translation Tools"):
            # Delete existing workspace
            frappe.delete_doc(
                "Workspace", "Translation Tools", force=True, ignore_permissions=True
            )
            frappe.db.commit()
            frappe.logger().info("Deleted existing Translation Tools workspace")

    except Exception as e:
        frappe.logger().error(
            f"Error cleaning up Translation Tools workspace: {str(e)}"
        )


def show_installation_success_message():
    """Display styled success message after Translation Tools installation"""
    # Get version from __init__.py and check for update
    try:
        from translation_tools import __version__ as new_version
    except ImportError:
        new_version = "1.1.0"  # fallback version
    
    # Get current version from server (if app was already installed)
    current_version = get_current_app_version()
    
    # Box content
    border_width = 42
    title = "Translation Tools Installation Complete!"
    
    if current_version and current_version != new_version:
        version = f"Update available! {current_version} → {new_version}"
    else:
        version = f"Version {new_version}"
    
    website = "Platform: Multi-language Translation System"
    setup_text = "Setup: Complete Translation Workflow Tools"
    
    # Create box border
    top_border = "┌" + "─" * border_width + "┐"
    bottom_border = "└" + "─" * border_width + "┘"
    empty_line = "│" + " " * border_width + "│"
    
    # Center text within box
    def center_text(text):
        padding = (border_width - len(text)) // 2
        return "│" + " " * padding + text + " " * (border_width - len(text) - padding) + "│"
    
    # Display the message
    print("")
    print(top_border)
    print(empty_line)
    print(center_text(title))
    print(center_text(version))
    print(center_text(website))
    print(center_text(setup_text))
    print(empty_line)
    print(bottom_border)
    print("")
    print("🌍 Ready to translate your applications!")
    print("📊 Dashboard with real-time translation statistics")
    print("🔧 CSV/PO/MO file management tools")
    print("📝 Glossary management and term validation")
    print("🚀 Automated translation workflow integration")
    print("")
    
    # Show additional translation-specific info
    try:
        from translation_tools.setup.create_workspace import (
            get_translation_stats_dashboard_info
        )
        stats = get_translation_stats_dashboard_info()
        if stats.get("total_languages"):
            print(f"🌎 Configured for {stats['total_languages']} languages including ASEAN languages")
    except:
        pass  # Continue without stats


def get_current_app_version():
    """Get current installed version of translation_tools app"""
    try:
        # Check if app version exists in database
        if frappe.db.exists("DocType", "App Version"):
            version_doc = frappe.db.get_value("App Version", {"app_name": "translation_tools"}, "version")
            return version_doc
        else:
            # Try to get from installed apps
            app_list = frappe.get_installed_apps()
            if "translation_tools" in app_list:
                # Try to read from hooks or existing installation
                try:
                    app_path = frappe.get_app_path("translation_tools")
                    init_file = os.path.join(app_path, "translation_tools", "__init__.py")
                    if os.path.exists(init_file):
                        with open(init_file, 'r') as f:
                            content = f.read()
                            for line in content.split('\n'):
                                if line.strip().startswith('__version__'):
                                    # Extract version string
                                    version = line.split('=')[1].strip().strip('"\'')
                                    return version
                except:
                    pass
        return None
    except Exception:
        return None


# def arrange_workspaces():
#     """Arrange workspaces based on installed apps"""
#     try:
#         # Check if Thai Business Suite is installed
#         has_thai_business = "thai_business_suite" in frappe.get_installed_apps()

#         if frappe.db.exists("Workspace", "Translation Tools"):
#             # Define the values to update
#             values = {
#                 "chart_name": "Translation Status"  # Set this to a non-empty value
#             }

#             # Set parent_page and sequence_id based on Thai Business Suite presence
#             if has_thai_business and frappe.db.exists(
#                 "Workspace", "Thai Business Suite"
#             ):
#                 values["parent_page"] = "Thai Business Suite"
#                 values["sequence_id"] = 1  # type: ignore
#             else:
#                 values["parent_page"] = ""
#                 values["sequence_id"] = 99.0  # type: ignore

#             # Update the workspace directly
#             frappe.db.set_value("Workspace", "Translation Tools", values)
#             frappe.db.commit()

#     except Exception as e:
#         frappe.log_error(f"Failed to arrange Translation Tools workspace: {e}")


# Hook to modify Print Settings doctype to include WeasyPrint
# def add_weasyprint():
#     # Add WeasyPrint option to Print Settings
#     try:
#         # First check if the Print Settings doctype exists
#         if frappe.db.exists("DocType", "Print Settings"):
#             # Check if we need to modify the pdf_generator field
#             pdf_generator_field = frappe.get_meta("Print Settings").get_field(
#                 "pdf_generator"
#             )

#             if pdf_generator_field and "weasyprint" not in pdf_generator_field.options:
#                 # Create a Property Setter to add WeasyPrint to the options
#                 if not frappe.db.exists(
#                     "Property Setter",
#                     {
#                         "doc_type": "Print Settings",
#                         "field_name": "pdf_generator",
#                         "property": "options",
#                     },
#                 ):
#                     # Get current options
#                     current_options = pdf_generator_field.options

#                     # Make sure we include chrome if it's supposed to be there
#                     # but might be missing in the UI
#                     if "chrome" not in current_options:
#                         current_options = current_options + "\nchrome"

#                     # Add WeasyPrint
#                     new_options = current_options + "\nweasyprint"

#                     # Create Property Setter
#                     ps = frappe.new_doc("Property Setter")
#                     ps.update(
#                         {
#                             "doctype_or_field": "DocField",
#                             "doc_type": "Print Settings",
#                             "field_name": "pdf_generator",
#                             "property": "options",
#                             "value": new_options,
#                             "property_type": "Text",
#                         }
#                     )
#                     ps.insert(ignore_permissions=True)
#                     frappe.db.commit()
#                     frappe.clear_cache(doctype="Print Settings")
#                     print("Added WeasyPrint option to Print Settings")
#     except Exception as e:
#         print(f"Error adding WeasyPrint to PDF generator options: {str(e)}")


# git fsck --lost-found
