// chat_bot.js
export default class ChatBot {
  constructor(opts) {
    this.$wrapper = opts.$wrapper;
    this.profile = opts.profile;
    this.messages = [];
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
            <div class='online-circle'></div>
            </div>
            <div class='chat-profile-status'>${__('Online')}</div>
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
      // Make API call to get AI response
      // This is where you would integrate with your AI service
      // For demonstration, using a timeout to simulate API call
      setTimeout(() => {
        this.hide_typing_indicator();
        this.add_message(
          "Thank you for your interest! The AI Tax Consultant is currently in development and will be available soon. This is just a demo to showcase the interface. In the full version, you'll be able to get answers to all your tax-related questions right here.",
          'sender'
        );

        // Add a follow-up message after a short delay
        setTimeout(() => {
          this.add_message(
            "For now, please contact our support team for assistance with your tax questions via email at <a href='mailto:admin@moocoding.com'>admin@moocoding.com</a>.",
            'sender'
          );
        }, 1000);
      }, 1500);

      // For actual implementation, use:
      // const response = await frappe.call({
      //   method: 'translation_tools.api.ai_chat.get_response',
      //   args: { message: message }
      // });
      // this.hide_typing_indicator();
      // this.add_message(response.message, 'sender');
    } catch (error) {
      this.hide_typing_indicator();
      this.add_message(
        "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
        'sender'
      );
      console.error('Error fetching AI response:', error);
    }
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
