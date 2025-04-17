frappe.pages['tax-consultant'].on_page_load = function (wrapper) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: __('AI Thai Tax Consultant'),
    single_column: false,
  });
};

frappe.pages['tax-consultant'].on_page_show = function (wrapper) {
  load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
  let $parent = $(wrapper).find('.layout-main-section');
  $parent.empty();

  frappe.require('tax_consultant.bundle.jsx').then(() => {
    frappe.tax_consultant = new frappe.ui.TaxConsultant({
      wrapper: $parent,
      page: wrapper.page,
    });
  });
}
