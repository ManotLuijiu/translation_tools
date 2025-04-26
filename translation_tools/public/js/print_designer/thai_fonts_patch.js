// Patch for adding Thai fonts to Print Designer

(function () {
  console.log('Thai fonts patch loading...');

  // Function to add Thai fonts to the Print Designer
  function addThaiToPrintDesigner() {
    try {
      // Check if we have access to the Pinia store
      if (window.__pinia && window.__pinia.state.value) {
        // Look for the store that might contain the fonts
        const storeKeys = Object.keys(window.__pinia.state.value);
        const mainStore = storeKeys.find(
          (key) =>
            Object.prototype.hasOwnProperty.call(
              window.__pinia.state.value[key],
              'fonts'
            ) || Object.hasOwn(window.__pinia.state.value[key], 'GoogleFonts')
        );

        if (mainStore) {
          const store = window.__pinia.state.value[mainStore];
          let fontsObject = store.fonts || store.GoogleFonts;

          if (fontsObject) {
            // Add Thai fonts
            fontsObject['Sarabun'] = [
              [100, 200, 300, 400, 500, 600, 700, 800],
              [100, 200, 300, 400, 500, 600, 700, 800],
            ];

            fontsObject['Kanit'] = [
              [100, 200, 300, 400, 500, 600, 700, 800, 900],
              [100, 200, 300, 400, 500, 600, 700, 800, 900],
            ];

            fontsObject['Prompt'] = [
              [100, 200, 300, 400, 500, 600, 700, 800, 900],
              [100, 200, 300, 400, 500, 600, 700, 800, 900],
            ];

            console.log('Successfully added Thai fonts to Print Designer');
            return true;
          }
        }

        // Method 2: Try to find the Google Fonts in the window object
        if (window.GoogleFonts) {
          window.GoogleFonts['Sarabun'] = [
            [100, 200, 300, 400, 500, 600, 700, 800],
            [100, 200, 300, 400, 500, 600, 700, 800],
          ];

          // Add other Thai fonts...
          console.log('Added Thai fonts to global GoogleFonts');
          return true;
        }
      }

      return false;
    } catch (e) {
      console.error('Error adding Thai fonts:', e);
      return false;
    }
  }

  // Try to modify fonts when the page loads
  $(document).on('page:change', function () {
    if (frappe.router.current_route[0] === 'print_designer') {
      console.log('Print Designer detected, attempting to add Thai fonts...');

      // Attempt immediately
      if (!addThaiToPrintDesigner()) {
        // If failed, try again after a delay to ensure the app is fully loaded
        let attempts = 0;
        const maxAttempts = 10;

        const attemptInterval = setInterval(function () {
          attempts++;
          console.log(`Attempt ${attempts} to add Thai fonts...`);

          if (addThaiToPrintDesigner() || attempts >= maxAttempts) {
            clearInterval(attemptInterval);
            if (attempts >= maxAttempts) {
              console.log('Failed to add Thai fonts after maximum attempts');
            }
          }
        }, 1000);
      }
    }
  });

  // Also try when DOM is ready
  $(function () {
    if (
      frappe.router &&
      frappe.router.current_route &&
      frappe.router.current_route[0] === 'print_designer'
    ) {
      setTimeout(addThaiToPrintDesigner, 1000);
    }
  });
})();
