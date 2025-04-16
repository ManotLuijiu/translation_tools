import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useGetTranslationSettings } from '../../translation_tools/api/settings';
import FileExplorer from './FileExplorer';
import TranslationEditor from './TranslationEditor';
import GlossaryManager from './GlossaryManager';
import SettingsPanel from './SettingsPanel';
import {checkSetupStatus, runSetup} from "../../translation_tools/hooks/useSetup"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('files');
  const [selectedFile, setSelectedFile] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const { data: settingsData } = useGetTranslationSettings();

  async function checkAndSetup() {
    try {
      // Check setup status
      const setupStatus = await checkSetupStatus();
      
      if (!setupStatus.is_setup_complete) {
        // Show setup UI
        // ...
        
        // When user clicks "Run Setup"
        const setupResult = await runSetup();
        if (setupResult.success) {
          frappe.show_alert(__('Setup completed successfully'), 5);
          // Refresh or update UI
        }
      }
    } catch (error) {
      frappe.msgprint(__('Error checking setup status'));
    }
  }

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

  const handleFileSelect = (file) => {
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
  if (setupStatus && !setupStatus.complete && !isSettingUp) {
    return (
      <div className="container mx-auto py-12 max-w-3xl">
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Setup Required</AlertTitle>
          <AlertDescription>
            Translation Tools needs to be set up before use. The following
            DocTypes are missing:
            <ul className="mt-2 list-disc pl-6">
              {setupStatus.missing_doctypes.map((dt) => (
                <li key={dt}>{dt}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <Button onClick={handleRunSetup} className="w-full">
          Complete Setup
        </Button>
      </div>
    );
  }

  if (isCheckingSetup || isSettingUp) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" />
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
    <>
      <Navbar currentTab={activeTab} />
      <div className="container mx-auto py-6 max-w-screen-xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              ERPNext Translation Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage translations for Frappe/ERPNext ecosystem
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="files">File Explorer</TabsTrigger>
            <TabsTrigger value="editor" disabled={!selectedFile}>
              Translation Editor
              {selectedFile && (
                <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {selectedFile.filename}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="glossary">Glossary Manager</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="p-4 border rounded-lg">
            <FileExplorer
              onFileSelect={handleFileSelect}
              selectedFilePath={selectedFile?.file_path || null}
            />
          </TabsContent>

          <TabsContent value="editor" className="p-4 border rounded-lg">
            <TranslationEditor
              selectedFile={selectedFile}
              settings={settingsData?.message || null}
            />
          </TabsContent>

          <TabsContent value="glossary" className="p-4 border rounded-lg">
            <GlossaryManager />
          </TabsContent>

          <TabsContent value="settings" className="p-4 border rounded-lg">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
