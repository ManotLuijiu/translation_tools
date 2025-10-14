frappe.pages['ai-translator'].on_page_load = function (wrapper) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: __('AI Translator'),
    single_column: true,
  });

  // Add a loading message
  $(wrapper)
    .find('.layout-main-section')
    .html(
      '<div class="text-center" style="padding: 40px 0;">' +
        '<i class="fa fa-spinner fa-spin fa-4x margin-bottom"></i>' +
        '<p style="margin-top: 15px; font-size: 16px;">' +
        __('กำลังเปลี่ยนเส้นทางไปยังหน้าเลือกเครื่องมือแปลภาษา...') +
        '</p>' +
        '<p style="color: var(--text-muted); margin-top: 10px;">' +
        __('Redirecting to Translation Tools Selection...') +
        '</p>' +
        '</div>'
    );

  // Log for debugging (can be removed in production)
  // console.log('Preparing to redirect to Thai Translation Dashboard');
};

frappe.pages['ai-translator'].on_page_show = function (wrapper) {
  console.info('wrapper ai-translator', wrapper);

  setTimeout(function () {
    // Redirect to translation tools landing page
    // User can choose between ASEAN Translations or CSV Translations
    window.location.href = '/translation_tools_dashboard';
  }, 800);
};

// function load_desk_page(wrapper) {
//   let $parent = $(wrapper).find('.layout-main-section');
//   $parent.empty();

//   frappe.require('ai_translator.bundle.jsx').then(() => {
//     frappe.ai_translator = new frappe.ui.AiTranslator({
//       wrapper: $parent,
//       page: wrapper.page,
//     });
//   });
// }
