import frappe
from frappe import _
import json

# from typing import Optional

# from frappe.utils import has_common
# import datetime


def time_in_range(start, end, current):
    """
    Check if the current time is within the given range.
    """
    if start < end:
        return start <= current <= end
    else:  # Over midnight
        return start <= current or current <= end


def validate_token(token: str):
    """Validate the guest token.

    Args:
        token (str): Guest token

    Returns:
        list: A list specifying whether token is valid and necessary info.
    """

    if not token or not isinstance(token, str):
        return [False, _("Token is required.")]

    guest_user = frappe.get_all("Chat Profile", filters={"token": token}, limit=1)

    if not guest_user:
        return [False, _("Invalid token.")]
    guest_user = frappe.get_doc("Chat Profile", guest_user[0].name)

    if guest_user.get("ip_address") != frappe.local.request_ip:
        return [False, _("Invalid token.")]

    room = frappe.db.get_value("Chat Room", guest_user.get("email"), "name")
    if not room:
        return [False, _("Invalid token.")]

    guest_details = {
        "email": guest_user.email,  # type: ignore
        "room": room,
    }
    return [True, guest_details]


def get_admin_name(user_key):
    """Get the admin name for the given user key.

    Args:
        user_key (str): The user key.

    Returns:
        str: The admin name.
    """
    admin_name = frappe.get_value("User", {"user_key": user_key}, "full_name")
    if not admin_name:
        return None
    return admin_name


def update_room(room, last_message=None, is_read=0, update_modified=True):
    """Update the value of chat room doctype with latest real time values

    Args:
        room (str): [description]
        last_message (str, optional): Last message of a room. Defaults to None.
        is_read (int, optional): Whether last message is read or not. Defaults to 0.
        update_modified (bool, optional): Whether to update or not. Defaults to True.
    """
    if not room:
        return

    new_values = {
        "is_read": is_read,
    }
    if last_message:
        new_values["last_message"] = last_message

    if is_read == 1:
        is_read_members = frappe.db.get_value("Chat Room", room, "is_read") or ""
        is_read_members = str(is_read_members) + f"{frappe.session.user}, "
        new_values["is_read"] = is_read_members  # type: ignore
    else:
        new_values["is_read"] = ""  # type: ignore

    frappe.db.set_value("Chat Room", room, new_values, update_modified=update_modified)


# def get_chat_settings():
#     """Get the chat settings
#     Returns:
#         dict: Dictionary containing chat settings.
#     """
#     chat_settings = frappe.get_cached_doc("Chat Settings")
#     user_roles = frappe.get_roles()

#     allowed_roles = [u.role for u in (chat_settings.get("allowed_roles") or [])]
#     allowed_roles.extend(["System Manager", "Administrator"])
#     result = {"enable_chat": False}

#     if frappe.session.user == "Guest":
#         result["enable_chat"] = True

#     if not getattr(chat_settings, "enable_chat", False) or not has_common(allowed_roles, user_roles):  # type: ignore
#         return result

#     chat_settings.chat_operators = [co.user for co in chat_settings.chat_operators]  # type: ignore

#     if chat_settings.start_time and chat_settings.end_time:  # type: ignore
#         start_time = datetime.time.fromisoformat(chat_settings.start_time)  # type: ignore
#         end_time = datetime.time.fromisoformat(chat_settings.end_time)  # type: ignore
#         current_time = datetime.datetime.now().time()

#         chat_status = (
#             "Online" if time_in_range(start_time, end_time, current_time) else "Offline"
#         )
#     else:
#         chat_status = "Online"

#     result["enable_chat"] = True
#     result["chat_status"] = chat_status  # type: ignore
#     return result


def display_warning():
    """Display deprecated warning message_item"""
    message = "The chat application in frappe is deprecated and will be removed in the future release. So please use this one only."

    frappe.publish_realtime(event="msgprint", message=message)


