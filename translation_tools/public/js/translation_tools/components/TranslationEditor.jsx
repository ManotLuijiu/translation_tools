import React, { useState, useEffect } from 'react';
import {
  useGetPOFileEntries,
  useTranslateSingleEntry,
  useSaveTranslation,
} from '../api';
import TranslationStats from './TranslationStats';

export default function TranslationEditor({ selectedFile, settings }) {
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [entryFilter, setEntryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editedTranslation, setEditedTranslation] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  const {
    data,
    error,
    isLoading,
    refetch: mutate,
  } = useGetPOFileEntries(selectedFile?.file_path || null);

  const translateEntry = useTranslateSingleEntry();
  const saveTranslation = useSaveTranslation({ args: {} });

  // Reset selected entry when file changes
  useEffect(() => {
    setSelectedEntryId(null);
    setEditedTranslation('');
    setStatusMessage(null);
  }, [selectedFile]);

  // Update edited translation when selected entry changes
  useEffect(() => {
    if (!data?.entries || !selectedEntryId) return;

    const entry = data.entries.find((e) => e.id === selectedEntryId);
    if (entry) {
      setEditedTranslation(entry.msgstr || '');
    }
  }, [selectedEntryId, data]);

  if (!selectedFile) {
    return (
      <div className="empty-state">
        <p>{__('Please select a PO file to start translation')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <span>{__('Loading file contents...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="frappe-alert error">
        <span className="indicator red"></span>
        <div className="alert-body">
          <h5>{__('Error')}</h5>
          <div>
            {__('Failed to load file:')} {error.message || 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }

  const fileData = data;
  if (!fileData) {
    return (
      <div className="padding text-center text-muted">
        <p>{__('No data available for this file')}</p>
      </div>
    );
  }

  const { entries, stats, metadata } = fileData;
  console.log('metadata', metadata);

  // Filter entries based on user selection
  const filteredEntries = entries.filter((entry) => {
    // First filter by translation status
    if (entryFilter === 'untranslated' && entry.is_translated) return false;
    if (entryFilter === 'translated' && !entry.is_translated) return false;

    // Then filter by search term
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      entry.msgid.toLowerCase().includes(term) ||
      entry.msgstr.toLowerCase().includes(term)
    );
  });

  const selectedEntry = selectedEntryId
    ? entries.find((e) => e.id === selectedEntryId)
    : null;

  const handleTranslate = async () => {
    if (!selectedEntry || !selectedFile.file_path) return;

    setStatusMessage({ type: 'info', message: 'Translating...' });

    try {
      const result = await translateEntry.mutateAsync({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        model_provider: settings?.default_model_provider || 'openai',
        model: settings?.default_model || undefined,
      });

      if (result.success && result.translation) {
        setEditedTranslation(result.translation);
        setStatusMessage({ type: 'success', message: 'Translation completed' });

        // If auto-save is enabled, also save the translation
        if (settings?.auto_save) {
          await handleSave();
        }
      } else {
        setStatusMessage({
          type: 'error',
          message: result.error || 'Translation failed',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred during translation',
      });
    }
  };

  const handleSave = async () => {
    if (!selectedEntry || !selectedFile.file_path) return;

    setStatusMessage({ type: 'info', message: 'Saving...' });

    try {
      const result = await saveTranslation.mutateAsync({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        translation: editedTranslation,
      });

      if (result.success) {
        setStatusMessage({ type: 'success', message: 'Translation saved' });

        // Refresh file data to update translation stats
        mutate();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to save translation',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred while saving',
      });
    }
  };

  return (
    <div className="translation-editor">
      <div className="file-header">
        <div>
          <h3 className="heading">{selectedFile.filename}</h3>
          <p className="text-muted">{selectedFile.app}</p>
        </div>

        <TranslationStats stats={stats} />
      </div>

      <div className="translation-content">
        <div className="entries-panel">
          <div className="panel-header">
            <div className="filter-controls">
              <h4>Entries</h4>
              <div className="select-wrapper">
                <select
                  className="form-control"
                  value={entryFilter}
                  onChange={(e) => setEntryFilter(e.target.value)}
                >
                  <option value="all">{__('All entries')}</option>
                  <option value="untranslated">
                    {__('Untranslated only')}
                  </option>
                  <option value="translated">{__('Translated only')}</option>
                </select>
              </div>
            </div>

            <input
              type="text"
              className="form-control"
              placeholder="Search in entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="entries-list">
            {filteredEntries.length === 0 ? (
              <div className="no-entries">No entries match your filter</div>
            ) : (
              <ul>
                {filteredEntries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      className={`entry-item ${
                        selectedEntryId === entry.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedEntryId(entry.id)}
                    >
                      <div className="entry-header">
                        <span
                          className={`badge ${entry.is_translated ? 'badge-success' : 'badge-light'}`}
                        >
                          {entry.is_translated ? 'Translated' : 'Untranslated'}
                        </span>
                      </div>
                      <p className="entry-preview">{entry.msgid}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="translation-panel">
          {selectedEntry ? (
            <div id="translation__card" className="">
              <div className="card-header">
                <h4>{__('Translation')}</h4>
                <div className="context-info">
                  {selectedEntry.context && (
                    <span className="badge badge-light">
                      {__('Context:')} {selectedEntry.context}
                    </span>
                  )}
                  {selectedEntry.comments &&
                    selectedEntry.comments.length > 0 && (
                      <div className="comments">
                        {selectedEntry.comments.map((comment, i) => (
                          <p key={i}>{comment}</p>
                        ))}
                      </div>
                    )}
                </div>
              </div>
              <div className="card-body">
                <div className="translation-fields">
                  <div>
                    <label>{__('Source (English)')}</label>
                    <div className="source-text">{selectedEntry.msgid}</div>
                  </div>
                  <div>
                    <label>{__('Translation (Thai)')}</label>
                    <textarea
                      rows={5}
                      value={editedTranslation}
                      onChange={(e) => setEditedTranslation(e.target.value)}
                      placeholder="Enter translation here..."
                      className="form-control"
                    />
                  </div>

                  {statusMessage && (
                    <div className={`alert alert-${statusMessage.type}`}>
                      <div className="alert-icon">
                        {statusMessage.type === 'success' && (
                          <span className="icon-check"></span>
                        )}
                        {statusMessage.type === 'error' && (
                          <span className="icon-alert-circle"></span>
                        )}
                        {statusMessage.type === 'info' && (
                          <span className="spinner-sm"></span>
                        )}
                      </div>
                      <div className="alert-body">
                        <h5>
                          {statusMessage.type === 'success'
                            ? 'Success'
                            : statusMessage.type === 'error'
                              ? 'Error'
                              : 'Info'}
                        </h5>
                        <div>{statusMessage.message}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-footer">
                <div className="button-group">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const entry = entries.find(
                        (e) => e.id === selectedEntryId
                      );
                      if (entry) setEditedTranslation(entry.msgstr);
                      setStatusMessage(null);
                    }}
                  >
                    {__('Reset')}
                  </button>
                  <button
                    className="btn btn-default"
                    onClick={() => {
                      // Find next untranslated entry
                      const untranslatedEntries = entries.filter(
                        (e) => !e.is_translated
                      );
                      if (untranslatedEntries.length > 0) {
                        setSelectedEntryId(untranslatedEntries[0].id);
                      }
                    }}
                  >
                    {__('Next Untranslated')}
                  </button>
                </div>
                <div className="button-group">
                  <button
                    className="btn btn-default"
                    onClick={handleTranslate}
                    disabled={translateEntry.isLoading}
                  >
                    {translateEntry.isLoading ? (
                      <>
                        <span className="spinner-sm"></span>
                        {__('Translating...')}
                      </>
                    ) : (
                      <>
                        <span className="icon-refresh-cw"></span>
                        {__('Translate')}
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saveTranslation.isLoading}
                  >
                    {saveTranslation.isLoading ? (
                      <>
                        <span className="spinner-sm"></span>
                        {__('Saving...')}
                      </>
                    ) : (
                      <>
                        <span className="icon-save"></span>
                        {__('Save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-panel">
              <p>{__('Select an entry to start translating')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
