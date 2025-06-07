import frappe
from frappe import _
from frappe.utils import flt


@frappe.whitelist()
def get_token_dashboard_data():
    """Get data for token dashboard"""
    if frappe.session.user == "Guest":
        return {"is_guest": True, "token_balance": 0, "packages": []}

    from translation_tools.api.tokens import get_or_create_user_tokens

    user_tokens = get_or_create_user_tokens(frappe.session.user)

    packages = frappe.get_all(
        "Token Package",
        filters={"is_active": 1},
        fields=["package_name", "token_amount", "price", "currency", "description"],
    )

    purchases = frappe.get_all(
        "Token Purchase",
        filters={"user": frappe.session.user},
        fields=["package", "amount", "currency", "status", "payment_date"],
        order_by="creation desc",
        limit=5,
    )

    return {
        "is_guest": False,
        "token_balance": user_tokens.token_balance,  # type: ignore
        "tokens_used": user_tokens.total_tokens_used,  # type: ignore
        "tokens_purchased": user_tokens.total_tokens_purchased,  # type: ignore
        "packages": packages,
        "recent_purchases": purchases,
    }
