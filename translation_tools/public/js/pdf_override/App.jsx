import * as React from 'react';
// import { useState, useEffect } from 'react';
// import PdfViewer from './components/PdfViewer';

export function App({ pdfMake, onGeneratePdf }) {
  return (
    <main className="tw">
      <div className="tw-p-4">
        <h1 className="tw-mb-4 tw-text-xl tw-font-bold">Thai PDF Generator</h1>
        <p className="tw-mb-4">
          This tool allows you to generate PDFs with Thai language support.
        </p>

        <div className="tw-rounded tw-bg-gray-100 tw-p-4">
          <h2 className="tw-mb-2 tw-font-bold">Quick Test</h2>
          <button
            onClick={onGeneratePdf}
            className="tw-hover:bg-green-600 tw-rounded tw-bg-green-500 tw-px-4 tw-py-2 tw-text-white"
          >
            Generate Test PDF
          </button>
        </div>

        <div className="tw-mt-6 tw-rounded tw-border tw-p-4">
          <h2 className="tw-mb-2 tw-font-bold">Status</h2>
          <p>
            PDF Library:{' '}
            <span className={pdfMake ? 'tw-text-green-600' : 'tw-text-red-600'}>
              {pdfMake ? 'Loaded ✓' : 'Not loaded ✗'}
            </span>
          </p>
        </div>
      </div>
    </main>
  );
  // const [docDefinition, setDocDefinition] = useState(null);
  // const [documentTitle, setDocumentTitle] = useState('');
  // const [activeTab, setActiveTab] = useState('form'); // 'form' or 'preview'
  // useEffect(() => {
  //   // Check if pdfMake is available
  //   if (pdfMake) {
  //     setPdfReady(true);
  //   } else {
  //     console.error('pdfMake is not available');
  //   }
  // }, [pdfMake]);
  // Form state
  // const [formData, setFormData] = useState({
  //   title: 'เอกสารภาษาไทย (Thai Document)',
  //   subtitle: 'สร้างจาก ERPNext',
  //   content: 'นี่คือเนื้อหาตัวอย่างในภาษาไทย สำหรับการทดสอบการสร้าง PDF',
  //   includeHeader: true,
  //   includeFooter: true,
  //   includePageNumbers: true,
  // });
  // const handleFormChange = (e) => {
  //   const { name, value, type, checked } = e.target;
  //   setFormData({
  //     ...formData,
  //     [name]: type === 'checkbox' ? checked : value,
  //   });
  // };
  // const generatePreview = () => {
  //   // Create the PDF definition based on form data
  //   const newDocDefinition = {
  //     content: [
  //       formData.includeHeader && { text: formData.title, style: 'header' },
  //       formData.includeHeader && {
  //         text: formData.subtitle,
  //         style: 'subheader',
  //         margin: [0, 0, 0, 20],
  //       },
  //       { text: formData.content, style: 'content' },
  //     ].filter(Boolean),
  //     styles: {
  //       header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
  //       subheader: { fontSize: 16, bold: false, color: '#666666' },
  //       content: { fontSize: 14, margin: [0, 10, 0, 10] },
  //     },
  //     defaultStyle: {
  //       font: 'THSarabun',
  //     },
  //     footer: formData.includeFooter
  //       ? function (currentPage, pageCount) {
  //           const footer = [];
  //           if (formData.includePageNumbers) {
  //             footer.push({
  //               text: `หน้า ${currentPage} จาก ${pageCount}`,
  //               alignment: 'center',
  //               fontSize: 10,
  //               margin: [0, 10, 0, 0],
  //             });
  //           }
  //           return footer;
  //         }
  //       : null,
  //   };
  //   setDocDefinition(newDocDefinition);
  //   setDocumentTitle(formData.title);
  //   setActiveTab('preview');
  // };
  // // Function to generate PDF from ERPNext document
  // const generateFromDocument = () => {
  //   frappe.prompt(
  //     [
  //       {
  //         label: 'DocType',
  //         fieldname: 'doctype',
  //         fieldtype: 'Link',
  //         options: 'DocType',
  //         reqd: 1,
  //       },
  //       {
  //         label: 'Document Name',
  //         fieldname: 'docname',
  //         fieldtype: 'Data',
  //         reqd: 1,
  //         depends_on: 'doctype',
  //       },
  //     ],
  //     function (values) {
  //       frappe.call({
  //         method:
  //           'translation_tools.translation_tools.api.pdfmake_generator.get_print_data',
  //         args: {
  //           doc_type: values.doctype,
  //           doc_name: values.docname,
  //         },
  //         callback: function (r) {
  //           if (r.message) {
  //             // const docDefinition = r.message;
  //             const { html, metadata } = r.message;
  //             // Convert HTML to pdfMake format (simplified)
  //             const content = [];
  //             // Add title
  //             content.push({
  //               text: metadata.title || values.docname,
  //               style: 'header',
  //             });
  //             // Add subtitle
  //             content.push({
  //               text: metadata.subtitle || 'subtitle',
  //               style: 'subheader',
  //             });
  //             // Add content
  //             content.push({
  //               text: html.replace(/<[^>]+>/g, ''), // Remove HTML tags
  //               style: 'content',
  //               margin: [0, 10, 0, 10],
  //             });
  //             // Add footer
  //             if (metadata.includeFooter) {
  //               content.push({
  //                 text: `Generated on ${new Date().toLocaleDateString()}`,
  //                 alignment: 'center',
  //                 fontSize: 10,
  //                 margin: [0, 10, 0, 0],
  //               });
  //             }
  //             // Create the PDF definition
  //             const newDocDefinition = {
  //               content: content,
  //               styles: {
  //                 header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
  //                 subheader: {
  //                   fontSize: 16,
  //                   bold: false,
  //                   color: '#666666',
  //                 },
  //                 content: { fontSize: 14, margin: [0, 10, 0, 10] },
  //               },
  //               defaultStyle: {
  //                 font: 'THSarabun',
  //               },
  //               footer: function (currentPage, pageCount) {
  //                 return [
  //                   {
  //                     text: `หน้า ${currentPage} จาก ${pageCount}`,
  //                     alignment: 'center',
  //                     fontSize: 10,
  //                     margin: [0, 10, 0, 0],
  //                   },
  //                 ];
  //               },
  //             };
  //             // Set the document definition and title
  //             setDocDefinition(newDocDefinition);
  //             setDocumentTitle(metadata.title || values.docname);
  //             setActiveTab('preview');
  //           } else if (r.message === null) {
  //             // Handle case where no data is returned
  //             frappe.msgprint(__('No data found for the selected document.'));
  //             const docDefinition = {
  //               content: [
  //                 {
  //                   text: 'No data found for the selected document.',
  //                   style: 'header',
  //                 },
  //               ],
  //               styles: {
  //                 header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
  //               },
  //               defaultStyle: {
  //                 font: 'THSarabun',
  //               },
  //             };
  //             setDocDefinition(docDefinition);
  //             setDocumentTitle(values.docname);
  //             setActiveTab('preview');
  //           } else {
  //             frappe.msgprint(__('No data found'));
  //           }
  //         },
  //         error: function (r) {
  //           frappe.msgprint(__('Error generating PDF'));
  //         },
  //       });
  //     }
  //   );
  // };
  // const generatePdf = () => {
  //   const docDefinition = {
  //     content: [
  //       { text: 'PDF generated from React component', style: 'header' },
  //       { text: 'Thai text: สวัสดีครับ / สวัสดีค่ะ' },
  //     ],
  //     styles: {
  //       header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
  //     },
  //     defaultStyle: {
  //       font: 'THSarabun',
  //     },
  //   };
  //   pdfMake.createPdf(docDefinition).download('react_thai_pdf.pdf');
  // };
  // if (!pdfReady) {
  //   return (
  //     <main className="tw">
  //       <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-4">
  //         <div className="tw-mb-4 tw-border-l-4 tw-border-yellow-500 tw-bg-yellow-100 tw-p-4 tw-text-yellow-700">
  //           <p>
  //             PDF library is loading or not available. Please wait or refresh
  //             the page.
  //           </p>
  //         </div>
  //         <button
  //           onClick={() => window.location.reload()}
  //           className="tw-hover:bg-blue-600 tw-rounded tw-bg-blue-500 tw-px-4 tw-py-2 tw-text-white"
  //         >
  //           Refresh Page
  //         </button>
  //       </div>
  //     </main>
  //   );
  // }
  // return (
  //   <main className="tw">
  //     <div className="tw-mb-4 tw-flex tw-space-x-2">
  //       <button
  //         className={`px-4 py-2 rounded ${activeTab === 'form' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
  //         onClick={() => setActiveTab('form')}
  //       >
  //         Form
  //       </button>
  //       <button
  //         className={`px-4 py-2 rounded ${activeTab === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
  //         onClick={() => setActiveTab('preview')}
  //         disabled={!docDefinition}
  //       >
  //         Preview
  //       </button>
  //     </div>
  //     {activeTab === 'form' ? (
  //       <div className="tw-rounded tw-border tw-p-4">
  //         <h2 className="tw-mb-4 tw-text-lg tw-font-medium">
  //           Thai PDF Generator
  //         </h2>
  //         <div className="tw-mb-6">
  //           <h3 className="tw-mb-2 tw-font-medium">Create Custom PDF</h3>
  //           <div className="tw-space-y-4">
  //             <div>
  //               <label className="tw-mb-1 tw-block">Title</label>
  //               <input
  //                 type="text"
  //                 name="title"
  //                 value={formData.title}
  //                 onChange={handleFormChange}
  //                 className="tw-w-full tw-rounded tw-border tw-p-2"
  //                 placeholder="Enter title"
  //               />
  //             </div>
  //             <div>
  //               <label className="tw-mb-1 tw-block">Subtitle</label>
  //               <input
  //                 type="text"
  //                 name="subtitle"
  //                 value={formData.subtitle}
  //                 onChange={handleFormChange}
  //                 className="tw-w-full tw-rounded tw-border tw-p-2"
  //                 placeholder="Enter subtitle"
  //               />
  //             </div>
  //             <div>
  //               <label className="tw-mb-1 tw-block">Content</label>
  //               <textarea
  //                 name="content"
  //                 value={formData.content}
  //                 onChange={handleFormChange}
  //                 className="tw-h-32 tw-w-full tw-rounded tw-border tw-p-2"
  //                 placeholder="Enter content"
  //                 rows={4}
  //               />
  //             </div>
  //             <div className="tw-flex tw-space-x-4">
  //               <label className="tw-flex tw-items-center">
  //                 <input
  //                   type="checkbox"
  //                   name="includeHeader"
  //                   checked={formData.includeHeader}
  //                   onChange={handleFormChange}
  //                   className="tw-mr-2"
  //                 />
  //                 Include Header
  //               </label>
  //               <label className="tw-flex tw-items-center">
  //                 <input
  //                   type="checkbox"
  //                   name="includeFooter"
  //                   checked={formData.includeFooter}
  //                   onChange={handleFormChange}
  //                   className="tw-mr-2"
  //                 />
  //                 Include Footer
  //               </label>
  //               <label className="tw-flex tw-items-center">
  //                 <input
  //                   type="checkbox"
  //                   name="includePageNumbers"
  //                   checked={formData.includePageNumbers}
  //                   onChange={handleFormChange}
  //                   className="tw-mr-2"
  //                 />
  //                 Include Page Numbers
  //               </label>
  //             </div>
  //             <button
  //               onClick={generatePreview}
  //               className="tw-rounded tw-bg-blue-500 tw-px-4 tw-py-2 tw-text-white hover:tw-bg-blue-600"
  //             >
  //               Generate Preview
  //             </button>
  //           </div>
  //         </div>
  //         <div className="tw-mt-8 tw-border-t tw-pt-6">
  //           <h3 className="tw-mb-2 tw-font-medium">
  //             Generate from ERPNext Document
  //           </h3>
  //           <button
  //             onClick={generateFromDocument}
  //             className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
  //           >
  //             Select Document
  //           </button>
  //         </div>
  //       </div>
  //     ) : (
  //       <div className="tw-flex-grow">
  //         {docDefinition ? (
  //           <PdfViewer
  //             pdfMake={pdfMake}
  //             docDefinition={docDefinition}
  //             documentTitle={documentTitle}
  //           />
  //         ) : (
  //           <div>
  //             <span className="tw-flex tw-h-full tw-items-center tw-justify-center tw-rounded tw-border">
  //               No PDF generated yet. Please go to the Form tab first.
  //             </span>
  //           </div>
  //         )}
  //       </div>
  //     )}
  //   </main>
  // );
}
