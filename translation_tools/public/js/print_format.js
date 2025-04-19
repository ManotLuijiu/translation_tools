frappe.ui.form.on('Print Format', {
  refresh: function (frm) {
    // Set WeasyPrint as default if creating a new record and no value is set
    if (frm.is_new() && !frm.doc.pdf_generator) {
      frm.set_value('pdf_generator', 'WeasyPrint');
    }

    // Add custom information about PDF generators
    frm
      .get_field('pdf_generator')
      .set_description(
        __(
          'WeasyPrint: Modern PDF engine with excellent CSS support for Thai fonts (Recommended)<br>'
        ) + __('wkhtmltopdf: Legacy ERPNext PDF engine')
      );
  },
});
