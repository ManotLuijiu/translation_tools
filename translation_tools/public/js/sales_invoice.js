// File: your_app/public/js/sales_invoice.js
frappe.ui.form.on('Sales Invoice', {
  refresh: function (frm) {
    if (frm.doc.docstatus === 1) {
      frm.add_custom_button(__('Preview PDF (pdfmake)'), function () {
        // Get the necessary data for PDF generation
        frappe.call({
          method: 'your_app.your_app.api.get_sales_invoice_data',
          args: {
            invoice_name: frm.doc.name,
          },
          callback: function (r) {
            if (r.message) {
              // Generate PDF using pdfmake
              generate_pdf_with_pdfmake(r.message);
            }
          },
        });
      });
    }
  },
});

function generate_pdf_with_pdfmake(invoice_data) {
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
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 14,
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
      normal: 'THSarabunNew.ttf',
      bold: 'THSarabunNew-Bold.ttf',
      italics: 'THSarabunNew-Italic.ttf',
      bolditalics: 'THSarabunNew-BoldItalic.ttf',
    },
  };

  // Open the PDF in a new window
  pdfMake.createPdf(docDefinition).open();
}
