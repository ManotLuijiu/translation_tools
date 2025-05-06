"""
MCP Server API Integration

This module provides integration between the ERPNext chat system and
the MCP server for Thai Tax Consultant Bot functionality.
"""

import json
import frappe
import requests
from frappe import _
from frappe.utils import get_site_name, cint, flt, nowdate
from frappe import defaults, get_site_config

# MCP Server configuration
MCP_SERVER_URL = get_site_config().get("mcp_server_url", "http://localhost:8000")
MCP_API_KEY = get_site_config().get("mcp_api_key", "")

# Anthropic API configuration
ANTHROPIC_API_KEY = get_site_config().get("anthropic_api_key", "")
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


@frappe.whitelist()
def call_tool(tool_name, arguments):
    """
    Call an MCP tool on the server

    Args:
        tool_name (str): Name of the tool to call
        arguments (dict): Arguments for the tool

    Returns:
        The tool response
    """
    try:
        # Validate user permissions
        if not frappe.has_permission("Chat Room"):
            frappe.throw(_("You don't have permission to use this feature"))

        # Validate arguments
        if not isinstance(arguments, dict):
            try:
                arguments = json.loads(arguments)
            except:
                frappe.throw(_("Invalid arguments format"))

        # Set up headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MCP_API_KEY}",
        }

        # Prepare the request
        data = {
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
        }

        # Make the request to the MCP server
        response = requests.post(f"{MCP_SERVER_URL}/", headers=headers, json=data)

        # Check for errors
        response.raise_for_status()

        # Parse and return the response
        result = response.json()

        if "error" in result:
            frappe.throw(result["error"].get("message", "Unknown error"))

        return result.get("result", {}).get("content", [{}])[0].get("text", "{}")

    except requests.exceptions.RequestException as e:
        frappe.log_error(f"MCP Server Error: {str(e)}", "MCP Tool Call Error")
        frappe.throw(_("Error connecting to MCP server"))
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MCP Tool Call Error")
        frappe.throw(_("Error calling tool: {0}").format(str(e)))


@frappe.whitelist()
def get_resource(resource_url):
    """
    Get a resource from the MCP server

    Args:
        resource_url (str): URL of the resource to get

    Returns:
        The resource content
    """
    try:
        # Validate user permissions
        if not frappe.has_permission("Chat Room"):
            frappe.throw(_("You don't have permission to use this feature"))

        # Set up headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MCP_API_KEY}",
        }

        # Prepare the request
        data = {"method": "resources/read", "params": {"uri": resource_url}}

        # Make the request to the MCP server
        response = requests.post(f"{MCP_SERVER_URL}/", headers=headers, json=data)

        # Check for errors
        response.raise_for_status()

        # Parse and return the response
        result = response.json()

        if "error" in result:
            frappe.throw(result["error"].get("message", "Unknown error"))

        # Extract the text content from the first contents item
        contents = result.get("result", {}).get("contents", [])
        if not contents:
            return "{}"

        return contents[0].get("text", "{}")

    except requests.exceptions.RequestException as e:
        frappe.log_error(f"MCP Server Error: {str(e)}", "MCP Resource Error")
        frappe.throw(_("Error connecting to MCP server"))
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MCP Resource Error")
        frappe.throw(_("Error getting resource: {0}").format(str(e)))


@frappe.whitelist()
def get_prompt(prompt_name, arguments):
    """
    Use a prompt from the MCP server

    Args:
        prompt_name (str): Name of the prompt to use
        arguments (dict): Arguments for the prompt

    Returns:
        The prompt result
    """
    try:
        # Validate user permissions
        if not frappe.has_permission("Chat Room"):
            frappe.throw(_("You don't have permission to use this feature"))

        # Validate arguments
        if not isinstance(arguments, dict):
            try:
                arguments = json.loads(arguments)
            except:
                frappe.throw(_("Invalid arguments format"))

        # Set up headers
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MCP_API_KEY}",
        }

        # Prepare the request
        data = {
            "method": "prompts/get",
            "params": {"name": prompt_name, "arguments": arguments},
        }

        # Make the request to the MCP server
        response = requests.post(f"{MCP_SERVER_URL}/", headers=headers, json=data)

        # Check for errors
        response.raise_for_status()

        # Parse and return the response
        result = response.json()

        if "error" in result:
            frappe.throw(result["error"].get("message", "Unknown error"))

        # Get the message content from the response
        messages = result.get("result", {}).get("messages", [])
        if not messages:
            return "No data available"

        # Get the first message content
        content = messages[0].get("content", {})
        if isinstance(content, dict) and "text" in content:
            return content["text"]

        return str(content)

    except requests.exceptions.RequestException as e:
        frappe.log_error(f"MCP Server Error: {str(e)}", "MCP Prompt Error")
        frappe.throw(_("Error connecting to MCP server"))
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MCP Prompt Error")
        frappe.throw(_("Error using prompt: {0}").format(str(e)))


