import React, { useState, useMemo, useEffect } from 'react';
import { useGetCachedPOFiles, useScanPOFiles } from '../api';
import { formatPercentage, formatDate } from '../utils/helpers';

export default function FileExplorer({ onFileSelect, selectedFilePath }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, refetch } = useGetCachedPOFiles();
  const files = data || [];
  // const errorMessage = error?.message || 'Unknown error';
  const scanFiles = useScanPOFiles();
  const [isScanning, setIsScanning] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  console.log('isMutating', isMutating);

  // useEffect(() => {}, []);

  const handleScan = async () => {
    console.log('handleScan initiated');
    setIsScanning(true);
    try {
      const result = await scanFiles.mutateAsync();
      console.log('Scan result', result);
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
      <div className="section-header">
        <h3 className="section-title">PO Files</h3>
        <button
          className="btn btn-default btn-sm"
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <>
              <span className="spinner-sm"></span>
              Scanning...
            </>
          ) : (
            <>
              <span className="icon-refresh"></span>
              Scan Files
            </>
          )}
        </button>
      </div>

      <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        <div className="search-wrapper">
          <span className="search-icon">
            <span className="icon-search"></span>
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
          Error loading files: {error.message || 'Unknown error'}
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="empty-state">
          {searchTerm
            ? 'No files matching your search'
            : 'No PO files found. Click "Scan Files" to discover translation files.'}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>App</th>
                <th>Filename</th>
                <th>Progress</th>
                <th>Last Modified</th>
                <th width="100">Action</th>
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
                  <td>{file.app}</td>
                  <td>
                    <div className="file-name">
                      <span className="icon-file-text"></span>
                      {file.filename}
                    </div>
                  </td>
                  <td>
                    <div className="progress-container">
                      <div className="progress">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${Math.min(100, Math.max(0, file.translated_percentage || 0))}%`,
                          }}
                        ></div>
                      </div>
                      <span className="progress-text">
                        {formatPercentage(file.translated_percentage)}
                      </span>
                      <span className="badge">
                        {file.translated_entries}/{file.total_entries}
                      </span>
                    </div>
                  </td>
                  <td className="text-muted">
                    {formatDate(file.last_modified)}
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${
                        selectedFilePath === file.file_path
                          ? 'btn-primary'
                          : 'btn-default'
                      }`}
                      onClick={() => onFileSelect(file)}
                    >
                      {selectedFilePath === file.file_path
                        ? 'Selected'
                        : 'Select'}
                    </button>
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
