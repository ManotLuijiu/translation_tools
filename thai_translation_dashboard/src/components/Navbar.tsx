import React from 'react';
import tbsLogo from '../assets/tbs_logo.png';
import { useFrappeAuth } from 'frappe-react-sdk';
import { RefreshCw } from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import LanguageToggle from './LanguageToggle';
import { useTranslation } from '@/context/TranslationContext';
import { GitCompareArrows } from 'lucide-react';
interface NavbarProps {
  currentTab?: string;
}

const tabMap: Record<string, string> = {
  files: 'File Explorer',
  editor: 'Translation Editor',
  glossary: 'Glossary Manager',
  settings: 'Settings',
};

const Navbar: React.FC<NavbarProps> = ({ currentTab }) => {
  const { currentUser, isValidating, isLoading, error } = useFrappeAuth();
  const { translate: __, isReady } = useTranslation();

  if (isLoading || !isReady)
    return (
      <div>
        <RefreshCw className="h-4 w-4 animate-spin" />
        loading...
      </div>
    );
  if (isValidating)
    return (
      <div>
        <RefreshCw className="h-4 w-4 animate-spin" />
        validating...
      </div>
    );
  if (error) return <div>{error.message}</div>;
  if (!currentUser) return <div>{__('not logged in')}</div>;

  return (
    <nav className="bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <a
              href="/app"
              className="text-primary hover:text-primary/80 flex items-center gap-2 font-medium transition-colors"
            >
              <img
                src={tbsLogo}
                alt="Thai Business Suite Logo"
                className="h-8 w-auto"
              />
              <span>{__('Back to ERPNext')}</span>
            </a>
          </div>

          <div className="text-muted-foreground flex justify-center items-center gap-4">
            <h1 className="text-lg font-semibold">{__('Translation Tools')}</h1>
            {/* <div className="flex space-x-2 justify-center items-center">
              <GitCompareArrows className="w-4 h-4" />
              <a href="/app/thai_translator">Desk Version</a>
            </div> */}
            <div className="flex justify-center items-center gap-4">
              {/* {currentUser && (
                <div className="text-sm">
                  {__('Logged in as:')}{' '}
                  <span className="font-medium">{currentUser}</span>
                </div>
              )} */}
              <LanguageToggle />
              <ModeToggle />
            </div>
          </div>
        </div>

        {/* Simple breadcrumb for tab-based navigation */}
        <div className="flex items-center py-2 text-sm">
          <span className="text-primary">
            <a href="/app">{__('Home')}</a>
          </span>
          {currentTab && tabMap[currentTab] && (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground mx-2"
              >
                <title>Breadcrumb Navigation Arrow</title>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="text-muted-foreground font-medium">
                {/* {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)} */}
                {tabMap[currentTab]}
              </span>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
