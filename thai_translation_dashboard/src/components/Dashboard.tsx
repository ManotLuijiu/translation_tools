import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useGetTranslationSettings } from '../api';
import type { TabType, POFile } from '../types';
import FileExplorer from './FileExplorer';
import TranslationEditor from './TranslationEditor';
import GlossaryManager from './GlossaryManager';
import SettingsPanel from './SettingsPanel';
import Footer from './Footer';
import { useTranslation } from '@/context/TranslationContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import GithubSync from './GithubSync';

export interface DashboardProps {
  onTabChange?: (tab: TabType) => void;
}

export default function Dashboard({ onTabChange }: DashboardProps = {}) {
  const { translate: __, isReady } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('files');

  // Notify parent when tab changes
  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);
  const [selectedFile, setSelectedFile] = useState<POFile | null>(null);
  const [setupStatus, setSetupStatus] = useState<{
    complete: boolean;
    missing_doctypes: string[];
  } | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [translationMode, setTranslationMode] = useState<'manual' | 'ai'>(
    'manual'
  );
  const { data: settingsData } = useGetTranslationSettings();

  // Ref to store FileExplorer's refresh function
  const fileExplorerRefreshRef = useRef<(() => void) | null>(null);

  // Ref to store TranslationEditor's refresh function (more reliable)
  const translationEditorRefreshRef = useRef<(() => void) | null>(null);

  // console.log('selectedFile', selectedFile);
  // console.log(__('Print Message'));

  const refreshTranslations = () => {
    console.log(
      '🔄 refreshTranslations: GitHub sync completed, starting refresh process'
    );
    console.log(
      '🔍 fileExplorerRefreshRef.current exists:',
      !!fileExplorerRefreshRef.current
    );
    console.log(
      '🔍 translationEditorRefreshRef.current exists:',
      !!translationEditorRefreshRef.current
    );

    // FileExplorer's mutate function refreshes live statistics from filesystem (useGetLivePOFiles)
    if (fileExplorerRefreshRef.current) {
      console.log('✅ Calling FileExplorer refresh function');
      fileExplorerRefreshRef.current();
    } else {
      console.log('❌ FileExplorer refresh function not available');
    }

    // Also refresh TranslationEditor if available (for translation entries)
    if (translationEditorRefreshRef.current) {
      console.log('✅ Also calling TranslationEditor refresh function');
      translationEditorRefreshRef.current();
    } else {
      console.log('❌ TranslationEditor refresh function not available');
    }
  };

  // Check setup status
  const { data: setupData, isLoading: isCheckingSetup } = useFrappeGetCall(
    'translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status',
    {}
  );

  // console.log('Setup Data: from Dashboard.tsx', setupData);

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
      <div className="container mx-auto py-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {__('ERPNext Translation Dashboard')}
            </h1>
            <p className="text-muted-foreground">
              {__('Manage translations for Frappe/ERPNext ecosystem')}
            </p>
          </div>
          <div className="flex justify-center items-center space-x-4">
            <div className="flex">
              <GithubSync
                selectedFile={selectedFile}
                onSyncComplete={refreshTranslations}
                onFilesFound={() => setActiveTab('files')}
              />
            </div>
            <div className="flex justify-center items-center space-x-2">
              <Switch
                id="translation-mode"
                checked={translationMode === 'ai'}
                onCheckedChange={(checked) =>
                  setTranslationMode(checked ? 'ai' : 'manual')
                }
              />
              <Label htmlFor="translation-mode">
                {translationMode === 'manual' ? (
                  __('Manual Mode')
                ) : (
                  <span
                    className={translationMode === 'ai' ? 'text-blue-600' : ''}
                  >
                    {__('AI Mode')}
                  </span>
                )}
              </Label>
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
              onRefreshFunctionReady={(refreshFn) => {
                fileExplorerRefreshRef.current = refreshFn;
              }}
            />
          </TabsContent>

          <TabsContent
            id="translation__editor__tab__content"
            value="editor"
            className="rounded-lg border p-4"
          >
            {settingsData?.message && (
              <TranslationEditor
                translationMode={translationMode}
                selectedFile={selectedFile}
                settings={settingsData.message}
                onRefreshFunctionReady={(refreshFn) => {
                  translationEditorRefreshRef.current = refreshFn;
                }}
                onFileStatsChange={() => {
                  // When translations are saved, refresh FileExplorer live statistics
                  console.log(
                    '📊 Dashboard: Translation saved, refreshing FileExplorer live statistics'
                  );
                  if (fileExplorerRefreshRef.current) {
                    fileExplorerRefreshRef.current();
                  }
                }}
              />
            )}
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
