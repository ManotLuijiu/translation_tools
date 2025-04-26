import React, { useState, useEffect } from 'react';
import { useGetTranslationSettings, useSaveTranslationSettings } from '../api';
// import { TranslationSettings } from '../types';

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    default_model_provider: 'openai',
    default_model: 'gpt-4-1106-preview',
    openai_api_key: '',
    anthropic_api_key: '',
    batch_size: 10,
    temperature: 0.3,
    auto_save: false,
    preserve_formatting: true,
  });

  const [statusMessage, setStatusMessage] = useState(null);

  const { data, error, isLoading } = useGetTranslationSettings();
  const saveSettings = useSaveTranslationSettings();

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async () => {
    setStatusMessage({ type: 'info', message: 'Saving settings...' });

    try {
      const result = await saveSettings.mutateAsync(settings);

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Settings saved successfully',
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to save settings',
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred while saving settings',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="frappe-alert error">
        <span className="indicator red"></span>
        <div className="alert-body">
          <h5>Error</h5>
          <div>{error.message || 'Failed to load settings'}</div>
        </div>
      </div>
    );
  }

  const modelOptions = {
    openai: [
      { value: 'gpt-4-1106-preview', label: 'GPT-4 Turbo (1106)' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    claude: [
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
  };

  return (
    <div className="settings-panel">
      <h2 className="form-section-heading">Translation Settings</h2>

      <div className="frappe-card">
        <div className="frappe-card-head">
          <h3 className="frappe-card-title">AI Translation Models</h3>
          <p className="text-muted">
            Configure which AI models to use for translations
          </p>
        </div>
        <div className="frappe-card-body">
          <div className="form-group">
            <label className="control-label" htmlFor="default_model_provider">
              Default Model Provider
            </label>
            <select
              className="form-control"
              id="default_model_provider"
              name="default_model_provider"
              value={settings.default_model_provider}
              onChange={handleSelectChange}
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Anthropic Claude</option>
            </select>
            <p className="help-text">
              Choose which AI provider to use by default for translations
            </p>
          </div>

          <div className="form-group">
            <label className="control-label" htmlFor="default_model">
              Default Model
            </label>
            <select
              className="form-control"
              id="default_model"
              name="default_model"
              value={settings.default_model}
              onChange={handleSelectChange}
            >
              {settings.default_model_provider === 'openai'
                ? modelOptions.openai.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                : modelOptions.claude.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
            </select>
            <p className="help-text">
              Choose which model to use by default for translations
            </p>
          </div>

          <hr className="section-divider" />

          <div className="form-section">
            <h4 className="form-section-title">API Keys</h4>

            <div className="form-group">
              <label className="control-label" htmlFor="openai_api_key">
                OpenAI API Key
              </label>
              <input
                className="form-control"
                id="openai_api_key"
                name="openai_api_key"
                type="password"
                value={settings.openai_api_key || ''}
                onChange={handleInputChange}
                placeholder={
                  settings.openai_api_key ? '********' : 'Enter OpenAI API key'
                }
              />
              <p className="help-text">Your OpenAI API key for GPT models</p>
            </div>

            <div className="form-group">
              <label className="control-label" htmlFor="anthropic_api_key">
                Anthropic API Key
              </label>
              <input
                className="form-control"
                id="anthropic_api_key"
                name="anthropic_api_key"
                type="password"
                value={settings.anthropic_api_key || ''}
                onChange={handleInputChange}
                placeholder={
                  settings.anthropic_api_key
                    ? '********'
                    : 'Enter Anthropic API key'
                }
              />
              <p className="help-text">
                Your Anthropic API key for Claude models
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="frappe-card">
        <div className="frappe-card-head">
          <h3 className="frappe-card-title">Translation Options</h3>
          <p className="text-muted">Configure how translations are processed</p>
        </div>
        <div className="frappe-card-body">
          <div className="form-group">
            <label className="control-label" htmlFor="batch_size">
              Batch Size: {settings.batch_size}
            </label>
            <div className="slider-container">
              <input
                type="range"
                className="slider-input"
                id="batch_size"
                name="batch_size"
                min="1"
                max="50"
                step="1"
                value={settings.batch_size || 10}
                onChange={handleInputChange}
              />
            </div>
            <p className="help-text">
              Number of entries to translate in a batch (larger batches are more
              efficient but may hit rate limits)
            </p>
          </div>

          <div className="form-group">
            <label className="control-label" htmlFor="temperature">
              Temperature: {settings.temperature?.toFixed(2)}
            </label>
            <div className="slider-container">
              <input
                type="range"
                className="slider-input"
                id="temperature"
                name="temperature"
                min="0"
                max="1"
                step="0.05"
                value={settings.temperature || 0.3}
                onChange={handleInputChange}
              />
            </div>
            <p className="help-text">
              Controls randomness in translations (lower values are more
              consistent)
            </p>
          </div>

          <hr className="section-divider" />

          <div className="form-group">
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  id="auto_save"
                  name="auto_save"
                  checked={!!settings.auto_save}
                  onChange={handleInputChange}
                />
                Auto-save Translations
              </label>
            </div>
            <p className="help-text">
              Automatically save translations after they are generated
            </p>
          </div>

          <div className="form-group">
            <div className="checkbox">
              <label>
                <input
                  type="checkbox"
                  id="preserve_formatting"
                  name="preserve_formatting"
                  checked={!!settings.preserve_formatting}
                  onChange={handleInputChange}
                />
                Preserve Formatting
              </label>
            </div>
            <p className="help-text">
              Maintain formatting tokens and placeholders in translations
            </p>
          </div>
        </div>
        <div className="frappe-card-footer">
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={saveSettings.isLoading}
          >
            {saveSettings.isLoading ? (
              <>
                <span className="spinner-sm"></span>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>

          {statusMessage && (
            <div
              className={`alert ${
                statusMessage.type === 'error'
                  ? 'alert-danger'
                  : statusMessage.type === 'success'
                    ? 'alert-success'
                    : 'alert-info'
              }`}
            >
              <div className="alert-indicator">
                {statusMessage.type === 'success' && (
                  <span className="indicator green"></span>
                )}
                {statusMessage.type === 'error' && (
                  <span className="indicator red"></span>
                )}
                {statusMessage.type === 'info' && (
                  <span className="indicator blue"></span>
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
    </div>
  );
}
