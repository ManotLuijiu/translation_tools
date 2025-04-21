import React, { useEffect, useState } from 'react';
import '../../css/tailwind.css';
// import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/components/Dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function App() {
  console.log('App component rendering');

  // Check initial theme state and log it
  const initialTheme = document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';
  console.log('Initial theme detection:', initialTheme);
  console.log('Document classes:', document.documentElement.className);

  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Function to detect ERPNext theme
    const detectTheme = () => {
      if (window.frappe && window.frappe.ui && window.frappe.ui.theme) {
        // If frappe.ui.theme is available, use it directly
        setTheme(window.frappe.ui.theme.current === 'dark' ? 'dark' : 'light');
        return;
      }

      // Use data-theme-mode attribute on root element if present
      const root = document.documentElement;
      const themeMode = root.getAttribute('data-theme-mode');
      const themeValue = root.getAttribute('data-theme');

      if (themeValue === 'dark') {
        setTheme('dark');
      } else if (themeMode === 'automatic') {
        // Check for system preference if it's set to automatic
        if (
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
          setTheme('dark');
        } else {
          setTheme('light');
        }
      } else {
        // Fallback to checking the navbar color or other UI elements
        const navbar = document.querySelector('.navbar');
        if (navbar) {
          const bgColor = window.getComputedStyle(navbar).backgroundColor;
          // Check if background color is dark
          const isDark =
            bgColor.includes('rgb(24, 24, 27)') ||
            bgColor.includes('rgb(31, 41, 55)');
          setTheme(isDark ? 'dark' : 'light');
        }
      }
    };

    // Initial detection
    detectTheme();

    // Set up a direct hook into frappe.ui.set_theme if available
    if (window.frappe && window.frappe.ui) {
      const originalSetTheme = window.frappe.ui.set_theme;
      if (typeof originalSetTheme === 'function') {
        window.frappe.ui.set_theme = function (newTheme) {
          originalSetTheme(newTheme);
          setTheme(newTheme === 'dark' ? 'dark' : 'light');
        };
      }
    }

    // Watch for media query changes for automatic mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => detectTheme();
    mediaQuery.addEventListener('change', handleMediaChange);

    // Watch for attribute changes on the root element
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-theme' ||
            mutation.attributeName === 'data-theme-mode')
        ) {
          detectTheme();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-theme-mode'],
    });

    // Add a new event listener for frappe theme changes
    document.addEventListener('frappe-theme-change', detectTheme);

    // Run detectTheme periodically to ensure synchronization
    const interval = setInterval(detectTheme, 2000);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      observer.disconnect();
      clearInterval(interval);
      document.removeEventListener('frappe-theme-change', detectTheme);
    };
  }, []);

  // Create a direct synchronization with Frappe theme
  useEffect(() => {
    if (window.frappe) {
      // Add a custom syncing method to frappe
      window.frappe.sync_ui_theme = () => {
        if (window.frappe && window.frappe.ui && window.frappe.ui.theme) {
          setTheme(
            window.frappe.ui.theme.current === 'dark' ? 'dark' : 'light'
          );
        }
      };

      // Call sync periodically
      const interval = setInterval(() => {
        if (window.frappe.sync_ui_theme) {
          window.frappe.sync_ui_theme();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  console.log('Rendering with theme:', theme);

  return (
    <QueryClientProvider client={queryClient}>
      <main
        className={`${theme === 'dark' ? 'tw-dark' : 'tw'} tw-font-sarabun`}
      >
        <div className="tw-min-h-screen tw-bg-background dark:tw-bg-background-dark tw-text-foreground dark:tw-text-foreground-dark">
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
