import frappe
from frappe import _
import json
from frappe.utils.response import build_response

@frappe.whitelist(allow_guest=True)
def stripe_webhook():
    """Handle Stripe webhook events - this is a raw endpoint for Stripe"""
    from translation_tools.api.stripe_payment import handle_stripe_webhook
    
    response = handle_stripe_webhook()
    return build_response("text/plain", response) # type: ignore