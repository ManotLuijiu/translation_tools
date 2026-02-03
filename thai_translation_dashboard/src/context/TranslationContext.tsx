import React, { createContext, useContext, useEffect, useState } from 'react';

type Translations = Record<string, string>;

interface TranslationContextProps {
  translate: (
    txt: string,
    replace?: Record<string, string | number>,
    context?: string | null
  ) => string;
  isReady: boolean;
}

const TranslationContext = createContext<TranslationContextProps>({
  translate: (txt) => txt,
  isReady: false,
});

export const useTranslation = () => useContext(TranslationContext);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [messages, setMessages] = useState<Translations>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        // First try boot messages (faster, already loaded)
        if (window.frappe?.boot?.__messages) {
          setMessages(window.frappe.boot.__messages);
          setIsReady(true);
          return;
        }

        // Fallback: fetch from translation_tools API
        const lang = window.frappe?.boot?.lang || navigator.language?.split('-')[0] || 'en';
        const url = new URL(
          '/api/method/translation_tools.api.get_translation.get_translations_by_lang',
          location.origin
        );
        url.searchParams.append('lang', lang);

        const response = await fetch(url);
        const data = await response.json();

        if (data.message) {
          setMessages(data.message);
        } else {
          console.warn('No translation data received');
          setMessages({});
        }
      } catch (error) {
        console.error('Failed to fetch translations: ', error);
        setMessages({});
      } finally {
        setIsReady(true);
      }
    };
    setup();
  }, []);

  const translate = (
    txt: string,
    replace?: Record<string, string | number>,
    content: string | null = null
  ) => {
    if (!txt || typeof txt !== 'string') return txt;

    let translatedText = '';
    const key = txt;

    if (content) {
      translatedText = messages[`${key}:${content}`];
    }
    if (!translatedText) {
      translatedText = messages[key] || txt;
    }

    if (replace && typeof replace === 'object') {
      translatedText = format(translatedText, replace);
    }
    return translatedText;
  };

  const format = (
    str: string,
    args: Record<string | number, string | number>
  ) => {
    if (str === undefined) return str;

    let unkeyedIndex = 0;
    return str.replace(/\{(\w*)\}/g, (match, key) => {
      if (key === '') {
        key = unkeyedIndex.toString();
        unkeyedIndex++;
      }
      return args[key] !== undefined ? String(args[key]) : match;
    });
  };

  return (
    <TranslationContext.Provider value={{ translate, isReady }}>
      {children}
    </TranslationContext.Provider>
  );
};
