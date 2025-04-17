import * as React from 'react';
import { App } from './App';
import { createRoot } from 'react-dom/client';

class TaxConsultant {
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
    this.page.set_primary_action(__('New Conversation'), () => {
      this.$tax_consultant.newConversation();
    });

    this.page.add_menu_item(__('Settings'), () => {
      frappe.set_route('Form', 'Translation Tools Settings');
    });
  }

  setup_app() {
    // create and mount the react app
    const root = createRoot(this.$wrapper.get(0));
    root.render(<App />);
    this.$tax_consultant = root;
  }
}

frappe.provide('frappe.ui');
frappe.ui.TaxConsultant = TaxConsultant;
export default TaxConsultant;
