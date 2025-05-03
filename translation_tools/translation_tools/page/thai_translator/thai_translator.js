frappe.pages['thai_translator'].on_page_load = function (wrapper) {
  console.log('wrapper', wrapper);

  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __('Thai Translator'),
    single_column: true,
  });

  console.log('page', page);

  page.set_indicator('อังกฤษ -> ไทย', 'blue');

  // Add a loading message
  // $(wrapper)
  //   .find('.layout-main-section')
  //   .html(
  //     '<div class="text-center" style="padding: 40px 0;">' +
  //       '<i class="fa fa-spinner fa-spin fa-4x margin-bottom"></i>' +
  //       '<p style="margin-top: 15px; font-size: 16px;">' +
  //       __('กำลังเปลี่ยนเส้นทางไปยังแดชบอร์ดการแปลภาษาไทย...') +
  //       '</p>' +
  //       '<p style="color: var(--text-muted); margin-top: 10px;">' +
  //       __('Redirecting to Thai Translation Dashboard...') +
  //       '</p>' +
  //       '</div>'
  //   );

  // Log for debugging (can be removed in production)
  console.log('Preparing to redirect to Thai Translation Dashboard');
};

frappe.pages['thai_translator'].on_page_show = function (wrapper) {
  console.log('wrapper in thai_translator.js', wrapper);
  load_desk_page(wrapper);

  // Perform the redirect with a slight delay to allow the page to render
  // setTimeout(function () {
  //   // Log for debugging (can be removed in production)
  //   console.log('Redirecting to Thai Translation Dashboard');

  //   // Perform the actual redirect
  //   window.location.href = '/thai_translation_dashboard';
  // }, 800);
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
