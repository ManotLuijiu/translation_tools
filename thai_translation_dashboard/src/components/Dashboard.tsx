// File: apps/translation_tools/thai_translation_dashboard/src/components/Dashboard.tsx
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

const Dashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

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
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <FileManager
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
          />
        </TabsContent>

        <TabsContent value="translate">
          <TranslationEditor filePath={selectedFile} />
        </TabsContent>

        <TabsContent value="glossary">
          <GlossaryManager />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
