import * as React from 'react';
import { App } from './App';
import { createRoot } from 'react-dom/client';

class TranslationStatus {
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
    this.refresh_btn = this.page.set_primary_action(__('Refresh'), () => {
      if (this.$translation_status) {
        this.$translation_status.refreshData();
      }
    });

    this.page.add_menu_item(__('Export as CSV'), () => {
      if (this.$translation_status) {
        this.$translation_status.exportCSV();
      }
    });

    this.page.add_menu_item(__('Export as PDF'), () => {
      if (this.$translation_status) {
        this.$translation_status.exportPDF();
      }
    });
  }

  setup_app() {
    // create and mount the react app
    const root = createRoot(this.$wrapper.get(0));
    root.render(<App />);
    this.$translation_status = root;
  }
}

frappe.provide('frappe.ui');
frappe.ui.TranslationStatus = TranslationStatus;
export default TranslationStatus;
