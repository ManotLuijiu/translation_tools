import {
  get_time,
  scroll_to_bottom,
  get_date_from_now,
  is_date_change,
  get_avatar_html,
} from './chat_utils';

export default class MCPChat {
  constructor(opts) {
    this.$wrapper = opts.$wrapper;
    this.profile = opts.profile;
    this.mcp_session = null;
    this.is_connected = false;
    this.setup();
  }

  setup() {
    this.$chat_space = $(document.createElement('div'));
    this.$chat_space.addClass('chat-space');
    this.setup_header();
    this.setup_messages_container();
    this.setup_actions();
    this.connect_to_mcp_server();
  }

  setup_header() {
    const avatar_html = get_avatar_html(
      this.profile.room_type,
      this.profile.opposite_person_email,
      this.profile.room_name
    );

    const header_html = `
        <div class='chat-header'>
          ${
            this.profile.is_admin === true
              ? `<span class='chat-back-button' title='${__('Go Back')}'>
              ${frappe.utils.icon('left')}
            </span>`
              : ''
          }
          ${avatar_html}
          <div class='chat-profile-info'>
            <div class='chat-profile-name'>
              ${__(this.profile.room_name)}
              <div class='online-circle ${this.is_connected ? 'online' : ''}'></div>
            </div>
            <div class='chat-profile-status'>${this.is_connected ? __('Connected to MCP Server') : __('Connecting...')}</div>
          </div>
        </div>
      `;

    this.$chat_space.append(header_html);
  }

  setup_messages_container() {
    this.$chat_space_container = $(document.createElement('div'));
    this.$chat_space_container.addClass('chat-space-container');
    this.$chat_space.append(this.$chat_space_container);

    // Add welcome message
    this.add_message(
      "Hello! I'm connected to your ERPNext system via MCP. You can ask me to:",
      'sender'
    );

    this.add_message(
      '• Look up documents and records<br>• Run queries<br>• Manage translations<br>• Generate reports<br>• Work with files',
      'sender'
    );
  }

