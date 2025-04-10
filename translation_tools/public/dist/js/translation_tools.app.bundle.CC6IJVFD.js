(() => {
  // ../translation_tools/translation_tools/public/js/app.js
  frappe.provide("translation_tools");
  translation_tools.setup_integration_button = function() {
    console.log("Translation Tools: Checking for Integrations page");
    const currentPath = window.location.pathname;
    const isIntegrationsPage = currentPath === "/app/integrations" || currentPath.endsWith("/app/integrations") || frappe.router && frappe.router.current_route && frappe.router.current_route.length > 0 && frappe.router.current_route[0] === "Integrations";
    console.log("isIntegrationsPage", isIntegrationsPage);
    if (isIntegrationsPage) {
      console.log(
        "Translation Tools: On Integrations page, checking for existing link"
      );
      if ($("#trigger-translation-tools").length > 0)
        return;
      if (sessionStorage.getItem("translation_tools_reload_executed")) {
        console.log("Translation Tools: Reload already executed, skipping");
        sessionStorage.removeItem("translation_tools_reload_executed");
        return;
      }
      frappe.call({
        method: "translation_tools.api.integrations.check_translation_tools_link",
        args: {},
        callback: function(r) {
          console.log("Translation Tools: Link check response", r);
          if (r.message && !r.message.link_exists) {
            console.log("Translation Tools: Link doesn't exist, adding button");
            var button = $(
              "<button class='btn btn-primary mt-3 mb-3' id='trigger-translation-tools'>Add Translation Tools to Integration</button>"
            );
            button.on("click", function() {
              frappe.call({
                method: "translation_tools.api.integrations.add_translation_tools_link_to_integrations",
                args: {},
                callback: function(r2) {
                  console.log("Translation Tools: Add link response", r2);
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
                console.log(
                  "No suitable container found, adding floating button"
                );
                $("body").append(
                  "<div style='position:fixed;top:100px;right:20px;z-index:9999;'>" + button[0].outerHTML + "</div>"
                );
              }
            }, 1e3);
          } else {
            console.log(
              "Translation Tools: Link already exists or error occurred"
            );
          }
        }
      });
    }
  };
  $(document).ready(function() {
    console.log("Translation Tools: Document ready");
    setTimeout(translation_tools.setup_integration_button, 2e3);
  });
  $(document).on("route_change", function() {
    console.log("Translation Tools: Route changed");
    setTimeout(translation_tools.setup_integration_button, 2e3);
  });
})();
//# sourceMappingURL=translation_tools.app.bundle.CC6IJVFD.js.map
