frappe.pages["translator"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("translator"),
		single_column: true,
	});
};

frappe.pages["translator"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	frappe.require("translator.bundle.js").then(() => {
		frappe.translator = new frappe.ui.Translator({
			wrapper: $parent,
			page: wrapper.page,
		});
	});
}