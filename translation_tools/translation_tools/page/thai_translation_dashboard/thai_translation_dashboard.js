frappe.pages["thai-translation-dashboard"].on_page_load = function (wrapper) {
  // Initialize page
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Thai Translation Dashboard"),
    single_column: true,
  });

  // Add refresh button
  page.set_primary_action(__("Refresh"), function () {
    // This will trigger re-render of the React component
    load_dashboard(wrapper);
  });

  // Load dashboard
  load_dashboard(wrapper);
};

frappe.pages["thai-translation-dashboard"].on_page_show = function (wrapper) {
  // Check for setup status
  frappe.call({
    method:
      "translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status",
    callback: function (r) {
      if (!r.exc) {
        if (!r.message.complete) {
          show_setup_dialog(r.message.missing_doctypes);
        }
      }
    },
  });
};

function show_setup_dialog(missing_doctypes) {
  frappe.msgprint(
    __(`Translation Tools needs to be set up before use. The following DocTypes are missing: 
			${missing_doctypes.join(", ")}.
			
			Do you want to complete the setup now?`),
    __("Setup Required"),
    function () {
      frappe.call({
        method:
          "translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.run_setup",
        callback: function (r) {
          if (!r.exc && r.message.success) {
            frappe.show_alert({
              message: __("Setup completed successfully. Refreshing page..."),
              indicator: "green",
            });
            setTimeout(function () {
              window.location.reload();
            }, 2000);
          } else {
            frappe.msgprint(
              __("Setup failed: " + (r.message.error || "Unknown error"))
            );
          }
        },
      });
    }
  );
}

function load_dashboard(wrapper) {
  // Clear the page area
  $(wrapper).find(".layout-main-section").empty();
  const $container = $('<div id="thai-translation-dashboard-root">').appendTo(
    $(wrapper).find(".layout-main-section")
  );

  // Show loading message
  $container.html(`<div class="text-center p-5">
		<div class="mb-3"><i class="fa fa-spinner fa-spin fa-2x"></i></div>
		<h4>${__("Loading translation dashboard...")}</h4>
	</div>`);

  // Load the dashboard React component
  frappe.require("thai_translation_dashboard.bundle.js").then(() => {
    // The bundle will initialize itself when loaded
    // The root React component will render in the #thai-translation-dashboard-root div
  });
}
