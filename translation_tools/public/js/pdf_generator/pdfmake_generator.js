frappe.provide('frappe.pdf_generator');

frappe.pdf_generator.generate = function (html, options) {
  // Set up fonts for pdfmake
  pdfMake.fonts = {
    Sarabun: {
      normal: 'Sarabun-Regular.ttf',
      bold: 'Sarabun-Bold.ttf',
      italics: 'Sarabun-Italic.ttf',
      bolditalics: 'Sarabun-BoldItalic.ttf',
    },
  };

  // Default document definition
  var docDefinition = {
    content: [],
    defaultStyle: {
      font: 'Sarabun',
    },
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 16,
        bold: true,
        margin: [0, 10, 0, 5],
      },
      tableHeader: {
        bold: true,
        fontSize: 13,
        color: 'black',
      },
    },
  };

  // Convert HTML to pdfmake compatible format
  // This is a simplified version, you may need a proper HTML-to-pdfmake converter
  var $html = $(html);
  var title = $html.find('h1').first().text() || 'Document';

  docDefinition.content.push({
    text: title,
    style: 'header',
  });

  // Generate PDF
  pdfMake.createPdf(docDefinition).download(title + '.pdf');
};
