frappe.pages['thai_translator'].on_page_load = function (wrapper) {
  // console.log('wrapper', wrapper);

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __('Thai Translator'),
    single_column: true,
  });

  // console.log('page', page);

  page.set_indicator('อังกฤษ -> ไทย', 'blue');

  // Log for debugging (can be removed in production)
  // console.log('Preparing to redirect to Thai Translation Dashboard');
};

frappe.pages['thai_translator'].on_page_show = function (wrapper) {
  // console.log('wrapper in thai_translator.js', wrapper);
  load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
  const $parent = $(wrapper).find('.layout-main-section');
  $parent.empty();

  frappe.require('thai_translator.bundle.jsx').then(() => {
    frappe.thai_translator = new frappe.ui.Thai_Translator({
      wrapper: $parent,
      page: wrapper.page,
    });
  });
}
