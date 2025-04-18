import frappe
import os


def override_print_css():
    """Override Frappe's print.css with a version that uses Sarabun font"""
    # Path to app's custom print.css
    app_path = frappe.get_app_path("translation_tools")
    custom_print_css = os.path.join(app_path, "public", "css", "custom_print.css")

    # Path to Frappe's print.css
    frappe_print_css = os.path.join(
        frappe.get_app_path("frappe"), "public", "css", "print.css"
    )

    if not os.path.exists(custom_print_css):
        # If our custom print.css doesn't exist yet, create it based on Frappe's
        with open(frappe_print_css, "r") as f_src:
            content = f_src.read()

        # Replace font definitions
        content = content.replace(
            'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;',
            'font-family: \'Sarabun\', -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Roboto", sans-serif;',
        )

        # Save our customized version
        with open(custom_print_css, "w") as f_dst:
            f_dst.write(content)

        print(f"Created custom print.css with Sarabun font at {custom_print_css}")

    # Update print.css symlink to point to our custom version
    # This is not recommended in production as it modifies Frappe core files
    # but is included here for completeness
    try:
        if os.path.exists(frappe_print_css):
            os.remove(frappe_print_css)
        os.symlink(custom_print_css, frappe_print_css)
        print(f"Linked Frappe's print.css to our custom version")
    except Exception as e:
        print(
            f"Could not create symlink (this may require manual intervention): {str(e)}"
        )
