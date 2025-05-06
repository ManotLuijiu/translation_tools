/**
 * Thai Tax Consultant Bot - MCP Client Integration
 *
 * This module extends the original ChatSpace implementation with MCP capabilities
 * to create a Thai Tax Consultant Bot.
 */

import { scroll_to_bottom, get_messages, send_message } from './components';

frappe.provide('frappe.Chat');
frappe.provide('frappe.Chat.settings');
frappe.provide('frappe.Chat.mcp');

// MCP Client Configuration
frappe.Chat.mcp = {
  // MCP Server connection details
  serverUrl: '/api/method/translation_tools.api.mcp_client.proxy_request',

  // MCP Tools available for use
  tools: {
    get_document: 'get_document',
    list_documents: 'list_documents',
    get_doctype_fields: 'get_doctype_fields',
    run_report: 'run_report',
    execute_query: 'execute_query',
    get_applicable_tax_laws: 'get_applicable_tax_laws',
    search_tax_laws: 'search_tax_laws',
    calculate_thai_tax: 'calculate_thai_tax',
    get_system_info: 'get_system_info',
  },

  // MCP Resources
  resources: {
    tax_laws: 'resource://erp/tax-law/thailand',
    document: 'resource://erp/document/{doctype}/{name}',
    company_dashboard: 'resource://erp/company-dashboard',
  },

  // Prompts for common tasks
  prompts: {
    sales_invoice_analysis: 'sales_invoice_analysis',
    customer_analysis: 'customer_analysis',
    inventory_analysis: 'inventory_analysis',
    financial_dashboard: 'financial_dashboard',
  },
};

/**
 * Initialize the MCP Client when ChatSpace is loaded
 * We're using the Class.prototype approach to extend ChatSpace's functionality
 * rather than creating a new class that inherits from it
 */
