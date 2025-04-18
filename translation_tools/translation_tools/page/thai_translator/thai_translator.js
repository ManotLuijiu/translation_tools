frappe.pages['thai_translator'].on_page_load = function (wrapper) {
  console.log('wrapper', wrapper);

  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __('Thai Translator'),
    single_column: true,
  });

  console.log('page', page);

  page.set_indicator('อังกฤษ -> ไทย', 'green');
};

frappe.pages['thai_translator'].on_page_show = function (wrapper) {
  load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
  let $parent = $(wrapper).find('.layout-main-section');
  $parent.empty();

  frappe.require('thai_translator.bundle.jsx').then(() => {
    frappe.thai_translator = new frappe.ui.Thai_Translator({
      wrapper: $parent,
      page: wrapper.page,
    });
  });
}
