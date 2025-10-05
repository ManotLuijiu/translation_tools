(() => {
  // ../translation_tools/translation_tools/public/js/app.js
  frappe.provide("translation_tools");
  translation_tools.setup_integration_button = function() {
    const currentPath = window.location.pathname;
    const isIntegrationsPage = currentPath === "/app/integrations" || currentPath.endsWith("/app/integrations") || frappe.router && frappe.router.current_route && frappe.router.current_route.length > 0 && frappe.router.current_route[0] === "Integrations";
    if (isIntegrationsPage) {
      if ($("#trigger-translation-tools").length > 0)
        return;
      if (sessionStorage.getItem("translation_tools_reload_executed")) {
        sessionStorage.removeItem("translation_tools_reload_executed");
        return;
      }
      frappe.call({
        method: "translation_tools.api.integrations.check_translation_tools_link",
        args: {},
        callback: function(r) {
          if (r.message && !r.message.link_exists) {
            var button = $(
              "<button class='btn btn-primary mt-3 mb-3' id='trigger-translation-tools'>Add Translation Tools to Integration</button>"
            );
            button.on("click", function() {
              frappe.call({
                method: "translation_tools.api.integrations.add_translation_tools_link_to_integrations",
                args: {},
                callback: function(r2) {
                  if (r2.message && r2.message.success) {
                    frappe.show_alert({
                      message: __("Translation Tools link added successfully!"),
                      indicator: "green"
                    });
                    sessionStorage.setItem(
                      "translation_tools_reload_executed",
                      "true"
                    );
                    setTimeout(function() {
                      window.location.reload(true);
                    }, 1500);
                  } else {
                    frappe.msgprint(
                      __(
                        "Error: " + (r2.message && r2.message.error ? r2.message.error : "Unknown error")
                      )
                    );
                  }
                }
              });
            });
            setTimeout(function() {
              var added = false;
              if ($(".layout-main-section").length) {
                $(".layout-main-section").prepend(button);
                added = true;
              } else if ($(".workspace-sidebar").length) {
                $(".workspace-sidebar").prepend(button);
                added = true;
              } else if ($(".page-head").length) {
                $(".page-head").append(button);
                added = true;
              }
              if (!added) {
                $("body").append(
                  "<div style='position:fixed;top:100px;right:20px;z-index:9999;'>" + button[0].outerHTML + "</div>"
                );
              }
            }, 1e3);
          } else {
          }
        }
      });
    }
  };
  $(document).ready(function() {
    setTimeout(translation_tools.setup_integration_button, 2e3);
  });
  $(document).on("route_change", function() {
    setTimeout(translation_tools.setup_integration_button, 2e3);
  });

  // ../translation_tools/translation_tools/public/js/language_toggle.js
  frappe.provide("frappe.ui");
  frappe.ui.language_toggle = class LanguageToggle {
    constructor() {
      this.languages = frappe.boot.languages || {
        en: "English",
        th: "\u0E44\u0E17\u0E22"
      };
      this.current_language = frappe.boot.lang || "en";
      this.setup();
    }
    setup() {
      if (!("desk" in frappe))
        return;
      this.create_toggle_element();
      this.setup_events();
    }
    create_toggle_element() {
      const toggle_items = Object.entries(this.languages).map(([code, label]) => {
        const active = this.current_language === code ? "active" : "";
        return `
          <li role="menuitem">
            <a href="#" data-lang="${code}" class="dropdown-item ${active}">
              ${label}
            </a>
          </li>`;
      }).join("");
      const toggle_html = `
      <li class="nav-item dropdown dropdown-language">
        <a class="nav-link dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
          \u{1F310} ${this.languages[this.current_language]}
        </a>
        <ul class="dropdown-menu dropdown-menu-right" role="menu">
          ${toggle_items}
        </ul>
      </li>`;
      const navbar = $("header.navbar .navbar-collapse .navbar-nav");
      if (navbar.length) {
        navbar.prepend(toggle_html);
      }
    }
    setup_events() {
      $("body").on("click", ".dropdown-language .dropdown-item", (e) => {
        e.preventDefault();
        const lang_code = $(e.currentTarget).data("lang");
        if (lang_code && lang_code !== this.current_language) {
          this.switch_language(lang_code);
        }
      });
    }
    switch_language(lang_code) {
      frappe.show_alert({
        message: __("Changing language to ") + this.languages[lang_code] + "...",
        indicator: "blue"
      });
      frappe.call({
        method: "frappe.client.set_value",
        args: {
          doctype: "User",
          name: frappe.session.user,
          fieldname: "language",
          value: lang_code
        },
        callback: () => {
          frappe.show_alert({
            message: __("Language updated. Reloading..."),
            indicator: "green"
          });
          setTimeout(() => window.location.reload(), 800);
        },
        error: () => {
          frappe.show_alert({
            message: __("Failed to update language."),
            indicator: "red"
          });
        }
      });
    }
  };
  $(function() {
    new frappe.ui.language_toggle();
  });
})();
//# sourceMappingURL=translation_tools.app.bundle.2UJUURKA.js.map
