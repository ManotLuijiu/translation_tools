import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, GitCompareArrows } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useGetTranslationSettings } from '../api';
import { TabType, POFile } from '../types';
import FileExplorer from './FileExplorer';
import TranslationEditor from './TranslationEditor';
import GlossaryManager from './GlossaryManager';
import SettingsPanel from './SettingsPanel';
import Navbar from './Navbar';
import Footer from './Footer';
import { useTranslation } from '@/context/TranslationContext';

export default function Dashboard() {
  const { translate: __, isReady } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [selectedFile, setSelectedFile] = useState<POFile | null>(null);
  const [setupStatus, setSetupStatus] = useState<{
    complete: boolean;
    missing_doctypes: string[];
  } | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const { data: settingsData } = useGetTranslationSettings();

  console.log('selectedFile', selectedFile);
  console.log(__('Print Message'));
  // const __ = translate;

  // Check setup status
  const { data: setupData, isLoading: isCheckingSetup } = useFrappeGetCall(
    'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status',
    {}
  );

  console.log('Setup Data: from Dashboard.tsx', setupData);

  // Run setup function
  const runSetup = useFrappePostCall(
    'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.run_setup'
  );

  useEffect(() => {
    if (setupData?.message) {
      setSetupStatus(setupData.message);
    }
  }, [setupData]);

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
      const result = await runSetup.call({});
      if (result.success) {
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
  if (setupStatus && !setupStatus.complete && !isSettingUp && isReady) {
    return (
      <div className="container mx-auto max-w-3xl py-12">
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{__('Setup Required')}</AlertTitle>
          <AlertDescription>
            {__(
              'Translation Tools needs to be set up before use. The following DocTypes are missing:'
            )}
            <ul className="mt-2 list-disc pl-6">
              {setupStatus.missing_doctypes.map((dt) => (
                <li key={dt}>{dt}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <Button onClick={handleRunSetup} className="w-full">
          {__('Complete Setup')}
        </Button>
      </div>
    );
  }

  if (isCheckingSetup || isSettingUp || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>
            {isSettingUp
              ? 'Setting up Translation Tools...'
              : !isReady
                ? 'Loading translation...'
                : 'Checking setup status...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar currentTab={activeTab} />
      <div className="container mx-auto max-w-screen-xl py-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {__('ERPNext Translation Dashboard')}
            </h1>
            <p className="text-muted-foreground">
              {__('Manage translations for Frappe/ERPNext ecosystem')}
            </p>
          </div>
          <div>
            <div className="flex space-x-2 justify-center items-center">
              <GitCompareArrows className="w-4 h-4" />
              <a href="/app/thai_translator">Desk Version</a>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabType)}
        >
          <TabsList className="mb-8 grid w-full grid-cols-4">
            <TabsTrigger value="files" className="cursor-pointer">
              {__('File Explorer')}
            </TabsTrigger>
            <TabsTrigger
              value="editor"
              disabled={!selectedFile}
              className="cursor-pointer"
            >
              {__('Translation Editor')}
              {selectedFile && (
                <span className="ml-2 rounded-full bg-sky-200 px-2.5 py-0.5 text-xs dark:bg-green-300 dark:text-gray-900">
                  {selectedFile.filename}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="glossary" className="cursor-pointer">
              {__('Glossary Manager')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="cursor-pointer">
              {__('Settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="rounded-lg border p-4">
            <FileExplorer
              onFileSelect={handleFileSelect}
              selectedFilePath={selectedFile?.file_path || null}
            />
          </TabsContent>

          <TabsContent value="editor" className="rounded-lg border p-4">
            <TranslationEditor
              selectedFile={selectedFile}
              settings={settingsData?.message! || null}
            />
          </TabsContent>

          <TabsContent value="glossary" className="rounded-lg border p-4">
            <GlossaryManager />
          </TabsContent>

          <TabsContent value="settings" className="rounded-lg border p-4">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </>
  );
}
