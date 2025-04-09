import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { useGetTranslationSettings } from "../api";
import { TabType, POFile } from "../types";
import FileExplorer from "./FileExplorer";
import TranslationEditor from "./TranslationEditor";
import GlossaryManager from "./GlossaryManager";
import SettingsPanel from "./SettingsPanel";
import Navbar from "./Navbar";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("files");
  const [selectedFile, setSelectedFile] = useState<POFile | null>(null);
  const [setupStatus, setSetupStatus] = useState<{
    complete: boolean;
    missing_doctypes: string[];
  } | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const { data: settingsData } = useGetTranslationSettings();

  // Check setup status
  const { data: setupData, isLoading: isCheckingSetup } = useFrappeGetCall(
    "translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.check_setup_status",
    {}
  );

  // Run setup function
  const runSetup = useFrappePostCall(
    "translation_tools.translation_tools.page.thai_translation_dashboard.thai_translation_dashboard.run_setup"
  );

  useEffect(() => {
    if (setupData?.message) {
      setSetupStatus(setupData.message);
    }
  }, [setupData]);

  // When a file is selected, switch to the editor tab
  useEffect(() => {
    if (selectedFile) {
      setActiveTab("editor");
    }
  }, [selectedFile]);

  const handleFileSelect = (file: POFile) => {
    setSelectedFile(file);
  };

  const handleRunSetup = async () => {
    console.log("clicked");
    setIsSettingUp(true);
    try {
      const result = await runSetup.call({});
      if (result.success) {
        // Refresh the page after setup
        window.location.reload();
      }
    } catch (error) {
      console.error("Setup failed:", error);
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
              ? "Setting up Translation Tools..."
              : "Checking setup status..."}
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

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabType)}
        >
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
