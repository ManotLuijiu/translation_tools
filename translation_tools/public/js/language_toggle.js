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

    const frappe_ver_str = frappe.boot.versions?.frappe || '15.0.0';
    this.frappe_major = parseInt(frappe_ver_str.split('.')[0], 10);

    this.setup();
  }

  setup() {
    if (!('desk' in frappe)) return;

    if (this.frappe_major >= 16) {
      this.inject_sidebar_controls();
    } else {
      this.create_navbar_toggle();
    }
    this.setup_events();
  }

  get_current_theme() {
    return document.documentElement.getAttribute('data-theme-mode') || 'light';
  }

  // v16+: inject language + theme dropdowns below the user block, styled like native sidebar links
  inject_sidebar_controls() {
    if (document.querySelector('.bunchee-sidebar-controls')) return;

    const inject = () => {
      if (document.querySelector('.bunchee-sidebar-controls')) return true;

      const user_section = $('.body-sidebar-bottom .dropdown-navbar-user');
      if (!user_section.length) return false;

      // Remove any stale injection from frappe_middleware to avoid duplicates
      $('.dropdown-language-sidebar').remove();

      const lang_items = Object.entries(this.languages)
        .map(([code, label]) => {
          const active = this.current_language === code ? 'active' : '';
          return `<a href="#" data-lang="${code}" class="dropdown-item ${active}">${label}</a>`;
        })
        .join('');

      const current_theme = this.get_current_theme();
      const theme_options = [
        { key: 'light', label: __('Light') },
        { key: 'dark', label: __('Dark') },
        { key: 'automatic', label: __('Auto') },
      ];
      const theme_label =
        theme_options.find((t) => t.key === current_theme)?.label || __('Light');
      const theme_items = theme_options
        .map(({ key, label }) => {
          const active = current_theme === key ? 'active' : '';
          return `<a href="#" data-theme="${key}" class="dropdown-item ${active}">${label}</a>`;
        })
        .join('');

      // Frappe v16 lucide icons
      const globe_icon = frappe.utils.icon(
        'earth',
        'sm',
        '',
        '',
        'text-ink-gray-7 current-color',
        true,
      );
      const theme_icon_name = current_theme === 'dark' ? 'moon' : 'sun';
      const theme_icon = frappe.utils.icon(
        theme_icon_name,
        'sm',
        '',
        '',
        'text-ink-gray-7 current-color',
        true,
      );

      const controls_html = `
        <div class="bunchee-sidebar-controls">
          <div class="dropdown">
            <a class="align-center btn-reset flex nav-link dropdown-toggle bunchee-lang-trigger"
               data-toggle="dropdown"
               href="#"
               aria-label="${__('Switch Language')}">
              <span class="sidebar-item-icon text-ink-gray-7 bunchee-lang-icon">${globe_icon}</span>
              <span class="sidebar-item-label bunchee-lang-label">${this.languages[this.current_language]}</span>
            </a>
            <div class="dropdown-menu">
              ${lang_items}
            </div>
          </div>
          <div class="dropdown">
            <a class="align-center btn-reset flex nav-link dropdown-toggle bunchee-theme-trigger"
               data-toggle="dropdown"
               href="#"
               aria-label="${__('Switch Theme')}">
              <span class="sidebar-item-icon text-ink-gray-7 bunchee-theme-icon">${theme_icon}</span>
              <span class="sidebar-item-label bunchee-theme-label">${theme_label}</span>
            </a>
            <div class="dropdown-menu">
              ${theme_items}
            </div>
          </div>
        </div>`;

      user_section.after(controls_html);
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
    // v16 language switch
    $('body').on('click', '.bunchee-sidebar-controls .dropdown-item[data-lang]', (e) => {
      e.preventDefault();
      const lang_code = $(e.currentTarget).data('lang');
      if (lang_code && lang_code !== this.current_language) {
        this.switch_language(lang_code);
      }
    });

    // v16 theme switch
    $('body').on('click', '.bunchee-sidebar-controls .dropdown-item[data-theme]', (e) => {
      e.preventDefault();
      const theme = $(e.currentTarget).data('theme');
      if (theme) {
        this.switch_theme(theme);
      }
    });

    // v15 navbar language switch
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

  switch_theme(theme) {
    document.documentElement.setAttribute('data-theme-mode', theme);
    frappe.ui.set_theme();

    // Update sidebar label and icon immediately
    const theme_options = {
      light: { label: __('Light'), icon: 'sun' },
      dark: { label: __('Dark'), icon: 'moon' },
      automatic: { label: __('Auto'), icon: 'sun-moon' },
    };
    const chosen = theme_options[theme] || theme_options.light;
    $('.bunchee-theme-label').text(chosen.label);
    const new_icon = frappe.utils.icon(
      chosen.icon,
      'sm',
      '',
      '',
      'text-ink-gray-7 current-color',
      true,
    );
    $('.bunchee-theme-icon').html(new_icon);

    // Mark active item
    $('.bunchee-sidebar-controls .dropdown-item[data-theme]').removeClass('active');
    $(`.bunchee-sidebar-controls .dropdown-item[data-theme="${theme}"]`).addClass('active');

    // Persist via Frappe API
    frappe.xcall('frappe.core.doctype.user.user.switch_theme', {
      theme: theme.charAt(0).toUpperCase() + theme.slice(1),
    });
  }
};

(function initLanguageToggle() {
  function tryInit() {
    if (document.querySelector('.bunchee-sidebar-controls')) return;
    if (typeof frappe !== 'undefined' && frappe.desk) {
      new frappe.ui.language_toggle();
    }
  }

  $(document).on('toolbar_setup', function () {
    setTimeout(tryInit, 300);
  });

  $(document).on('page-change', function () {
    // Re-inject on page navigation (v16 renders dynamically)
    $('.bunchee-sidebar-controls').remove();
    $('.dropdown-language-sidebar').remove();
    setTimeout(tryInit, 300);
  });

  $(document).on('app-ready', function () {
    setTimeout(tryInit, 500);
  });

  if (document.readyState === 'complete') {
    setTimeout(tryInit, 500);
  } else {
    $(function () {
      setTimeout(tryInit, 500);
    });
  }
})();
