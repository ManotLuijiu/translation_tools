import frappe
import logging
from frappe import _

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