@frappe.whitelist()
def process_message(message, conversation_context=None, room_name=None):
    """
    Process a user message with Claude using the MCP tools

    Args:
        message (str): User message
        conversation_context (list, optional): Previous conversation messages
        room_name (str, optional): Name of the chat room

    Returns:
        str: Claude's response
    """
    try:
        # Validate user permissions
        if not frappe.has_permission("Chat Room"):
            frappe.throw(_("You don't have permission to use this feature"))

        # Parse conversation context if needed
        if conversation_context and isinstance(conversation_context, str):
            try:
                conversation_context = json.loads(conversation_context)
            except:
                conversation_context = []

        # Ensure conversation_context is a list
        if not conversation_context:
            conversation_context = []

        # Create system prompt
        system_prompt = get_system_prompt(room_name)

        # Create message to send to Claude
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        # Define available MCP tools
        tools = [
            {
                "name": "get_document",
                "description": "Get document details from ERPNext",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "doctype": {
                            "type": "string",
                            "description": "The DocType to get (e.g., 'Customer', 'Sales Invoice')",
                        },
                        "name": {
                            "type": "string",
                            "description": "The document name or ID",
                        },
                        "fields": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional list of fields to fetch",
                        },
                    },
                    "required": ["doctype", "name"],
                },
            },
            {
                "name": "list_documents",
                "description": "List documents of a given type with filters",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "doctype": {
                            "type": "string",
                            "description": "The DocType to list (e.g., 'Customer', 'Sales Invoice')",
                        },
                        "filters": {
                            "type": "object",
                            "description": "Optional filters to apply",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of documents to return",
                        },
                    },
                    "required": ["doctype"],
                },
            },
            {
                "name": "search_tax_laws",
                "description": "Search Thai tax laws using semantic search",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query"},
                        "top_k": {
                            "type": "integer",
                            "description": "Number of results to return",
                        },
                        "category": {
                            "type": "string",
                            "description": "Optional category to filter by",
                        },
                    },
                    "required": ["query"],
                },
            },
            {
                "name": "calculate_thai_tax",
                "description": "Calculate Thai taxes based on income and deductions",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "income_type": {
                            "type": "string",
                            "description": "Type of income (personal or corporate)",
                        },
                        "total_income": {
                            "type": "number",
                            "description": "Total income amount in THB",
                        },
                        "deductions": {
                            "type": "object",
                            "description": "Optional dictionary of applicable deductions",
                        },
                    },
                    "required": ["income_type", "total_income"],
                },
            },
        ]

        # Create the request payload
        payload = {
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 4000,
            "system": system_prompt,
            "messages": conversation_context + [{"role": "user", "content": message}],
            "tools": tools,
        }

        # Make request to Claude
        response = requests.post(ANTHROPIC_API_URL, headers=headers, json=payload)

        # Parse response
        claude_response = response.json()

        if "error" in claude_response:
            frappe.log_error(
                f"Claude API Error: {claude_response['error']}", "Claude API Error"
            )
            return "I'm sorry, I encountered an error while processing your request. Please try again."

        # Get the assistant's message
        assistant_message = claude_response.get(
            "content", [{"text": "No response from assistant"}]
        )[0]["text"]

        # Check if tool calls were made
        tool_calls = claude_response.get("tool_calls", [])
        if tool_calls:
            # Process each tool call
            tool_results = []
            for tool_call in tool_calls:
                tool_name = tool_call.get("name")
                tool_arguments = tool_call.get("input", {})

                # Execute the tool
                try:
                    tool_result = execute_mcp_tool(tool_name, tool_arguments)
                    tool_results.append({"tool_name": tool_name, "result": tool_result})
                except Exception as e:
                    frappe.log_error(
                        f"Tool execution error: {str(e)}", "MCP Tool Error"
                    )
                    tool_results.append({"tool_name": tool_name, "error": str(e)})

            # If tools were used, make a follow-up call to Claude with the results
            if tool_results:
                followup_message = {
                    "role": "user",
                    "content": f"Here are the results from the tools you requested:\n\n{json.dumps(tool_results, indent=2)}\n\nPlease provide your final answer based on these results.",
                }

                followup_payload = {
                    "model": "claude-3-5-sonnet-20240620",
                    "max_tokens": 4000,
                    "system": system_prompt,
                    "messages": conversation_context
                    + [
                        {"role": "user", "content": message},
                        {"role": "assistant", "content": assistant_message},
                        followup_message,
                    ],
                }

                # Make follow-up request to Claude
                followup_response = requests.post(
                    ANTHROPIC_API_URL, headers=headers, json=followup_payload
                )

                # Get final response
                followup_data = followup_response.json()
                if "error" not in followup_data:
                    assistant_message = followup_data.get(
                        "content", [{"text": assistant_message}]
                    )[0]["text"]

        return assistant_message

    except Exception as e:
        frappe.log_error(e)


