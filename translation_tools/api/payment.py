import frappe
from frappe import _
import omise
import json
from translation_tools.api.tokens import process_successful_payment

# Set your Omise API keys
omise.api_secret = frappe.conf.get("omise_secret_key")
omise.api_public = frappe.conf.get("omise_public_key")


@frappe.whitelist()
def create_payment_charge(transaction_id):
    """Create a payment charge in Omise"""
    if frappe.session.user == "Guest":
        frappe.throw(_("Please sign in to complete payment"))

    purchase = frappe.get_doc("Token Purchase", transaction_id)
    if not purchase or purchase.user != frappe.session.user:  # type: ignore
        frappe.throw(_("Invalid transaction"))

    if purchase.status != "Pending":  # type: ignore
        frappe.throw(_("This transaction is already processed"))

    try:
        # Assume token is passed from the frontend after card tokenization
        token = frappe.form_dict.get("omise_token")
        if not token:
            frappe.throw(_("Payment details not provided"))

        # Create charge
        charge = omise.Charge.create(
            amount=int(
                purchase.amount * 100
            ),  # Amount in satangs (1/100 THB) # type: ignore
            currency=purchase.currency.lower(),  # type: ignore
            card=token,
            metadata={
                "transaction_id": transaction_id,
                "user_email": purchase.user,  # type: ignore
                "package": purchase.package,  # type: ignore
            },
        )

        print(f"charge omise {charge}")

        if charge.status == "successful":
            process_successful_payment(transaction_id)
            return {
                "success": True,
                "message": _(
                    "Payment successful! Tokens have been added to your account."
                ),
                "charge_id": charge.id,
            }
        else:
            return {
                "success": False,
                "message": _("Payment failed. Please try again."),
                "charge_id": charge.id,
                "status": charge.status,
            }
    except Exception as e:
        frappe.log_error(f"Omise payment error: {str(e)}", "Token Payment Error")
        return {
            "success": False,
            "message": _(
                "Payment processing error. Please try again or contact support."
            ),
        }


@frappe.whitelist(allow_guest=True)
def handle_omise_webhook():
    """Handle Omise payment webhook callbacks"""
    try:
        data = json.loads(frappe.request.data)
        if data.get("key") == "charge.complete":
            charge = data.get("data")
            if charge.get("status") == "successful":
                metadata = charge.get("metadata", {})
                transaction_id = metadata.get("transaction_id")
                if transaction_id:
                    process_successful_payment(transaction_id)
                    return "OK"
        return "Event ignored"
    except Exception as e:
        frappe.log_error(f"Webhook error: {str(e)}", "Omise Webhook Error")
        return "Error"
