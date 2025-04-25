import { useState, useEffect } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

export function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState('en');
  const [loading, setLoading] = useState(false);

  // Get initial language from frappe.boot.lang when component mounts
  useEffect(() => {
    // console.log('access lang toggle', window.frappe.boot?.lang);
    // Access the global frappe object for the initial language
    if (window.frappe?.boot?.lang) {
      setCurrentLang(window.frappe.boot.lang);
    }
  }, []);

  const { call: setLanguage, loading: apiLoading } = useFrappePostCall(
    'translation_tools.utils.language_utils.set_language'
  );

  const toggleLanguage = async () => {
    const newLang = currentLang === 'en' ? 'th' : 'en';
    setLoading(true);

    try {
      await setLanguage({
        language: newLang,
      });

      setCurrentLang(newLang);
      // Reload the page to apply language changes
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch language:', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="language-toggle"
        checked={currentLang === 'th'}
        disabled={loading || apiLoading}
        onCheckedChange={toggleLanguage}
      />
      <Label
        htmlFor="language-toggle"
        className="cursor-pointer text-gray-900 dark:text-gray-50"
      >
        {currentLang === 'en' ? '🇬🇧 English' : '🇹🇭 ไทย'}
      </Label>
    </div>
  );
}

export default LanguageToggle;
