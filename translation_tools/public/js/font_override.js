// Load and configure Thai fonts for pdfmake
frappe.provide('frappe.pdfmake');

frappe.pdfmake = {
  // Register fonts with pdfMake
  init: function () {
    // Define available fonts
    const fonts = {
      Sarabun: {
        normal: '/assets/translation_tools/fonts/Sarabun/Sarabun-Regular.ttf',
        bold: '/assets/translation_tools/fonts/Sarabun/Sarabun-Bold.ttf',
        italics: '/assets/translation_tools/fonts/Sarabun/Sarabun-Italic.ttf',
        bolditalics:
          '/assets/translation_tools/fonts/Sarabun/Sarabun-BoldItalic.ttf',
      },
      Prompt: {
        normal: '/assets/translation_tools/fonts/Prompt/Prompt-Regular.ttf',
        bold: '/assets/translation_tools/fonts/Prompt/Prompt-Bold.ttf',
        italics: '/assets/translation_tools/fonts/Prompt/Prompt-Italic.ttf',
        bolditalics:
          '/assets/translation_tools/fonts/Prompt/Prompt-BoldItalic.ttf',
      },
      Kanit: {
        normal: '/assets/translation_tools/fonts/Kanit/Kanit-Regular.ttf',
        bold: '/assets/translation_tools/fonts/Kanit/Kanit-Bold.ttf',
        italics: '/assets/translation_tools/fonts/Kanit/Kanit-Italic.ttf',
        bolditalics:
          '/assets/translation_tools/fonts/Kanit/Kanit-BoldItalic.ttf',
      },
    };

    // Register fonts with pdfmake
    if (window.pdfMake) {
      pdfMake.fonts = fonts;
      console.log('Thai fonts registered with pdfmake');
    } else {
      console.warn('pdfMake not loaded yet, fonts will not be registered');
    }
  },
};

// Initialize fonts when the page loads
$(document).ready(function () {
  frappe.pdfmake.init();
});
