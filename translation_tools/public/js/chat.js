frappe.provide('translation_tools.chat');

translation_tools.chat.setup_token_display = function () {
  // Add token display to chat interface
  if (!$('.chat-token-display').length) {
    $('.chat-header').append('<div class="chat-token-display"></div>');
    translation_tools.chat.update_token_display();
  }
};

translation_tools.chat.update_token_display = function () {
  frappe.call({
    method: 'translation_tools.api.message.get_token_balance',
    callback: function (r) {
      if (r.message) {
        $('.chat-token-display').html(
          `<div class="token-info">
                    <span class="token-count">${r.message.token_balance}</span>
                    <span class="token-label">${__('tokens remaining')}</span>
                    <a href="/tokens" class="buy-tokens-link">${__('Buy More')}</a>
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
};

translation_tools.chat.check_tokens_before_send = function (callback) {
  frappe.call({
    method: 'translation_tools.api.message.get_token_balance',
    callback: function (r) {
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
};

// Override the original send message function to check tokens first
translation_tools.chat.original_send_message =
  translation_tools.chat.send_message;
translation_tools.chat.send_message = function (args) {
  translation_tools.chat.check_tokens_before_send(function () {
    translation_tools.chat.original_send_message(args);
    translation_tools.chat.update_token_display();
  });
};

// Initialize token display when chat loads
$(document).on('chat:loaded', function () {
  translation_tools.chat.setup_token_display();
});

// Update token display after message is sent
$(document).on('message:sent', function () {
  translation_tools.chat.update_token_display();
});
