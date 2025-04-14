frappe.ui.form.on('*', {
    refresh(frm) {
      frm.add_custom_button(__('Download PDF (PDFMake)'), () => {
        frappe.call({
          method: 'translation_tools.translation_tools.api.pdfmake_generator.get_print_data',
          args: {
            doc_type: frm.doctype,
            doc_name: frm.docname,
            print_format: frm.print_preview?.print_format || null
          },
          callback({ message }) {
            const { html, metadata } = message;

            const docDefinition = {
              content: [
                { text: metadata.title, style: 'header' },
                {
                  text: html.replace(/<[^>]+>/g, ''), // naive HTML to text for now
                },
              ],
              styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
              },
              defaultStyle: {
                font: 'THSarabun'
              }
            };

            // Load TH font
            pdfMake.fonts = {
              THSarabun: {
                normal: 'THSarabun.ttf',
                bold: 'THSarabun-Bold.ttf',
                italics: 'THSarabun-Italic.ttf',
                bolditalics: 'THSarabun-BoldItalic.ttf'
              }
            };

            pdfMake.createPdf(docDefinition).download(`${metadata.title}.pdf`);
          }
        });
      });
    }
  });