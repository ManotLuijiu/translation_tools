import frappe
from frappe import _


@frappe.whitelist()
def request_trial():
    """Handle trial request for Thai Business Suite"""
    try:
        # Get user info
        user = frappe.session.user
        if not user:
            raise ValueError(_("User is not logged in."))
        user_doc = frappe.get_doc("User", user)

        # Check if the user has already requested a trial
        if frappe.db.exists("Trial Request", {"email": user_doc.get("email")}):
            return {
                "status": "error",
                "message": _("You have already requested a trial."),
            }

        # Create a new trial request
        # Get user info
        user = frappe.session.user
        if not user:
            raise ValueError(_("User is not logged in."))
        user_doc = frappe.get_doc("User", user)

        trial_request = frappe.get_doc(
            {
                "doctype": "Trial Request",
                "email": frappe.session.user,
                "status": "Pending",
            }
        )
        trial_request.insert(ignore_permissions=True)

        # Send email to user
        frappe.sendmail(
            recipients=[user_doc.get("email")],
            subject="Your Thai Business Suite Trial",
            message="""
                <p>Thank you for your interest in Thai Business Suite!</p>
                <p>Our team will contact you within 24 hours to set up your 3-month free trial.</p>
                <p>If you have any questions, please reply to this email.</p>
                <p>Best regards,<br>The Thai Business Suite Team</p>
            """,
        )

        # Send notification to admin
        frappe.sendmail(
            recipients=frappe.get_hooks("notification_email") or ["admin@example.com"],
            subject="New Thai Business Suite Trial Request",
            message=f"""
                <p>A new trial request has been submitted:</p>
                <p>User: {user_doc.get("full_name")} ({user})</p>
                <p>Email: {user_doc.get("email")}</p>
                <p>Please follow up within 24 hours.</p>
            """,
        )

        return {
            "status": "success",
            "message": _("Trial request submitted successfully."),
        }
    except Exception as e:
        frappe.log_error(str(e), "Thai Business Suite Trial Request Error")
        return {"success": False, "error": str(e)}
