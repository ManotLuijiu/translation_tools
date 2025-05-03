frappe.provide('frappe.ui');

frappe.ui.language_toggle = class LanguageToggle {
  constructor() {
    this.languages = frappe.boot.languages || {
      en: 'English',
      th: 'ไทย',
    };
    this.current_language = frappe.boot.lang || 'en';
    this.setup();
  }

  setup() {
    if (!('desk' in frappe)) return;

    this.create_toggle_element();
    this.setup_events();
  }

  create_toggle_element() {
    const toggle_items = Object.entries(this.languages)
      .map(([code, label]) => {
        const active = this.current_language === code ? 'active' : '';
        return `
          <li role="menuitem">
            <a href="#" data-lang="${code}" class="dropdown-item ${active}">
              ${label}
            </a>
          </li>`;
      })
      .join('');

    const toggle_html = `
      <li class="nav-item dropdown dropdown-language">
        <a class="nav-link dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
          🌐 ${this.languages[this.current_language]}
        </a>
        <ul class="dropdown-menu dropdown-menu-right" role="menu">
          ${toggle_items}
        </ul>
      </li>`;

    const navbar = $('header.navbar .navbar-collapse .navbar-nav');
    if (navbar.length) {
      navbar.prepend(toggle_html);
    }
  }

  setup_events() {
    $('body').on('click', '.dropdown-language .dropdown-item', (e) => {
      e.preventDefault();
      const lang_code = $(e.currentTarget).data('lang');
      if (lang_code && lang_code !== this.current_language) {
        this.switch_language(lang_code);
      }
    });
  }

  switch_language(lang_code) {
    frappe.show_alert({
      message: __('Changing language to ') + this.languages[lang_code] + '...',
      indicator: 'blue',
    });

    frappe.call({
      method: 'frappe.client.set_value',
      args: {
        doctype: 'User',
        name: frappe.session.user,
        fieldname: 'language',
        value: lang_code,
      },
      callback: () => {
        frappe.show_alert({
          message: __('Language updated. Reloading...'),
          indicator: 'green',
        });
        setTimeout(() => window.location.reload(), 800);
      },
      error: () => {
        frappe.show_alert({
          message: __('Failed to update language.'),
          indicator: 'red',
        });
      },
    });
  }
};

$(function () {
  new frappe.ui.language_toggle();
});
