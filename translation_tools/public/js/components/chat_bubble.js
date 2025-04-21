export default class ChatBubble {
  constructor(parent) {
    this.parent = parent;
    this.setup();
  }

  setup() {
    this.$chat_bubble = $(document.createElement('div'));
    this.open_title = this.parent.is_admin
      ? __('Show Chats')
      : __('Tax Consult');
    this.closed_title = __('Close Chat');

    const bubble_visible = this.parent.is_desk === true ? 'd-none' : '';
    this.open_inner_html = `
              <div class='p-3 chat-bubble ${bubble_visible}'>
                  <span class='chat-message-icon'>
                      <img src='/assets/translation_tools/images/icons/talk-bubbles-line.svg' alt='Chat Message Icon' />
                  </span>
                  <div id='open__title'>${this.open_title}</div>
              </div>
          `;
    this.closed_inner_html = `
          <div class='chat-bubble-closed chat-bubble ${bubble_visible}'>
              <span class='cross-icon'>
                  ${frappe.utils.icon('close-alt', 'lg')}
              </span>
          </div>
          `;
    this.$chat_bubble
      .attr({
        title: this.open_title,
        id: 'chat-bubble',
      })
      .html(this.open_inner_html);
  }

  render() {
    this.parent.$app_element.append(this.$chat_bubble);
    this.setup_events();
  }

  change_bubble() {
    this.parent.is_open = !this.parent.is_open;
    if (this.parent.is_open === false) {
      this.$chat_bubble
        .attr({
          title: this.open_title,
        })
        .html(this.open_inner_html);
      this.parent.hide_chat_widget();
    } else {
      this.$chat_bubble
        .attr({
          title: this.closed_title,
        })
        .html(this.closed_inner_html);
      this.parent.show_chat_widget();
    }
  }

  setup_events() {
    const me = this;
    $('#chat-bubble, .chat-cross-button').on('click', () => {
      me.change_bubble();
    });
  }
}
