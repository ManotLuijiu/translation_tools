frappe.provide('frappe.ui');

frappe.ui.language_toggle = class LanguageToggle {
  constructor() {
    this.languages = frappe.boot.languages || {
      en: 'English',
      th: 'ไทย',
      lo: 'ลาว',
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
  }

  get_current_theme() {
    return document.documentElement.getAttribute('data-theme-mode') || 'light';
  }

  // v16+: Convert user section to dropdown menu with Profile, Settings, Logout
  inject_user_dropdown() {
    // Skip if already converted
    if (document.querySelector('.dropdown-navbar-user-wrapper')) return;
    
    const user_section = $('.body-sidebar-bottom .dropdown-navbar-user');
    if (!user_section.length) return;

    const user_name = frappe.session.user_fullname || frappe.session.user;
    const user_email = frappe.session.user_email || '';
    const user_initials = user_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Get avatar HTML from existing element
    const avatar_html = user_section.find('.avatar').parent().html() || '';

    // Icons
    const user_icon = '<svg class="icon icon-sm"><use href="#icon-user"></use></svg>';
    const settings_icon = '<svg class="icon icon-sm"><use href="#icon-settings"></use></svg>';
    const logout_icon = '<svg class="icon icon-sm"><use href="#icon-log-out"></use></svg>';

    // Build user dropdown HTML
    const user_dropdown_html = `
      <div class="dropdown-navbar-user-wrapper">
        <a class="align-center btn-reset flex nav-link sidebar-user-button bunchee-user-dropdown-toggle"
           data-toggle="dropdown"
           href="#"
           aria-label="${__('User Menu')}">
          <div class="bunchee-user-avatar">${avatar_html}</div>
          <div class="bunchee-user-info text-small overflow-hidden ml-2">
            <span class="d-block text-truncate">${user_name}</span>
            <span class="d-block text-secondary text-truncate">${user_email}</span>
          </div>
        </a>
        <div class="dropdown-menu dropdown-menu-right bunchee-user-menu">
          <div class="bunchee-user-menu-header">
            <div class="d-flex align-items-center mb-2">
              <span class="avatar avatar-medium">
                <div class="avatar-frame standard-image" style="background-color: var(--orange-avatar-bg); color: var(--orange-avatar-color)">
                  ${user_initials}
                </div>
              </span>
              <div class="ml-2">
                <div class="text-truncate fw-bold">${user_name}</div>
                <div class="text-truncate text-muted" style="font-size: 11px;">${user_email}</div>
              </div>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <a href="#" class="dropdown-item bunchee-profile-item" onclick="return frappe.ui.toolbar.route_to_user()">
            <span class="mr-2">${user_icon}</span>
            ${__('My Profile')}
          </a>
          <a href="/desk/settings" class="dropdown-item">
            <span class="mr-2">${settings_icon}</span>
            ${__('Settings')}
          </a>
          <div class="dropdown-divider"></div>
          <a href="/desk/logout" class="dropdown-item text-danger">
            <span class="mr-2">${logout_icon}</span>
            ${__('Logout')}
          </a>
        </div>
      </div>`;

    user_section.replaceWith(user_dropdown_html);
  }

  // v16+: inject language + theme dropdowns below the user block
  inject_sidebar_controls() {
    if (document.querySelector('.bunchee-sidebar-controls')) return;

    const user_section = $('.dropdown-navbar-user-wrapper');
    if (!user_section.length) return;

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
    const theme_label = theme_options.find((t) => t.key === current_theme)?.label || __('Light');
    const theme_items = theme_options
      .map(({ key, label }) => {
        const active = current_theme === key ? 'active' : '';
        return `<a href="#" data-theme="${key}" class="dropdown-item ${active}">${label}</a>`;
      })
      .join('');

    // Icons - force show icon always
    const globe_icon = '<svg class="icon icon-sm"><use href="#icon-earth"></use></svg>';
    const theme_icon_name = current_theme === 'dark' ? 'moon' : 'sun';
    const theme_icon = `<svg class="icon icon-sm"><use href="#icon-${theme_icon_name}"></use></svg>`;

    const controls_html = `
      <div class="bunchee-sidebar-controls">
        <div class="dropdown">
          <a class="align-center btn-reset flex nav-link dropdown-toggle bunchee-lang-trigger"
             data-toggle="dropdown"
             href="#"
             aria-label="${__('Switch Language')}">
            <span class="bunchee-lang-icon">${globe_icon}</span>
            <span class="bunchee-lang-label sidebar-item-label">${this.languages[this.current_language]}</span>
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
            <span class="bunchee-theme-icon">${theme_icon}</span>
            <span class="bunchee-theme-label sidebar-item-label">${theme_label}</span>
          </a>
          <div class="dropdown-menu">
            ${theme_items}
          </div>
        </div>
      </div>`;

    user_section.after(controls_html);
  }

  // Setup event handlers
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

    // Update sidebar labels
    const theme_options = {
      light: { label: __('Light'), icon: 'sun' },
      dark: { label: __('Dark'), icon: 'moon' },
      automatic: { label: __('Auto'), icon: 'sun-moon' },
    };
    const chosen = theme_options[theme] || theme_options.light;
    $('.bunchee-theme-label').text(chosen.label);
    const new_icon = `<svg class="icon icon-sm"><use href="#icon-${chosen.icon}"></use></svg>`;
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

// ============================================================================
// Initialization - Single shot only
// ============================================================================
(function initLanguageToggle() {
  let initialized = false;
  let langToggle = null;

  function injectControls() {
    if (initialized) return;
    
    const user_section = document.querySelector('.body-sidebar-bottom .dropdown-navbar-user');
    if (!user_section) {
      // Try again after short delay
      setTimeout(injectControls, 500);
      return;
    }
    
    // Check if already initialized
    if (document.querySelector('.dropdown-navbar-user-wrapper')) {
      console.log('[language_toggle] Already initialized, skipping');
      return;
    }
    
    initialized = true;
    console.log('[language_toggle] Injecting controls now');
    
    langToggle = new frappe.ui.language_toggle();
    langToggle.inject_user_dropdown();
    langToggle.inject_sidebar_controls();
    langToggle.setup_events();
    
    console.log('[language_toggle] Injection complete');
  }

  // Start after document is ready and DOM is stable
  if (document.readyState === 'complete') {
    setTimeout(injectControls, 2000);
  } else {
    $(window).on('load', function() {
      setTimeout(injectControls, 2000);
    });
  }
})();