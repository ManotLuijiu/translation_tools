import * as React from 'react';
import { App } from './App';
import { createRoot } from 'react-dom/client';

class PdfGenerator {
  constructor({ page, wrapper }) {
    this.$wrapper = $(wrapper);
    this.page = page;

    this.init();
  }

  init() {
    this.setup_page_actions();
    this.setup_app();
  }

  setup_page_actions() {
    // setup page actions
    // this.primary_btn = this.page.set_primary_action(__('Print Message'), () =>
    //   frappe.msgprint('Hello My Page!')
    // );
    this.page.set_primary_action(__('Generate Sample PDF'), () => {
      this.generate_sample_pdf();
    });

    this.page.set_secondary_action(__('Settings'), () => {
      frappe.set_route('Form', 'Print Settings');
    });
  }

  setup_app() {
    // create and mount the react app
    const root = createRoot(this.$wrapper.get(0));
    root.render(<App />);
    this.$pdf_generator = root;
  }

  generate_sample_pdf() {
    const html = `
		<div>
			<h1>Sample PDF</h1>
			<p>This is a sample PDF generated using pdfmake on the client side.</p>
			<p>ทดสอบภาษาไทย</p>
		</div>
	`;

    frappe.pdf_generator.generate(html);
  }
}

frappe.provide('frappe.ui');
frappe.ui.PdfGenerator = PdfGenerator;
export default PdfGenerator;
