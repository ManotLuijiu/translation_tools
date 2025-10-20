import { useEffect } from "react";

/**
 * Hook to synchronize HTML lang attribute with Frappe language preference
 * This enables dynamic font and line-height switching via CSS
 *
 * Usage: Call this hook at the top level of your App component
 */
export function useLanguageSync() {
  useEffect(() => {
    const updateHtmlLang = () => {
      // Get language from Frappe boot data
      const lang = window?.frappe?.boot?.lang || "th";

      // Normalize language codes
      const normalizedLang = lang?.toLowerCase()?.startsWith('en') ? 'en' : 'th';

      // Get current HTML lang to avoid unnecessary updates
      const currentLang = document.documentElement.getAttribute('lang');

      // Only update and log if language actually changed
      if (currentLang !== normalizedLang) {
        document.documentElement.setAttribute('lang', normalizedLang);
        console.log(`🌐 HTML lang attribute updated to: ${normalizedLang}`);
      }
    };

    // Set initial language
    updateHtmlLang();

    // Check on window focus (when user returns to tab)
    window.addEventListener('focus', updateHtmlLang);

    return () => {
      window.removeEventListener('focus', updateHtmlLang);
    };
  }, []);
}
