import {
  get_time,
  scroll_to_bottom,
  get_messages,
  get_date_from_now,
  is_date_change,
  send_message,
  set_typing,
  is_image,
  get_avatar_html,
} from './chat_utils';

// MCP Configuration - Add at the top of the file
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

export default class ChatSpace {
  constructor(opts) {
    this.chat_list = opts.chat_list;
    this.$wrapper = opts.$wrapper;
    this.profile = opts.profile;
    this.file = null;

    // Add MCP-specific properties
    this.is_processing = false;
    this.conversation_context = [];
    this.last_query = null;

    this.setup();

    // Store a reference to this instance
    frappe.Chat.space = this;
  }

  setup() {
    this.$chat_space = $(document.createElement('div'));
    this.typing = false;
    this.$chat_space.addClass('chat-space');
    this.setup_header();
    this.fetch_and_setup_messages();
    this.setup_socketio();
  }

  setup_header() {
    this.avatar_html = get_avatar_html(
      this.profile.room_type,
      this.profile.opposite_person_email,
      this.profile.room_name
    );
    const header_html = `
              <div class='chat-header'>
                  ${
                    this.profile.is_admin === true
                      ? `<span class='chat-back-button' title='${__('Go Back')}' >
                                  ${frappe.utils.icon('left')}
                              </span>`
                      : ``
                  }
                  ${this.avatar_html}
                  <div class='chat-profile-info'>
                      <div class='chat-profile-name'>
                      ${__(this.profile.room_name)}
                      <div class='online-circle'></div>
                      </div>
                      <div class='chat-profile-status'>${__('Typing...')}</div>
                  </div>
              </div>
          `;
    this.$chat_space.append(header_html);
  }

  async fetch_and_setup_messages() {
    try {
      const res = await get_messages(
        this.profile.room,
        this.profile.user_email
      );
      this.setup_messages(res);
      this.setup_actions();
      this.render();

      // Show welcome message for Thai Tax Bot if not admin
      if (!this.profile.is_admin) {
        this.display_message({
          content:
            "สวัสดีค่ะ! I'm your Thai Tax Consultant Bot. How can I help you with tax or accounting questions today? Type /help to see available commands.",
          creation: new Date(),
          sender: 'Thai Tax Bot',
          sender_email: 'taxbot@system.local',
        });
      }
    } catch (error) {
      frappe.msgprint({
        title: __('Error'),
        message: __(
          `Something went wrong. Please refresh and try again. ${error}`
        ),
      });
    }
  }

  setup_messages(messages_list) {
    this.$chat_space_container = $(document.createElement('div'));
    this.$chat_space_container.addClass('chat-space-container');

    this.make_messages_html(messages_list);

    this.$chat_space_container.html(this.message_html);
    this.$chat_space.append(this.$chat_space_container);
  }

  make_messages_html(messages_list) {
    this.prevMessage = {};
    this.message_html = ``;
    if (this.profile.message) {
      messages_list.push(this.profile.message);
      send_message(
        this.profile.message.content,
        this.profile.user,
        this.profile.room,
        this.profile.user_email
      );
    }
    messages_list.forEach((element) => {
      const date_line_html = this.make_date_line_html(element.creation);
      this.message_html += date_line_html;

      let message_type = 'sender';

      if (element.sender_email === this.profile.user_email) {
        message_type = 'recipient';
      } else if (this.profile.room_type === 'Guest') {
        if (this.profile.is_admin === true && element.sender !== 'Guest') {
          message_type = 'recipient';
        }
      }
      this.message_html += this.make_message(
        element.content,
        get_time(element.creation),
        message_type,
        element.sender
      ).prop('outerHTML');

      this.prevMessage = element;
    });
  }

  make_date_line_html(dateObj) {
    let result = `
              <div class='date-line'>
                  <span>
                      ${__(get_date_from_now(dateObj, 'space'))}
                  </span>
              </div>
          `;
    if ($.isEmptyObject(this.prevMessage)) {
      return result;
    } else if (is_date_change(dateObj, this.prevMessage.creation)) {
      return result;
    } else {
      return '';
    }
  }

