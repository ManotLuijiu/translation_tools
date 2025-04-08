import React, { useState } from "react";
import { FrappeProvider } from "frappe-react-sdk";
import FileSelector from "./components/FileSelector";
import TranslationEditor from "./components/TranslationEditor";
import TranslationStatus from "./components/TranslationStatus";
import LogViewer from "./components/LogViewer";
import Settings from "./components/Settings";
import GlossaryManager from "./components/GlossaryManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
// import { BrowserRouter as Router, Route, Routes } from "react-router";
import Navbar from "./components/Navbar";
import { AppProvider } from "./context/AppProvider";
import Dashboard from "./components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

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

  //   const baseUrl = "/thai_translation_dashboard";

  return (
    <FrappeProvider
      siteName={import.meta.env.VITE_SITE_NAME}
      socketPort={import.meta.env.VITE_SOCKET_PORT}
    >
      <AppProvider>
        <div className="min-h-screen bg-background">
          <Navbar currentTab={currentView} />
          <div className="container mx-auto p-4">
            <header className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">
                ERPNext Thai Translation Dashboard
              </h1>
              <p className="text-muted-foreground">
                AI-powered PO file translation for ERPNext
              </p>
            </header>

            <Tabs
              value={currentView}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(value) => setCurrentView(value as any)}
              className="space-y-4"
            >
              <TabsList className="border-b border-moo-blue rounded-none w-full justify-start space-x-4 bg-transparent p-0">
                <TabsTrigger
                  value="translations"
                  className="rounded-none cursor-pointer border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-none data-[state=active]:bg-moo-blue data-[state=active]:text-white data-[state=active]:rounded-t-lg"
                >
                  Translations
                </TabsTrigger>
                <TabsTrigger
                  value="glossary"
                  className="rounded-none cursor-pointer border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-none data-[state=active]:bg-moo-blue data-[state=active]:text-white data-[state=active]:rounded-t-lg"
                >
                  Glossary
                </TabsTrigger>
                <TabsTrigger
                  value="logs"
                  className="rounded-none cursor-pointer border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-none data-[state=active]:bg-moo-blue data-[state=active]:text-white data-[state=active]:rounded-t-lg"
                >
                  Logs
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="rounded-none cursor-pointer border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-none data-[state=active]:bg-moo-blue data-[state=active]:text-white data-[state=active]:rounded-t-lg"
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="translations" className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-4">
                    <FileSelector
                      onFileSelect={handleFileSelect}
                      selectedFile={selectedFile}
                    />
                  </div>
                  <div className="md:col-span-8">
                    {selectedFile ? (
                      <div className="space-y-4">
                        <TranslationStatus filePath={selectedFile} />
                        <TranslationEditor
                          filePath={selectedFile}
                          onTranslationComplete={handleTranslationComplete}
                        />
                      </div>
                    ) : (
                      <div className="bg-card p-8 rounded-lg shadow text-center">
                        <p className="text-muted-foreground">
                          Select a PO file to start translating
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="glossary" className="pt-4">
                <GlossaryManager />
              </TabsContent>

              <TabsContent value="logs" className="pt-4">
                <LogViewer logFilePath={logFilePath} />
              </TabsContent>

              <TabsContent value="settings" className="pt-4">
                <Settings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </AppProvider>
    </FrappeProvider>
  );
};

export default App;
