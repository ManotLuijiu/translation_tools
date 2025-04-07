frappe.pages["thai-translation-das"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("thai-translation-dashboard"),
		single_column: true,
	});
};

frappe.pages["thai-translation-das"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	frappe.require("thai_translation_das.bundle.jsx").then(() => {
		frappe.thai_translation_das = new frappe.ui.ThaiTranslationDas({
			wrapper: $parent,
			page: wrapper.page,
		});
	});
}