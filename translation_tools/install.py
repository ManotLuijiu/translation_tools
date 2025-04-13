import frappe
import logging
from frappe import _

# Import reorganized functions
from translation_tools.api.installation import (
    setup_logging,
    handle_version_upgrade,
    setup_environment,
    check_dependencies,
    run_setup_script,
    handle_installation_error,
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

    try:
        # Check version for upgrades
        handle_version_upgrade()

        # Structure the installation process
        bench_dir = setup_environment()
        check_dependencies()
        run_setup_script(bench_dir)
        setup_frappe_components()

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

    except Exception as e:
        logger.error(f"Installation failed: {str(e)}")
        handle_installation_error(e)


# git fsck --lost-found