  setup_actions() {
    this.$chat_actions = $(document.createElement('div'));
    this.$chat_actions.addClass('chat-space-actions');
    const chat_actions_html = `
              <span class='open-attach-items'>
                  ${frappe.utils.icon('attachment', 'lg')}
              </span>
              <input type='file' id='chat-file-uploader' 
                  accept='image/*, application/pdf, .doc, .docx'
                  style='display: none;'
              >
              <input class='form-control type-message' 
                  type='search' 
                  placeholder='${__('Type message')}'
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

  async handle_upload_file(file) {
    const dataurl = await frappe.dom.file_to_base64(file.file_obj);
    file.dataurl = dataurl;
    file.name = file.file_obj.name;
    return this.upload_file(file);
  }

  upload_file(file) {
    const me = this;
    return new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('load', () => {
        resolve();
      });

      xhr.addEventListener('error', () => {
        reject(frappe.throw(__('Internal Server Error')));
      });
      xhr.onreadystatechange = () => {
        if (xhr.readyState == XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            let r = null;
            let file_doc = null;
            try {
              r = JSON.parse(xhr.responseText);
              if (r.message.doctype === 'File') {
                file_doc = r.message;
              }
            } catch (e) {
              console.error(e);
              r = xhr.responseText;
            }
            try {
              if (file_doc === null) {
                reject(frappe.throw(__('File upload failed!')));
              }
              me.handle_send_message(file_doc.file_url);
            } catch (error) {
              console.error(error);
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              const messages = JSON.parse(error._server_messages);
              const errorObj = JSON.parse(messages[0]);
              reject(frappe.throw(__(errorObj.message)));
            } catch (e) {
              console.error(e);
            }
          }
        }
      };

      xhr.open('POST', '/api/method/upload_file', true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token);

      let form_data = new FormData();

      form_data.append('file', file.file_obj, file.name);
      form_data.append('is_private', +false);

      form_data.append('doctype', 'Chat Room');
      form_data.append('docname', this.profile.room);
      form_data.append('optimize', +true);
      xhr.send(form_data);
    });
  }

  setup_events() {
    const me = this;

    //Timeout function
    me.typing_timeout = () => {
      me.typing = false;
    };

    $('.chat-back-button').on('click', function () {
      me.chat_list.render_messages();
      me.chat_list.render();
    });

    $('.open-attach-items').on('click', function () {
      $('#chat-file-uploader').click();
    });

    $('#chat-file-uploader').on('change', function () {
      if (this.files.length > 0) {
        me.file = {};
        me.file.file_obj = this.files[0];
        me.handle_upload_file(me.file);
        me.file = null;
      }
    });

    $('.message-send-button').on('click', function () {
      me.handle_send_message();
    });

    $('.type-message').keydown(function (e) {
      if (e.which === 13) {
        me.handle_send_message();
      } else {
        //Set as typing
        if (me.typing === false) {
          me.typing = true;
          set_typing(
            me.profile.room,
            me.profile.user_email,
            me.typing,
            !me.profile.is_admin
          );
          me.timeout = setTimeout(me.typing_timeout, 3000);
        }
      }
    });
  }

  setup_socketio() {
    const me = this;

    frappe.realtime.on(this.profile.room, function (res) {
      me.receive_message(res, get_time(res.creation));
    });

    frappe.realtime.on(this.profile.room + ':typing', function (res) {
      me.get_typing_changes(res);
    });
  }

  destroy_socket_events() {
    frappe.realtime.off(this.profile.room);
    frappe.realtime.off(this.profile.room + ':typing');
  }

  get_typing_changes(res) {
    if (res.user != this.profile.user_email) {
      if (
        (this.profile.is_admin === true && res.is_guest === 'true') ||
        this.profile.is_admin === false ||
        this.profile.room_type === 'Group' ||
        this.profile.room_type === 'Direct'
      ) {
        if (res.is_typing === 'false') {
          $('.chat-profile-status').css('visibility', 'hidden');
        } else {
          $('.chat-profile-status').css('visibility', 'visible');
          setTimeout(() => {
            $('.chat-profile-status').css('visibility', 'hidden');
          }, 3000);
        }
      }
    }
  }

  make_message(content, time, type, name) {
    const message_class =
      type === 'recipient' ? 'recipient-message' : 'sender-message';
    const $recipient_element = $(document.createElement('div')).addClass(
      message_class
    );
    const $message_element = $(document.createElement('div')).addClass(
      'message-bubble'
    );

    const $name_element = $(document.createElement('div'))
      .addClass('message-name')
      .text(name);

    const n = content.lastIndexOf('/');
    const file_name = content.substring(n + 1) || '';
    let $sanitized_content;

    if (content.startsWith('/files/') && file_name !== '') {
      let $url;
      if (is_image(file_name)) {
        $url = $(document.createElement('img'));
        $url.attr({ src: content }).addClass('img-responsive chat-image');
        $message_element.css({ padding: '0px', background: 'inherit' });
        $name_element.css({
          color: 'var(--text-muted)',
          'padding-bottom': 'var(--padding-xs)',
        });
      } else {
        $url = $(document.createElement('a'));
        $url.attr({ href: content, target: '_blank' }).text(__(file_name));

        if (type === 'sender') {
          $url.css('color', 'var(--cyan-100)');
        }
      }
      $sanitized_content = $url;
    } else {
      // Support Markdown in messages
      if (name === 'Thai Tax Bot') {
        try {
          $sanitized_content = $('<div>').html(marked.parse(content));
        } catch (e) {
          console.error(e);
          $sanitized_content = __($('<div>').text(content).html());
        }
      } else {
        $sanitized_content = __($('<div>').text(content).html());
      }
    }

    if (type === 'sender' && this.profile.room_type === 'Group') {
      $message_element.append($name_element);
    }
    $message_element.append($sanitized_content);
    $recipient_element.append($message_element);
    $recipient_element.append(`<div class='message-time'>${__(time)}</div>`);

    return $recipient_element;
  }

  display_message(message) {
    const message_type =
      message.sender_email === this.profile.user_email ? 'recipient' : 'sender';
    const sender = message.sender;

    // If it's the bot message, add a special class
    const message_element = this.make_message(
      message.content,
      get_time(message.creation),
      message_type,
      sender
    );

    if (sender === 'Thai Tax Bot') {
      message_element.addClass('bot');
    }

    this.$chat_space_container.append(message_element);
    scroll_to_bottom(this.$chat_space_container);

    return message_element;
  }

  handle_send_message(attachment) {
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

    // For non-admin users, process with MCP
    if (!this.profile.is_admin) {
      // Display user message
      this.display_message({
        content: content,
        creation: new Date(),
        sender: this.profile.user,
        sender_email: this.profile.user_email,
      });

      // Clear input
      $type_message.val('');

      // Show typing indicator
      this.display_typing_indicator();

      // Process with MCP
      this.process_with_mcp(content, this.profile.room_name)
        .then((response) => {
          // Display assistant response
          this.display_message({
            content: response,
            creation: new Date(),
            sender: 'Thai Tax Bot',
            sender_email: 'taxbot@system.local',
          });
        })
        .catch((error) => {
          console.error('Error processing message:', error);
          this.display_message({
            content:
              "I'm sorry, I encountered an error processing your request. Please try again.",
            creation: new Date(),
            sender: 'Thai Tax Bot',
            sender_email: 'taxbot@system.local',
          });
        })
        .finally(() => {
          this.hide_typing_indicator();
        });
    } else {
      // For admins, use normal message sending
      if (frappe.Chat.settings.user.enable_message_tone === 1) {
        frappe.utils.play_sound('chat-message-send');
      }

      this.$chat_space_container.append(
        this.make_message(content, get_time(), 'recipient', this.profile.user)
      );
      $type_message.val('');
      scroll_to_bottom(this.$chat_space_container);
      send_message(
        content,
        this.profile.user,
        this.profile.room,
        this.profile.user_email
      );
    }
  }

  receive_message(res, time) {
    let chat_type = 'sender';
    if (res.sender_email === this.profile.user_email) {
      return;
    }

    if (
      this.profile.is_admin === true &&
      $('.chat-element').is(':visible') &&
      frappe.Chat.settings.user.enable_message_tone === 1
    ) {
      frappe.utils.play_sound('chat-message-receive');
    }

    if (this.profile.room_type === 'Guest') {
      if (this.profile.is_admin === true && res.user !== 'Guest') {
        chat_type = 'recipient';
      }
    }

    this.$chat_space_container.append(
      this.make_message(res.content, time, chat_type, res.user)
    );
    scroll_to_bottom(this.$chat_space_container);
  }

  render() {
    this.$wrapper.html(this.$chat_space);
    this.setup_events();

    scroll_to_bottom(this.$chat_space_container);

    // Add CSS for token-based system
    this.add_token_ui_styles();
  }

  // MCP-specific methods
  async process_with_mcp(message, roomName) {
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
        const result = await this.handle_special_command(message, roomName);
        this.is_processing = false;
        return result;
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
  }

  display_typing_indicator() {
    const typing_html = `
      <div class="chat-typing-indicator">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    this.$chat_space_container.append(typing_html);
    scroll_to_bottom(this.$chat_space_container);
  }

