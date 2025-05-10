import {
  ChatBubble,
  ChatList,
  ChatSpace,
  ChatWelcome,
  MCPChat,
  get_settings,
  scroll_to_bottom,
} from './components';
frappe.provide('frappe.Chat');
frappe.provide('frappe.Chat.settings');

/** Spawns a chat widget on any web page */
frappe.Chat = class {
  constructor() {
    this.setup_app();
  }

  /** Create all the required elements for chat widget */
  create_app() {
    this.$app_element = $(document.createElement('div'));
    this.$app_element.addClass('chat-app');
    this.$chat_container = $(document.createElement('div'));
    this.$chat_container.addClass('chat-container');
    $('body').append(this.$app_element);
    this.is_open = false;

    this.$chat_element = $(document.createElement('div'))
      .addClass('chat-element')
      .hide();

    this.$chat_element.append(`
              <span class="chat-cross-button">
                  ${frappe.utils.icon('close', 'lg')}
              </span>
          `);
    this.$chat_element.append(this.$chat_container);
    this.$chat_element.appendTo(this.$app_element);

    this.chat_bubble = new ChatBubble(this);
    this.chat_bubble.render();

    // const icon_html = `<img src="/assets/translation_tools/images/icons/sparkles.svg" class="custom-icon">`;

    const icon_svg = `
        <svg class="theme-svg" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <path class="fill-primary" d="M208,512,155.62,372.38,16,320l139.62-52.38L208,128l52.38,139.62L400,320,260.38,372.38Z"></path>
          <path class="fill-secondary" d="M88,176,64.43,111.57,0,88,64.43,64.43,88,0l23.57,64.43L176,88l-64.43,23.57Z"></path>
          <path class="fill-accent" d="M400,256l-31.11-80.89L288,144l80.89-31.11L400,32l31.11,80.89L512,144l-80.89,31.11Z"></path>
        </svg>
        `;

    const navbar_icon_html = `
          <li class='nav-item dropdown dropdown-notifications 
            dropdown-mobile chat-navbar-icon' title="Thai Tax Consult Bot" >
            ${icon_svg}
            <span class="badge" id="chat-notification-count"></span>
          </li>
      `;

    if (this.is_desk === true) {
      $('header.navbar > .container > .navbar-collapse > ul').prepend(
        navbar_icon_html
      );
    }
    this.setup_events();
  }

  /** Load dependencies and fetch the settings */
  async setup_app() {
    try {
      const token = localStorage.getItem('guest_token') || '';
      const res = await get_settings(token);

      console.log('res chat.bundle.js', res);

      this.is_admin = res.is_admin;
      this.is_desk = 'desk' in frappe;

      if (res.enable_chat === false || (!this.is_desk && this.is_admin)) {
        return;
      }

      this.create_app();
      await frappe.socketio.init(res.socketio_port);

      frappe.Chat.settings = {};
      frappe.Chat.settings.user = res.user_settings;
      frappe.Chat.settings.unread_count = 0;

      // Check if MCP integration is enabled and available
      this.check_mcp_availability(res);

      if (res.is_admin) {
        // If the user is admin, render everything
        this.chat_list = new ChatList({
          $wrapper: this.$chat_container,
          user: res.user,
          user_email: res.user_email,
          is_admin: res.is_admin,
        });
        this.chat_list.render();
      } else if (res.is_verified) {
        // If the token and ip address matches, directly render the chat space
        // Check if we should use MCP chat or regular chat
        if (this.use_mcp_client) {
          this.mcp_chat = new MCPChat({
            $wrapper: this.$chat_container,
            profile: {
              room_name: res.guest_title || 'ERPNext Assistant',
              room: res.room,
              room_type: 'Direct',
              is_admin: res.is_admin,
              user: res.user,
              user_email: res.user_email,
              opposite_person_email: 'erpassistant@system.local',
            },
          });
          this.mcp_chat.render();
        } else {
          this.chat_space = new ChatSpace({
            $wrapper: this.$chat_container,
            profile: {
              room_name: res.guest_title,
              room: res.room,
              is_admin: res.is_admin,
              user: res.user,
              user_email: res.user_email,
            },
          });
          this.chat_space.render();
        }
      } else {
        //Render the welcome screen if the user is not verified
        this.chat_welcome = new ChatWelcome({
          $wrapper: this.$chat_container,
          profile: {
            name: res.guest_title,
            is_admin: res.is_admin,
            chat_status: res.chat_status,
          },
        });
        this.chat_welcome.render();
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**!SECTION
   * Check if MCP integration is available
   * @param {Object} settings - The chat settings
   */
  async check_mcp_availability(settings) {
    console.log('settings chat.bubble.js', settings);
    try {
      // Try to check MCP server status
      const result = await frappe.call({
        method: 'translation_tools.api.mcp_integration.get_mcp_server_status',
        args: {},
        freeze: false,
        // Don't show error messages if it fails
        error: function (e) {
          console.error(e);
        },
      });

      console.log('result check_mcp_availability', result);

      // If MCP Server is available, set flag to use MCP chat
      if (result && result.message && result.message.status === 'available') {
        console.log('MCP server is available:', result.message.server_name);
        this.use_mcp_chat = true;

        // Add MCP chat button to the menu if we're on the desktop app
        if (this.is_desk) {
          this.add_mcp_menu_button();
        }
      } else {
        console.log('MCP server is not available, using standard chat');
        this.use_mcp_chat = false;
      }
    } catch (error) {
      console.error(`Error checking MCP availability: ${error}`);
      this.use_mcp_chat = false;
    }
  }

  /**!SECTION
   * Add MCP Assistant button to the menu
   */
  add_mcp_menu_button() {
    // Add after a short delay to ensure the DOM is ready
    setTimeout(() => {
      const $navbar_right = $('.navbar-right');

      if ($navbar_right.length && !$('#mcp-assistant-btn').length) {
        const $mcp_btn = $(`
          <li class="dropdown" id="mcp-assistant-btn">
            <a class="dropdown-toggle" data-toggle="dropdown" aria-expanded="true" title="ERPNext Assistant">
              <div>
                <i class="fa fa-robot"></i>
                <span class="hidden-xs hidden-sm"> Assistant</span>
              </div>
            </a>
            <ul class="dropdown-menu" role="menu">
              <li><a href="#" onclick="frappe.Chat.instance.show_mcp_chat()">ERPNext Assistant</a></li>
            </ul>
          </li>
        `);

        $navbar_right.prepend($mcp_btn);
      }
    }, 1000);
  }

  /**!SECTION
   * Show MCP chat in a dialog
   */
  show_mcp_chat() {
    if (!this.mcp_dialog) {
      this.mcp_dialog = new frappe.ui.Dialog({
        title: __('ERPNext Assistant'),
        wide: true,
        fields: [
          {
            fieldname: 'chat_container',
            fieldtype: 'HTML',
            options:
              '<div id="mcp-chat-dialog-container" style="height: 500px;"></div>',
          },
        ],
      });
    }

    this.mcp_dialog.show();

    // Initialize chat component if not already done
    if (!this.mcp_dialog_chat) {
      setTimeout(() => {
        const $chat_container = $('#mcp-chat-dialog-container');

        if ($chat_container.length) {
          this.mcp_dialog_chat = new MCPChat({
            $wrapper: $chat_container,
            profile: {
              room_name: 'ERPNext Assistant',
              room_type: 'Direct',
              is_admin: this.is_admin,
              user: frappe.session.user_fullname,
              user_email: frappe.session.user,
              opposite_person_email: 'erpassistant@system.local',
            },
          });

          this.mcp_dialog_chat.render();
        }
      }, 100);
    }
  }

  /** Shows the chat widget */
  show_chat_widget() {
    this.is_open = true;
    this.$chat_element.fadeIn(250);

    // Call scroll_to_bottom for appropriate component
    if (typeof this.chat_space !== 'undefined') {
      scroll_to_bottom(this.chat_space.$chat_space_container);
    } else if (typeof this.mcp_chat !== 'undefined') {
      scroll_to_bottom(this.mcp_chat.$chat_space_container);
    }
  }

  /** Hides the chat widget */
  hide_chat_widget() {
    this.is_open = false;
    this.$chat_element.fadeOut(300);
  }

  should_close(e) {
    const chat_app = $('.chat-app');
    const navbar = $('.navbar');
    const modal = $('.modal');
    return (
      !chat_app.is(e.target) &&
      chat_app.has(e.target).length === 0 &&
      !navbar.is(e.target) &&
      navbar.has(e.target).length === 0 &&
      !modal.is(e.target) &&
      modal.has(e.target).length === 0
    );
  }

  setup_events() {
    const me = this;
    $('.chat-navbar-icon').on('click', function () {
      me.chat_bubble.change_bubble();
    });

    $(document).mouseup(function (e) {
      if (me.should_close(e) && me.is_open === true) {
        me.chat_bubble.change_bubble();
      }
    });

    // Set up keyboard shortcut if in desk
    if (this.is_desk) {
      $(document).on('keydown', function (e) {
        // Alt+m to open MCP Assistant
        if (e.altKey && e.key === 'm') {
          if (me.use_mcp_chat) {
            me.show_mcp_chat();
          } else {
            me.chat_bubble.change_bubble();
          }
          e.preventDefault();
        }
      });
    }
  }
};

$(function () {
  const chatInstance = new frappe.Chat();
  // Make it accessible globally
  frappe.Chat.instance = chatInstance;
});
