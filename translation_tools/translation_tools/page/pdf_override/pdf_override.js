frappe.pages['pdf-override'].on_page_load = function (wrapper) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: __('Thai PDF Generator'),
    single_column: false,
  });
};

frappe.pages['pdf-override'].on_page_show = function (wrapper) {
  // First load PDF.js libraries
  frappe.require(
    [
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js',
    ],
    function () {
      // Fix the font definition
      if (window.pdfMake) {
        // Explicitly define Roboto font
        window.pdfMake.fonts = {
          Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf',
          },
        };
      }
      setup_page(wrapper);
    }
  );
};

function setup_page(wrapper) {
  // Get reference to page and layout section
  const page = wrapper.page;
  const $content = $(wrapper).find('.layout-main-section');

  // Setup Thai fonts for pdfMake
  //   if (window.pdfMake) {
  //     window.pdfMake.fonts = {
  //       Roboto: {
  //         normal: 'Roboto-Regular.ttf',
  //         bold: 'Roboto-Medium.ttf',
  //         italics: 'Roboto-Italic.ttf',
  //         bolditalics: 'Roboto-MediumItalic.ttf',
  //       },
  //       Kanit: {
  //         normal:
  //           'https://cdn.jsdelivr.net/npm/@fontsource/kanit@4.5.10/files/kanit-thai-400-normal.woff2',
  //         bold: 'https://cdn.jsdelivr.net/npm/@fontsource/kanit@4.5.10/files/kanit-thai-700-normal.woff2',
  //         italics:
  //           'https://cdn.jsdelivr.net/npm/@fontsource/kanit@4.5.10/files/kanit-thai-400-italic.woff2',
  //         bolditalics:
  //           'https://cdn.jsdelivr.net/npm/@fontsource/kanit@4.5.10/files/kanit-thai-700-italic.woff2',
  //       },
  //     };
  //   }

  // Clear content area
  $content.empty();

  // Add page actions
  page.set_primary_action(__('Generate Test PDF'), function () {
    generate_test_pdf();
  });

  page.add_menu_item(__('Settings'), function () {
    show_settings();
  });

  // Build the UI
  const html = `
	  <div class="pdf-generator-container">
		<div class="tw-relative tw-flex tw-flex-col tw-min-w-0 tw-break-words tw-bg-clip tw-border tw-border-black/10 tw-rounded-xl">
		  <div class="card-body">
			<h5 class="card-title">${__('Thai PDF Generator')}</h5>
			<p class="card-text">${__('Generate PDFs with Thai language support.')}</p>
			
			<div class="form-group">
			  <label for="pdf-title">${__('Document Title')}</label>
			  <input type="text" class="form-control" id="pdf-title" value="ทดสอบ PDF ภาษาไทย">
			</div>
			
			<div class="form-group">
			  <label for="pdf-content">${__('Content')}</label>
			  <textarea class="form-control" id="pdf-content" rows="4">นี่คือการทดสอบการสนับสนุนภาษาไทยใน PDF\nThis is a test of Thai language support in PDFs.</textarea>
			</div>
			
			<div class="form-group">
			  <div class="checkbox">
				<label>
				  <input type="checkbox" id="pdf-include-logo" checked> ${__('Include Company Logo')}
				</label>
			  </div>
			</div>

			<div class="form-group">
				<label for="font-select">${__('Font')}</label>
				<select class="form-control" id="font-select">
				<option value="THSarabun" selected>THSarabun (ภาษาไทย)</option>
				<option value="Roboto">Roboto (English only)</option>
				</select>
				<small class="text-muted">Note: For proper Thai text display, use the THSarabun option</small>
          	</div>
			
			<button class="btn btn-primary" id="btn-generate-pdf">${__('Generate PDF')}</button>
			<button class="btn btn-secondary" id="btn-generate-from-doc">${__('Generate from Document')}</button>
		  </div>
		</div>
		
		<div class="mt-4">
		  <div class="alert alert-info">
			<strong>${__('Status')}:</strong> 
			${window.pdfMake ? __('PDF Library loaded successfully ✓') : __('PDF Library not loaded ✗')}
		  </div>
		</div>
	  </div>
	`;

  $content.html(html);

  // Attach event handlers
  $content.find('#btn-generate-pdf').on('click', function () {
    generate_custom_pdf();
  });

  $content.find('#btn-generate-from-doc').on('click', function () {
    generate_from_document();
  });

  // Function to generate test PDF
  function generate_test_pdf() {
    if (!window.pdfMake) {
      frappe.msgprint(__('PDF library not loaded properly'));
      return;
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
  }

  // Function to generate custom PDF from form input
  function generate_custom_pdf() {
    if (!window.pdfMake) {
      frappe.msgprint(__('PDF library not loaded properly'));
      return;
    }

    const title = $content.find('#pdf-title').val() || 'PDF Document';
    const content = $content.find('#pdf-content').val() || '';
    const includeLogo = $content.find('#pdf-include-logo').prop('checked');
    const selectedFont = $content.find('#font-select').val();

    // console.log('selectedFont', selectedFont);

    // If Thai font is selected, load it first
    const prepare =
      selectedFont === 'THSarabun' ? load_thai_fonts() : Promise.resolve();

    // console.log('Selected font:', selectedFont);
    // console.log('prepare:', prepare);

    // Show loading
    frappe.show_alert({
      message: __('Generating PDF...'),
      indicator: 'blue',
    });

    // let fontConfig = {};
    // if (selectedFont === 'ThaiRoboto') {
    //   // Use special fallback configuration for Thai
    //   fontConfig = {
    //     fallback: true,
    //     lang: 'th',
    //   };
    // }

    prepare
      .then(() => {
        // Font config based on selection
        const fontConfig = {
          font: selectedFont === 'THSarabun' ? 'THSarabun' : undefined,
        };
        const docDefinition = {
          content: [{ text: title, style: 'header' }],
          styles: {
            header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          },
          defaultStyle: fontConfig,
        };

        // Add logo if requested
        if (includeLogo && frappe.boot.company_logo) {
          docDefinition.content.unshift({
            image: 'data:image/png;base64,' + frappe.boot.company_logo,
            width: 150,
            alignment: 'center',
            margin: [0, 0, 0, 10],
          });
        }

        // Add content
        if (content) {
          // console.log('content', content);
          // Split by newlines and add each line as a paragraph
          const lines = content.split('\n');
          lines.forEach((line) => {
            if (line.trim()) {
              docDefinition.content.push({ text: line, margin: [0, 5, 0, 0] });
            }
          });
        }
        window.pdfMake.createPdf(docDefinition).open();
      })
      .catch((error) => {
        frappe.msgprint(__('Error loading fonts ครับ: {0}', [error]));
      });
  }

  // Load Thai fonts dynamically
  function load_thai_fonts() {
    if (!window.pdfMake) return Promise.reject('pdfMake not loaded');

    // Check if fonts already loaded
    if (window.thai_fonts_loaded) return Promise.resolve();

    // Function to load a font
    function load_font(font_name) {
      return new Promise((resolve, reject) => {
        frappe.call({
          method: 'translation_tools.api.pdf_fonts.get_font_base64',
          args: { font_name: font_name },
          callback: function (response) {
            if (response.message && !response.message.error) {
              const fontData = response.message;
              resolve({ name: font_name, data: fontData });
            } else {
              reject(response.message?.error || 'Failed to load font');
            }
          },
          error: function (err) {
            reject(err);
          },
        });
      });
    }

    // Load all needed fonts
    return Promise.all([
      load_font('THSarabun'),
      load_font('THSarabunBold'),
      load_font('THSarabunBold'),
      load_font('THSarabunBold'),
    ]).then((fonts) => {
      // Add fonts to pdfMake
      if (!window.pdfMake.vfs) window.pdfMake.vfs = {};

      // Add each font to the virtual file system
      fonts.forEach((font) => {
        window.pdfMake.vfs[font.name + '.ttf'] = font.data;
      });

      // Configure Thai font
      window.pdfMake.fonts = {
        ...window.pdfMake.fonts,
        THSarabun: {
          normal: 'THSarabun.ttf',
          bold: 'THSarabunBold.ttf',
          italics: 'THSarabun.ttf',
          bolditalics: 'THSarabunBold.ttf',
        },
      };

      window.thai_fonts_loaded = true;
      return true;
    });
  }

  // Function to generate PDF from an ERPNext document
  function generate_from_document() {
    frappe.prompt(
      [
        {
          label: 'DocType',
          fieldname: 'doctype',
          fieldtype: 'Link',
          options: 'DocType',
          reqd: 1,
        },
        {
          label: 'Document Name',
          fieldname: 'docname',
          fieldtype: 'Data',
          reqd: 1,
          depends_on: 'doctype',
        },
      ],
      function (values) {
        frappe.call({
          method: 'translation_tools.api.pdfmake_generator.get_print_data',
          args: {
            doc_type: values.doctype,
            doc_name: values.docname,
          },
          callback: function (response) {
            if (response.message) {
              const { html, metadata } = response.message;

              // Simple HTML to text conversion - for a real app you'd want better conversion
              const textContent = html
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

              const docDefinition = {
                content: [
                  { text: metadata.title || values.docname, style: 'header' },
                  { text: textContent },
                ],
                styles: {
                  header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
                },
                defaultStyle: {
                  font: 'Kanit',
                },
              };

              window.pdfMake.createPdf(docDefinition).open();
            }
          },
        });
      }
    );
  }

  // Function to show settings
  function show_settings() {
    frappe.prompt(
      [
        // {
        //   label: 'Default Font',
        //   fieldname: 'default_font',
        //   fieldtype: 'Select',
        //   options: 'Kanit\nRoboto',
        //   default: 'Kanit',
        // },
        {
          label: 'Default Page Size',
          fieldname: 'page_size',
          fieldtype: 'Select',
          options: 'A4\nLetter\nLegal',
          default: 'A4',
        },
      ],
      (values) => {
        // Store settings in localStorage
        localStorage.setItem('pdf_override_settings', JSON.stringify(values));
        frappe.show_alert({
          message: __('Settings saved'),
          indicator: 'green',
        });
      },
      __('PDF Settings'),
      __('Save')
    );
  }
}

// frappe.pages['pdf-override'].on_page_load = function (wrapper) {
//   frappe.ui.make_app_page({
//     parent: wrapper,
//     title: __('Thai PDF Generator'),
//     single_column: false,
//   });
// };

// frappe.pages['pdf-override'].on_page_show = function (wrapper) {
//   load_desk_page(wrapper);
// };

// function load_desk_page(wrapper) {
//   let $parent = $(wrapper).find('.layout-main-section');
//   $parent.empty();

//   console.log('Loading PDF Override page...');

//   // Load pdfMake dependencies first
//   Promise.all([
//     $.getScript('/assets/translation_tools/js/pdfmake.min.js'),
//     $.getScript('/assets/translation_tools/js/vfs_fonts.js'),
//   ])
//     .then(() => {
//       console.log('pdfMake dependencies loaded successfully');

//       // Now load the main bundle
//       frappe
//         .require('pdf_override.bundle.jsx')
//         .then(() => {
//           console.log('Bundle loaded, checking for PdfOverride class...');

//           if (frappe.ui.PdfOverride) {
//             console.log('PdfOverride class found, initializing...');
//             try {
//               frappe.pdf_override = new frappe.ui.PdfOverride({
//                 wrapper: $parent,
//                 page: wrapper.page,
//               });
//             } catch (error) {
//               console.error('Error initializing PdfOverride:', error);
//               $parent.html(
//                 '<div class="text-center text-muted" style="padding: 30px;">Error initializing PDF Generator: ' +
//                   error.message +
//                   '</div>'
//               );
//             }
//           } else {
//             console.error('PdfOverride class not found after loading bundle');
//             $parent.html(
//               '<div class="text-center text-muted" style="padding: 30px;">Error: PdfOverride component not found</div>'
//             );
//           }
//         })
//         .catch((error) => {
//           console.error('Error loading bundle:', error);
//           $parent.html(
//             '<div class="text-center text-muted" style="padding: 30px;">Error loading PDF Generator bundle: ' +
//               error +
//               '</div>'
//           );
//         });
//     })
//     .catch((error) => {
//       console.error('Error loading pdfMake dependencies:', error);
//       $parent.html(
//         '<div class="text-center text-muted" style="padding: 30px;">Error loading pdfMake library: ' +
//           error +
//           '</div>'
//       );
//     });

//   // First check if the bundle is already loaded
//   //   if (frappe.ui.PdfOverride) {
//   //     console.log('PdfOverride class found, initializing...');
//   //     try {
//   //       frappe.pdf_override = new frappe.ui.PdfOverride({
//   //         wrapper: $parent,
//   //         page: wrapper.page,
//   //       });
//   //     } catch (error) {
//   //       console.error('Error initializing PdfOverride:', error);
//   //       $parent.html(
//   //         '<div class="text-center text-muted" style="padding: 30px;">Error loading PDF Generator: ' +
//   //           error.message +
//   //           '</div>'
//   //       );
//   //     }
//   //   } else {
//   //     console.log('Loading bundle...');
//   //     frappe
//   //       .require('pdf_override.bundle.jsx')
//   //       .then(() => {
//   //         console.log('Bundle loaded, checking for PdfOverride class...');
//   //         if (frappe.ui.PdfOverride) {
//   //           console.log('PdfOverride class found after loading bundle');
//   //           frappe.pdf_override = new frappe.ui.PdfOverride({
//   //             wrapper: $parent,
//   //             page: wrapper.page,
//   //           });
//   //         } else {
//   //           console.error('PdfOverride class not found after loading bundle');
//   //           $parent.html(
//   //             '<div class="text-center text-muted" style="padding: 30px;">Error: PdfOverride component not found</div>'
//   //           );
//   //         }
//   //       })
//   //       .catch((error) => {
//   //         console.error('Error loading bundle:', error);
//   //         $parent.html(
//   //           '<div class="text-center text-muted" style="padding: 30px;">Error loading PDF Generator bundle</div>'
//   //         );
//   //       });
//   //   }

//   //   frappe.require('pdf_override.bundle.jsx').then(() => {
//   //     frappe.pdf_override = new frappe.ui.PdfOverride({
//   //       wrapper: $parent,
//   //       page: wrapper.page,
//   //     });
//   //   });
// }
