import type React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useState, useEffect } from 'react';

// UI Components
import {
  AppSidebar,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppBreadcrumbs } from './components/AppBreadcrumbs';
import { LanguageToggle } from './components/LanguageToggle';
import { ModeToggle } from './components/ModeToggle';
import { NavUserDropdown } from './components/NavUserDropdown';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Contexts and Hooks
import { AutoSaveProvider } from '@/contexts/AutoSaveContext';
import { useLanguageSync } from '@/hooks/useLanguageSync';

// Types
import type { TabType } from './types';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ASEANTranslationsPage = lazy(
  () => import('./pages/ASEANTranslationsPage')
);
const CSVTranslationsPage = lazy(() => import('./pages/CSVTranslationsPage'));
const UUIDGeneratorPage = lazy(() => import('./pages/UUIDGeneratorPage'));

// Loading skeleton component for Suspense fallback - mobile-optimized
const LoadingSkeleton = () => (
  <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 md:p-8">
    <Skeleton className="h-6 sm:h-8 w-full sm:w-[250px]" />
    <Skeleton className="h-3 sm:h-4 w-full" />
    <Skeleton className="h-3 sm:h-4 w-full" />
    <Skeleton className="h-3 sm:h-4 w-3/4" />
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
      <Skeleton className="h-24 sm:h-32 w-full" />
      <Skeleton className="h-24 sm:h-32 w-full" />
      <Skeleton className="h-24 sm:h-32 w-full" />
    </div>
  </div>
);

// Main content component that works with the sidebar system - responsive to sidebar state
const MainContent: React.FC<{
  currentTab: TabType | undefined;
  setCurrentTab: (tab: TabType | undefined) => void;
}> = ({ currentTab, setCurrentTab }) => {
  const location = useLocation();

  // ✅ No marginLeft needed - sidebar's spacer div (w-(--sidebar-width)) handles spacing
  // The sidebar.tsx component creates an invisible spacer that pushes content automatically
  // Adding margin-left would create DOUBLE spacing (16rem + 16rem = 32rem)

  // Reset currentTab when navigating away from ASEAN Translations page
  useEffect(() => {
    if (!location.pathname.startsWith('/asean-translations')) {
      setCurrentTab(undefined);
    }
  }, [location.pathname, setCurrentTab]);

  return (
    <main className="flex flex-1 flex-col transition-all duration-300 ease-in-out antialiased h-screen w-full overflow-y-auto overflow-x-hidden">
      {/* Header with sidebar trigger and controls - mobile-optimized */}
      <div
        id="main__first__div"
        className="border-b shrink-0 p-2 sm:p-4 md:p-6 w-full"
      >
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <SidebarTrigger />
            <h1 className="text-base sm:text-lg font-semibold">
              Translation Tools
            </h1>
            {/* Hide breadcrumbs on small screens */}
            <div className="hidden md:block">
              <AppBreadcrumbs currentTab={currentTab} />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ModeToggle />
            <LanguageToggle />
            <NavUserDropdown />
          </div>
        </div>
      </div>

      {/* Content area with responsive padding - mobile-first */}
      <div className="flex-1 bg-sidebar-accent/50 w-full">
        <div className="container mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4 md:py-6">
          <Suspense fallback={<LoadingSkeleton />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/asean-translations"
                element={<ASEANTranslationsPage onTabChange={setCurrentTab} />}
              />
              <Route path="/csv-translations" element={<CSVTranslationsPage />} />
              <Route path="/uuid-generator" element={<UUIDGeneratorPage />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </main>
  );
};

/**
 * Main App Component
 * Local layout implementation (not imported from thai_business_suite)
 */
const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType | undefined>(undefined);

  // Sync HTML lang attribute with Frappe language preference for dynamic font/line-height
  useLanguageSync();

  // Use basename only in production (when served from Frappe)
  // In development (Vite dev server), no basename is needed
  const basename = import.meta.env.DEV
    ? undefined
    : '/translation_tools_dashboard';

  return (
    <div className="h-screen w-full overflow-hidden">
      <BrowserRouter basename={basename}>
        <AutoSaveProvider>
          <SidebarProvider>
            {/* Sidebar - collapsible with icon-only mode */}
            <AppSidebar />

            {/* Main content area with sidebar-aware styling */}
            <MainContent
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
            />

            <Toaster />
          </SidebarProvider>
        </AutoSaveProvider>
      </BrowserRouter>
    </div>
  );
};

export default App;
