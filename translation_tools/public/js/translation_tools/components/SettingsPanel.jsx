import React, { useState, useEffect } from 'react';

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    default_model_provider: 'openai',
    default_model: '',
    openai_api_key: '',
    anthropic_api_key: '',
    batch_size: 10,
    temperature: 0.3,
    auto_save: false,
    preserve_formatting: true,
    github_enable: false,
    github_repo: '',
    github_token: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('ai-models');
  const [statusMessage, setStatusMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [models, setModels] = useState({ openai: [], claude: [] });
  const [modelLoading, setModelLoading] = useState(false);

  // Load translation settings on component mount
  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  // Load settings from the server
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await frappe.call({
        method: 'translation_tools.api.settings.get_translation_settings',
      });

      if (result && result.message) {
        const provider = result.message.default_model_provider || 'openai';

        setSettings((prev) => ({
          ...prev,
          ...result.message,
          default_model_provider: provider,
        }));
      }
    } catch (err) {
      setError(err.message || __('Failed to load settings'));
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load AI models from the server
  const loadModels = async () => {
    setModelLoading(true);
    try {
      const result = await frappe.call({
        method: 'translation_tools.api.ai_models.get_cached_models',
      });

      if (result && result.message) {
        setModels(result.message);

        // Set default model if available
        setSettings((prev) => {
          const provider = prev.default_model_provider;
          const modelList =
            provider === 'openai'
              ? result.message.openai
              : result.message.claude;
          const defaultModel =
            modelList && modelList.length > 0 ? modelList[0].id : '';

          return {
            ...prev,
            default_model: prev.default_model || defaultModel,
          };
        });
      }
    } catch (err) {
      console.error('Error loading models:', err);
    } finally {
      setModelLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (fieldname, value) => {
    setSettings((prev) => ({
      ...prev,
      [fieldname]: value,
    }));
  };

  // Handle saving settings
  const saveSettings = async () => {
    setStatusMessage({ type: 'info', message: __('Saving settings...') });

    try {
      const result = await frappe.call({
        method: 'translation_tools.api.settings.save_translation_settings',
        args: { settings },
      });

      if (result && result.message && result.message.success) {
        setStatusMessage({
          type: result.message.warnings?.length ? 'warning' : 'success',
          message:
            result.message.warnings?.join(' ') ||
            result.message.message ||
            __('Settings saved successfully'),
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: __('Failed to save settings'),
        });
      }
    } catch (err) {
      const errorMessage =
        err.message || __('An error occurred while saving settings');
      setStatusMessage({
        type: 'error',
        message: errorMessage,
      });
    }
  };

  // Test GitHub connection
  const testGitHubConnection = async () => {
    setStatusMessage({
      type: 'info',
      message: __('Testing GitHub connection...'),
    });

    try {
      const result = await frappe.call({
        method: 'translation_tools.api.settings.test_github_connection',
        args: {
          github_repo: settings.github_repo,
          github_token: settings.github_token,
        },
      });

      if (result && result.message && result.message.success) {
        setStatusMessage({
          type: 'success',
          message: __('Successfully connected to GitHub!'),
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: result.message?.error || __('Failed to connect to GitHub'),
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message:
          err.message || __('An error occurred while testing the connection'),
      });
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="text-center" style={{ padding: '2rem' }}>
        <i className="fa fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
        <div style={{ marginTop: '1rem' }}>{__('Loading settings...')}</div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="alert alert-danger">
        <div className="indicator-pill red"></div>
        <h4>{__('Error')}</h4>
        <p>{error}</p>
      </div>
    );
  }

  // Render different tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai-models':
        return (
          <div className="frappe-card">
            <div className="frappe-card-content">
              <h5 className="form-section-heading uppercase">
                {__('Model Provider')}
              </h5>
              <div className="form-group">
                <label className="control-label">
                  {__('Default Provider')}
                </label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <select
                      className="form-control"
                      value={settings.default_model_provider}
                      onChange={(e) => {
                        const value = e.target.value;
                        const newModels =
                          value === 'openai' ? models.openai : models.claude;
                        handleInputChange('default_model_provider', value);
                        handleInputChange(
                          'default_model',
                          newModels.length > 0 ? newModels[0].id : ''
                        );
                      }}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Claude</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="control-label">{__('Default Model')}</label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <select
                      className="form-control"
                      value={settings.default_model}
                      onChange={(e) =>
                        handleInputChange('default_model', e.target.value)
                      }
                    >
                      {settings.default_model_provider === 'openai'
                        ? models.openai?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))
                        : models.claude?.map((model) => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              </div>

              <h5 className="form-section-heading uppercase mt-4">
                {__('API Keys')}
              </h5>
              <div className="form-group">
                <label className="control-label">{__('OpenAI API Key')}</label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <div className="input-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={settings.openai_api_key || ''}
                        onChange={(e) =>
                          handleInputChange('openai_api_key', e.target.value)
                        }
                        placeholder={__('Enter OpenAI API Key')}
                      />
                      <span className="input-group-btn">
                        <button
                          className="btn btn-default"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i
                            className={`fa fa-${showPassword ? 'eye-slash' : 'eye'}`}
                          ></i>
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="control-label">
                  {__('Anthropic API Key')}
                </label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <div className="input-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={settings.anthropic_api_key || ''}
                        onChange={(e) =>
                          handleInputChange('anthropic_api_key', e.target.value)
                        }
                        placeholder={__('Enter Anthropic API Key')}
                      />
                      <span className="input-group-btn">
                        <button
                          className="btn btn-default"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i
                            className={`fa fa-${showPassword ? 'eye-slash' : 'eye'}`}
                          ></i>
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="frappe-card-footer">
              <button className="btn btn-primary" onClick={saveSettings}>
                {__('Save Settings')}
              </button>
            </div>
          </div>
        );

      case 'translation-options':
        return (
          <div className="frappe-card">
            <div className="frappe-card-content">
              <h5 className="form-section-heading uppercase">
                {__('Batch Processing')}
              </h5>
              <div className="form-group">
                <label className="control-label">{__('Batch Size')}</label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={settings.batch_size}
                      onChange={(e) =>
                        handleInputChange(
                          'batch_size',
                          parseInt(e.target.value)
                        )
                      }
                    />
                    <div className="mt-1 text-center">
                      {settings.batch_size}
                    </div>
                  </div>
                  <p className="help-box">
                    {__('Number of strings to translate in each API call')}
                  </p>
                </div>
              </div>

              <h5 className="form-section-heading uppercase mt-4">
                {__('Translation Quality')}
              </h5>
              <div className="form-group">
                <label className="control-label">{__('Temperature')}</label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) =>
                        handleInputChange(
                          'temperature',
                          parseFloat(e.target.value)
                        )
                      }
                    />
                    <div className="mt-1 text-center">
                      {settings.temperature}
                    </div>
                  </div>
                  <p className="help-box">
                    {__(
                      'Lower values produce more consistent translations, higher values more creative ones'
                    )}
                  </p>
                </div>
              </div>

              <h5 className="form-section-heading uppercase mt-4">
                {__('Translation Behavior')}
              </h5>
              <div className="form-group">
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.auto_save}
                      onChange={(e) =>
                        handleInputChange('auto_save', e.target.checked)
                      }
                    />
                    {__('Auto-save translations')}
                  </label>
                </div>
                <p className="help-box">
                  {__('Automatically save translations after each batch')}
                </p>
              </div>

              <div className="form-group">
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.preserve_formatting}
                      onChange={(e) =>
                        handleInputChange(
                          'preserve_formatting',
                          e.target.checked
                        )
                      }
                    />
                    {__('Preserve formatting')}
                  </label>
                </div>
                <p className="help-box">
                  {__(
                    'Preserve tags, placeholders, and formatting in translations'
                  )}
                </p>
              </div>
            </div>
            <div className="frappe-card-footer">
              <button className="btn btn-primary" onClick={saveSettings}>
                {__('Save Settings')}
              </button>
            </div>
          </div>
        );

      case 'github-integration':
        return (
          <div className="frappe-card">
            <div className="frappe-card-content">
              <h5 className="form-section-heading uppercase">
                {__('GitHub Integration')}
              </h5>
              <div className="form-group">
                <div className="checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.github_enable}
                      onChange={(e) =>
                        handleInputChange('github_enable', e.target.checked)
                      }
                    />
                    {__('Enable GitHub Integration')}
                  </label>
                </div>
                <p className="help-box">
                  {__('Allow syncing translations with GitHub repository')}
                </p>
              </div>

              <div className="form-group">
                <label className="control-label">
                  {__('GitHub Repository')}
                </label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <input
                      type="text"
                      className="form-control"
                      value={settings.github_repo || ''}
                      onChange={(e) =>
                        handleInputChange('github_repo', e.target.value)
                      }
                      placeholder={__('username/repository')}
                    />
                  </div>
                  <p className="help-box">
                    {__('Format: username/repository')}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="control-label">{__('GitHub Token')}</label>
                <div className="control-input-wrapper">
                  <div className="control-input">
                    <div className="input-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={settings.github_token || ''}
                        onChange={(e) =>
                          handleInputChange('github_token', e.target.value)
                        }
                        placeholder={__('Enter GitHub Personal Access Token')}
                      />
                      <span className="input-group-btn">
                        <button
                          className="btn btn-default"
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i
                            className={`fa fa-${showPassword ? 'eye-slash' : 'eye'}`}
                          ></i>
                        </button>
                      </span>
                    </div>
                  </div>
                  <p className="help-box">
                    {__('Personal Access Token with repo scope')}
                  </p>
                </div>
              </div>
            </div>
            <div className="frappe-card-footer">
              <div className="btn-group">
                <button
                  className="btn btn-default"
                  onClick={testGitHubConnection}
                  disabled={
                    !settings.github_enable ||
                    !settings.github_repo ||
                    !settings.github_token
                  }
                >
                  <i className="fa fa-check"></i> {__('Test Connection')}
                </button>
                <button className="btn btn-primary" onClick={saveSettings}>
                  {__('Save Settings')}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return <div>{__('Unknown tab')}</div>;
    }
  };

  return (
    <div className="settings-panel-container">
      <h2 className="h3 mb-4">{__('Translation Settings')}</h2>

      {/* Status message */}
      {statusMessage && (
        <div
          className={`alert alert-${statusMessage.type === 'error' ? 'danger' : statusMessage.type === 'success' ? 'success' : statusMessage.type === 'warning' ? 'warning' : 'info'} mb-4`}
        >
          {statusMessage.type === 'error' && (
            <i className="fa fa-exclamation-triangle"></i>
          )}
          {statusMessage.type === 'success' && (
            <i className="fa fa-check-circle"></i>
          )}
          {statusMessage.type === 'warning' && (
            <i className="fa fa-warning"></i>
          )}
          {statusMessage.type === 'info' && (
            <i className="fa fa-info-circle"></i>
          )}
          <span style={{ marginLeft: '10px' }}>{statusMessage.message}</span>
        </div>
      )}

      {/* Tab navigation */}
      <ul className="nav nav-pills" style={{ marginBottom: '20px' }}>
        <li className={activeTab === 'ai-models' ? 'active' : ''}>
          <a
            onClick={() => setActiveTab('ai-models')}
            style={{ cursor: 'pointer' }}
          >
            {__('AI Models')}
          </a>
        </li>
        <li className={activeTab === 'translation-options' ? 'active' : ''}>
          <a
            onClick={() => setActiveTab('translation-options')}
            style={{ cursor: 'pointer' }}
          >
            {__('Translation Options')}
          </a>
        </li>
        <li className={activeTab === 'github-integration' ? 'active' : ''}>
          <a
            onClick={() => setActiveTab('github-integration')}
            style={{ cursor: 'pointer' }}
          >
            {__('GitHub Integration')}
          </a>
        </li>
      </ul>

      {/* Tab content */}
      {renderTabContent()}
    </div>
  );
}
