frappe.pages["translation-tools"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("translation-tools"),
		single_column: true,
	});
};

frappe.pages["translation-tools"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	frappe.require("translation_tools.bundle.jsx").then(() => {
		frappe.translation_tools = new frappe.ui.TranslationTools({
			wrapper: $parent,
			page: wrapper.page,
		});
	});
}