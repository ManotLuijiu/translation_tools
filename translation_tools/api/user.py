import frappe
from frappe import _
from frappe.utils import validate_email_address
from typing import Tuple, Dict
from functools import wraps


def validate_room_kwargs(function):
    @wraps(function)
    def _validator(**kwargs):
        if not kwargs["full_name"]:
            frappe.throw(title="Error", msg=_("Full Name is required"))
        if not kwargs["message"]:
            frappe.throw(title="Error", msg=_("Message is too short"))
        validate_email_address(kwargs["email"], throw=True)
        return function(**kwargs)

    return _validator


def generate_guest_room(email: str, full_name: str, message: str) -> Tuple[str, str]:
    chat_operators = frappe.get_cached_doc("Chat Settings").chat_operators or []  # type: ignore
    profile_doc = frappe.get_doc(
        {
            "doctype": "Chat Profile",
            "email": email,
            "guest_name": full_name,
        }
    ).insert(ignore_permissions=True)
    new_room = frappe.get_doc(
        {
            "doctype": "Chat Room",
            "guest": email,
            "room_name": full_name,
            "members": "Guest",
            "type": "Guest",
            "users": chat_operators,
        }
    ).insert(ignore_permissions=True)
    room = new_room.name

    profile = {
        "room_name": full_name,
        "last_message": message,
        "last_date": new_room.modified,
        "room": room,
        "is_read": 0,
        "room_type": "Guest",
    }

    for operator in chat_operators:
        frappe.publish_realtime(
            event="new_room_creation",
            message=profile,
            after_commit=True,
            user=operator,
        )

    return room, profile_doc.token  # type: ignore


@frappe.whitelist(allow_guest=True)
@validate_room_kwargs
def get_guest_room(*, email: str, full_name: str, message: str) -> Dict[str, object]:
    """Validate and setup profile & room for the guest user

    Args:
        email (str): Email of guest.
        full_name (str): Full name of guest.
        message (str): Message to be dropped.
    """
    if not frappe.db.exists("Chat Profile", email):
        room, token = generate_guest_room(email, full_name, message)

    else:
        room = frappe.db.get_value("Chat Room", {"guest": email}, "name")
        token = frappe.db.get_value("Chat Profile", email, "token")

    return {
        "guest_name": "Guest",
        "room_type": "Guest",
        "email": email,
        "room_name": full_name,
        "message": message,
        "room": room,
        "token": token,
    }


@frappe.whitelist()
def get_current_user():
    """
    Get current user data with debug logging
    This is a custom API method to fetch user data with backend logging
    """
    try:
        current_user = frappe.session.user
        print(f"🔍 Backend: Current user session: {current_user}")

        if not current_user or current_user == "Guest":
            print("🔍 Backend: User is Guest, returning null")
            return None

        # Get user document
        user_doc = frappe.get_doc("User", current_user)
        print(f"🔍 Backend: User document found: {user_doc.name}")

        # Extract user data
        user_data = {
            "name": user_doc.name,
            "email": user_doc.email,
            "first_name": user_doc.first_name,
            "last_name": user_doc.last_name,
            "full_name": user_doc.full_name,
            "username": user_doc.username,
            "user_image": user_doc.user_image,
            "mobile_no": user_doc.mobile_no,
            "phone": user_doc.phone,
            "gender": user_doc.gender,
            "birth_date": user_doc.birth_date,
            "enabled": user_doc.enabled,
            "user_type": user_doc.user_type,
        }

        print(f"🔍 Backend: User data extracted: {user_data}")

        return user_data

    except Exception as e:
        print(f"❌ Backend Error getting user data: {str(e)}")
        frappe.log_error(f"Error in get_current_user: {str(e)}")
        return None


@frappe.whitelist()
def get_user_profile(user_name=None):
    """
    Get user profile data for specific user or current user
    """
    try:
        if not user_name:
            user_name = frappe.session.user

        print(f"🔍 Backend: Getting profile for user: {user_name}")

        if not user_name or user_name == "Guest":
            print("🔍 Backend: User is Guest, returning null")
            return None

        # Check if user exists
        if not frappe.db.exists("User", user_name):
            print(f"❌ Backend: User {user_name} does not exist")
            return None

        # Get user document with all relevant fields
        user_doc = frappe.get_doc("User", user_name)

        user_profile = {
            "name": user_doc.name,
            "email": user_doc.email,
            "first_name": user_doc.first_name,
            "last_name": user_doc.last_name,
            "full_name": user_doc.full_name,
            "username": user_doc.username,
            "user_image": user_doc.user_image,
            "mobile_no": user_doc.mobile_no,
            "phone": user_doc.phone,
            "gender": user_doc.gender,
            "birth_date": user_doc.birth_date,
            "location": user_doc.location,
            "bio": user_doc.bio,
            "interest": user_doc.interest,
            "enabled": user_doc.enabled,
            "user_type": user_doc.user_type,
            "creation": user_doc.creation,
            "modified": user_doc.modified,
        }

        print(f"🔍 Backend: User profile data: {user_profile}")

        return user_profile

    except Exception as e:
        print(f"❌ Backend Error getting user profile: {str(e)}")
        frappe.log_error(f"Error in get_user_profile: {str(e)}")
        return None
