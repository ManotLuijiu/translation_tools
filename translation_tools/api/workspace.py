import frappe
from frappe import _
from translation_tools.api.tokens import get_or_create_user_tokens


def get_token_stats_widget():
    """Widget to show token stats in workspace"""
    if frappe.session.user == "Guest":
        return None

    user_tokens = get_or_create_user_tokens(frappe.session.user)

    return {
        "label": _("Thai Tax Consultant Tokens"),
        "icon": "fa fa-coins",
        "type": "chart",
        "chart_type": "Progress",
        "data": {
            "labels": ["Tokens Used", "Tokens Remaining"],
            "datasets": [
                {"values": [user_tokens.total_tokens_used, user_tokens.token_balance]}  # type: ignore
            ],
        },
        "color": "#4caf50",
        "is_custom": 1,
        "action": {"route": "/tokens", "label": _("Manage Tokens")},
    }