def execute_mcp_tool(tool_name, arguments):
    """
    Execute an MCP tool with the given arguments

    Args:
        tool_name (str): Name of the tool to execute
        arguments (dict): Arguments for the tool

    Returns:
        The tool execution result
    """
    try:
        # Different handling for each tool
        if tool_name == "get_document":
            doctype = arguments.get("doctype")
            name = arguments.get("name")
            fields = arguments.get("fields")

            # Check permissions
            if not frappe.has_permission(doctype, "read"):
                return {"error": f"You don't have permission to read {doctype}"}

            # Get the document
            try:
                # Get the full document first
                doc = frappe.get_doc(doctype, name)

                # If specific fields are requested, filter the document
                if fields:
                    # Create a new dict with only the requested fields
                    doc_dict = {
                        field: doc.get(field) for field in fields if hasattr(doc, field)
                    }
                else:
                    # Convert to dict and sanitize
                    doc_dict = doc.as_dict()

                # Remove internal fields
                # Remove internal fields
                for key in list(doc_dict.keys()):
                    if key.startswith("_"):
                        del doc_dict[key]

                return doc_dict
            except frappe.DoesNotExistError:
                return {"error": f"Document {doctype}/{name} not found"}

        elif tool_name == "list_documents":
            doctype = arguments.get("doctype")
            filters = arguments.get("filters", {})
            limit = min(arguments.get("limit", 20), 100)  # Limit to 100 max

            # Check permissions
            if not frappe.has_permission(doctype, "read"):
                return {"error": f"You don't have permission to read {doctype}"}

            try:
                docs = frappe.get_list(
                    doctype,
                    filters=filters,
                    limit=limit,
                    ignore_permissions=False,  # Enforce permissions
                )
                return {"count": len(docs), "documents": docs}
            except Exception as e:
                return {"error": str(e)}

        elif tool_name == "search_tax_laws":
            # Call the MCP server for this
            return call_tool("search_tax_laws", arguments)

        elif tool_name == "calculate_thai_tax":
            # Call the MCP server for this
            return call_tool("calculate_thai_tax", arguments)

        else:
            # For unrecognized tools, delegate to the MCP server
            return call_tool(tool_name, arguments)

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Tool Execution Error: {tool_name}")
        return {"error": str(e)}


def get_system_prompt(room_name=None):
    """
    Generate a system prompt for Claude based on context

    Args:
        room_name (str, optional): Name of the chat room

    Returns:
        str: System prompt for Claude
    """
    # Get company info
    # company = frappe.db.get_default("Company") or ""
    company = defaults.get_user_default("Company") or ""
    if company:
        # Ensure company is a string
        company_str = str(company)
        company_doc = frappe.get_doc("Company", company_str)
        # Using get() method to safely access attributes
        company_info = f"""
        Company: {company_doc.name}
        Country: {company_doc.get("country") or "Thailand"}
        Currency: {company_doc.get("default_currency") or "THB"}
        """
    else:
        company_info = "No company information available."

    # Build the system prompt
    system_prompt = f"""
    You are a Thai Tax Consultant Bot and AI Bookkeeper integrated with ERPNext.
    
    COMPANY INFORMATION:
    {company_info}
    
    YOUR CAPABILITIES:
    - You can answer questions about Thai tax laws, regulations, and accounting standards
    - You can retrieve and analyze ERPNext documents when users ask about their business data
    - You can calculate taxes based on different income types and amounts
    - You can provide guidance on accounting practices and tax compliance in Thailand
    
    GUIDELINES:
    - Be concise and precise in your responses
    - When providing tax advice, always clarify that you're providing general guidance, not legal advice
    - Format responses with Markdown for readability (headings, bullet points, etc.)
    - For calculations, show your work step by step
    - Always cite the legal basis for tax information when possible
    - If users want to see specific documents or reports, show them how to use the appropriate commands
    
    AVAILABLE COMMANDS:
    - /tax [query] - Search Thai tax laws
    - /invoice [invoice_id] - Analyze a sales invoice
    - /customer [customer_id] - Analyze a customer's data
    - /inventory - Analyze current inventory status
    - /finance - Show financial dashboard
    - /calculate [income_type] [amount] - Calculate tax
    - /clear - Clear conversation context
    - /help - Show help information
    
    Current date: {nowdate()}
    
    If the user's question is outside your expertise or capabilities, politely explain what you can and cannot do.
    """

    return system_prompt
