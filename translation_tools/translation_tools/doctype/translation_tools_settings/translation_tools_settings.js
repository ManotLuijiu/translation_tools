// Copyright (c) 2025, Manot Luijiu and contributors
// For license information, please see license.txt

frappe.ui.form.on('Translation Tools Settings', {
  refresh: function (frm) {
    frm.add_custom_button(__('Test OpenAI Connection'), function () {
      if (!frm.doc.openai_api_key) {
        frappe.msgprint(__('Please enter an OpenAI API key first'));
        return;
      }

      frappe.call({
        method:
          'translation_tools.translation_tools.api.translation.translate_text',
        args: {
          text: 'Hello, this is a test message.',
          provider: 'openai',
          target_lang: 'th',
          model: frm.doc.openai_model,
          save_history: false,
        },
        callback: function (r) {
          if (r.message && r.message.translated) {
            frappe.msgprint({
              title: __('Test Successful'),
              indicator: 'green',
              message: __(
                'OpenAI API connection successful! Translation: {0}',
                [r.message.translated]
              ),
            });
          } else if (r.message && r.message.error) {
            frappe.msgprint({
              title: __('Test Failed'),
              indicator: 'red',
              message: __('OpenAI API connection failed: {0}', [
                r.message.error,
              ]),
            });
          }
        },
      });
    });

    frm.add_custom_button(__('Test Claude Connection'), function () {
      if (!frm.doc.anthropic_api_key) {
        frappe.msgprint(__('Please enter an Anthropic API key first'));
        return;
      }

      frappe.call({
        method:
          'translation_tools.translation_tools.api.translation.translate_text',
        args: {
          text: 'Hello, this is a test message.',
          provider: 'claude',
          target_lang: 'th',
          model: frm.doc.anthropic_model,
          save_history: false,
        },
        callback: function (r) {
          if (r.message && r.message.translated) {
            frappe.msgprint({
              title: __('Test Successful'),
              indicator: 'green',
              message: __(
                'Claude API connection successful! Translation: {0}',
                [r.message.translated]
              ),
            });
          } else if (r.message && r.message.error) {
            frappe.msgprint({
              title: __('Test Failed'),
              indicator: 'red',
              message: __('Claude API connection failed: {0}', [
                r.message.error,
              ]),
            });
          }
        },
      });
    });
  },
});