  hide_typing_indicator() {
    $('.chat-typing-indicator').remove();
  }

  async handle_special_command(command, roomName) {
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
  }

  async call_mcp_tool(toolName, args) {
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
  }

  async use_mcp_prompt(promptName, args) {
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
  }

  async get_mcp_resource(resourceUrl) {
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
  }

  format_tax_law_results(results) {
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
  }

  format_tax_calculation(calculation) {
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
  }

  get_help_message() {
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
  }

  // Add CSS styles for token UI and bot messages
  add_token_ui_styles() {
    if ($('#mcp-styles').length) return;

    $('<style id="mcp-styles">')
      .prop('type', 'text/css')
      .html(`
        /* Bot styling */
        .bot .message-bubble {
          background-color: var(--blue-100);
          border-radius: 0.5rem;
        }
        
        /* Typing indicator */
        .chat-typing-indicator {
          display: flex;
          align-items: center;
          padding: 10px;
          margin: 5px 0;
          width: fit-content;
        }
        
        .chat-typing-indicator .dot {
          height: 8px;
          width: 8px;
          margin: 0 2px;
          background-color: var(--text-muted);
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.5s infinite ease-in-out;
        }
        
        .chat-typing-indicator .dot:nth-child(1) {
          animation-delay: 0s;
        }
        
        .chat-typing-indicator .dot:nth-child(2) {
          animation-delay: 0.3s;
        }
        
        .chat-typing-indicator .dot:nth-child(3) {
          animation-delay: 0.6s;
        }
        
        @keyframes pulse {
          0%, 50%, 100% { transform: scale(1); opacity: 1; }
          25%, 75% { transform: scale(1.5); opacity: 0.5; }
        }
        
        /* Token display */
        .token-info {
          display: flex;
          align-items: center;
          margin-left: 15px;
          font-size: 14px;
        }
        
        .token-count {
          font-weight: bold;
          color: #4caf50;
          margin-right: 5px;
        }
        
        .token-label {
          color: #666;
          margin-right: 10px;
        }
        
        .buy-tokens-link {
          color: #2196f3;
          text-decoration: none;
          font-size: 13px;
        }
        
        .token-cost-indicator {
          font-size: 11px;
          color: #888;
          margin-top: 4px;
          text-align: right;
        }
        
        .token-tooltip {
          position: relative;
          display: inline-block;
          margin-left: 8px;
          cursor: help;
        }
        
        .token-tooltip-content {
          visibility: hidden;
          width: 220px;
          background-color: #555;
          color: #fff;
          text-align: left;
          border-radius: 6px;
          padding: 8px 12px;
          position: absolute;
          z-index: 1;
          bottom: 125%;
          left: 50%;
          margin-left: -110px;
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 12px;
        }
        
        .token-tooltip-content ul {
          margin: 5px 0 0 0;
          padding-left: 20px;
        }
        
        .token-tooltip-content::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #555 transparent transparent transparent;
        }
        
        .token-tooltip:hover .token-tooltip-content {
          visibility: visible;
          opacity: 1;
        }
        
        /* Markdown styling for bot messages */
        .bot .message-bubble h1,
        .bot .message-bubble h2,
        .bot .message-bubble h3,
        .bot .message-bubble h4,
        .bot .message-bubble h5,
        .bot .message-bubble h6 {
          margin-top: 10px;
          margin-bottom: 5px;
          font-weight: 600;
        }
        
        .bot .message-bubble h1 { font-size: 1.5em; }
        .bot .message-bubble h2 { font-size: 1.3em; }
        .bot .message-bubble h3 { font-size: 1.1em; }
        
        .bot .message-bubble p {
          margin-bottom: 8px;
        }
        
        .bot .message-bubble code {
          background-color: #f0f0f0;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }
        
        .bot .message-bubble pre {
          background-color: #f5f5f5;
          padding: 8px;
          border-radius: 5px;
          overflow-x: auto;
        }
        
        .bot .message-bubble ul,
        .bot .message-bubble ol {
          padding-left: 20px;
          margin-bottom: 8px;
        }
        
        .bot .message-bubble blockquote {
          border-left: 4px solid #ddd;
          padding-left: 10px;
          color: #666;
          margin: 0 0 8px 0;
        }
        
        .bot .message-bubble table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 8px;
        }
        
        .bot .message-bubble th,
        .bot .message-bubble td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
        }
        
        .bot .message-bubble th {
          background-color: #f2f2f2;
        }
      `)
      .appendTo('head');
  }

