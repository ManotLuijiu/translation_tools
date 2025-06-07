# tokens.py - Create in your translation_tools app

import frappe
from frappe import _
from frappe.model.document import Document
from datetime import datetime, timedelta
import uuid

# Constants
DEFAULT_FREE_TOKENS = 3000
TOKEN_COST_PER_QUESTION = {
    "basic": 25,  # Basic tax information
    "standard": 75,  # Standard calculations or personalized advice
    "complex": 150,  # In-depth consultations with document analysis
}


class TokenPackage(Document):
    """Token packages that users can purchase"""

    # This will be set up through DocType


class UserTokens(Document):
    """Track user token balances and usage"""

    def validate(self):
        if not self.token_balance and not self.is_new():
            self.token_balance = DEFAULT_FREE_TOKENS

    def deduct_tokens(self, tokens_to_deduct):
        """Deduct tokens from user balance"""
        if self.token_balance < tokens_to_deduct:
            frappe.throw(
                _("Insufficient tokens. Please purchase more tokens to continue.")
            )

        self.token_balance -= tokens_to_deduct
        self.total_tokens_used += tokens_to_deduct
        self.save(ignore_permissions=True)
        return True

    def add_tokens(self, tokens_to_add):
        """Add tokens to user balance"""
        self.token_balance += tokens_to_add
        self.total_tokens_purchased += tokens_to_add
        self.save(ignore_permissions=True)
        return True


def create_token_purchase(user_email, package_name, amount, currency="THB"):
    """Create a token purchase record"""
    purchase = frappe.new_doc("Token Purchase")
    purchase.user = user_email  # type: ignore
    purchase.package = package_name  # type: ignore
    purchase.amount = amount  # type: ignore
    purchase.currency = currency  # type: ignore
    purchase.status = "Pending"  # type: ignore
    purchase.transaction_id = f"TKN-{uuid.uuid4().hex[:8].upper()}"  # type: ignore
    purchase.insert(ignore_permissions=True)
    return purchase.name


def process_successful_payment(transaction_id):
    """Process a successful token purchase payment"""
    # First get the name of the document using get_value
    purchase_name = frappe.get_value(
        "Token Purchase", {"transaction_id": transaction_id}, "name"
    )
    # purchase = frappe.get_doc("Token Purchase", {"transaction_id": transaction_id})
    if not purchase_name:
        return False
    # Then get the document using the name (explicitly cast to string)
    purchase = frappe.get_doc("Token Purchase", str(purchase_name))
    if purchase.status != "Pending":  # type: ignore
        return False

    # Update purchase status
    purchase.status = "Completed"  # type: ignore
    purchase.payment_date = datetime.now()  # type: ignore
    purchase.save(ignore_permissions=True)

    # Get token package details
    package = frappe.get_doc("Token Package", purchase.package)  # type: ignore

    # Add tokens to user balance
    user_tokens = get_or_create_user_tokens(purchase.user)  # type: ignore
    user_tokens.add_tokens(package.token_amount)  # type: ignore

    # Send confirmation email
    send_token_purchase_confirmation(purchase.user, package.token_amount)  # type: ignore

    return True


def get_or_create_user_tokens(user_email):
    """Get or create user token record"""
    user_token_name = f"Tokens-{user_email}"

    if not frappe.db.exists("User Tokens", user_token_name):
        user_tokens = frappe.new_doc("User Tokens")
        user_tokens.name = user_token_name
        user_tokens.user = user_email  # type: ignore
        user_tokens.token_balance = DEFAULT_FREE_TOKENS  # type: ignore
        user_tokens.total_tokens_used = 0  # type: ignore
        user_tokens.total_tokens_purchased = 0  # type: ignore
        user_tokens.insert(ignore_permissions=True)
        return user_tokens

    return frappe.get_doc("User Tokens", user_token_name)


def check_token_balance(user_email, tokens_needed=TOKEN_COST_PER_QUESTION["basic"]):
    """Check if user has enough tokens"""
    user_tokens = get_or_create_user_tokens(user_email)
    return user_tokens.token_balance >= tokens_needed  # type: ignore


def calculate_token_cost(message_content):
    """Calculate token cost based on message complexity"""
    # Check for keywords that indicate complexity level
    content_lower = message_content.lower()

    # Complex queries involve documents, calculations, or in-depth analysis
    if any(
        keyword in content_lower
        for keyword in [
            "invoice",
            "calculate",
            "analysis",
            "document",
            "financial",
            "bookkeeping",
        ]
    ):
        return TOKEN_COST_PER_QUESTION["complex"]

    # Standard queries involve personalized advice or specific questions
    elif any(
        keyword in content_lower
        for keyword in [
            "my company",
            "specific",
            "advice",
            "how should i",
            "what should i",
        ]
    ):
        return TOKEN_COST_PER_QUESTION["standard"]

    # Basic queries are simple information requests
    else:
        return TOKEN_COST_PER_QUESTION["basic"]


def deduct_tokens_for_message(user_email, message_content):
    """Deduct tokens for a message based on complexity"""
    tokens_to_deduct = calculate_token_cost(message_content)

    user_tokens = get_or_create_user_tokens(user_email)
    return user_tokens.deduct_tokens(tokens_to_deduct)  # type: ignore


def send_token_purchase_confirmation(user_email, token_amount):
    """Send email confirmation for token purchase"""
    subject = _("Token Purchase Confirmation")
    message = _(
        f"Thank you for purchasing {token_amount} tokens for the Thai Tax Consultant. Your tokens have been added to your account."
    )

    frappe.sendmail(recipients=[user_email], subject=subject, message=message)
