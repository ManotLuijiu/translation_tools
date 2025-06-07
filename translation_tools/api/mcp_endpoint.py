"""
MCP Server API Endpoints

This module exposes API endpoints that bridge the frontend chat interface
with the MCP server functionality for the Thai Tax Consultant Bot.
"""

import json
import frappe
from frappe import _
from frappe.utils import cstr
from frappe.exceptions import ValidationError

from translation_tools.api.mcp_server import (
    call_tool,
    get_resource,
    get_prompt,
    process_message,
)


@frappe.whitelist(allow_guest=True)
def handle_request():
    """
    Main endpoint that handles all MCP-related requests from the chat interface

    Expected request format:
    {
        "action": "call_tool" | "get_resource" | "get_prompt" | "process_message",
        "data": {
            // Action-specific parameters
        }
    }

    Returns:
        JSON response with action result
    """
    try:
        # Get request data
        request_data = frappe.local.form_dict

        # Validate request
        if not request_data or "action" not in request_data:
            return {"status": "error", "message": "Invalid request format"}

        action = request_data.get("action")
        data = request_data.get("data", {})

        # Check if JSON string
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except:
                return {"status": "error", "message": "Invalid data format"}

        # Dispatch to the appropriate handler
        if action == "call_tool":
            return handle_call_tool(data)
        elif action == "get_resource":
            return handle_get_resource(data)
        elif action == "get_prompt":
            return handle_get_prompt(data)
        elif action == "process_message":
            return handle_process_message(data)
        else:
            return {"status": "error", "message": f"Unknown action: {action}"}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MCP API Error")
        return {"status": "error", "message": str(e)}


def handle_call_tool(data):
    """Handle call_tool action"""
    tool_name = data.get("tool_name")
    arguments = data.get("arguments", {})

    if not tool_name:
        return {"status": "error", "message": "Tool name is required"}

    try:
        result = call_tool(tool_name, arguments)
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def handle_get_resource(data):
    """Handle get_resource action"""
    resource_url = data.get("resource_url")

    if not resource_url:
        return {"status": "error", "message": "Resource URL is required"}

    try:
        result = get_resource(resource_url)
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def handle_get_prompt(data):
    """Handle get_prompt action"""
    prompt_name = data.get("prompt_name")
    arguments = data.get("arguments", {})

    if not prompt_name:
        return {"status": "error", "message": "Prompt name is required"}

    try:
        result = get_prompt(prompt_name, arguments)
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def handle_process_message(data):
    """Handle process_message action"""
    message = data.get("message")
    conversation_context = data.get("conversation_context", [])
    room_name = data.get("room_name")

    if not message:
        return {"status": "error", "message": "Message is required"}

    try:
        result = process_message(message, conversation_context, room_name)
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@frappe.whitelist()
def get_bot_settings():
    """
    Get the settings for the Thai Tax Consultant Bot

    Returns:
        dict: Bot settings
    """
    try:
        # Check if the required settings doctype exists
        if not frappe.db.exists("DocType", "Tax Bot Settings"):
            return {
                "enabled": True,
                "bot_name": "Thai Tax Consultant",
                "welcome_message": "สวัสดีครับ! I'm your Thai Tax Consultant Bot. How can I help you today?",
                "tax_categories": [
                    "Personal Income Tax",
                    "Corporate Income Tax",
                    "VAT",
                    "Withholding Tax",
                ],
            }

        # Get settings from the database
        settings = frappe.get_single("Tax Bot Settings")

        return {
            "enabled": settings.enabled,  # type: ignore
            "bot_name": settings.bot_name,  # type: ignore
            "welcome_message": settings.welcome_message,  # type: ignore
            "tax_categories": [t.category for t in settings.tax_categories],  # type: ignore
            "mcp_enabled": settings.enable_mcp,  # type: ignore
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Tax Bot Settings Error")
        # Return default settings on error
        return {
            "enabled": True,
            "bot_name": "Thai Tax Consultant",
            "welcome_message": "สวัสดีครับ! I'm your Thai Tax Consultant Bot. How can I help you today?",
            "tax_categories": [
                "Personal Income Tax",
                "Corporate Income Tax",
                "VAT",
                "Withholding Tax",
            ],
        }
