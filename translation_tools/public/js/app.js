console.log("Translation Tools integration script loaded");
frappe.ui.form.on("Workspace", {
  refresh: function (frm) {
    // Only run this for Integrations workspace
    if (frm.doc.name !== "Integrations") return;

    console.log(
      "Translation Tools integration running for Integrations workspace"
    );

    // First check if the link already exists
    frappe.call({
      method: "translation_tools.api.integrations.check_translation_tools_link",
      args: {},
      callback: function (r) {
        if (r.message && !r.message.link_exists) {
          console.log("Translation Tools link doesn't exist, showing button");

          // Create a button to add the link
          var button = $(
            "<button class='btn btn-primary mt-3 mb-3'>Add Translation Tools to Integration</button>"
          );

          button.on("click", function () {
            frappe.call({
              method:
                "ranslation_tools.api.integrations.add_translation_tools_link_to_integrations",
              args: {},
              callback: function (r) {
                if (r.message && r.message.success) {
                  frappe.show_alert({
                    message: __("Translation Tools link added successfully!"),
                    indicator: "green",
                  });

                  // Reload the page after a short delay
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

          // Add the button to the page
          $(frm.fields_dict.links_html.wrapper).prepend(button);
        } else {
          console.log("Translation Tools link already exists");
        }
      },
    });
  },
});
