import frappe
from frappe import _
from translation_tools.utils import (
    update_room,
    is_user_allowed_in_room,
    raise_not_authorized_error,
)
from translation_tools.api.tokens import (
    check_token_balance,
    deduct_tokens_for_message,
    get_or_create_user_tokens,
)


@frappe.whitelist(allow_guest=True)
def send(content: str, user: str, room: str, email: str):
    """Send the message via socketio

    Args:
        content (str): Message to be sent.
        user (str): Sender's name.
        room (str): Room name.
        email (str): Sender's email.
    """
    if not is_user_allowed_in_room(room, email, user):
        raise_not_authorized_error()

    # For guest users or public chatbot, check token balance
    if user == "Guest" or not frappe.session.user:
        if not check_token_balance(email):
            frappe.throw(
                _(
                    "You've used all your free tokens. Please purchase more to continue using the Thai Tax Consultant."
                )
            )

    # For the bookkeeping/advanced features, check if user is authenticated
    if "bookkeeping" in content.lower() or "invoice" in content.lower():
        if user == "Guest" or not frappe.session.user:
            frappe.throw(
                _(
                    "AI Bookkeeping features require you to log in to your ERPNext account."
                )
            )

    # Create new message
    new_message = frappe.get_doc(
        {
            "doctype": "Chat Message",
            "content": content,
            "sender": user,
            "room": room,
            "sender_email": email,
        }
    )
    new_message.insert(ignore_permissions=True)

    # Deduct tokens for non-authenticated users
    if user == "Guest" or not frappe.session.user:
        deduct_tokens_for_message(email, len(content))

    update_room(room=room, last_message=content)

    result = {
        "content": content,
        "user": user,
        "creation": new_message.creation,
        "room": room,
        "sender_email": email,
    }

    typing_data = {
        "room": room,
        "user": user,
        "is_typing": "false",
        "is_guest": "true" if user == "Guest" else "false",
    }
    typing_event = f"{room}:typing"

    from translation_tools.translation_tools.doctype.chat_room.chat_room import ChatRoom

    # Cast the document to ChatRoom type to access get_members method
    chat_room = frappe.get_cached_doc("Chat Room", room)
    chat_room = chat_room.as_dict()
    members = []
    members_str = chat_room.get("members")
    if members_str and isinstance(members_str, str):
        members = [x.strip() for x in members_str.split(",")]

    for chat_user in members:
        frappe.publish_realtime(event=typing_event, message=typing_data, user=chat_user)
        frappe.publish_realtime(
            event=room,
            message=result,
            user=chat_user,
            after_commit=True,
        )
        frappe.publish_realtime(
            event="latest_chat_updates",
            message=result,
            user=chat_user,
            after_commit=True,
        )


@frappe.whitelist(allow_guest=True)
def get_all(room: str, email: str):
    """Get all the messages of a particularly room
    Args:
        room (str): Room name.
        email (str): Sender's email.
    """
    # Fix: Use get_doc instead of get_all to get room details
    try:
        room_detail = frappe.get_doc("Chat Room", room)
        if not room_detail:
            raise_not_authorized_error()

        if not is_user_allowed_in_room(room, email):
            raise_not_authorized_error()

    except Exception as e:
        frappe.log_error(f"Error accessing chat room: {str(e)}")
        raise_not_authorized_error()

    messages = frappe.get_all(
        "Chat Message",
        filters={"room": room},
        fields=["sender_email", "content", "sender", "creation"],
        order_by="creation asc",
    )

    return messages


@frappe.whitelist()
def get_token_balance():
    """Get current user's token balance"""
    if frappe.session.user == "Guest":
        frappe.throw(_("Please sign in or provide your email to check token balance"))
    user_tokens = get_or_create_user_tokens(frappe.session.user)

    from translation_tools.translation_tools.doctype.user_tokens.user_tokens import (
        UserTokens,
    )

    return {
        "token_balance": user_tokens.token_balance,  # type: ignore
        "total_used": user_tokens.total_tokens_used,  # type: ignore
        "total_purchased": user_tokens.total_tokens_purchased,  # type: ignore
    }


@frappe.whitelist(allow_guest=True)
def get_token_packages():
    """Get available token packages for purchase"""
    from translation_tools.translation_tools.doctype.token_package.token_package import (
        TokenPackage,
    )

    packages = frappe.get_all(
        "Token Package",
        filters={"is_active": 1},
        fields=["package_name", "token_amount", "price", "currency", "description"],
    )

    return packages


@frappe.whitelist()
def initiate_token_purchase(package_name):
    """Initiate a token purchase"""
    if frappe.session.user == "Guest":
        frappe.throw(_("Please sign in to purchase tokens"))

    from translation_tools.translation_tools.doctype.token_package.token_package import (
        TokenPackage,
    )

    package = frappe.get_doc("Token Package", package_name)
    if not package or not package.is_active:  # type: ignore
        frappe.throw(_("Invalid token package"))

    from translation_tools.api.tokens import create_token_purchase

    transaction_id = create_token_purchase(
        frappe.session.user,
        package_name,
        package.price,  # type: ignore
        package.currency,  # type: ignore
    )

    # Here integrate with payment gateway
    # Just return the transaction details
    return {
        "transaction_id": transaction_id,
        "amount": package.price,  # type: ignore
        "currency": package.currency,  # type: ignore
        "tokens": package.token_amount,  # type: ignore
        # Add payment URL or details based on payment gateway
        "payment_url": f"/payment?transaction_id={transaction_id}",
    }


@frappe.whitelist(allow_guest=True)
def mark_as_read(room: str):
    """Mark the message as read

    Args:
        room (str): Room name.
    """
    frappe.enqueue(
        "translation_tools.utils.update_room",
        room=room,
        is_read=1,
        update_modified=False,
    )


@frappe.whitelist(allow_guest=True)
def set_typing(room: str, user: str, is_typing: bool, is_guest: bool):
    """Set the typing text accordingly

    Args:
        room (str): Room's name.
        user (str): Sender who is typing.
        is_typing (bool): Whether user is typing.
        is_guest (bool): Whether user is guest or not.
    """
    result = {"room": room, "user": user, "is_typing": is_typing, "is_guest": is_guest}
    event = f"{room}:typing"

    # Get members using the same approach as in the send function
    chat_room = frappe.get_cached_doc("Chat Room", room)
    chat_room = chat_room.as_dict()
    members = []
    members_str = chat_room.get("members")
    if members_str and isinstance(members_str, str):
        members = [x.strip() for x in members_str.split(",")]

    for chat_user in members:
        frappe.publish_realtime(event=event, user=chat_user, message=result)
