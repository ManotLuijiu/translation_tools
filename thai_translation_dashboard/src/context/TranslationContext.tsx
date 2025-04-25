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
        if (window.frappe?.boot?.__messages) {
          setMessages(window.frappe.boot.__messages);
        } else {
          const url = new URL(
            '/api/method/frappe.translate.load_all_translations',
            location.origin
          );
          url.searchParams.append(
            'lang',
            window.frappe?.boot?.lang ?? navigator.language
          );
          url.searchParams.append(
            'hash',
            window.frappe?.boot?.translations_hash ||
              window._version_number ||
              Math.random().toString()
          );

          const response = await fetch(url);
          const data = await response.json();
          setMessages(data || {});
        }
      } catch (error) {
        console.error('Failed to fetch translations: ', error);
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
