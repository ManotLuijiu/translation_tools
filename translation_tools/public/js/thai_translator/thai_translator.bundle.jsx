import * as React from 'react';
import { App } from './App';
import { createRoot } from 'react-dom/client';

class Thai_Translator {
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
    this.page.set_primary_action(
      __('Translate File'),
      () => this.translateFile(),
      'octicon octicon-sync'
    );

    this.page.add_menu_item(__('Settings'), () => this.showSettings(), true);

    this.page.add_menu_item(
      __('View Glossary'),
      () => this.viewGlossary(),
      true
    );
  }

  translateFile() {
    frappe.msgprint(__('Please select a file to translate'));
  }

  showSettings() {
    frappe.set_route('Form', 'Translation Settings');
  }

  viewGlossary() {
    frappe.set_route('List', 'Translation Glossary Term');
  }

  setup_app() {
    // create and mount the react app
    const root = createRoot(this.$wrapper.get(0));
    root.render(<App />);
    this.$thai_translator = root;
  }
}

frappe.provide('frappe.ui');
frappe.ui.Thai_Translator = Thai_Translator;
export default Thai_Translator;
