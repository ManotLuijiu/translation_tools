/**
 * API functions for setup status and operations
 */

// Type for setup status
// export interface SetupStatus {
//     is_setup_complete: boolean;
//     missing_dependencies?: string[];
//     api_key_configured?: boolean;
//     // Add other status fields as needed
//   }

/**
 * Check the setup status of the translation tools
 */
export const checkSetupStatus = () => {
  return new Promise((resolve, reject) => {
    frappe.call({
      method:
        'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status',
      callback: (r) => {
        if (r.exc) {
          console.error('Error checking setup status:', r.exc);
          reject(r.exc);
        } else {
          resolve(r.message || { is_setup_complete: false });
        }
      },
    });
  });
};

/**
 * Run the setup process
 */
export const runSetup = (args) => {
  return new Promise((resolve, reject) => {
    frappe.call({
      method:
        'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.run_setup',
      args: args || {},
      callback: (r) => {
        if (r.exc) {
          console.error('Error running setup:', r.exc);
          reject(r.exc);
        } else {
          resolve(r.message || {});
        }
      },
    });
  });
};
