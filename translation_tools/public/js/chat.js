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
                    <div class="token-tooltip>
                       <i class="fa fa-info-circle"></i>
                        <div class="token-tooltip-content">
                           <p>${__('Token Usage:')}</p>
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

// Add token cost display to chat messages
translation_tools.chat.display_token_cost = function (
  message_element,
  token_cost
) {
  if (!token_cost) return;

  // Add token cost indicator
  $(message_element).append(
    `<div class="token-cost-indicator">
          <span class="token-cost-value">${token_cost} ${__('tokens')}</span>
      </div>`
  );
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

// Hook into message display to show token costs
translation_tools.chat.original_display_message =
  translation_tools.chat.display_message;
translation_tools.chat.display_message = function (message) {
  // Call original display function
  const message_element =
    translation_tools.chat.original_display_message(message);

  // Add token cost if available
  if (message.token_cost) {
    translation_tools.chat.display_token_cost(
      message_element,
      message.token_cost
    );
  }

  return message_element;
};

// Initialize token display when chat loads
$(document).on('chat:loaded', function () {
  translation_tools.chat.setup_token_display();
});

// Update token display after message is sent
$(document).on('message:sent', function () {
  translation_tools.chat.update_token_display();
});

// Add styling for token elements
$(document).ready(function () {
  $('<style>')
    .prop('type', 'text/css')
    .html(`
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
        `)
    .appendTo('head');
});
