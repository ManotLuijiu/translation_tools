// ============================================================================
// Sidebar Header Extension - Add Language & Theme to Sidebar Header Menu
// ============================================================================

frappe.provide('frappe.ui.sidebar_header_ext');

frappe.ui.sidebar_header_ext = {
  initialized: false,
  
  init: function() {
    if (this.initialized) return;
    this.initialized = true;
    
    // Wait for frappe to be ready
    if (typeof frappe === 'undefined' || !frappe.ui || !frappe.ui.Toolbar) return;
    
    // Store original populate_dropdown_menu
    const me = this;
    
    frappe.ui.SidebarHeader = class extends frappe.ui.SidebarHeader {
      populate_dropdown_menu() {
        // Call original first
        super.populate_dropdown_menu();
        
        // Add Language and Theme items after original items
        this.add_language_theme_items();
      }
      
      add_language_theme_items() {
        // Check if we already added our items
        if (this.$wrapper.find('.sidebar-lang-theme-items').length) return;
        
        const languages = {
          en: 'English',
          th: 'ไทย',
          lo: 'ลาว',
        };
        const current_lang = frappe.boot.lang || 'en';
        const current_theme = document.documentElement.getAttribute('data-theme-mode') || 'light';
        
        // Create our custom items container
        const customItemsHtml = `
          <div class="dropdown-menu-item sidebar-lang-theme-section" data-name="lang-theme-section">
            <div class="sidebar-lang-theme-items">
              <div class="sidebar-item-label text-muted" style="font-size: 10px; padding: 4px 8px;">
                ${__('Language')}
              </div>
              ${Object.entries(languages).map(([code, label]) => `
                <a href="#" data-lang="${code}" class="dropdown-item ${code === current_lang ? 'active' : ''}">
                  ${label}
                </a>
              `).join('')}
              
              <div class="sidebar-item-label text-muted" style="font-size: 10px; padding: 8px 8px 4px;">
                ${__('Theme')}
              </div>
              ${['light', 'dark'].map(theme => `
                <a href="#" data-theme="${theme}" class="dropdown-item ${theme === current_theme ? 'active' : ''}">
                  ${theme === 'light' ? '☀️ ' + __('Light') : '🌙 ' + __('Dark')}
                </a>
              `).join('')}
            </div>
          </div>
        `;
        
        // Add divider and our items
        const $divider = $('<div class="dropdown-menu-item dropdown-divider"></div>');
        const $customSection = $(customItemsHtml);
        
        this.$wrapper.find('.dropdown-menu').append($divider).append($customSection);
        
        // Setup click events
        this.$wrapper.find('.sidebar-lang-theme-items .dropdown-item[data-lang]').on('click', (e) => {
          e.preventDefault();
          const lang_code = $(e.currentTarget).data('lang');
          if (lang_code && lang_code !== current_lang) {
            this.switch_language(lang_code);
          }
        });
        
        this.$wrapper.find('.sidebar-lang-theme-items .dropdown-item[data-theme]').on('click', (e) => {
          e.preventDefault();
          const theme = $(e.currentTarget).data('theme');
          if (theme) {
            this.switch_theme(theme);
          }
        });
      }
      
      switch_language(lang_code) {
        const languages = {
          en: 'English',
          th: 'ไทย',
          lo: 'ลาว',
        };
        
        frappe.show_alert({
          message: __('Changing language to ') + languages[lang_code] + '...',
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
        
        const theme_options = {
          light: { label: __('Light'), icon: 'sun' },
          dark: { label: __('Dark'), icon: 'moon' },
        };
        const chosen = theme_options[theme] || theme_options.light;
        
        // Update active state
        this.$wrapper.find('.sidebar-lang-theme-items .dropdown-item[data-theme]').removeClass('active');
        this.$wrapper.find(`.sidebar-lang-theme-items .dropdown-item[data-theme="${theme}"]`).addClass('active');
        
        // Persist via Frappe API
        frappe.xcall('frappe.core.doctype.user.user.switch_theme', {
          theme: theme.charAt(0).toUpperCase() + theme.slice(1),
        });
      }
    };
    
    console.log('[sidebar_header_ext] Extended SidebarHeader class');
  }
};

// Initialize when app is ready
$(document).on('app_ready', function() {
  setTimeout(() => frappe.ui.sidebar_header_ext.init(), 1000);
});

$(document).on('toolbar_setup', function() {
  setTimeout(() => frappe.ui.sidebar_header_ext.init(), 500);
});