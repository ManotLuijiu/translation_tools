# stripe_payment.py - Stripe Payment Integration

import frappe
from frappe import _
import stripe
import json
from translation_tools.api.tokens import process_successful_payment
from frappe.utils import get_url

# Set Stripe API key from site_config.json
stripe.api_key = frappe.conf.get("stripe_secret_key")
stripe_webhook_secret = frappe.conf.get("stripe_webhook_secret")
stripe_public_key = frappe.conf.get("stripe_public_key")

def get_email_address(user=None):
    """Get the email address of the user from User"""
    if not user:
        user = frappe.session.user
    return frappe.db.get_value("User", user, "email")

def create_stripe_checkout_session(transaction_id, amount, currency, token_amount, package_name):
    """Create a Stripe Checkout Session for token purchase"""
    try:
        # Get current site URL for success/cancel URLs
        site_url = get_url()
        
        # Format amount for Stripe (in smallest currency unit)
        amount_in_cents = int(float(amount) * 100)
        
        # email = get_email_address()
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency.lower(),
                    'product_data': {
                        'name': f'{package_name} - {token_amount} Tokens',
                        'description': f'Purchase {token_amount} tokens for Thai Tax Consultant',
                    },
                    'unit_amount': amount_in_cents,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{site_url}/tokens?success=true&session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{site_url}/tokens?canceled=true',
            metadata={
                'transaction_id': transaction_id,
                'token_amount': token_amount,
                'package_name': package_name,
                'user_email': str(get_email_address() or "")
            }
        )
        
        # Update token purchase with Stripe session ID
        purchase = frappe.get_doc("Token Purchase", transaction_id)
        purchase.stripe_session_id = checkout_session.id # type: ignore
        purchase.save(ignore_permissions=True)
        
        return checkout_session
        
    except Exception as e:
        frappe.log_error(f"Stripe checkout error: {str(e)}", "Token Payment Error")
        frappe.throw(_("Error creating payment session. Please try again."))


@frappe.whitelist(allow_guest=True)
def handle_stripe_webhook():
    """Handle Stripe webhook events"""
    try:
        payload = frappe.request.data
        sig_header = frappe.request.headers.get('Stripe-Signature')
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, stripe_webhook_secret
            )
        except Exception as e:
            # Check if it's a signature verification error
            if "signature" in str(e).lower():
                frappe.throw(_("Invalid signature"))
            else:
                raise
            
        # Handle the checkout.session.completed event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            
            # Make sure we only process payments with our metadata
            if 'transaction_id' in session.get('metadata', {}):
                transaction_id = session['metadata']['transaction_id']
                
                # Process the payment
                process_successful_payment(transaction_id)
                
                # Optional: Log success message
                frappe.log_error(
                    f"Payment successful for transaction {transaction_id}",
                    "Stripe Payment Success"
                )
                
        return "success"
        
    except Exception as e:
        frappe.log_error(f"Stripe webhook error: {str(e)}", "Stripe Webhook Error")
        return "error"


@frappe.whitelist()
def get_stripe_public_key():
    """Return Stripe public key for frontend"""
    return {"stripe_public_key": stripe_public_key}


@frappe.whitelist()
def verify_stripe_payment(session_id):
    """Verify payment was completed"""
    try:
        # Fetch the session to verify its status
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == "paid":
            # Find the transaction in our database
            token_purchases = frappe.get_list("Token Purchase",
                filters={"stripe_session_id": session_id},
                fields=["name", "status"]
            )
            
            # If found and not processed yet, process it
            if token_purchases and token_purchases[0].status == "Pending":
                token_purchase = token_purchases[0]
                process_successful_payment(token_purchase.name)
                
            return {
                "success": True,
                "message": _("Payment verified successfully! Tokens have been added to your account.")
            }
        else:
            return {
                "success": False,
                "message": _("Payment has not been completed yet. Please try again.")
            }
            
    except Exception as e:
        frappe.log_error(f"Payment verification error: {str(e)}", "Stripe Payment Error")
        return {
            "success": False,
            "message": _("Error verifying payment. Please contact support.")
        }