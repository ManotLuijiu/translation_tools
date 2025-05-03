import frappe
from frappe import _


def update_email_service_options():
    """
    Add Resend to the options for service field in Email Account
    """
    try:
        # Check if the Property Setter already exists
        existing = frappe.db.get_value(
            "Property Setter",
            {
                "doc_type": "Email Account",
                "field_name": "service",
                "property": "options",
            },
            "name",
        )

        # Get current options
        service_field = frappe.get_meta("Email Account").get_field("service")
        current_options = service_field.options if service_field else ""

        # Check if Resend is already in options
        if "Resend" not in current_options:
            # If Property Setter exists, update it
            if existing:
                if isinstance(existing, str):
                    doc = frappe.get_doc("Property Setter", existing)
                else:
                    raise ValueError("Invalid value for 'existing': Expected a string.")
                options = doc.options.split("\n")  # type: ignore
                options.append("Resend")
                doc.options = "\n".join(options)  # type: ignore
                doc.save()
            # Otherwise, create a new Property Setter
            else:
                options = current_options.split("\n")
                options.append("Resend")

                frappe.get_doc(
                    {
                        "doctype": "Property Setter",
                        "doc_type": "Email Account",
                        "doctype_or_field": "DocField",
                        "field_name": "service",
                        "property": "options",
                        "value": "\n".join(options),
                        "property_type": "Text",
                    }
                ).insert()

            print("Added Resend to Email Account service options")
    except Exception as e:
        frappe.log_error(
            f"Failed to update Email Account service options: {str(e)}",
            "Resend Integration Setup Error",
        )


def create_sample_email_account():
    """
    Create a sample Email Account for Resend if it doesn't exist
    """
    try:
        # Check if sample account already exists
        if not frappe.db.exists("Email Account", {"service": "Resend"}):
            # Get site email
            site_email = frappe.db.get_value("Website Settings", None, "auto_email_id")
            if not site_email:
                site_email = "noreply@example.com"

            # Create new email account
            email_account = frappe.get_doc(
                {
                    "doctype": "Email Account",
                    "email_account_name": "Resend",
                    "service": "Resend",
                    "email_id": site_email,
                    "default_outgoing": 0,
                    "enable_outgoing": 1,
                    "smtp_server": "api.resend.com",  # Not actually used but required
                    "smtp_port": 443,  # Not actually used but required
                    "use_tls": 1,  # Not actually used but required
                    "append_to": "ToDo",
                    "enable_auto_reply": 0,
                }
            )

            email_account.insert(ignore_permissions=True)
            frappe.db.commit()

            print(f"Created sample Email Account for Resend with email {site_email}")

            # Show notification to user
            frappe.msgprint(
                _(
                    "A sample Email Account for Resend has been created. "
                    "Please update it with your Resend API key and settings."
                )
            )

    except Exception as e:
        frappe.log_error(
            f"Failed to create sample Email Account for Resend: {str(e)}",
            "Resend Integration Setup Error",
        )
