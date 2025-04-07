import React, { useState } from "react";
import { FrappeProvider } from "frappe-react-sdk";
import FileSelector from "./components/FileSelector";
import TranslationEditor from "./components/TranslationEditor";
import TranslationStatus from "./components/TranslationStatus";
import LogViewer from "./components/LogViewer";
import Settings from "./components/Settings";
import GlossaryManager from "./components/GlossaryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<
    "translations" | "glossary" | "logs" | "settings"
  >("translations");
  const [logFilePath, setLogFilePath] = useState<string | null>(null);

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath);
  };

  const handleTranslationComplete = (logFile: string) => {
    setLogFilePath(logFile);
    setCurrentView("logs");
  };

  return (
    <FrappeProvider siteName={import.meta.env.VITE_SITE_NAME}
    socketPort={import.meta.env.VITE_SOCKET_PORT}>
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">
            ERPNext Thai Translation Dashboard
          </h1>
          <p className="text-gray-600">
            AI-powered PO file translation for ERPNext
          </p>
        </header>

        <Tabs
          value={currentView}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onValueChange={(value) => setCurrentView(value as any)}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="translations">Translations</TabsTrigger>
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="translations">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 bg-white p-4 rounded shadow">
                <FileSelector
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
              </div>
              <div className="md:col-span-8">
                {selectedFile ? (
                  <div className="bg-white p-4 rounded shadow">
                    <TranslationStatus filePath={selectedFile} />
                    <TranslationEditor
                      filePath={selectedFile}
                      onTranslationComplete={handleTranslationComplete}
                    />
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded shadow text-center">
                    <p className="text-gray-500">
                      Select a PO file to start translating
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="glossary">
            <div className="bg-white p-4 rounded shadow">
              <GlossaryManager />
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <div className="bg-white p-4 rounded shadow">
              <LogViewer logFilePath={logFilePath} />
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-white p-4 rounded shadow">
              <Settings />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </FrappeProvider>
  );
};

export default App;
