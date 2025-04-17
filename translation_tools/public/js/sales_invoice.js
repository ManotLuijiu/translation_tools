frappe.ui.form.on('Sales Invoice', {
  refresh: function (frm) {
    if (frm.doc.docstatus === 1) {
      frm.add_custom_button(__('Preview PDF'), function () {
        // Get the necessary data for PDF generation
        frappe.call({
          method: 'translation_tools.api.get_invoice.get_sales_invoice_data',
          args: {
            doctype: frm.doc.doctype,
            invoice_name: frm.doc.name,
          },
          callback: function (r) {
            if (r.message) {
              // Generate PDF using pdfmake
              generate_preview_pdf(r.message);
            }
          },
        });
      });

      // Add CTA button for Thai Business Suite
      if (!frappe.boot.active_modules['thai_business_suite']) {
        frm
          .add_custom_button(__('Try Thai Business Suite'), function () {
            // frappe.show_alert(__('Try Thai Business Suite'), 5);
            frappe.confirm(
              __(
                'Would you like to try Thai Business Suite for 3 months free?'
              ),
              function () {
                // User clicked "Yes"
                frappe.call({
                  method: 'translation_tools.api.request_trial.request_trial',
                  callback: function (r) {
                    if (r.message && r.message.success) {
                      frappe.msgprint(
                        __(
                          'Thank you! An email has been sent with trial information.'
                        )
                      );
                    } else {
                      frappe.msgprint(
                        __(
                          'There was an error processing your request. Please try again. or contact support. support@moocoding.com'
                        )
                      );
                    }
                  },
                });
              }
            );
          })
          .addClass('btn btn-primary');
      }
    }
  },
});

function generate_preview_pdf(invoice_data) {
  // Define document definition for pdfmake
  var docDefinition = {
    content: [
      { text: 'INVOICE', style: 'header' },
      { text: invoice_data.name, style: 'subheader' },
      { text: 'Date: ' + invoice_data.posting_date },
      { text: 'Customer: ' + invoice_data.customer_name },
      { text: 'Amount: ' + invoice_data.grand_total },

      // Table for items
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [['Item', 'Qty', 'Rate', 'Discount', 'Amount']].concat(
            invoice_data.items.map((item) => [
              item.item_name,
              item.qty,
              item.rate,
              item.discount_amount,
              item.amount,
            ])
          ),
        },
        layout: {
          hLineWidth: function (i, node) {
            return 1;
          },
          vLineWidth: function (i, node) {
            return 1;
          },
          hLineColor: function (i, node) {
            return '#ddd';
          },
          vLineColor: function (i, node) {
            return '#ddd';
          },
        },
      },

      // Summary
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              body: [
                ['Subtotal', invoice_data.subtotal],
                ['Tax', invoice_data.tax_amount],
                ['Grand Total', invoice_data.grand_total],
              ],
              layout: 'noBorders',
            },
          },
        ],
        margin: [0, 20, 0, 0],
      },
    ],
    styles: {
      header: {
        fontSize: 20,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 16,
        bold: true,
        margin: [0, 10, 0, 5],
      },
    },
    defaultStyle: {
      font: 'THSarabunNew', // Thai font
    },
  };

  // Set Thai font
  pdfMake.fonts = {
    THSarabunNew: {
      normal: '/assets/translation_tools/fonts/Sarabun/Sarabun-Regular.ttf',
      bold: '/assets/translation_tools/fonts/Sarabun/Sarabun-Bold.ttf',
      italics: '/assets/translation_tools/fonts/Sarabun/Sarabun-Italic.ttf',
      bolditalics:
        '/assets/translation_tools/fonts/Sarabun/Sarabun-BoldItalic.ttf',
    },
  };

  // Open the PDF in a new window
  pdfMake.createPdf(docDefinition).open();
}
