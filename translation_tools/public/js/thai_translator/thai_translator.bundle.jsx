import * as React from 'react';
import { App } from './App';
import { createRoot } from 'react-dom/client';

class Thai_Translator {
  constructor({ page, wrapper }) {
    this.$wrapper = $(wrapper);
    this.page = page;
    this.menuItems = []; // Track menu items for cleanup
    this.root = null; // Store React root instance

    this.init();
  }

  init() {
    this.setup_page_actions();
    this.setup_app();
    this.setupCleanup();
  }

  setup_page_actions() {
    this.cleanupMenuItems();
    this.page.set_primary_action(
      __('React Version'),
      () => this.redirectToSPA(),
      'react-logo'
      // 'fa fa-react'
      // '<i class="fa fa-react" aria-hidden="true"></i>'
      // 'refresh'
      // 'branch'
      // 'globe'
    );

    // Add CSS class to modify primary action icon
    // setTimeout(() => {
    //   $('.page-actions .primary-action use').attr('href', '#icon-language'); // Your custom symbol ID
    // }, 100);

    // Menu items with proper cleanup tracking
    this.menuItems.push(
      this.page.add_menu_item(
        `<i class="fa fa-language mr-2" aria-hidden="true"></i> ${__('Translate File')}`,
        () => this.translateFile(),
        true
      )
    );

    this.menuItems.push(
      this.page.add_menu_item(
        `<i class="fa fa-cog mr-2" aria-hidden="true"></i> ${__('Settings')}`,
        () => this.showSettings(),
        true
      )
    );

    this.menuItems.push(
      this.page.add_menu_item(
        `<i class="fa fa-book mr-2" aria-hidden="true"></i> ${__('View Glossary')}`,
        () => this.viewGlossary(),
        true
      )
    );

    this.menuItems.push(
      this.page.add_menu_item(
        `<i class="fa fa-question-circle mr-2" aria-hidden="true"></i> ${__('Help')}`,
        () => this.showHelp(),
        true
      )
    );

    // this.page.add_menu_item(
    //   // __('Settings'),
    //   `<i class="fa fa-cog mr-2" aria-hidden="true"></i> ${__('Settings')}`,
    //   () => this.showSettings(),
    //   true
    // );

    // this.page.add_menu_item(
    //   // __('View Glossary'),
    //   `<i class="octicon octicon-book mr-2" aria-hidden="true"></i> ${__('View Glossary')}
    //   `,
    //   () => this.viewGlossary(),
    //   true
    // );

    // this.page.add_menu_item(
    //   // __('Help'),
    //   `<i class="fa fa-question-circle mr-2" aria-hidden="true"></i> ${__('Help')}`,
    //   () => this.showHelp(),
    //   true
    // );
  }

  cleanupMenuItems() {
    // Remove all tracked menu items
    this.menuItems.forEach((item) => {
      if (item && item.remove) item.remove();
    });
    this.menuItems = [];
  }

  setupCleanup() {
    // Handle page navigation cleanup
    $(document).on('page-change.thai_translator', () => {
      this.cleanupMenuItems();
      if (this.root) {
        this.root.unmount();
      }
    });

    // Handle window unload
    $(window).on('beforeunload.thai_translator', () => {
      this.cleanup();
    });
  }

  cleanup() {
    this.cleanupMenuItems();
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    $(document).off('page-change.thai_translator');
    $(window).off('beforeunload.thai_translator');
  }

  translateFile() {
    frappe.msgprint(__('Please select a file to translate'));
  }

  redirectToSPA() {
    window.location.href = '/thai_translation_dashboard';
  }

  showSettings() {
    frappe.set_route('Form', 'Translation Settings');
  }

  viewGlossary() {
    frappe.set_route('List', 'Translation Glossary Term');
  }

  showHelp() {
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
