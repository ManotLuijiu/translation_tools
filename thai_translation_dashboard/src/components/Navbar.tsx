import React from "react";
import mooLogo from "../assets/moo_logo.svg";
import { useFrappeAuth } from "frappe-react-sdk";
import { RefreshCw } from "lucide-react";

interface NavbarProps {
  currentTab?: string;
}

const tabMap: Record<string, string> = {
  files: "File Explorer",
  editor: "Translation Editor",
  glossary: "Glossary Manager",
  settings: "Settings",
};

const Navbar: React.FC<NavbarProps> = ({ currentTab }) => {
  const { currentUser, isValidating, isLoading, error } = useFrappeAuth();

  if (isLoading)
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
  if (!currentUser) return <div>not logged in</div>;

  return (
    <nav className="bg-card">
      <div className="container mx-auto py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a
              href="/app"
              className="flex items-center gap-2 text-primary font-medium hover:text-primary/80 transition-colors"
            >
              <img src={mooLogo} alt="Moo Logo" className="h-8 w-auto" />
              <span>Back to ERPNext</span>
            </a>
          </div>

          <div className="text-muted-foreground flex items-center gap-4">
            <h1 className="text-lg font-semibold">Translation Tools</h1>
            <div className="flex items-center gap-4">
              {currentUser && (
                <div className="text-sm">
                  Logged in as:{" "}
                  <span className="font-medium">{currentUser}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simple breadcrumb for tab-based navigation */}
        <div className="flex items-center py-2 text-sm">
          <span className="text-primary">Home</span>
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
                className="mx-2 text-muted-foreground"
              >
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
