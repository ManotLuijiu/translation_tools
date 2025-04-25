import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// Type definitions
type Messages = Record<string, string>;
type ReplaceParams = Record<string | number, string | number>;

interface TranslationRequest {
  txt: string;
  replace?: ReplaceParams;
  context?: string | null;
}

interface TranslationResult {
  translatedText: string;
  originalText: string;
}

interface TranslationContextValue {
  translate: (request: TranslationRequest) => Promise<TranslationResult>;
  isTranslating: boolean;
  lastResult: TranslationResult | null;
  error: Error | null;
  __: (txt: string, replace?: ReplaceParams, context?: string | null) => string;
}

interface TranslationProviderProps {
  children: ReactNode;
}

// Create a context for translations
const TranslationContext = createContext<TranslationContextValue | undefined>(
  undefined
);

// Custom hook to use translations
export const useTranslation = (): TranslationContextValue => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Translation provider component
export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
}) => {
  const [messages, setMessages] = useState<Messages>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [lastResult, setLastResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const translate = async (
    request: TranslationRequest
  ): Promise<TranslationResult> => {
    setIsTranslating(true);
    setError(null);

    try {
      const { txt, replace, context } = request;
      let translatedText = '';

      if (context) {
        translatedText = messages[`${txt}:${context}`] || '';
      }

      if (!translatedText) {
        translatedText = messages[txt] || txt;
      }

      if (replace && typeof replace === 'object') {
        translatedText = format(translatedText, replace);
      }

      const result = {
        translatedText,
        originalText: txt,
      };

      setLastResult(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Translation failed'));
      throw err;
    } finally {
      setIsTranslating(false);
    }
  };

  // Synchronous version for convenience
  const __ = (
    txt: string,
    replace?: ReplaceParams,
    context?: string | null
  ): string => {
    if (!txt || typeof txt !== 'string') return txt;

    let translatedText = '';
    if (context) {
      translatedText = messages[`${txt}:${context}`] || '';
    }

    if (!translatedText) {
      translatedText = messages[txt] || txt;
    }

    if (replace && typeof replace === 'object') {
      translatedText = format(translatedText, replace);
    }

    return translatedText;
  };

  const format = (str: string, args: ReplaceParams): string => {
    if (str === undefined) return str;

    let unkeyedIndex = 0;
    return str.replace(/\{(\w*)\}/g, (match, keyPattern) => {
      let actualKey = keyPattern;
      if (keyPattern === '') {
        actualKey = unkeyedIndex.toString();
        unkeyedIndex++;
      }
      if (!Number.isNaN(Number(actualKey))) {
        return args[actualKey] !== undefined
          ? args[actualKey].toString()
          : match;
      }
      return match;
    });
  };

  useEffect(() => {
    const loadTranslations = async () => {
      setIsTranslating(true);
      try {
        if (window.frappe?.boot?.__messages) {
          setMessages(window.frappe.boot.__messages);
          return;
        }

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
        const data = ((await response.json()) as Messages) || {};
        setMessages(data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to load translations')
        );
      } finally {
        setIsTranslating(false);
      }
    };

    loadTranslations();
  }, []);

  const contextValue: TranslationContextValue = {
    translate,
    isTranslating,
    lastResult,
    error,
    __,
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
};

// Higher-order component for class components
export function withTranslation<
  P extends {
    __?: (
      txt: string,
      replace?: ReplaceParams,
      context?: string | null
    ) => string;
  },
>(WrappedComponent: React.ComponentType<P>): React.FC<Omit<P, '__'>> {
  const ComponentWithTranslation: React.FC<Omit<P, '__'>> = (props) => {
    const { __ } = useTranslation();
    return <WrappedComponent {...(props as P)} __={__} />;
  };
  ComponentWithTranslation.displayName = `withTranslation(${WrappedComponent.displayName || WrappedComponent.name})`;
  return ComponentWithTranslation;
}
