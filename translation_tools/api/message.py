import frappe
from frappe import _
from translation_tools.utils import (
    update_room,
    is_user_allowed_in_room,
    raise_not_authorized_error,
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
    typing_event = f"{room}:tpying"

    for chat_user in frappe.get_cached_doc("Chat Room", room).get_members():  # type: ignore
        frappe.publish_realtime(event=typing_event, message=typing_data, user=chat_user)
        frappe.publish_realtime(
            event=room,
            message=result,
            user=chat_user,
            after_commit=True,
        )
        frappe.publish_realtime(
            event="lastest_chat_updates",
            message=result,
            user=chat_user,
            after_commit=True,
        )


@frappe.whitelist(allow_guest=True)
def get_all(room: str, email: str):
    """Get all the messages of a particulary room
    Args:
        room (str): Room name.
        email (str): Sender's email.
    """
    if not is_user_allowed_in_room(room, email):
        raise_not_authorized_error()

    messages = frappe.get_all(
        "Chat Message",
        filters={"room": room},
        fields=["sender_email", "content", "sender", "creation"],
        order_by="creation asc",
    )

    return messages


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

    for chat_user in frappe.get_cached_doc("Chat Room", room).get_members():  # type: ignore
        frappe.publish_realtime(event=event, user=chat_user, message=result)