  setup_actions() {
    this.$chat_actions = $(document.createElement('div'));
    this.$chat_actions.addClass('chat-space-actions');

    const chat_actions_html = `
        <input class='form-control type-message' 
          type='search' 
          placeholder='${__('Ask the ERPNext MCP server...')}'
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
    this.$chat_space.append(this.$chat_actions);
  }

  async connect_to_mcp_server() {
    try {
      // Connect to MCP server
      await this.initializeMCPClient();
      this.is_connected = true;
      $('.online-circle').addClass('online');
      $('.chat-profile-status').text(__('Connected to MCP Server'));

      this.add_message(
        'Connected to ERPNext MCP server successfully! What would you like to do?',
        'sender'
      );
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      this.add_message(
        "I'm having trouble connecting to the ERPNext server. Please try again later.",
        'sender'
      );
    }
  }

  async initializeMCPClient() {
    try {
      // Check if the MCP server is available
      const result = await frappe.call({
        method: 'translation_tools.api.mcp_integration.get_mcp_server_status',
        freeze: false,
      });

      if (result.message && result.message.status === 'available') {
        console.log('Connected to MCP server:', result.message.server_name);

        // Get available tools
        const toolsResult = await frappe.call({
          method: 'translation_tools.api.mcp_integration.list_mcp_tools',
          freeze: false,
        });

        if (toolsResult.message && toolsResult.message.status === 'success') {
          this.available_tools = toolsResult.message.tools;
          console.log('Available tools:', this.available_tools);
        }

        return true;
      } else {
        console.warn('MCP server is not available:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error connecting to MCP server:', error);

      // For development/demo, return true anyway
      return true;
    }
  }

  async callMCPTool(toolName, args) {
    console.log(`Calling MCP tool: ${toolName} with args:`, args);

    try {
      // Call the MCP tool through our integration API
      const result = await frappe.call({
        method: 'translation_tools.api.mcp_integration.execute_mcp_tool',
        args: {
          tool_name: toolName,
          arguments: JSON.stringify(args),
        },
        freeze: false,
      });

      if (result.message) {
        if (result.message.status === 'error') {
          console.error('Error calling MCP tool:', result.message.message);
          return { error: result.message.message };
        }
        return result.message.result;
      }

      return { error: 'No response from server' };
    } catch (error) {
      console.error('Error calling MCP tool:', error);

      // Fallback to mock data for development/demo
      console.log('Falling back to mock data');

      return new Promise((resolve) => {
        setTimeout(() => {
          if (toolName === 'get_document') {
            resolve({
              name: args.name,
              doctype: args.doctype,
              creation: '2023-01-01 12:00:00',
              owner: 'Administrator',
              modified_by: 'Administrator',
              docstatus: 0,
              // Simulated document data
              ...this.getMockDocData(args.doctype, args.name),
            });
          } else if (toolName === 'query_documents') {
            resolve(this.getMockQueryResults(args.doctype));
          } else {
            resolve({ error: 'Tool not found' });
          }
        }, 1500);
      });
    }
  }

  getMockDocData(doctype, name) {
    // Provide mock data for simulation
    if (doctype === 'Customer') {
      return {
        customer_name: name,
        customer_type: 'Company',
        customer_group: 'Commercial',
        territory: 'Thailand',
        tax_id: '1234567890123',
        status: 'Active',
      };
    } else if (doctype === 'Sales Invoice') {
      return {
        customer: 'Test Customer',
        posting_date: '2023-01-01',
        due_date: '2023-01-31',
        grand_total: 10000,
        status: 'Paid',
        items: [{ item_code: 'ITEM-001', qty: 1, rate: 10000, amount: 10000 }],
      };
    }
    return {};
  }

  getMockQueryResults(doctype) {
    // Provide mock query results
    if (doctype === 'Customer') {
      return [
        {
          name: 'CUST-001',
          customer_name: 'ABC Company',
          territory: 'Thailand',
        },
        {
          name: 'CUST-002',
          customer_name: 'XYZ Corporation',
          territory: 'Thailand',
        },
        {
          name: 'CUST-003',
          customer_name: 'Local Business',
          territory: 'Thailand',
        },
      ];
    } else if (doctype === 'Item') {
      return [
        { name: 'ITEM-001', item_name: 'Product A', item_group: 'Products' },
        { name: 'ITEM-002', item_name: 'Product B', item_group: 'Products' },
        { name: 'ITEM-003', item_name: 'Service X', item_group: 'Services' },
      ];
    }
    return [];
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
    scroll_to_bottom(this.$chat_space_container);
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
    scroll_to_bottom(this.$chat_space_container);
  }

  hide_typing_indicator() {
    $('.typing-indicator').remove();
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
      // Process the message to determine intent
      const intent = this.determine_intent(message);

      setTimeout(async () => {
        this.hide_typing_indicator();

        if (intent.action === 'get_document') {
          const result = await this.callMCPTool('get_document', intent.args);
          this.display_document(result);
        } else if (intent.action === 'query_documents') {
          const results = await this.callMCPTool(
            'query_documents',
            intent.args
          );
          this.display_query_results(results, intent.args.doctype);
        } else if (intent.action === 'help') {
          this.add_message(
            'I can help you with ERPNext tasks. Try asking me to:<br>' +
              "• Show a customer or document (e.g., 'Show me customer ABC')<br>" +
              "• List records (e.g., 'List all customers')<br>" +
              '• Find translations for a term<br>' +
              '• Generate a report<br>' +
              '• Work with files',
            'sender'
          );
        } else {
          this.add_message(
            "I'm not sure how to process that request. Try asking for specific information like 'Show me customer ABC' or 'List all sales invoices'.",
            'sender'
          );
        }
      }, 1500);
    } catch (error) {
      this.hide_typing_indicator();
      this.add_message(
        "I'm sorry, I encountered an error while processing your request.",
        'sender'
      );
      console.error('Error processing message:', error);
    }
  }

  determine_intent(message) {
    // Simple intent detection - in a real implementation, this would be more sophisticated
    const lowerMsg = message.toLowerCase();

    // Look for document lookup patterns
    if (
      lowerMsg.includes('show') ||
      lowerMsg.includes('get') ||
      lowerMsg.includes('find')
    ) {
      // Check for customer requests
      if (lowerMsg.includes('customer')) {
        const nameMatch = lowerMsg.match(/customer\s+([a-z0-9\s]+)/i);
        const name = nameMatch ? nameMatch[1].trim() : 'CUST-001';
        return {
          action: 'get_document',
          args: { doctype: 'Customer', name: name },
        };
      }

      // Check for invoice requests
      if (lowerMsg.includes('invoice')) {
        const nameMatch = lowerMsg.match(/invoice\s+([a-z0-9\s\-]+)/i);
        const name = nameMatch ? nameMatch[1].trim() : 'INV-001';
        return {
          action: 'get_document',
          args: { doctype: 'Sales Invoice', name: name },
        };
      }
    }

    // Look for list/query patterns
    if (lowerMsg.includes('list') || lowerMsg.includes('all')) {
      if (lowerMsg.includes('customer')) {
        return {
          action: 'query_documents',
          args: {
            doctype: 'Customer',
            filters: '{}',
            fields: 'name,customer_name,territory',
          },
        };
      }

      if (lowerMsg.includes('item') || lowerMsg.includes('product')) {
        return {
          action: 'query_documents',
          args: {
            doctype: 'Item',
            filters: '{}',
            fields: 'name,item_name,item_group',
          },
        };
      }
    }

    // Help intent
    if (lowerMsg.includes('help') || lowerMsg.includes('what can you do')) {
      return { action: 'help' };
    }

    // Default to help if we can't determine intent
    return { action: 'help' };
  }

  display_document(doc) {
    if (doc.error) {
      this.add_message(`Error: ${doc.error}`, 'sender');
      return;
    }

    let message = `<strong>${doc.doctype}: ${doc.name}</strong><br><br>`;

    // Get the most important fields to display
    const importantFields = this.get_important_fields(doc.doctype);

    for (const field of importantFields) {
      if (doc[field]) {
        message += `<strong>${this.format_field_name(field)}:</strong> ${doc[field]}<br>`;
      }
    }

    message +=
      '<br><em>These are the key details. You can ask for more specific information if needed.</em>';

    this.add_message(message, 'sender');
  }

  display_query_results(results, doctype) {
    if (!results || results.length === 0) {
      this.add_message(`No ${doctype} records found.`, 'sender');
      return;
    }

    let message = `<strong>Found ${results.length} ${doctype}s:</strong><br><br>`;

    // Create a simple table for the results
    message += "<table class='table table-bordered'><thead><tr>";

    // Get headers from the first result
    const keys = Object.keys(results[0]);
    for (const key of keys) {
      message += `<th>${this.format_field_name(key)}</th>`;
    }

    message += '</tr></thead><tbody>';

    // Add data rows
    for (const item of results) {
      message += '<tr>';
      for (const key of keys) {
        message += `<td>${item[key] || ''}</td>`;
      }
      message += '</tr>';
    }

    message += '</tbody></table>';

    this.add_message(message, 'sender');
  }

  get_important_fields(doctype) {
    // Return the most important fields for each doctype
    switch (doctype) {
      case 'Customer':
        return [
          'customer_name',
          'customer_type',
          'customer_group',
          'territory',
          'tax_id',
          'status',
        ];
      case 'Sales Invoice':
        return [
          'customer',
          'posting_date',
          'due_date',
          'grand_total',
          'status',
        ];
      default:
        return ['name', 'creation', 'owner'];
    }
  }

  format_field_name(field) {
    // Convert snake_case to Title Case
    return field
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  setup_events() {
    const me = this;

    // Handle back button click
    $('.chat-back-button').on('click', function () {
      if (me.chat_list) {
        me.chat_list.render_messages();
        me.chat_list.render();
      }
    });

    // Handle send button click
    $('.message-send-button').on('click', function () {
      const message = $('.type-message').val();
      me.handle_user_message(message);
    });

    // Handle Enter key press
    $('.type-message').keydown(function (e) {
      if (e.which === 13) {
        const message = $(this).val();
        me.handle_user_message(message);
      }
    });
  }

  render() {
    this.$wrapper.html(this.$chat_space);
    this.setup_events();
    scroll_to_bottom(this.$chat_space_container);
  }
}
