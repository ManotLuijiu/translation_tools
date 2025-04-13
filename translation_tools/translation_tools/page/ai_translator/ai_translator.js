frappe.pages["ai-translator"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("ai-translator"),
		single_column: true,
	});
};

frappe.pages["ai-translator"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	frappe.require("ai_translator.bundle.jsx").then(() => {
		frappe.ai_translator = new frappe.ui.AiTranslator({
			wrapper: $parent,
			page: wrapper.page,
		});
	});
}