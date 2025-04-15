frappe.listview_settings['Chat Message'] = {
  filters: [['sender_email', '=', frappe.session.user]],
};
