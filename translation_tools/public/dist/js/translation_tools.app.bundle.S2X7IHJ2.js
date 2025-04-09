(() => {
  // ../translation_tools/translation_tools/public/js/app.js
  console.log("Translation Tools integration script loaded");
  frappe.ui.form.on("Workspace", {
    refresh: function(frm) {
      if (frm.doc.name !== "Integrations")
        return;
      console.log(
        "Translation Tools integration running for Integrations workspace"
      );
      frappe.call({
        method: "translation_tools.api.integrations.check_translation_tools_link",
        args: {},
        callback: function(r) {
          if (r.message && !r.message.link_exists) {
            console.log("Translation Tools link doesn't exist, showing button");
            var button = $(
              "<button class='btn btn-primary mt-3 mb-3'>Add Translation Tools to Integration</button>"
            );
            button.on("click", function() {
              frappe.call({
                method: "ranslation_tools.api.integrations.add_translation_tools_link_to_integrations",
                args: {},
                callback: function(r2) {
                  if (r2.message && r2.message.success) {
                    frappe.show_alert({
                      message: __("Translation Tools link added successfully!"),
                      indicator: "green"
                    });
                    setTimeout(function() {
                      window.location.reload();
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
            $(frm.fields_dict.links_html.wrapper).prepend(button);
          } else {
            console.log("Translation Tools link already exists");
          }
        }
      });
    }
  });
})();
//# sourceMappingURL=translation_tools.app.bundle.S2X7IHJ2.js.map
