import React, { useState, useEffect } from 'react';
import { useGetTranslationSettings } from '../api';
// import { TabType, POFile } from '../types';
import FileExplorer from './FileExplorer';
import TranslationEditor from './TranslationEditor';
import GlossaryManager from './GlossaryManager';
import SettingsPanel from './SettingsPanel';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('files');
  const [selectedFile, setSelectedFile] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [settingsData, setSettingsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: translationSettingsData } = useGetTranslationSettings();

  console.log('Translation Settings Data:', translationSettingsData);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Check setup status
        const setupResponse = await frappe.call({
          method:
            'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status',
          args: {},
        });
        setSetupStatus(setupResponse.message);

        console.log('setupResponse:', setupResponse);
        console.log('setupResponse.message:', setupResponse.message);
        console.log(
          'setupResponse.message.complete:',
          setupResponse.message.complete
        );

        // Load settings if setup is complete
        if (setupResponse.message.complete) {
          const settingsResponse = await frappe.call({
            method: 'translation_tools.api.settings.get_translation_settings',
            args: {},
          });
          setSettingsData(settingsResponse.message);
          console.log('settingsResponse:', settingsResponse);
          console.log('settingsResponse.message:', settingsResponse.message);
        }
      } catch (error) {
        console.error('Error checking setup status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSetup();
  }, []);

  // When a file is selected, switch to the editor tab
  useEffect(() => {
    if (selectedFile) {
      setActiveTab('editor');
    }
  }, [selectedFile]);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleRunSetup = async () => {
    setIsSettingUp(true);
    try {
      const result = await frappe.call({
        method:
          'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.run_setup',
        args: {},
      });
      if (result.message.success) {
        // Refresh the page after setup
        window.location.reload();
      }
    } catch (error) {
      console.error('Setup failed:', error);
    } finally {
      setIsSettingUp(false);
    }
  };

  // Show setup prompt if needed
  if (setupStatus && !setupStatus.complete && !isSettingUp) {
    return (
      <div className="setup-container">
        <div className="frappe-alert error">
          <span className="indicator red"></span>
          <div className="alert-body">
            <h5>{__('Setup Required')}</h5>
            <div>
              {__(
                'Translation Tools needs to be set up before use. The following DocTypes are missing:'
              )}
              <ul className="missing-doctypes">
                {setupStatus.missing_doctypes.map((dt) => (
                  <li key={dt}>{dt}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={handleRunSetup}>
          {__('Complete Setup')}
        </button>
      </div>
    );
  }

  if (isLoading || isSettingUp) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>
          {isSettingUp
            ? __('Setting up Translation Tools...')
            : __('Checking setup status...')}
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-container container">
      <div className="page-header space-y-2 mt-2">
        <div>
          <h1 className="page-title">{__('ERPNext Translation Dashboard')}</h1>
          <p className="text-muted text-2xl">
            {__('Manage translations for Frappe/ERPNext ecosystem')}
          </p>
        </div>
      </div>

      <div className="tabs-container">
        <ul id="translation__tabs" className="nav nav-tabs" role="tablist">
          <li className="nav-item">
            <a
              className={`nav-link ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
              role="tab"
            >
              {__('File Explorer')}
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${activeTab === 'editor' ? 'active' : ''} ${!selectedFile ? 'disabled' : ''}`}
              onClick={() => selectedFile && setActiveTab('editor')}
              role="tab"
            >
              {__('Translation Editor')}
              {selectedFile && (
                <span className="tab-badge">{selectedFile.filename}</span>
              )}
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${activeTab === 'glossary' ? 'active' : ''}`}
              onClick={() => setActiveTab('glossary')}
              role="tab"
            >
              {__('Glossary Manager')}
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
              role="tab"
            >
              {__('Settings')}
            </a>
          </li>
        </ul>

        <div className="tab-content">
          <div
            className={`tab-pane ${activeTab === 'files' ? 'show active' : ''}`}
            role="tabpanel"
          >
            <div className="tab-content-inner">
              <FileExplorer
                onFileSelect={handleFileSelect}
                selectedFilePath={selectedFile?.file_path || null}
              />
            </div>
          </div>

          <div
            className={`tab-pane ${activeTab === 'editor' ? 'show active' : ''}`}
            role="tabpanel"
          >
            <div className="tab-content-inner">
              <TranslationEditor
                selectedFile={selectedFile}
                settings={settingsData?.message || null}
              />
            </div>
          </div>

          <div
            className={`tab-pane ${activeTab === 'glossary' ? 'show active' : ''}`}
            role="tabpanel"
          >
            <div className="tab-content-inner">
              <GlossaryManager />
            </div>
          </div>

          <div
            className={`tab-pane ${activeTab === 'settings' ? 'show active' : ''}`}
            role="tabpanel"
          >
            <div className="tab-content-inner">
              <SettingsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
