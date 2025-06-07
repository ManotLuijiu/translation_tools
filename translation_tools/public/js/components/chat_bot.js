// chat_bot.js
export default class ChatBot {
  constructor(opts) {
    this.$wrapper = opts.$wrapper;
    this.profile = opts.profile;
    this.messages = [];
    this.mcpEnabled = false;
    this.setup();
  }

  setup() {
    this.$chat_bot = $(document.createElement('div'));
    this.$chat_bot.addClass('chat-space');

    // Setup header
    this.setup_header();

    // Setup message container
    this.$chat_space_container = $(document.createElement('div'));
    this.$chat_space_container.addClass('chat-space-container');
    this.$chat_bot.append(this.$chat_space_container);

     // Check MCP server status
    this.check_mcp_status();

    // Add initial AI greeting
    this.add_message(
      "Hello! I'm your AI Tax Assistant. How can I help you today?",
      'sender'
    );

    // Setup input area
    this.setup_actions();
  }

  setup_header() {
    const header_html = `
        <div class='chat-header'>
          <div class='chat-profile-info'>
            <div class='chat-profile-name'>
            ${__('AI Tax Consultant')} 
            <span id="mcp-status-badge" class="badge badge-warning ml-2" style="display: none;">MCP Off</span>
            </div>
            <div class='chat-profile-status'>${__('Online')}</div>
          </div>
          <div class="chat-header-actions">
            <button id="toggle-mcp-button" class="btn btn-sm btn-default">
              <span class="mcp-toggle-text">Enable MCP</span>
            </button>
          </div>
        </div>
      `;
    this.$chat_bot.append(header_html);
  }

  setup_actions() {
    this.$chat_actions = $(document.createElement('div'));
    this.$chat_actions.addClass('chat-space-actions');
    const chat_actions_html = `
        <input class='form-control type-message' 
          type='search' 
          placeholder='${__('Type your tax question here...')}'
        >
        <div>
          <span class='message-send-button'>
            <svg xmlns="http://www.w3.org/2000/svg" width="1.1rem" height="1.1rem" viewBox="0 0 24 24">
              <path d="M24 0l-6 22-8.129-7.239 7.802-8.234-10.458 7.227-7.215-1.754 24-12zm-15 16.668v7.332l3.258-4.431-3.258-2.901z"/>
            </svg>
          </span>
        </div>
      `;
    this.$chat_actions.html(chat_actions_html);
    this.$chat_bot.append(this.$chat_actions);
  }

   async check_mcp_status() {
    // Check if MCP client is available and initialized
    if (typeof frappe.chat_mcp !== 'undefined') {
      try {
        // Wait for initialization if needed
        if (!frappe.chat_mcp.isRunning) {
          await frappe.chat_mcp.initMCPStatus();
        }
        
        this.mcpEnabled = frappe.chat_mcp.isRunning();
        this.update_mcp_ui();
      } catch (error) {
        console.error("Error checking MCP status:", error);
        this.mcpEnabled = false;
        this.update_mcp_ui();
      }
    } else {
      console.warn("MCP client not available");
      this.mcpEnabled = false;
      this.update_mcp_ui();
    }
  }

  update_mcp_ui() {
    // Update UI elements based on MCP status
    const $badge = $('#mcp-status-badge');
    const $button = $('#toggle-mcp-button');
    const $buttonText = $button.find('.mcp-toggle-text');
    
    if (this.mcpEnabled) {
      $badge.removeClass('badge-warning').addClass('badge-success').text('MCP On').show();
      $buttonText.text('Disable MCP');
      $button.removeClass('btn-default').addClass('btn-primary');
    } else {
      $badge.removeClass('badge-success').addClass('badge-warning').text('MCP Off').show();
      $buttonText.text('Enable MCP');
      $button.removeClass('btn-primary').addClass('btn-default');
    }
  }

  async toggle_mcp() {
    try {
      if (this.mcpEnabled) {
        // Turn off MCP
        const result = await frappe.chat_mcp.stopMCPServer();
        if (result.success) {
          this.mcpEnabled = false;
          this.add_message("MCP server has been disabled. I'll now respond using my standard capabilities.", 'sender');
        } else {
          this.add_message(`Failed to disable MCP server: ${result.message || 'Unknown error'}`, 'sender');
        }
      } else {
        // Turn on MCP
        this.add_message("Starting MCP server. This might take a moment...", 'sender');
        const result = await frappe.chat_mcp.startMCPServer();
        if (result.success) {
          this.mcpEnabled = true;
          this.add_message("MCP server is now enabled! I can now help you with your ERPNext data and operations.", 'sender');
        } else {
          this.add_message(`Failed to enable MCP server: ${result.message || 'Unknown error'}`, 'sender');
        }
      }
      
      this.update_mcp_ui();
    } catch (error) {
      console.error("Error toggling MCP:", error);
      this.add_message(`Error toggling MCP server: ${error.message || 'Unknown error'}`, 'sender');
    }
  }

