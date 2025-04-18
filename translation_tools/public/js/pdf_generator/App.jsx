import React, { useState, useEffect } from 'react';

export function App() {
  const [doctype, setDoctype] = useState('');
  const [docname, setDocname] = useState('');
  const [printFormat, setPrintFormat] = useState('');
  const [printFormats, setPrintFormats] = useState([]);

  // Fetch print formats when doctype changes
  useEffect(() => {
    if (doctype) {
      frappe.db
        .get_list('Print Format', {
          filters: { doc_type: doctype, disabled: 0 },
          fields: ['name', 'default'],
        })
        .then((formats) => {
          setPrintFormats(formats);
          // Set default format if available
          const defaultFormat = formats.find((f) => f.default);
          if (defaultFormat) setPrintFormat(defaultFormat.name);
          else if (formats.length > 0) setPrintFormat(formats[0].name);
        });
    }
  }, [doctype]);

  const generatePdf = () => {
    if (!doctype || !docname || !printFormat) {
      frappe.msgprint(__('Please select a document to print'));
      return;
    }

    frapp.call({
      method: 'frappe.client.get',
      args: {
        doctype: doctype,
        name: docname,
      },
      callback: function (r) {
        if (r.message) {
          frappe.call({
            method: 'frappe.www.printview.get_html_and_style',
            args: {
              doc: r.message,
              print_format: printFormat,
              no_letterhead: 0,
            },
            callback: function (r) {
              if (r.message) {
                // Use client-side pdfmake
                frappe.pdf_generator.generate(r.message.html, {
                  title: docname,
                });
              } else {
                frappe.pdf_generator.generate(r.message);
              }
            },
          });
        }
      },
    });
  };

  return (
    <main className="tw">
      <div className="pdf-generator-container tw-p-4">
        <h3>{__('Select Document to Print')}</h3>

        <div className="frappe-control tw-my-4">
          <label>{__('Document Type')}</label>
          <div className="control-input-wrapper">
            <div className="control-input">
              <input
                type="text"
                className="form-control"
                value={doctype}
                onChange={(e) => setDoctype(e.target.value)}
                data-fieldtype="Link"
                data-target="DocType"
              />
            </div>
          </div>
        </div>

        <div className="frappe-control my-4">
          <label>{__('Document Name')}</label>
          <div className="control-input-wrapper">
            <div className="control-input">
              <input
                type="text"
                className="form-control"
                value={docname}
                onChange={(e) => setDocname(e.target.value)}
                data-fieldtype="Link"
                data-target={doctype}
              />
            </div>
          </div>
        </div>

        <div className="frappe-control my-4">
          <label>{__('Print Format')}</label>
          <div className="control-input-wrapper">
            <div className="control-input">
              <select
                className="form-control"
                value={printFormat}
                onChange={(e) => setPrintFormat(e.target.value)}
              >
                {printFormats.map((format) => (
                  <option key={format.name} value={format.name}>
                    {format.name} {format.default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button className="btn btn-primary mt-4" onClick={generatePdf}>
          {__('Generate PDF')}
        </button>

        <div className="mt-4">
          <p className="text-muted">
            {__(
              'This PDF generator uses pdfmake on the client side and WeasyPrint on the server side.'
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
