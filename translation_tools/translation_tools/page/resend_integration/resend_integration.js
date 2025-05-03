frappe.pages["resend-integration"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("resend-integration"),
		single_column: true,
	});
};

frappe.pages["resend-integration"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	frappe.require("resend_integration.bundle.jsx").then(() => {
		frappe.resend_integration = new frappe.ui.ResendIntegration({
			wrapper: $parent,
			page: wrapper.page,
		});
	});
}