// @ts-ignore - frappe is a global variable in Frappe/ERPNext
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGetTranslationSettings } from '../api';
import { TabType, POFile } from '../types';
import FileExplorer from './FileExplorer';
import TranslationEditor from './TranslationEditor';
import GlossaryManager from './GlossaryManager';
import SettingsPanel from './SettingsPanel';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [selectedFile, setSelectedFile] = useState<POFile | null>(null);
  const [setupStatus, setSetupStatus] = useState<{
    complete: boolean;
    missing_doctypes: string[];
  } | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [settingsData, setSettingsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: translationSettingsData } = useGetTranslationSettings();

  console.log('Translation Settings Data:', translationSettingsData);

  // Check setup status
  // const { data: setupData, isLoading: isCheckingSetup } = useFrappeGetCall(
  //   'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status',
  //   {}
  // );

  // Run setup function
  // const runSetup = useFrappePostCall(
  //   'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.run_setup'
  // );

  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Check setup status
        // biome-ignore lint/correctness/noUndeclaredVariables: <explanation>
        const setupResponse = await frappe.call({
          method:
            'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status',
          args: {},
        });
        setSetupStatus(setupResponse.message);

        // Load settings if setup is complete
        if (setupResponse.message.complete) {
          const settingsResponse = await frappe.call({
            method: 'translation_tools.api.settings.get_translation_settings',
            args: {},
          });
          setSettingsData(settingsResponse.message);
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

  const handleFileSelect = (file: POFile) => {
    setSelectedFile(file);
  };

  const handleRunSetup = async () => {
    // console.log("clicked");
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
      <div className="tw-container tw-mx-auto tw-max-w-3xl tw-py-12">
        <Alert variant="destructive" className="tw-mb-8">
          <AlertCircle className="tw-h-4 tw-w-4" />
          <AlertTitle>Setup Required</AlertTitle>
          <AlertDescription>
            Translation Tools needs to be set up before use. The following
            DocTypes are missing:
            <ul className="tw-mt-2 tw-list-disc tw-pl-6">
              {setupStatus.missing_doctypes.map((dt) => (
                <li key={dt}>{dt}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <Button onClick={handleRunSetup} className="tw-w-full">
          Complete Setup
        </Button>
      </div>
    );
  }

  if (isLoading || isSettingUp) {
    return (
      <div className="tw-flex tw-h-screen tw-items-center tw-justify-center">
        <div className="tw-text-center">
          <Loader2 className="tw-mx-auto tw-mb-4 tw-h-8 tw-w-8 tw-animate-spin" />
          <p>
            {isSettingUp
              ? 'Setting up Translation Tools...'
              : 'Checking setup status...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tw-container tw-mx-auto tw-max-w-screen-xl tw-py-6">
      <div className="tw-mb-8 tw-flex tw-items-center tw-justify-between">
        <div>
          <h1 className="tw-text-3xl tw-font-bold">
            ERPNext Translation Dashboard
          </h1>
          <p className="tw-text-muted-foreground">
            Manage translations for Frappe/ERPNext ecosystem
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
      >
        <TabsList className="tw-mb-8 tw-grid tw-w-full tw-grid-cols-4">
          <TabsTrigger value="files">File Explorer</TabsTrigger>
          <TabsTrigger value="editor" disabled={!selectedFile}>
            Translation Editor
            {selectedFile && (
              <span className="tw-ml-2 tw-rounded-full tw-bg-muted tw-px-2.5 tw-py-0.5 tw-text-xs">
                {selectedFile.filename}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="glossary">Glossary Manager</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="tw-rounded-lg tw-border tw-p-4">
          <FileExplorer
            onFileSelect={handleFileSelect}
            selectedFilePath={selectedFile?.file_path || null}
          />
        </TabsContent>

        <TabsContent value="editor" className="tw-rounded-lg tw-border tw-p-4">
          <TranslationEditor
            selectedFile={selectedFile}
            settings={settingsData?.message || null}
          />
        </TabsContent>

        <TabsContent
          value="glossary"
          className="tw-rounded-lg tw-border tw-p-4"
        >
          <GlossaryManager />
        </TabsContent>

        <TabsContent
          value="settings"
          className="tw-rounded-lg tw-border tw-p-4"
        >
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
