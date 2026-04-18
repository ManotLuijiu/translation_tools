frappe.provide('frappe.ui');

frappe.ui.language_toggle = class LanguageToggle {
  constructor() {
    this.languages = frappe.boot.languages || {
      en: 'English',
      th: 'ไทย',
      lo: 'ລາວ',
    };
    const boot_lang = frappe.boot.lang || 'en';
    // Resolve exact match first, then base code (en-GB → en), then default to 'en'
    const base_lang = boot_lang.split('-')[0];
    this.current_language = this.languages[boot_lang]
      ? boot_lang
      : this.languages[base_lang]
        ? base_lang
        : 'en';

    // Detect Frappe major version from boot data
    const frappe_ver_str = frappe.boot.versions?.frappe || '15.0.0';
    this.frappe_major = parseInt(frappe_ver_str.split('.')[0], 10);

    this.setup();
  }

  setup() {
    if (!('desk' in frappe)) return;

    if (this.frappe_major >= 16) {
      this.inject_sidebar_toggle();
    } else {
      this.create_navbar_toggle();
    }
    this.setup_events();
  }

  // v16+: inject below the user section in the body sidebar
  inject_sidebar_toggle() {
    if (document.querySelector('.dropdown-language-sidebar')) return;

    const inject = () => {
      if (document.querySelector('.dropdown-language-sidebar')) return true;

      const user_section = $('.body-sidebar-bottom .dropdown-navbar-user');
      if (!user_section.length) return false;

      const toggle_items = Object.entries(this.languages)
        .map(([code, label]) => {
          const active = this.current_language === code ? 'active' : '';
          return `<a href="#" data-lang="${code}" class="dropdown-item ${active}">${label}</a>`;
        })
        .join('');

      const sidebar_html = `
        <div class="dropdown-language-sidebar" style="padding: 2px 8px 6px;">
          <div class="dropdown">
            <a class="align-center btn-reset flex nav-link dropdown-toggle"
               data-toggle="dropdown"
               style="width: 100%; min-height: 32px; padding: 4px 10px; gap: 8px; cursor: pointer;">
              <span style="font-size: 14px;">🌐</span>
              <span class="text-small">${this.languages[this.current_language]}</span>
            </a>
            <div class="dropdown-menu">
              ${toggle_items}
            </div>
          </div>
        </div>`;

      user_section.after(sidebar_html);
      return true;
    };

    if (!inject()) {
      const timer = setInterval(() => {
        if (inject()) clearInterval(timer);
      }, 300);
      setTimeout(() => clearInterval(timer), 15000);
    }
  }

  // v15: inject into Bootstrap navbar
  create_navbar_toggle() {
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
    // v16 sidebar toggle
    $('body').on('click', '.dropdown-language-sidebar .dropdown-item', (e) => {
      e.preventDefault();
      const lang_code = $(e.currentTarget).data('lang');
      if (lang_code && lang_code !== this.current_language) {
        this.switch_language(lang_code);
      }
    });

    // v15 navbar toggle
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
