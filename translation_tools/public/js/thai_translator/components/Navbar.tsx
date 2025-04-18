import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

declare const frappe: {
  session: { user: string };
  call: Function;
};

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
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    frappe.call({
      method: 'frappe.auth.get_logged_user',
      callback: function (response: any) {
        if (response.message) {
          setCurrentUser(response.message);
        } else {
          setError('Unable to fetch user.');
        }
        setLoading(false);
      },
      error: function (err: any) {
        setError(err.message || 'An error occurred.');
        setLoading(false);
      },
    });
  }, []);

  if (loading) {
    return (
      <div className="tw-flex tw-items-center tw-gap-2 tw-p-2">
        <RefreshCw className="tw-h-4 tw-w-4 tw-animate-spin" />
        Loading...
      </div>
    );
  }

  if (error) {
    return <div className="tw-text-red-500">{error}</div>;
  }

  return (
    <nav className="">
      <div className="">
        <div className="">
          <div className="">
            <a href="/app" className="">
              <img
                src="/assets/translation_tools/images/logos/moo_logo.svg"
                alt="Moo Logo"
                className="tw-h-8 tw-w-auto"
              />
              <span>Back to ERPNext</span>
            </a>
          </div>

          <div className="">
            <h1 className="">Translation Tools</h1>
            <div className="">
              Logged in as: <span className="">{currentUser}</span>
            </div>
          </div>
        </div>

        <div className="">
          <span className="">Home</span>
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
                className="tw-mx-2 tw-text-muted-foreground"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="tw-font-medium tw-text-muted-foreground">
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
