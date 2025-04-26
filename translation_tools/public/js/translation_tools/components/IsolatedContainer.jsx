import React from 'react';

export function IsolatedContainer({ children }) {
  return (
    <div className="tw-text-base tw-font-sans tw-antialiased tw-box-border tw-m-0 tw-p-0">
      <div className="tw-text-foreground tw-bg-background tw-rounded-lg tw-p-4 tw-shadow-sm">
        {children}
      </div>
    </div>
  );
}
