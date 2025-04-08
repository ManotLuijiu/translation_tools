import React from "react";
import { FrappeProvider } from "frappe-react-sdk";

import Navbar from "./components/Navbar";
import { AppProvider } from "./context/AppProvider";
import Dashboard from "./components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

const App: React.FC = () => {
  return (
    <FrappeProvider
      siteName={import.meta.env.VITE_SITE_NAME}
      socketPort={import.meta.env.VITE_SOCKET_PORT}
    >
      <AppProvider>
        <div className="min-h-screen bg-background">
          <Navbar />
          <Dashboard />
          <Toaster />
        </div>
      </AppProvider>
    </FrappeProvider>
  );
};

export default App;