frappe.Chat.initMCPClientExtension = function () {
  // const originalHandleSendMessage =
  //   frappe.Chat.space.constructor.prototype.handle_send_message;

  // Store a reference to the MCP client state on the instance
  frappe.Chat.space.is_processing = false;
  frappe.Chat.space.conversation_context = [];
  frappe.Chat.space.last_query = null;

  // Override the handle_send_message method to add MCP processing
  frappe.Chat.space.constructor.prototype.handle_send_message = async function (
    attachment
  ) {
    const $type_message = $('.type-message');
    let content = null;

    if (attachment) {
      content = attachment;
    } else {
      content = $type_message.val().trim();
    }

    if (content.length === 0) {
      return;
    }

    this.typing = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Display user message
    this.display_message({
      content: content,
      creation: new Date(),
      sender: this.profile.user,
      sender_email: this.profile.user_email,
    });

    // Clear input
    $type_message.val('');

    // For non-admin users, process with MCP
    if (!this.profile.is_admin) {
      this.display_typing_indicator();

      try {
        // Process message using MCP
        const response = await this.process_with_mcp(
          content,
          this.profile.room_name
        );

        // Display assistant response
        this.display_message({
          content: response,
          creation: new Date(),
          sender: 'Thai Tax Bot',
          sender_email: 'taxbot@system.local',
        });
      } catch (error) {
        console.error('Error processing message:', error);
        this.display_message({
          content:
            "I'm sorry, I encountered an error processing your request. Please try again.",
          creation: new Date(),
          sender: 'Thai Tax Bot',
          sender_email: 'taxbot@system.local',
        });
      } finally {
        this.hide_typing_indicator();
      }
    } else {
      // For admins, use normal message sending
      send_message(
        content,
        this.profile.user,
        this.profile.room,
        this.profile.user_email
      );
    }
  };

  // Add the process_with_mcp method to the ChatSpace prototype
  frappe.Chat.space.constructor.prototype.process_with_mcp = async function (
    message,
    roomName
  ) {
    if (this.is_processing) {
      return "I'm still processing your previous request. Please wait a moment.";
    }

    try {
      this.is_processing = true;
      this.last_query = message;

      // Add user message to conversation context
      this.conversation_context.push({
        role: 'user',
        content: message,
      });

      // Special command handling
      if (message.startsWith('/')) {
        return await this.handle_special_command(message, roomName);
      }

      // Process using Claude with MCP tools
      const response = await frappe.call({
        method: 'translation_tools.api.mcp_client.process_message',
        args: {
          message: message,
          conversation_context: this.conversation_context,
          room_name: roomName,
        },
      });

      // Add assistant response to conversation context
      const assistantResponse = response.message;
      this.conversation_context.push({
        role: 'assistant',
        content: assistantResponse,
      });

      // Keep conversation context to a reasonable size (last 10 messages)
      if (this.conversation_context.length > 10) {
        this.conversation_context = this.conversation_context.slice(-10);
      }

      this.is_processing = false;
      return assistantResponse;
    } catch (error) {
      console.error('Error processing message with MCP:', error);
      this.is_processing = false;
      return 'I encountered an error while processing your request. Please try again.';
    }
  };

  // Add the handle_special_command method
  frappe.Chat.space.constructor.prototype.handle_special_command =
    async function (command, roomName) {
      const cmd = command.split(' ')[0].toLowerCase();
      const args = command.substring(cmd.length).trim();

      switch (cmd) {
        case '/tax': {
          // Search tax laws
          const taxLaws = await this.call_mcp_tool(
            frappe.Chat.mcp.tools.search_tax_laws,
            {
              query: args,
              top_k: 3,
            }
          );
          return this.format_tax_law_results(taxLaws);
        }

        case '/invoice': {
          // Analyze invoice
          if (!args)
            return 'Please provide an invoice ID. Example: /invoice INV-00001';
          const invoiceAnalysis = await this.use_mcp_prompt(
            frappe.Chat.mcp.prompts.sales_invoice_analysis,
            {
              invoice_id: args,
            }
          );
          return invoiceAnalysis;
        }

        case '/customer': {
          // Analyze customer
          if (!args)
            return 'Please provide a customer ID. Example: /customer CUST-00001';
          const customerAnalysis = await this.use_mcp_prompt(
            frappe.Chat.mcp.prompts.customer_analysis,
            {
              customer_id: args,
            }
          );
          return customerAnalysis;
        }

        case '/inventory': {
          // Analyze inventory
          const inventoryAnalysis = await this.use_mcp_prompt(
            frappe.Chat.mcp.prompts.inventory_analysis,
            {}
          );
          return inventoryAnalysis;
        }

        case '/finance': {
          // Show financial dashboard
          const financialDashboard = await this.use_mcp_prompt(
            frappe.Chat.mcp.prompts.financial_dashboard,
            {}
          );
          return financialDashboard;
        }

        case '/calculate': {
          // Calculate tax
          if (!args)
            return 'Please specify income type and amount. Example: /calculate personal 750000';
          const [incomeType, amount] = args.split(' ');
          if (!incomeType || !amount)
            return 'Please provide both income type and amount.';

          const taxCalculation = await this.call_mcp_tool(
            frappe.Chat.mcp.tools.calculate_thai_tax,
            {
              income_type: incomeType,
              total_income: parseFloat(amount),
            }
          );
          return this.format_tax_calculation(taxCalculation);
        }

        case '/help': {
          // Show help
          return this.get_help_message(roomName);
        }

        case '/clear': {
          // Clear conversation context
          this.conversation_context = [];
          return 'Conversation context cleared. Starting fresh!';
        }

        default:
          return `Unknown command: ${cmd}. Type /help to see available commands.`;
      }
    };

  // Add helper methods to ChatSpace prototype
  frappe.Chat.space.constructor.prototype.call_mcp_tool = async function (
    toolName,
    args
  ) {
    try {
      this.is_processing = true;

      const response = await frappe.call({
        method: 'translation_tools.api.mcp_client.call_tool',
        args: {
          tool_name: toolName,
          arguments: args,
        },
      });

      this.is_processing = false;
      return response.message;
    } catch (error) {
      this.is_processing = false;
      console.error('Error calling MCP tool:', error);
      throw error;
    }
  };

  frappe.Chat.space.constructor.prototype.use_mcp_prompt = async function (
    promptName,
    args
  ) {
    try {
      this.is_processing = true;

      const response = await frappe.call({
        method: 'translation_tools.api.mcp_client.get_prompt',
        args: {
          prompt_name: promptName,
          arguments: args,
        },
      });

      this.is_processing = false;
      return response.message;
    } catch (error) {
      this.is_processing = false;
      console.error('Error using MCP prompt:', error);
      throw error;
    }
  };

  frappe.Chat.space.constructor.prototype.get_mcp_resource = async function (
    resourceUrl
  ) {
    try {
      this.is_processing = true;

      const response = await frappe.call({
        method: 'translation_tools.api.mcp_client.get_resource',
        args: {
          resource_url: resourceUrl,
        },
      });

      this.is_processing = false;
      return response.message;
    } catch (error) {
      this.is_processing = false;
      console.error('Error getting MCP resource:', error);
      throw error;
    }
  };

  // Format helper methods
  frappe.Chat.space.constructor.prototype.format_tax_law_results = function (
    results
  ) {
    if (results.error) {
      return `Error: ${results.error}`;
    }

    if (!results.results || results.results.length === 0) {
      return 'No relevant tax laws found.';
    }

    let response = `## Tax Law Search Results\n\n`;

    results.results.forEach((law, index) => {
      response += `### ${index + 1}. ${law.title}\n`;
      response += `**Category:** ${law.category}\n`;
      response += `**Summary:** ${law.summary}\n\n`;

      if (law.content && law.content.length > 200) {
        response += `${law.content.substring(0, 200)}...\n\n`;
      } else if (law.content) {
        response += `${law.content}\n\n`;
      }

      response += `**Effective Date:** ${law.effective_date}\n`;
      if (law.legal_reference) {
        response += `**Reference:** ${law.legal_reference}\n`;
      }
      response += '\n';
    });

    return response;
  };

  frappe.Chat.space.constructor.prototype.format_tax_calculation = function (
    calculation
  ) {
    if (calculation.error) {
      return `Error: ${calculation.error}`;
    }

    let response = `## Tax Calculation Results\n\n`;
    response += `**Income Type:** ${calculation.income_type}\n`;
    response += `**Tax Year:** ${calculation.tax_year}\n`;
    response += `**Total Income:** ฿${calculation.total_income.toLocaleString()}\n\n`;

    response += `**Deductions:**\n`;
    if (calculation.standard_deduction) {
      response += `- Standard Deduction: ฿${calculation.standard_deduction.toLocaleString()}\n`;
    }
    if (calculation.personal_allowance) {
      response += `- Personal Allowance: ฿${calculation.personal_allowance.toLocaleString()}\n`;
    }
    if (calculation.additional_deductions) {
      response += `- Additional Deductions: ฿${calculation.additional_deductions.toLocaleString()}\n`;
    }
    response += `- Total Deductions: ฿${calculation.total_deductions.toLocaleString()}\n\n`;

    response += `**Taxable Income:** ฿${calculation.taxable_income.toLocaleString()}\n`;
    response += `**Calculated Tax:** ฿${calculation.calculated_tax.toLocaleString()}\n`;
    response += `**Effective Tax Rate:** ${calculation.effective_tax_rate.toFixed(2)}%\n`;

    return response;
  };

  frappe.Chat.space.constructor.prototype.get_help_message = function () {
    let help = `# Thai Tax Consultant Bot - Help\n\n`;
    help += `I'm your AI assistant for Thai tax and accounting matters. You can ask me questions about Thai tax laws, regulations, and ERPNext documents.\n\n`;

    help += `## Available Commands\n\n`;
    help += `- **/tax [query]** - Search Thai tax laws\n`;
    help += `- **/invoice [invoice_id]** - Analyze a sales invoice\n`;
    help += `- **/customer [customer_id]** - Analyze a customer's data\n`;
    help += `- **/inventory** - Analyze current inventory status\n`;
    help += `- **/finance** - Show financial dashboard\n`;
    help += `- **/calculate [income_type] [amount]** - Calculate tax (income_type: personal or corporate)\n`;
    help += `- **/clear** - Clear conversation context\n`;
    help += `- **/help** - Show this help message\n\n`;

    help += `## Examples\n\n`;
    help += `- "What is the VAT rate in Thailand?"\n`;
    help += `- "How do I calculate withholding tax?"\n`;
    help += `- "Explain the personal income tax brackets"\n`;
    help += `- "How should I record depreciation in ERPNext?"\n`;
    help += `- "/tax personal income tax deductions"\n`;
    help += `- "/calculate personal 750000"\n`;

    return help;
  };

  // Add display_message and typing indicator methods
  frappe.Chat.space.constructor.prototype.display_message = function (message) {
    const message_type =
      message.sender_email === this.profile.user_email ? 'recipient' : 'sender';
    const sender = message.sender;

    // If it's the bot message, add a special class
    const message_element = this.make_message(
      message.content,
      frappe.datetime.get_time(message.creation),
      message_type,
      sender
    );

    if (sender === 'Thai Tax Bot') {
      message_element.addClass('bot');
    }

    this.$chat_space_container.append(message_element);
    scroll_to_bottom(this.$chat_space_container);
  };

  frappe.Chat.space.constructor.prototype.display_typing_indicator =
    function () {
      const typing_html = `
        <div class="chat-typing-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      `;
      this.$chat_space_container.append(typing_html);
      scroll_to_bottom(this.$chat_space_container);
    };

  frappe.Chat.space.constructor.prototype.hide_typing_indicator = function () {
    $('.chat-typing-indicator').remove();
  };
};

// Listen for ChatSpace initialization
$(document).on('chatspace:initialized', function (_event, chatSpace) {
  frappe.Chat.space = chatSpace;

  // Initialize the MCP client extension
  frappe.Chat.initMCPClientExtension();

  // If this is a guest/non-admin chat, show welcome message
  if (!chatSpace.profile.is_admin) {
    chatSpace.display_message({
      content:
        "สวัสดีครับ! I'm your Thai Tax Consultant Bot. How can I help you with tax or accounting questions today? Type /help to see available commands.",
      creation: new Date(),
      sender: 'Thai Tax Bot',
      sender_email: 'taxbot@system.local',
    });
  }
});

// Initialize the chat
$(function () {
  // The original Chat initialization will still work
  // We just need to trigger our event when ChatSpace is created
  const originalChatSpace = ChatSpace;

  // Override the constructor to notify when it's initialized
  window.ChatSpace = function (...args) {
    const instance = new originalChatSpace(...args);
    $(document).trigger('chatspace:initialized', [instance]);
    return instance;
  };

  // Copy the prototype
  window.ChatSpace.prototype = originalChatSpace.prototype;
});
