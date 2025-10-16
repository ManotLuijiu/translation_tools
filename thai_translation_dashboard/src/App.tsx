import type React from 'react';
import { FrappeProvider } from 'frappe-react-sdk';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';

import { AppProvider } from './context/AppProvider';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from './hooks/useTheme';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  SidebarProvider,
  SidebarTrigger,
} from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
import { AppBreadcrumbs } from './components/AppBreadcrumbs';
import { ModeToggle } from './components/ModeToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { NavUserDropdown } from './components/NavUserDropdown';
import type { TabType } from './types';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ASEANTranslationsPage = lazy(
  () => import('./pages/ASEANTranslationsPage')
);
const CSVTranslationsPage = lazy(() => import('./pages/CSVTranslationsPage'));
const UUIDGeneratorPage = lazy(() => import('./pages/UUIDGeneratorPage'));

const MainContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType | undefined>(undefined);
  const location = useLocation();

  // Reset currentTab when navigating away from ASEAN Translations page
  useEffect(() => {
    if (!location.pathname.startsWith('/asean-translations')) {
      setCurrentTab(undefined);
    }
  }, [location.pathname]);

  return (
    <main
      className="flex flex-1 flex-col transition-all duration-300 ease-in-out antialiased bg-gray-50 dark:bg-gray-900"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <AppBreadcrumbs currentTab={currentTab} />
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ModeToggle />
          <NavUserDropdown />
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-screen">
              <p>Loading...</p>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={<LandingPage />}
            />
            <Route
              path="/asean-translations"
              element={<ASEANTranslationsPage onTabChange={setCurrentTab} />}
            />
            <Route path="/csv-translations" element={<CSVTranslationsPage />} />
            <Route path="/uuid-generator" element={<UUIDGeneratorPage />} />
          </Routes>
        </Suspense>
      </div>

      <Toaster richColors position="bottom-right" />
    </main>
  );
};

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
            <BrowserRouter basename="/translation_tools_dashboard">
              <SidebarProvider>
                <AppSidebar />
                <MainContent />
              </SidebarProvider>
            </BrowserRouter>
          </AppProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </FrappeProvider>
  );
};

export default App;
