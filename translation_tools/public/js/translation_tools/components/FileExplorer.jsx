import React, { useState, useMemo, useEffect } from 'react';
import { useGetCachedPOFiles, useScanPOFiles } from '../api';
import { formatPercentage, formatDate } from '../utils/helpers';
import { FileText, RefreshCcw, Search } from 'lucide-react';

export default function FileExplorer({ onFileSelect, selectedFilePath }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, refetch } = useGetCachedPOFiles();
  const files = data || [];
  // const errorMessage = error?.message || 'Unknown error';
  const scanFiles = useScanPOFiles();
  const [isScanning, setIsScanning] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  console.info('isMutating', isMutating);

  // useEffect(() => {}, []);

  const handleScan = async () => {
    // console.log('handleScan initiated');

    setIsScanning(true);
    try {
      const result = await scanFiles.mutateAsync();

      // console.log('Scan result', result);

      if (result && result.success === true) {
        setIsMutating(true);
        await refetch();
      } else {
        console.error('Scan failed:', result || 'Unknown error');
        frappe.throw('Scan failed. Please try again.');
      }
    } catch (error) {
      console.error('Error scanning files:', error);
    } finally {
      setIsScanning(false);
      setIsMutating(false);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    const searchLower = searchTerm.toLowerCase();
    return files.filter(
      (file) =>
        file.filename.toLowerCase().includes(searchLower) ||
        file.app.toLowerCase().includes(searchLower)
    );
  }, [files, searchTerm]);

  const sortedFiles = useMemo(
    () =>
      [...filteredFiles].sort((a, b) => {
        if (a.app !== b.app) return a.app.localeCompare(b.app);
        return a.filename.localeCompare(b.filename);
      }),
    [filteredFiles]
  );

  return (
    <div className="file-explorer">
      <div className="section-header flex justify-between items-center m-2 p-2">
        <h3 className="section-title mb-0">{__('PO Files')}</h3>
        <button
          className="btn btn-default btn-sm"
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <>
              <span className="spinner-sm"></span>
              {__('Scanning...')}
            </>
          ) : (
            <div className="">
              <RefreshCcw className="w-35 h-35 mr-2" />
              <span className="text-center m-0">{__('Scan Files')}</span>
            </div>
          )}
        </button>
      </div>

      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <div className="search-wrapper">
          <span className="search-icon flex">
            <Search />
          </span>
          <input
            type="text"
            className="form-control"
            placeholder={__('Search app name...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off" // Tells browsers not to autocomplete
            autoCorrect="off" // Disables auto-correction
            autoCapitalize="off" // Prevents automatic capitalization
            spellCheck="false" // Disables spell-checking
            data-form-type="search" // Explicitly tells it's a search field
            name="search-files" // Unique name that won't match stored credentials
          />
        </div>
      </form>

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="error-message">
          {__('Error loading files:')} {error.message || 'Unknown error'}
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="empty-state">
          {searchTerm
            ? __('No files matching your search')
            : __(
                'No PO files found. Click "Scan Files" to discover translation files.'
              )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>{__('App')}</th>
                <th>{__('Filename')}</th>
                <th>{__('Progress')}</th>
                <th>{__('Last Modified')}</th>
                <th width="100">{__('Action')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file) => (
                <tr
                  key={file.file_path}
                  className={
                    selectedFilePath === file.file_path ? 'selected-row' : ''
                  }
                >
                  <td className="align-middle">{file.app}</td>
                  <td>
                    <div className="file-name align-middle">
                      <span id="file__text" className="mr-2">
                        <FileText className="w-30" />
                      </span>
                      {file.filename}
                    </div>
                  </td>
                  <td>
                    <div className="progress-container">
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${Math.min(100, Math.max(0, parseFloat(file.translated_percentage || 0)))}%`,
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between mt-1">
                        <span className="progress-text">
                          {formatPercentage(file.translated_percentage)}
                        </span>
                        <span className="badge">
                          {file.translated_entries || 0}/
                          {file.total_entries || 0}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted align-middle">
                    {formatDate(file.last_modified)}
                  </td>
                  <td>
                    <div id="file__explorer" className="custom-tooltip-wrapper">
                      <button
                        className={`btn btn-sm w-100 ${
                          selectedFilePath === file.file_path
                            ? 'btn-primary'
                            : 'btn-default'
                        }`}
                        onClick={() => onFileSelect(file)}
                        disabled={file.file_path.includes('translated')}
                        style={{ backgroundColor: '#0984e3' }}
                      >
                        {selectedFilePath === file.file_path
                          ? __('Selected')
                          : __('Select')}
                      </button>
                      {file.file_path.includes('translated') && (
                        <div className="custom-tooltip-text">Only AI</div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
