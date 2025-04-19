import React from 'react';
import '../../css/tailwind.css';
// import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/components/Dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="tw tw-font-sarabun">
        <div className="tw-min-h-screen tw-bg-background">
          <div className="tw-mx-auto tw-px-4">
            <Dashboard />
          </div>
          {/* <Toaster /> */}
        </div>
      </main>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
