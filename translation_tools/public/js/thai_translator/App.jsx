import React from 'react';
import '../../css/tailwind.css';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/components/Dashboard';

export function App() {
  return (
    <main className="tw tw-font-sarabun">
      <div className="tw-min-h-screen tw-bg-background">
        <div className="tw-mx-auto tw-px-4">
          <Dashboard />
        </div>
        <Toaster />
      </div>
    </main>
  );
}
