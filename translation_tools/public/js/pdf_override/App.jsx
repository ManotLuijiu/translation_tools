import * as React from "react";
import '../../css/tailwind.css';
import { useState } from 'react';
import PdfViewer from './components/PdfViewer';

export function App({pdfMake}) {
  const [docDefinition, setDocDefinition] = useState(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'preview'
  const generatePdf = () => {
    const docDefinition = {
      content: [
        { text: 'PDF generated from React component', style: 'header' },
        { text: 'Thai text: สวัสดีครับ / สวัสดีค่ะ' },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      },
      defaultStyle: {
        font: 'THSarabun'
      }
    }
    pdfMake.createPdf(docDefinition).download('react_thai_pdf.pdf');
  }
  return (
    <main className="tw">

      <h1 className="text-xl font-bold mb-4">Thai PDF Generation</h1>
      <p className="mb-4">This page demonstrates PDF generation with Thai language support.</p>
      <button 
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        onClick={generatePdf}
      >
        Generate Thai PDF from React
      </button>
    </main>
  );
}