import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState('light');

  // console.log('theme', theme)

  useEffect(() => {
    // Function to detect theme from frappe.boot
    const detectTheme = () => {
      try {
        // Check if we have access to frappe.boot.desk_theme
        if (window.frappe && window.frappe.boot && (window.frappe.boot as { desk_theme?: string }).desk_theme) {
          const bootTheme = (window.frappe.boot as { desk_theme?: string })
            .desk_theme;
          setTheme(bootTheme === 'Dark' ? 'dark' : 'light');
          return;
        }

        // Fallbacks if boot data isn't available for some reason
        const root = document.documentElement;
        const themeValue = root.getAttribute('data-theme');

        if (themeValue === 'dark') {
          setTheme('dark');
          return;
        }

        // Check for dark mode class on body
        if (document.body.classList.contains('dark')) {
          setTheme('dark');
          return;
        }
      } catch (error) {
        console.error('Error detecting theme:', error);
        // Default to light theme if there's an error
        setTheme('light');
      }
    };

    // Initial detection
    detectTheme();

    // Listen for theme changes if frappe is available
    const handleThemeChange = () => {
      detectTheme();
    };

    // Add event listener if frappe is available
    if (window.frappe) {
      document.addEventListener('frappe-theme-change', handleThemeChange);
    }

    // Run detectTheme periodically to ensure we stay in sync
    const interval = setInterval(detectTheme, 2000);

    return () => {
      clearInterval(interval);
      if (window.frappe) {
        document.removeEventListener('frappe-theme-change', handleThemeChange);
      }
    };
  }, []);

  // console.log('theme', theme);

  return theme;
}