def allow_guest_to_upload():
    """Allow guest to upload files"""
    system_settings = frappe.get_doc("System Settings")
    system_settings.allow_guests_to_upload_files = 1  # type: ignore
    system_settings.save()


def get_full_name(email, only_first=False):
    """Get full name from email

    Args:
        email (str): Email of user
        only_first (bool, optional): Whether to fetch only first name. Defaults to False.

    Returns:
        str: Full Name
    """
    field = "first_name" if only_first else "full_name"
    return frappe.db.get_value("User", email, field)


def get_user_settings():
    """Get the user settings

    Returns:
        dict: user settings
    """
    if frappe.db.exists("Chat User Settings", frappe.session.user):
        user_doc = frappe.db.get_value(
            "Chat User Settings",
            frappe.session.user,
            ["enable_message_tone", "enable_notifications"],  # type: ignore
            as_dict=1,  # type: ignore
        )
    else:
        user_doc = {"enable_message_tone": 1, "enable_notifications": 1}

    return user_doc


def get_room_detail(room):
    """Get a room's details

    Args:
        room (str): Room's name

    Returns:
        dict: Room's details
    """
    room_detail = frappe.db.get_values(
        "Chat Room",
        filters={"name": room},
        fieldname="members, type, guest",
        as_dict=True,  # type: ignore
    )
    return room_detail


def is_user_allowed_in_room(room_name: str, email: str, user: str | None = None) -> bool:
    """Check if user is allowed in rooms

    Args:
        room_name (str): Room's name/ID
        email (str): User's email
        user (str, optional): User's name. Defaults to None.

    Returns:
        bool: Whether user is allowed or not
    """
    try:
        # Special case for Administrator - always allow
        if email == "Administrator" or frappe.session.user == "Administrator":
            return True
            
        # Special case for System Manager role
        if "System Manager" in frappe.get_roles(frappe.session.user):
            return True
            
        # Get the room details
        room_detail = frappe.get_doc("Chat Room", room_name)
        
        # Check if room exists
        if not room_detail:
            return False

        room_type = room_detail.type if hasattr(room_detail, "type") else "" # type: ignore
        
        # Guest cannot access non-Guest rooms
        if room_type != "Guest" and frappe.session.user == "Guest":
            return False
            
        # Check if user is the owner/creator of the room
        if room_detail.owner == frappe.session.user:
            return True
            
        # Get members from the users child table (if exists)
        members = []
        if hasattr(room_detail, "users") and room_detail.users: # type: ignore
            members = [user_row.user for user_row in room_detail.users if hasattr(user_row, "user")] # type: ignore
            
        # Fallback to members text field if users table is empty
        if not members and hasattr(room_detail, "members") and room_detail.members: # type: ignore
            # Try different approaches to parse members
            members_text = room_detail.members # type: ignore
            
            # Try JSON parsing first
            try:
                import json
                members_data = json.loads(members_text)
                if isinstance(members_data, list):
                    # If list of strings
                    if all(isinstance(item, str) for item in members_data):
                        members = members_data
                    # If list of objects with 'user' key
                    elif all(isinstance(item, dict) for item in members_data):
                        members = [item.get("user") for item in members_data if "user" in item]
            except json.JSONDecodeError:
                # If not JSON, try comma-separated list
                members = [m.strip() for m in members_text.split(",") if m.strip()]
                
        # Check if current user or email is in members
        current_user = frappe.session.user
        user_email = email
        
        # For direct rooms, check if email or user is in members
        if room_type == "Direct":
            return any([
                current_user in members,
                user_email in members,
                user and user in members
            ])
            
        # For all other room types
        return any([
            current_user in members,
            user_email in members
        ])

    except Exception as e:
        frappe.log_error(f"Error in is_user_allowed_in_room: {str(e)}, room: {room_name}, email: {email}")
        return False


class NotAuthorizedError(Exception):
    pass


def raise_not_authorized_error():
    frappe.throw(
        msg="You are not authorized to access read/write this resource.",
        title="Error",
        exc=NotAuthorizedError,
    )
