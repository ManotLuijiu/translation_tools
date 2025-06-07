import frappe
import json
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)


@frappe.whitelist()
def get_mcp_server_status():
    """Check if the MCP server is available and return status information."""
    try:
        # Import the MCP client
        from mcp.client.session import ClientSession
        from mcp.client.stdio import StdioServerParameters, stdio_client

        result = {"is_installed": True, "status": "unknown"}

        try:
            # Try to import the server module to check installation
            from erpnext_mcp_server.mcp.mcp import get_server

            server = get_server()
            result["server_name"] = server.name
            result["status"] = "available"
        except ImportError:
            result["status"] = "not_installed"
            result["error"] = "ERPNext MCP Server is not installed"
        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)

        return result
    except ImportError:
        return {
            "is_installed": False,
            "status": "not_installed",
            "error": "MCP library is not installed",
        }
    except Exception as e:
        logger.exception("Error checking MCP server status")
        return {"is_installed": False, "status": "error", "error": str(e)}


@frappe.whitelist()
def execute_mcp_tool(tool_name, arguments=None):
    """Execute a tool on the MCP server.

    Args:
        tool_name: Name of the tool to execute
        arguments: JSON string of arguments to pass to the tool

    Returns:
        Result from the tool execution
    """
    try:
        # Check if MCP is installed
        try:
            import mcp
        except ImportError:
            return {"status": "error", "message": "MCP library is not installed"}

        # Try to import the server module
        try:
            from erpnext_mcp_server.mcp.mcp import get_server
        except ImportError:
            return {"status": "error", "message": "ERPNext MCP Server is not installed"}

        # Parse arguments if they're a string
        if arguments and isinstance(arguments, str):
            args = json.loads(arguments)
        else:
            args = arguments or {}

        # Get the server and check if the tool exists
        server = get_server()
        tool_manager = server._tool_manager

        if not tool_manager.get_tool(tool_name):
            return {"status": "error", "message": f"Tool '{tool_name}' not found"}

        # Execute the tool directly
        # Note: This is a synchronous approximation and not the proper way to call
        # an async tool. In a real implementation, you'd use a proper async framework.
        import asyncio

        # Create a new asyncio loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Run the tool in the loop
            result = loop.run_until_complete(tool_manager.call_tool(tool_name, args))

            return {"status": "success", "result": result}
        finally:
            # Clean up
            loop.close()

    except Exception as e:
        logger.exception(f"Error executing MCP tool {tool_name}")
        return {"status": "error", "message": str(e)}


@frappe.whitelist()
def list_mcp_tools():
    """List all available tools from the MCP server."""
    try:
        # Check if MCP is installed
        try:
            import mcp
        except ImportError:
            return {"status": "error", "message": "MCP library is not installed"}

        # Try to import the server module
        try:
            from erpnext_mcp_server.mcp.mcp import get_server
        except ImportError:
            return {"status": "error", "message": "ERPNext MCP Server is not installed"}

        # Get the server and list tools
        server = get_server()
        tools = server._tool_manager.list_tools()

        # Convert tools to a serializable format
        tool_list = []
        for tool in tools:
            tool_list.append(
                {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters,
                }
            )

        return {"status": "success", "tools": tool_list}

    except Exception as e:
        logger.exception("Error listing MCP tools")
        return {"status": "error", "message": str(e)}
