frappe.pages['pdf-generator'].on_page_load = function (wrapper) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: __('PDF Generator'),
    single_column: true,
  });
};

frappe.pages['pdf-generator'].on_page_show = function (wrapper) {
  load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
  let $parent = $(wrapper).find('.layout-main-section');
  $parent.empty();

  frappe.require('pdf_generator.bundle.jsx').then(() => {
    frappe.pdf_generator = new frappe.ui.PdfGenerator({
      wrapper: $parent,
      page: wrapper.page,
    });
  });
}
