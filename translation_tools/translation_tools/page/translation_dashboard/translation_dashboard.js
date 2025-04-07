frappe.pages["translation-dashboard"].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Translation Dashboard"),
    single_column: true,
  });

  // Add a refresh button to the page
  page.add_menu_item(__("Refresh"), () => {
    loadDashboard(wrapper, page);
  });

  // Load the dashboard
  loadDashboard(wrapper, page);
};

function loadDashboard(wrapper, page) {
  const $container = $(wrapper).find(".layout-main-section");
  $container.empty();

  // Show loading state
  $container.html(`
		<div class="text-center" style="margin-top: 30px;">
			<div class="spinner"></div>
			<div style="margin-top: 15px;">${__("Loading translation dashboard...")}</div>
		</div>
	`);

  // Create an iframe to load the React app
  const iframe = document.createElement("iframe");
  iframe.src = "/translation_dashboard";
  iframe.style.width = "100%";
  iframe.style.height = "800px";
  iframe.style.border = "none";
  iframe.onload = function () {
    // Hide the loading indicator when iframe is loaded
    $container.find(".text-center").hide();
  };

  // Append the iframe to the container
  $container.append(iframe);

  // Resize iframe when window resizes
  $(window).on("resize", function () {
    resizeIframe(iframe);
  });

  // Initial resize
  resizeIframe(iframe);
}

function resizeIframe(iframe) {
  // Adjust iframe height to the window height minus some padding
  const windowHeight = $(window).height();
  const topOffset = $(iframe).offset().top;
  const newHeight = windowHeight - topOffset - 50; // 50px bottom padding
  iframe.style.height = newHeight + "px";
}