  add_message(content, type) {
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const message_class =
      type === 'recipient' ? 'recipient-message' : 'sender-message';

    const $message_element = $(`
        <div class='${message_class}'>
          <div class='message-bubble'>${content}</div>
          <div class='message-time'>${time}</div>
        </div>
      `);

    this.$chat_space_container.append($message_element);
    this.scroll_to_bottom();

    // Save message to history
    this.messages.push({
      content: content,
      type: type,
      time: time,
    });
  }

  scroll_to_bottom() {
    this.$chat_space_container.animate(
      {
        scrollTop: this.$chat_space_container[0].scrollHeight,
      },
      300
    );
  }

  async handle_user_message(message) {
    if (!message.trim()) return;

    // Add user message to chat
    this.add_message(message, 'recipient');

    // Clear input
    $('.type-message').val('');

    // Show typing indicator
    this.show_typing_indicator();

    try {
      let response;
      
      if (this.mcpEnabled && frappe.chat_mcp && frappe.chat_mcp.isRunning()) {
        // Use MCP for the response
        response = await this.get_mcp_response(message);
      } else {
        // Use standard AI service
        response = await this.get_standard_ai_response(message);
      }
      
      // Hide typing indicator
      this.hide_typing_indicator();
      
      // Add response to chat
      this.add_message(response, 'sender');
    } catch (error) {
      console.error("Error processing message:", error);
      this.hide_typing_indicator();
      this.add_message(
        "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        'sender'
      );
    }
  }

  async get_mcp_response(message) {
    try {
      // Query the MCP server through our client
      const result = await frappe.chat_mcp.queryMCP(message, {
        chat_history: this.messages.slice(-10) // Send recent chat history for context
      });
      
      if (result.error) {
        return `I encountered an error while processing your request: ${result.error}. You may need to restart the MCP server or check the server logs.`;
      }
      
      return result.response || "I processed your request through the MCP server, but didn't receive a clear response. Please check the server logs or try again.";
    } catch (error) {
      console.error("MCP response error:", error);
      return `I encountered an error while communicating with the MCP server: ${error.message || 'Unknown error'}. Please check if the server is running correctly.`;
    }
  }

  async get_standard_ai_response(message) {
    // For demonstration, using a timeout to simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        if (message.toLowerCase().includes('sales invoice') || 
            message.toLowerCase().includes('invoice') || 
            message.toLowerCase().includes('order') ||
            message.toLowerCase().includes('enable mcp')) {
          resolve("I see you're asking about ERPNext data. To help you with that, please enable MCP using the button at the top right. Once enabled, I can access your ERPNext data and help you query invoices, customers, and more.");
        } else if (message.toLowerCase().includes('tax')) {
          resolve("I can answer general tax questions, but for specific tax calculations or to query your ERPNext tax data, please enable MCP first using the button at the top right.");
        } else {
          resolve("Thank you for your message. I'm your AI Tax Consultant and can help with a variety of tax and accounting questions. For more advanced features like accessing your ERPNext data, please enable MCP using the button at the top right.");
        }
      }, 1500);
    });
  }

  show_typing_indicator() {
    // Add typing indicator to chat
    this.$chat_space_container.append(`
        <div class='typing-indicator sender-message'>
          <div class='message-bubble'>
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      `);
    this.scroll_to_bottom();
  }

  hide_typing_indicator() {
    $('.typing-indicator').remove();
  }

  setup_events() {
    const me = this;

     // MCP toggle button
    $('#toggle-mcp-button').on('click', function() {
      me.toggle_mcp();
    });

    // Send message on button click
    $('.message-send-button').on('click', function () {
      const message = $('.type-message').val();
      me.handle_user_message(message);
    });

    // Send message on Enter key
    $('.type-message').keydown(function (e) {
      if (e.which === 13) {
        const message = $(this).val();
        me.handle_user_message(message);
      }
    });
  }

  render() {
    this.$wrapper.html(this.$chat_bot);
    this.setup_events();
    this.scroll_to_bottom();
  }
}
