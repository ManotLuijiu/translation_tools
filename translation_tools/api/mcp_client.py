import frappe
import requests
from frappe import _


@frappe.whitelist()
def proxy_request():
    """Proxy requests to the MCP server"""
    try:
        # Get request parameters
        params = frappe.local.form_dict

        # Define the MCP server URL
        mcp_url = frappe.conf.get("mcp_server_url") or "https://mcp.so"

        # Forward the request
        response = requests.post(
            f"{mcp_url}/api/method/erpnext_mcp_server.api.endpoints.{params.action}",
            json=params.data,
        )

        # Return the response
        return response.json()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "MCP Client Error")
        return {"error": str(e)}
