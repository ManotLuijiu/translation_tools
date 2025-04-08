// File location: thai_translation_dashboard/src/components/Navbar.tsx

import React from "react";
import mooLogo from "../assets/moo_logo.svg";

interface NavbarProps {
  currentTab?: string;
}

const Navbar: React.FC<NavbarProps> = ({ currentTab }) => {
  return (
    <nav className="bg-card">
      <div className="container mx-auto px-4 py-3">
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

          <div>
            <h1 className="text-lg font-semibold">Translation Tools</h1>
          </div>
        </div>

        {/* Simple breadcrumb for tab-based navigation */}
        <div className="flex items-center py-2 text-sm">
          <span className="text-primary">Dashboard</span>
          {currentTab && (
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
                {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
              </span>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
