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

    // v16 desk uses a flat flex layout, not Bootstrap navbar-collapse
    const navbar_flex = $('header.navbar > .flex');
    if (navbar_flex.length) {
      // v16 desk: inject as a div inside the right-side flex container
      const toggle_html_v16 = `
        <div class="dropdown dropdown-language" style="position: relative;">
          <button class="btn-reset nav-link text-muted" data-toggle="dropdown" style="cursor: pointer; font-size: 13px;">
            🌐 ${this.languages[this.current_language]}
          </button>
          <ul class="dropdown-menu dropdown-menu-right" role="menu" style="min-width: 120px;">
            ${toggle_items}
          </ul>
        </div>`;
      navbar_flex.prepend(toggle_html_v16);
    } else {
      // v15 fallback: Bootstrap navbar-collapse layout
      const toggle_html_v15 = `
        <li class="nav-item dropdown dropdown-language">
          <a class="nav-link dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
            🌐 ${this.languages[this.current_language]}
          </a>
          <ul class="dropdown-menu dropdown-menu-right" role="menu">
            ${toggle_items}
          </ul>
        </li>`;
      const navbar_nav = $('header.navbar .navbar-collapse .navbar-nav');
      if (navbar_nav.length) {
        navbar_nav.prepend(toggle_html_v15);
      }
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

// Initialize language toggle once navbar is available
// v16 desk renders navbar after DOM ready and may load app bundles after app-ready
(function initLanguageToggle() {
  function tryInit() {
    if (document.querySelector('.dropdown-language')) return; // already initialized
    var navbar = document.querySelector('header.navbar');
    if (navbar && (navbar.querySelector('.flex') || navbar.querySelector('.navbar-nav'))) {
      new frappe.ui.language_toggle();
    }
  }

  // Try immediately (in case navbar is already rendered)
  if (document.readyState === 'complete') {
    setTimeout(tryInit, 300);
  }

  // Also listen for page-change (fires on every navigation in v16)
  $(document).on('page-change', function () {
    setTimeout(tryInit, 300);
  });

  // Fallback: try on app-ready
  $(document).on('app-ready', function () {
    setTimeout(tryInit, 500);
  });
})();
