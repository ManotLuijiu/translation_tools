frappe.provide('frappe.ui');

frappe.ui.language_toggle = class LanguageToggle {
  constructor() {
    this.languages = frappe.boot.languages || {
      en: 'English',
      th: 'ไทย',
      lo: 'ລາວ',
    };
    const boot_lang = frappe.boot.lang || 'en';
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

    const toggle_html = `
      <div class="dropdown dropdown-language" style="position: relative;">
        <button class="btn-reset nav-link text-muted" data-toggle="dropdown" style="cursor: pointer; font-size: 13px;">
          🌐 ${this.languages[this.current_language]}
        </button>
        <ul class="dropdown-menu dropdown-menu-right" role="menu" style="min-width: 120px;">
          ${toggle_items}
        </ul>
      </div>`;

    // Try multiple injection points in order of preference:

    // 1. v16 desktop navbar (home/desk page)
    const navbar_flex = $('header.navbar > .flex');
    if (navbar_flex.length) {
      navbar_flex.prepend(toggle_html);
      return;
    }

    // 2. v16 workspace/module pages — inject into the user dropdown area
    //    These pages have a sidebar layout with no desktop navbar
    const sidebarFooter = $('.desk-sidebar .sidebar-footer, .sidebar-footer');
    if (sidebarFooter.length) {
      sidebarFooter.prepend(toggle_html);
      return;
    }

    // 3. v15 fallback: Bootstrap navbar-collapse layout
    const navbar_nav = $('header.navbar .navbar-collapse .navbar-nav');
    if (navbar_nav.length) {
      const toggle_html_v15 = `
        <li class="nav-item dropdown dropdown-language">
          <a class="nav-link dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
            🌐 ${this.languages[this.current_language]}
          </a>
          <ul class="dropdown-menu dropdown-menu-right" role="menu">
            ${toggle_items}
          </ul>
        </li>`;
      navbar_nav.prepend(toggle_html_v15);
      return;
    }

    // 4. Universal fallback: fixed position toggle in top-right corner
    //    Works on any page layout where other methods fail
    const fixed_toggle = `
      <div class="dropdown dropdown-language" style="position: fixed; top: 8px; right: 80px; z-index: 1050;">
        <button class="btn-reset nav-link text-muted" data-toggle="dropdown"
          style="cursor: pointer; font-size: 13px; background: var(--bg-color); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color);">
          🌐 ${this.languages[this.current_language]}
        </button>
        <ul class="dropdown-menu dropdown-menu-right" role="menu" style="min-width: 120px;">
          ${toggle_items}
        </ul>
      </div>`;
    $('body').append(fixed_toggle);
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
// v16 has multiple page layouts (desktop, workspace, form) — re-check on navigation
(function initLanguageToggle() {
  function tryInit() {
    if (document.querySelector('.dropdown-language')) return;
    // Don't require specific navbar — the universal fallback handles any layout
    if (typeof frappe !== 'undefined' && frappe.desk) {
      new frappe.ui.language_toggle();
    }
  }

  if (document.readyState === 'complete') {
    setTimeout(tryInit, 300);
  }

  $(document).on('page-change', function () {
    setTimeout(tryInit, 300);
  });

  $(document).on('app-ready', function () {
    setTimeout(tryInit, 500);
  });
})();
