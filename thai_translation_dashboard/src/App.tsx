import React from 'react';
import { FrappeProvider } from 'frappe-react-sdk';

import { AppProvider } from './context/AppProvider';
import Dashboard from './components/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from './hooks/useTheme';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
// import { CrossIcon, InfoIcon } from 'lucide-react';

const App: React.FC = () => {
  const theme = useTheme();
  console.info('theme', theme);
  return (
    <FrappeProvider
      siteName={import.meta.env.VITE_SITE_NAME}
      socketPort={import.meta.env.VITE_SOCKET_PORT}
    >
      <ErrorBoundary fallback={<p>Opps! Something broke.</p>}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <AppProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <main className="container mx-auto px-4 dark:bg-gray-900">
                <Dashboard />
              </main>
              <Toaster richColors position="bottom-right" />
            </div>
          </AppProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </FrappeProvider>
  );
};

export default App;
