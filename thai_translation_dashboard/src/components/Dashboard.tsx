import React, { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import FileManager from "./FileManager";
import TranslationEditor from "./TranslationEditor";
import GlossaryManager from "./GlossaryManager";
import SettingsPanel from "./SettingsPanel";
import LogViewer from "./LogViewer";

const Dashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logFilePath, setLogFilePath] = useState<string | null>(null);

  // When a translation process completes, you can set the log file path
  // This would typically be returned from your translation API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTranslationComplete = (result: any) => {
    if (result.log_file) {
      setLogFilePath(result.log_file);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold">ERPNext Thai Translation Tools</h1>
        <p className="text-muted-foreground">
          AI-powered translation utility for ERPNext
        </p>
      </header>

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="translate">Translate</TabsTrigger>
          <TabsTrigger value="glossary">Glossary</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <FileManager
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </TabsContent>

        <TabsContent value="translate">
          <TranslationEditor filePath={selectedFile}
           onTranslationComplete={handleTranslationComplete}
          />
        </TabsContent>

        <TabsContent value="glossary">
          <GlossaryManager />
        </TabsContent>

        <TabsContent value="logs">
          <LogViewer logFilePath={logFilePath} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
