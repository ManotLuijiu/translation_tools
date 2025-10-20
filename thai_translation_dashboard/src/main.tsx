import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TranslationProvider } from './context/TranslationContext.tsx';
import { ThemeProvider } from './components/ThemeProvider';
import { FrappeProvider } from 'frappe-react-sdk';
import { AppProvider } from './context/AppProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

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
      if (!window.frappe) {
        window.frappe = {
          __: (text: string) => text,
          show_alert: (message: string) => alert(message),
        };
      }
      window.frappe.boot = v;
    })
    .catch((error) => {
      console.warn('Development context API failed:', error.message);
      if (!window.frappe) {
        window.frappe = {
          __: (text: string) => text,
          show_alert: (message: string) => alert(message),
        };
      }
    });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="translation-tools-ui-theme">
        <QueryClientProvider client={queryClient}>
          <FrappeProvider
            siteName={import.meta.env.VITE_SITE_NAME}
            socketPort={import.meta.env.VITE_SOCKET_PORT}
          >
            <TranslationProvider>
              <ErrorBoundary fallback={<p>Oops! Something broke.</p>}>
                <AppProvider>
                  <App />
                </AppProvider>
              </ErrorBoundary>
            </TranslationProvider>
          </FrappeProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>
  );
} else {
  console.error('Root element not found');
}