  // Token-specific methods
  update_token_display() {
    // Add token display to chat header if not exists
    if (!$('.chat-token-display').length) {
      $('.chat-header').append('<div class="chat-token-display"></div>');
    }

    frappe.call({
      method: 'translation_tools.api.message.get_token_balance',
      callback: function (r) {
        if (r.message) {
          $('.chat-token-display').html(
            `<div class="token-info">
              <span class="token-count">${r.message.token_balance}</span>
              <span class="token-label">${__('tokens remaining')}</span>
              <a href="/tokens" class="buy-tokens-link">${__('Buy More')}</a>
              <div class="token-tooltip">
                <i class="fa fa-info-circle"></i>
                <div class="token-tooltip-content">
                  <p>${__('Token Usage:')}</p>
                  <ul>
                    <li>${__('Basic questions')}: 25 ${__('tokens')}</li>
                    <li>${__('Standard advice')}: 75 ${__('tokens')}</li>
                    <li>${__('Complex consultations')}: 150 ${__('tokens')}</li>
                  </ul>
                </div>
              </div>
            </div>`
          );
        } else {
          $('.chat-token-display').html(
            `<div class="token-info">
              <a href="/login" class="login-link">${__('Login to track tokens')}</a>
            </div>`
          );
        }
      },
    });
  }

  check_tokens_before_send(callback) {
    // Skip for admin users
    if (this.profile.is_admin) {
      if (typeof callback === 'function') callback();
      return true;
    }

    frappe.call({
      method: 'translation_tools.api.message.get_token_balance',
      callback: (r) => {
        if (r.message && r.message.token_balance <= 0) {
          // Show insufficient tokens modal
          frappe.msgprint({
            title: __('Insufficient Tokens'),
            indicator: 'red',
            message: __(
              'You have run out of tokens for the Thai Tax Consultant. Would you like to purchase more tokens?'
            ),
            primary_action: {
              label: __('Purchase Tokens'),
              action: function () {
                window.location.href = '/tokens';
              },
            },
          });
          return false;
        }
        // Sufficient tokens, proceed with message sending
        if (typeof callback === 'function') callback();
        return true;
      },
    });
  }

  display_token_cost(message_element, token_cost) {
    if (!token_cost) return;

    // Add token cost indicator
    $(message_element).append(
      `<div class="token-cost-indicator">
        <span class="token-cost-value">${token_cost} ${__('tokens')}</span>
      </div>`
    );
  }
}
