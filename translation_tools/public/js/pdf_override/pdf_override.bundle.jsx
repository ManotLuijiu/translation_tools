import * as React from "react";
import { App } from "./App";
import { createRoot } from "react-dom/client";
import pdfMake from "pdfmake/build/pdfmake";
import { initThaiPdfMake } from "./vfs_fonts_thai";

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

class PdfOverride {
	constructor({ page, wrapper }) {
		this.$wrapper = $(wrapper);
		this.page = page;

		this.init();
	}

	async init() {
		// Initialize Thai fonts for pdfMake
		await initThaiPdfMake();
		
		this.setup_page_actions();
		this.setup_app();
	}

	setup_page_actions() {
		// setup page actions
		this.primary_btn = this.page.set_primary_action(__("Print Message"), () =>
	  		frappe.msgprint("Hello My Page!")
		);

		// Add PDF generation action
		this.page.add_menu_item(__("Generate Thai PDF"), () => this.generate_pdf());
	}

	generate_pdf() {
		// Example PDF generation with Thai support
		const docDefinition = {
			content: [
				{ text: 'English text with Thai / ข้อความภาษาไทย', style: 'header' },
				{ text: 'This document supports Thai language / เอกสารนี้รองรับภาษาไทย' },
			],
			styles: {
				header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
			},
			defaultStyle: {
				font: 'THSarabun'
			}
		};
		
		pdfMake.createPdf(docDefinition).download('thai_document.pdf');
	}

	setup_app() {
		// create and mount the react app
		const root = createRoot(this.$wrapper.get(0));
		root.render(<App pdfMake={pdfMake} />);
		this.$pdf_override = root;
	}
}

frappe.provide("frappe.ui");
frappe.ui.PdfOverride = PdfOverride;
export default PdfOverride;