// MCP client integration for the chat bot

class ChatMCPClient {
    constructor() {
        this.initMCPStatus();
        this.mcpServerRunning = false;
        this.mcp_base_url = null;
    }

    async initMCPStatus() {
        try {
            // Check if MCP server is running
            const response = await this.checkMCPServerStatus();
            this.mcpServerRunning = response.is_running;
            
            // If MCP is running, determine the base URL based on transport type
            if (this.mcpServerRunning) {
                if (response.transport === 'sse') {
                    // For SSE transport, use the HTTP URL
                    this.mcp_base_url = frappe.urllib.get_base_url() + '/api/mcp';
                } else {
                    // For stdio transport, we need to use the local endpoint
                    this.mcp_base_url = 'http://localhost:8000/api/mcp';
                }
            }
        } catch (error) {
            console.error("Failed to check MCP server status:", error);
            this.mcpServerRunning = false;
        }
    }

    async checkMCPServerStatus() {
        // Check if MCP server is running
        try {
            const response = await frappe.call({
                method: "erpnext_mcp_server.erpnext_mcp_server.api.mcp_server.get_mcp_server_status",
                async: true
            });
            
            return response.message || { is_running: false, status: 'Unknown' };
        } catch (error) {
            console.error("Error checking MCP status:", error);
            return { is_running: false, status: 'Error' };
        }
    }

    async startMCPServer() {
        try {
            const response = await frappe.call({
                method: "erpnext_mcp_server.erpnext_mcp_server.api.mcp_server.start_mcp_server",
                async: true
            });
            
            if (response.message && response.message.status === 'success') {
                // Wait a moment for the server to start
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check status again
                await this.initMCPStatus();
                return { success: this.mcpServerRunning };
            }
            
            return { success: false, message: response.message?.message || 'Failed to start MCP server' };
        } catch (error) {
            console.error("Error starting MCP server:", error);
            return { success: false, message: error.message || 'Unknown error' };
        }
    }

    async stopMCPServer() {
        try {
            const response = await frappe.call({
                method: "erpnext_mcp_server.erpnext_mcp_server.api.mcp_server.stop_mcp_server",
                async: true
            });
            
            if (response.message && response.message.status === 'success') {
                this.mcpServerRunning = false;
                return { success: true };
            }
            
            return { success: false, message: response.message?.message || 'Failed to stop MCP server' };
        } catch (error) {
            console.error("Error stopping MCP server:", error);
            return { success: false, message: error.message || 'Unknown error' };
        }
    }

    async queryMCP(query, context = {}) {
        if (!this.mcpServerRunning || !this.mcp_base_url) {
            return { error: 'MCP server is not running. Please start the server first.' };
        }
        
        try {
            // Format the query for MCP
            const payload = {
                query: query,
                context: context
            };
            
            // Send request to the MCP server
            const response = await fetch(`${this.mcp_base_url}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': frappe.csrf_token
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error querying MCP:", error);
            return { error: error.message || 'Failed to query MCP server' };
        }
    }

    isRunning() {
        return this.mcpServerRunning;
    }
}

// Create a global instance for reuse
frappe.provide('frappe.chat_mcp');
frappe.chat_mcp = new ChatMCPClient();