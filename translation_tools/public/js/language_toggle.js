// Language Toggle
// Author - Manot Luijiu <moocoding@gmail.com>

frappe.provide('frappe.TranslationTools');

/** Language Toggle that adds a language switcher to the navbar */
frappe.TranslationTools.LanguageToggle = class {
  constructor() {
    this.languages = {
      en: 'ENG',
      th: 'TH',
    };
    this.current_language = frappe.boot.lang || 'en';
    this.setup();
  }

  /** Create the language toggle element */
  setup() {
    if (!('desk' in frappe)) {
      // Only run in desk mode
      return;
    }

    this.create_toggle_element();
    this.setup_events();
  }

  /** Create the language toggle switch in the navbar */
  create_toggle_element() {
    const toggle_html = `
      <li class="nav-item dropdown dropdown-language">
        <div class="language-toggle-container" title="Toggle Language">
          <span class="language-label language-en ${this.current_language !== 'en' ? 'inactive' : ''}">ENG</span>
          <div class="language-switch-toggle ${this.current_language === 'th' ? 'active' : ''}">
            <div class="toggle-circle"></div>
          </div>
          <span class="language-label language-th ${this.current_language !== 'th' ? 'inactive' : ''}">TH</span>
        </div>
      </li>
    `;

    // Add toggle to the navbar
    $('header.navbar > .container > .navbar-collapse > ul.navbar-nav').prepend(
      toggle_html
    );

    // Add the CSS
    const css = `
      .dropdown-language {
        display: flex;
        align-items: center;
        margin-right: 10px;
      }
      
      .language-toggle-container {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 0 12px;
      }
      
      .language-switch-toggle {
        position: relative;
        width: 36px;
        height: 20px;
        background-color: var(--gray-500);
        border-radius: 12px;
        margin: 0 8px;
        transition: background-color 0.3s ease;
      }
      
      .language-switch-toggle.active {
        background-color: var(--primary);
      }
      
      .toggle-circle {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.3s ease;
      }
      
      .language-switch-toggle.active .toggle-circle {
        transform: translateX(16px);
      }
      
      .language-label {
        font-weight: 500;
        font-size: 12px;
        color: var(--text-color);
        transition: opacity 0.3s ease;
      }
      
      .language-label.inactive {
        opacity: 0.6;
      }
    `;

    // Add the CSS to the head
    $('<style>').text(css).appendTo('head');
  }

  /** Setup event listeners for language switching */
  setup_events() {
    const me = this;

    $('.language-toggle-container').on('click', function () {
      const new_language = me.current_language === 'en' ? 'th' : 'en';
      me.switch_language(new_language);
    });
  }

  /** Switch the language and reload the page */
  switch_language(lang_code) {
    if (lang_code === this.current_language) return;

    // Show a loading message
    frappe.show_alert({
      message: __('Changing language to ') + this.languages[lang_code] + '...',
      indicator: 'blue',
    });

    // Set the language in user preferences
    frappe.call({
      method: 'frappe.core.doctype.user.user.set_language',
      args: {
        lang: lang_code,
      },
      callback: function (r) {
        if (r.exc) {
          frappe.show_alert({
            message: __('Language change failed'),
            indicator: 'red',
          });
          return;
        }

        // Reload the page to apply the language change
        window.location.reload();
      },
    });
  }
};

// Initialize the language toggle when the document is ready
$(function () {
  new frappe.TranslationTools.LanguageToggle();
});
