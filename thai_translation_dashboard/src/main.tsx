import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TranslationProvider } from './context/TranslationContext.tsx';

const queryClient = new QueryClient();

if (import.meta.env.DEV) {
  fetch(
    '/api/method/translation_tools.www.translation_tools_dashboard.get_context_for_dev',
    {
      method: 'POST',
    }
  )
    .then((response) => response.json())
    .then((values) => {
      const v = JSON.parse(values.message);
      // if (!window.frappe) window.frappe = {};
      if (!window.frappe) {
        window.frappe = {
          __: (text: string) => text, // Provide a default implementation for the __ function
          show_alert: (message: string) => alert(message), // Provide a default implementation for show_alert
        };
      }
      window.frappe.boot = v;
    });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TranslationProvider>
          <App />
        </TranslationProvider>
      </QueryClientProvider>
    </StrictMode>
  );
} else {
  console.error('Root element not found');
}
