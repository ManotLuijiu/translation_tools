import * as React from 'react';
import { App } from './App';
import { createRoot } from 'react-dom/client';
// import pdfMake from 'pdfmake/build/pdfmake';
// import pdfFonts from 'pdfmake/build/vfs_fonts';
// import { initThaiPdfMake } from './vfs_fonts_thai';

// Initialize pdfMake with fonts
pdfMake.vfs = pdfFonts.pdfMake.vfs;

class PdfOverride {
  constructor({ page, wrapper }) {
    // console.log('PdfOverride constructor called');
    this.$wrapper = $(wrapper);
    this.page = page;

    this.init();
  }

  init() {
    // console.log('PdfOverride init called');
    this.setup_page_actions();
    this.setup_app();
  }

  //   async init() {
  //     // Load pdfMake dynamically
  //     try {
  //       // First check if pdfMake is already loaded globally
  //       if (!window.pdfMake) {
  //         console.log('Loading pdfMake dynamically');
  //         await this.loadScript('/assets/translation_tools/js/pdfmake.min.js');
  //         await this.loadScript('/assets/translation_tools/js/vfs_fonts.js');
  //       }

  //       // Configure Thai fonts
  //       if (window.pdfMake) {
  //         window.pdfMake.fonts = {
  //           Roboto: {
  //             normal: 'Roboto-Regular.ttf',
  //             bold: 'Roboto-Medium.ttf',
  //             italics: 'Roboto-Italic.ttf',
  //             bolditalics: 'Roboto-MediumItalic.ttf',
  //           },
  //           Kanit: {
  //             normal: '/assets/translation_tools/fonts/Kanit/Kanit-Regular.ttf',
  //             bold: '/assets/translation_tools/fonts/Kanit/Kanit-Bold.ttf',
  //             italics: '/assets/translation_tools/fonts/Kanit/Kanit-Italic.ttf',
  //             bolditalics:
  //               '/assets/translation_tools/fonts/Kanit/Kanit-BoldItalic.ttf',
  //           },
  //         };

  //         console.log('pdfMake configured successfully');
  //       } else {
  //         console.error('pdfMake failed to load');
  //       }
  //     } catch (error) {
  //       console.error('Error initializing pdfMake:', error);
  //     }

  //     this.setup_page_actions();
  //     this.setup_app();
  //   }

  // Helper function to load scripts
  //   loadScript(src) {
  //     return new Promise((resolve, reject) => {
  //       const script = document.createElement('script');
  //       script.src = src;
  //       script.onload = resolve;
  //       script.onerror = reject;
  //       document.head.appendChild(script);
  //     });
  //   }

  //   setup_page_actions() {
  //     // Add refresh button
  //     this.page.set_primary_action(__('Refresh'), () => {
  //       this.refresh();
  //     });

  //     // Add settings menu
  //     this.page.add_menu_item(__('Settings'), () => {
  //       this.show_settings();
  //     });

  //     // Add help menu
  //     this.page.add_menu_item(__('Help'), () => {
  //       frappe.help.show_video(
  //         'https://www.youtube.com/watch?v=example',
  //         'Using Thai PDF Generator'
  //       );
  //     });

  //     // Add PDF generation action
  //     this.page.add_menu_item(__('Generate Thai PDF'), () => this.generate_pdf());
  //   }

  setup_page_actions() {
    // Add refresh button
    this.page.set_primary_action(__('Generate PDF'), () => {
      this.generateSimplePdf();
    });
  }

  //   refresh() {
  //     // Re-render the app
  //     this.setup_app();
  //   }

  //   show_settings() {
  //     frappe.prompt(
  //       [
  //         {
  //           label: 'Default Font',
  //           fieldname: 'default_font',
  //           fieldtype: 'Select',
  //           options: 'Kanit\nRoboto',
  //           default: 'Kanit',
  //         },
  //         {
  //           label: 'Include Company Logo',
  //           fieldname: 'include_logo',
  //           fieldtype: 'Check',
  //           default: 1,
  //         },
  //         {
  //           label: 'Default Page Size',
  //           fieldname: 'page_size',
  //           fieldtype: 'Select',
  //           options: 'A4\nLetter\nLegal',
  //           default: 'A4',
  //         },
  //       ],
  //       (values) => {
  //         // Store settings in localStorage
  //         localStorage.setItem('pdf_override_settings', JSON.stringify(values));
  //         frappe.show_alert({
  //           message: __('Settings saved'),
  //           indicator: 'green',
  //         });
  //         this.refresh();
  //       },
  //       __('PDF Settings'),
  //       __('Save')
  //     );
  //   }

  //   generate_pdf() {
  //     // Example PDF generation with Thai support
  //     const docDefinition = {
  //       content: [
  //         { text: 'English text with Thai / ข้อความภาษาไทย', style: 'header' },
  //         {
  //           text: 'This document supports Thai language / เอกสารนี้รองรับภาษาไทย',
  //         },
  //       ],
  //       styles: {
  //         header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
  //       },
  //       defaultStyle: {
  //         font: 'THSarabun',
  //       },
  //     };

  //     pdfMake.createPdf(docDefinition).download('thai_document.pdf');
  //   }

  generateSimplePdf() {
    // console.log('Generating simple PDF');
    if (window.pdfMake) {
      // Configure Thai fonts if needed
      if (!window.pdfMake.fonts || !window.pdfMake.fonts.Kanit) {
        window.pdfMake.fonts = {
          ...window.pdfMake.fonts,
          Kanit: {
            normal: '/assets/translation_tools/fonts/Kanit/Kanit-Regular.ttf',
            bold: '/assets/translation_tools/fonts/Kanit/Kanit-Bold.ttf',
            italics: '/assets/translation_tools/fonts/Kanit/Kanit-Italic.ttf',
            bolditalics:
              '/assets/translation_tools/fonts/Kanit/Kanit-BoldItalic.ttf',
          },
        };
      }

      const docDefinition = {
        content: [
          { text: 'Thai PDF Test / ทดสอบ PDF ภาษาไทย', style: 'header' },
          {
            text: 'This is a test of Thai language support in PDFs.',
            margin: [0, 10, 0, 5],
          },
          {
            text: 'นี่คือการทดสอบการสนับสนุนภาษาไทยใน PDF',
            margin: [0, 0, 0, 10],
          },
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        },
        defaultStyle: {
          font: 'Kanit',
        },
      };

      window.pdfMake.createPdf(docDefinition).open();
    } else {
      frappe.msgprint('pdfMake library is not loaded properly');
    }
  }

  setup_app() {
    // console.log('Setting up React app');
    // Create and mount the react app
    const root = createRoot(this.$wrapper.get(0));
    root.render(
      <App
        pdfMake={window.pdfMake}
        onGeneratePdf={() => this.generateSimplePdf()}
      />
    );
    this.$pdf_override = root;
  }

  //   setup_app() {
  //     // Get settings from localStorage
  // 	console.log("Setting up React app");
  //     let settings;
  //     try {
  //       settings = JSON.parse(
  //         localStorage.getItem('pdf_override_settings') || '{}'
  //       );
  //     } catch (error) {
  //       settings = {};
  //     }

  //     // create and mount the react app
  //     const root = createRoot(this.$wrapper.get(0));
  //     root.render(<App pdfMake={pdfMake} />);
  //     this.$pdf_override = root;
  //   }
}

frappe.provide('frappe.ui');
frappe.ui.PdfOverride = PdfOverride;
export default PdfOverride;
