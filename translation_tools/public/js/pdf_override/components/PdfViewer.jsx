import React, { useState, useEffect, useRef } from 'react';

export default function PdfViewer({ pdfMake, docDefinition, documentTitle }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef(null);
  
  useEffect(() => {
    if (docDefinition) {
      setIsLoading(true);
      
      // Generate the PDF
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      
      // Get the PDF as a blob URL
      pdfDocGenerator.getBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setIsLoading(false);
      });
      
      // Cleanup function to revoke the URL when component unmounts
      return () => {
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
      };
    }
  }, [docDefinition, pdfMake]);
  
  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    } else {
      // Fallback if iframe isn't available
      const pdfDocGenerator = pdfMake.createPdf(docDefinition);
      pdfDocGenerator.print();
    }
  };
  
  const handleDownload = () => {
    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    pdfDocGenerator.download(documentTitle || 'document.pdf');
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded">
        <h2 className="text-lg font-medium">{documentTitle || 'PDF Preview'}</h2>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Print
          </button>
          <button 
            onClick={handleDownload}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Download
          </button>
        </div>
      </div>
      
      <div className="flex-grow border rounded overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-gray-500">Loading PDF...</span>
          </div>
        ) : (
          <iframe 
            ref={iframeRef}
            src={pdfUrl} 
            className="w-full h-full"
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  );
}