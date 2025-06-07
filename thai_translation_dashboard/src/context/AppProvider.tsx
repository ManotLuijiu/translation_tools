import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { AppContext } from './AppContext';

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logFilePath, setLogFilePath] = useState<string | null>(null);

  return (
    <AppContext.Provider
      value={{
        selectedFile,
        setSelectedFile,
        logFilePath,
        setLogFilePath,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
