import frappe

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
from translation_tools.api.setup_workspace import (
    setup_workspace_and_links,
    add_to_integrations_workspace,
)


def after_install():
    """Run setup operations after app installation"""
    logger = setup_logging()
    arrange_workspaces()

    try:
        if frappe.db.exists("Workspace", "Translation Tools"):
            doc = frappe.get_doc("Workspace", "Translation Tools")
            doc.sequence_id = 99  # type: ignore
            doc.save(ignore_permissions=True)
            frappe.db.commit()

        # Check version for upgrades
        handle_version_upgrade()

        # Structure the installation process
        bench_dir = setup_environment()
        check_dependencies()
        run_setup_script(bench_dir)
        setup_frappe_components()

        # Add custom fields
        from translation_tools.setup.install_custom_fields import install_custom_fields

        install_custom_fields()

        print("✅ Custom PDF generator setup completed successfully")

        # Set up custom print theme
        from translation_tools.utils.custom_theme import (
            create_sarabun_theme,
        )

        create_sarabun_theme()

        # Override print CSS
        from translation_tools.utils.override_print_css import override_print_css

        override_print_css()

        # Set up custom fonts
        from translation_tools.setup.setup_fonts import setup_sarabun_font

        setup_sarabun_font()

        print("✅ Sarabun font setup completed successfully")

        # Attempt to add to workspaces
        try:
            # First try to set up the main workspace
            setup_workspace_and_links()

            # Then try to add to integrations workspace
            add_to_integrations_workspace()

        except Exception as e:
            logger.error(f"Error setting up workspaces: {e}")
            frappe.db.rollback()
            # Continue installation even if workspace setup fails

        # Import initial data
        try:
            import_initial_data()
        except Exception as e:
            logger.error(f"Error importing initial data: {e}")
            # Continue installation

        validate_configuration()

        # Final notification to users
        show_success_notification()

        # Generate PO file
        generate_po_file()

    except Exception as e:
        logger.error(f"Installation failed: {str(e)}")
        handle_installation_error(e)


def arrange_workspaces():
    """Arrange workspaces based on installed apps"""
    try:
        # Check if Thai Business Suite is installed
        has_thai_business = "thai_business_suite" in frappe.get_installed_apps()

        if frappe.db.exists("Workspace", "Translation Tools"):
            # Define the values to update
            values = {
                "chart_name": "Translation Status"  # Set this to a non-empty value
            }

            # Set parent_page and sequence_id based on Thai Business Suite presence
            if has_thai_business and frappe.db.exists(
                "Workspace", "Thai Business Suite"
            ):
                values["parent_page"] = "Thai Business Suite"
                values["sequence_id"] = 1
            else:
                values["parent_page"] = ""
                values["sequence_id"] = 99

            # Update the workspace directly
            frappe.db.set_value("Workspace", "Translation Tools", values)
            frappe.db.commit()

    except Exception as e:
        frappe.log_error(f"Failed to arrange Translation Tools workspace: {e}")


# git fsck --lost-found
