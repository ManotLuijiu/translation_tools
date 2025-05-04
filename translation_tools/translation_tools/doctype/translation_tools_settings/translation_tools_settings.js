// Copyright (c) 2025, Manot Luijiu and contributors
// For license information, please see license.txt

frappe.ui.form.on('Translation Tools Settings', {
  refresh: function (frm) {
    frm.add_custom_button(__('Test OpenAI'), function () {
      if (!frm.doc.openai_api_key) {
        frappe.msgprint(__('Please enter an OpenAI API key first'));
        return;
      }

      frappe.call({
        method: 'translation_tools.api.ai_translation.test_ai_connection',
        args: {
          provider: 'openai',
        },
        callback: function (r) {
          console.log('r OpenAI', r);
          if (r.message && r.message.success) {
            frappe.msgprint({
              title: __('Test Successful'),
              indicator: 'green',
              message: __(
                'OpenAI API connection successful! Translation: {0}',
                [r.message.model]
              ),
            });
          } else if (r.message) {
            frappe.msgprint({
              title: __('Test Failed'),
              indicator: 'red',
              message: __('OpenAI API connection failed: {0}', [
                r.message.error || 'Unknown error',
              ]),
            });
          }
        },
      });
    });

    frm.add_custom_button(__('Test Anthropic AI'), function () {
      if (!frm.doc.anthropic_api_key) {
        frappe.msgprint(__('Please enter an Anthropic API key first'));
        return;
      }

      frappe.call({
        method: 'translation_tools.api.ai_translation.test_ai_connection',
        args: {
          provider: 'anthropic',
        },
        callback: function (r) {
          console.log('r', r);
          if (r.message && r.message.success) {
            frappe.msgprint({
              title: __('Test Successful'),
              indicator: 'green',
              message: __(
                'Claude API connection successful! Translation: {0}',
                [r.message.model]
              ),
            });
          } else if (r.message) {
            frappe.msgprint({
              title: __('Test Failed'),
              indicator: 'red',
              message: __('Claude API connection failed: {0}', [
                r.message.error || 'Unknown error',
              ]),
            });
          }
        },
      });
    });

    // Add a button to test both services at once
    frm.add_custom_button(
      __('Test All Connections'),
      function () {
        if (!frm.doc.openai_api_key && !frm.doc.anthropic_api_key) {
          frappe.msgprint(__('Please enter at least one API key first'));
          return;
        }

        frappe.call({
          method:
            'translation_tools.api.ai_translation.test_all_ai_connections',
          freeze: true,
          freeze_message: __('Testing AI connections...'),
          callback: function (r) {
            if (r.message) {
              let message = '';

              console.log('API Response:', r.message);

              // OpenAI results
              if (r.message.openai) {
                message +=
                  '<b>OpenAI:</b> ' +
                  (r.message.openai.success
                    ? __('Success! Model: {0}', [r.message.openai.model])
                    : __('Failed: {0}', [r.message.openai.error])) +
                  '<br><br>';
              } else {
                message += '<b>OpenAI:</b> No response<br><br>';
              }

              // Claude results
              if (r.message.anthropic) {
                message +=
                  '<b>Claude:</b> ' +
                  (r.message.anthropic.success
                    ? __('Success! Model: {0}', [r.message.anthropic.model])
                    : __('Failed: {0}', [r.message.anthropic.error]));
              }

              frappe.msgprint({
                title: __('Connection Test Results'),
                indicator: r.message.all_successful ? 'green' : 'orange',
                message: message,
              });
            }
          },
        });
      },
      __('More Actions')
    );
  },
});
