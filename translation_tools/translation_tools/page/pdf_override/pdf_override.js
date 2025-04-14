frappe.pages["pdf-override"].on_page_load = function (wrapper) {
	frappe.ui.make_app_page({
		parent: wrapper,
		title: __("pdf-override"),
		single_column: true,
	});
};

frappe.pages["pdf-override"].on_page_show = function (wrapper) {
	load_desk_page(wrapper);
};

function load_desk_page(wrapper) {
	let $parent = $(wrapper).find(".layout-main-section");
	$parent.empty();

	frappe.require("pdf_override.bundle.jsx").then(() => {
		frappe.pdf_override = new frappe.ui.PdfOverride({
			wrapper: $parent,
			page: wrapper.page,
		});
	});
}