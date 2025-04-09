frappe.provide("translation_tools");

translation_tools.setup_integration_button = function () {
  console.log("Translation Tools: Checking for Integrations page");

  // Check if we're on the Integrations page
  if (window.location.href.includes("/app/integrations")) {
    console.log(
      "Translation Tools: On Integrations page, checking for existing link"
    );

    // First check if button already exists to avoid duplicates
    if ($("#trigger-translation-tools").length > 0) return;

    frappe.call({
      method: "translation_tools.api.integrations.check_translation_tools_link",
      args: {},
      callback: function (r) {
        console.log("Translation Tools: Link check response", r);

        if (r.message && !r.message.link_exists) {
          console.log("Translation Tools: Link doesn't exist, adding button");

          var button = $(
            "<button class='btn btn-primary mt-3 mb-3' id='trigger-translation-tools'>Add Translation Tools to Integration</button>"
          );

          button.on("click", function () {
            frappe.call({
              method:
                "translation_tools.api.integrations.add_translation_tools_link_to_integrations",
              args: {},
              callback: function (r) {
                console.log("Translation Tools: Add link response", r);

                if (r.message && r.message.success) {
                  frappe.show_alert({
                    message: __("Translation Tools link added successfully!"),
                    indicator: "green",
                  });

                  setTimeout(function () {
                    window.location.reload();
                  }, 1500);
                } else {
                  frappe.msgprint(
                    __(
                      "Error: " +
                        (r.message && r.message.error
                          ? r.message.error
                          : "Unknown error")
                    )
                  );
                }
              },
            });
          });

          // Add the button to various possible locations
          setTimeout(function () {
            var added = false;

            // Try different places to add the button
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
                "<div style='position:fixed;top:100px;right:20px;z-index:9999;'>" +
                  button[0].outerHTML +
                  "</div>"
              );
            }
          }, 1000);
        } else {
          console.log(
            "Translation Tools: Link already exists or error occurred"
          );
        }
      },
    });
  }
};

// Run when DOM is ready
$(document).ready(function () {
  console.log("Translation Tools: Document ready");
  setTimeout(translation_tools.setup_integration_button, 2000);
});

// Also run when route changes
$(document).on("route_change", function () {
  console.log("Translation Tools: Route changed");
  setTimeout(translation_tools.setup_integration_button, 2000);
});
