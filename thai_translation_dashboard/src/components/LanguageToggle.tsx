import { useFrappeUpdateDoc } from 'frappe-react-sdk';
import { Languages } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

export function LanguageToggle() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>(() => {
    const lang = window?.frappe?.boot?.lang || 'th';
    return lang?.toLowerCase()?.startsWith('en') ? 'en' : 'th';
  });
  const [optimisticLang, setOptimisticLang] = useState<string | null>(null);

  let updateUser: any = null;
  try {
    const { updateDoc } = useFrappeUpdateDoc();
    updateUser = updateDoc;
  } catch (error) {
    console.warn('FrappeProvider context not available, using fallback method');
  }

  const getCurrentLanguageFromBoot = () => {
    const lang = window?.frappe?.boot?.lang || 'th';
    return lang?.toLowerCase()?.startsWith('en') ? 'en' : 'th';
  };

  const getCurrentUserId = () => {
    return window?.frappe?.session?.user || 'Administrator';
  };

  useEffect(() => {
    const checkLanguageSync = () => {
      const bootLang = getCurrentLanguageFromBoot();
      if (bootLang !== currentLang && !optimisticLang) {
        setCurrentLang(bootLang);
      }
    };

    checkLanguageSync();
    const handleFocus = () => checkLanguageSync();
    window.addEventListener('focus', handleFocus);

    const interval = import.meta.env.DEV
      ? setInterval(checkLanguageSync, 2000)
      : null;

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (interval) clearInterval(interval);
    };
  }, [currentLang, optimisticLang]);

  const toggleLanguage = async () => {
    if (isLoading) return;

    const current = optimisticLang || currentLang;
    const newLang = current === 'en' ? 'th' : 'en';
    const userId = getCurrentUserId();

    setOptimisticLang(newLang);
    setIsLoading(true);

    try {
      if (updateUser) {
        await updateUser('User', userId, {
          language: newLang,
        });
      } else {
        const response = await fetch('/api/method/frappe.client.set_value', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            doctype: 'User',
            name: userId,
            fieldname: 'language',
            value: newLang,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update language preference');
        }
      }

      setCurrentLang(newLang);

      setTimeout(() => {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.location.href = cleanUrl;
      }, 500);
    } catch (error) {
      console.error('Language toggle error:', error);
      setOptimisticLang(null);
      setIsLoading(false);

      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
  };

  const displayLanguage = optimisticLang || currentLang;
  const nextLanguageDisplay = displayLanguage === 'en' ? 'ไทย' : 'EN';

  // Show skeleton during loading/switching
  if (isLoading) {
    return (
      <Skeleton className="h-9 w-24" />
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="transition-all duration-200 dark:hover:text-primary hover:scale-105"
    >
      <Languages className="w-4 h-4 mr-2" />
      {nextLanguageDisplay}
    </Button>
  );
}

export default LanguageToggle;
