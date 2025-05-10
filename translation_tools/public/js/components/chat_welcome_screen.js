import ChatForm from './chat_form';
import ChatBot from './chat_bot';
import MCPChat from './mcp_chat';
import ChatSpace from './chat_space';

export default class ChatWelcome {
  constructor(opts) {
    this.$wrapper = opts.$wrapper;
    this.profile = opts.profile;
    this.setup();
  }

  setup() {
    this.$chat_welcome_screen = $(document.createElement('div')).addClass(
      'chat-welcome'
    );

    const welcome_html = `
			<div class='chat-welcome-header'>
					<div class='hero-icon'>
            <img src="/assets/translation_tools/images/logos/tbs_logo.png" alt="MBOne">
            <span class="tax-consultant-title">${__('Tax Consultant')}</span>
					</div>
					<h3>${__('Hi there ! 🙌🏼')}</h3>
					<p>
						${__('I am AI Tax Consultant, your virtual assistant.')}
						${__('Ask me anything about your tax and accounting needs.')}
					</p>
			</div>
		`;

    const status_text =
      this.profile.chat_status === 'Online'
        ? __('We are online')
        : __('We are offline');

    const reason_text =
      this.profile.chat_status === 'Online'
        ? __('Typically replies in a few hours')
        : __('Just drop a message and we will get back to you soon');

    const bottom_html = `
			<div class='chat-welcome-footer'>
				<p class='status-content'>${status_text}</p>
				<p class='hero-content'>${reason_text}</p>
				<button type='button' class='btn btn-primary w-100'
					id='start-conversation'>
					${__('Start Conversation')}
				</button>
        <div class="mt-3">
          <button type='button' class='btn btn-default w-100'
            id='start-erp-assistant'>
            ${__('Use ERPNext Assistant')}
          </button>
        </div>
				<a class='chat-footer welcome-footer' target='_blank' href='https://moo-ai.online/'>
					${__('⚡ Powered by MooCoding')}
				</a>
			</div>
		`;

    this.$chat_welcome_screen.append(welcome_html + bottom_html);
  }

  setup_events() {
    const me = this;
    $('#start-conversation').on('click', function () {
      me.chat_form = new ChatForm({
        $wrapper: me.$wrapper,
        profile: me.profile,
      });
      me.chat_form.render();
      // import('./chat_bot').then((module) => {
      //   const ChatBot = module.default;
      //   me.chat_bot = new ChatBot({
      //     $wrapper: me.$wrapper,
      //     profile: me.profile,
      //   });
      //   me.chat_bot.render();
      // });
      // me.chat_form = new ChatForm({
      //   $wrapper: me.$wrapper,
      //   profile: me.profile,
      // });
      // me.chat_form.render();
    });

    // Add handler for ERPNext Assistant button
    $('#start-erp-assistant').on('click', function () {
      // Check if MCP server is available
      frappe.call({
        method: 'translation_tools.api.mcp_integration.get_mcp_server_status',
        freeze: true,
        callback: function (r) {
          if (r.message && r.message.status === 'available') {
            // Create MCP chat
            me.mcp_chat = new MCPChat({
              $wrapper: me.$wrapper,
              profile: {
                room_name: 'ERPNext Assistant',
                room_type: 'Direct',
                is_admin: me.profile.is_admin,
                user: frappe.session.user_fullname || 'Guest',
                user_email: frappe.session.user || 'guest@example.com',
                opposite_person_email: 'erpassistant@system.local',
              },
            });
            me.mcp_chat.render();
          } else {
            frappe.msgprint({
              title: __('ERPNext Assistant Unavailable'),
              message: __(
                'The ERPNext Assistant is currently unavailable. Please try again later or use the standard chat.'
              ),
            });
          }
        },
      });
    });
  }

  render() {
    this.$wrapper.html(this.$chat_welcome_screen);
    this.setup_events();
  }
}
