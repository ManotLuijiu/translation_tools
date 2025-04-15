frappe.ui.form.on('Chat Settings', {
    after_save: function (frm) {
      $('.chat-app').remove();
      $('.chat-navbar-icon').remove();
      if (frm.doc.enable_chat) {
        new frappe.Chat();
      }
    },
  });