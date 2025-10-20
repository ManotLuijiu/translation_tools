import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveContextType {
  autoSaveStatus: AutoSaveStatus;
  setAutoSaveStatus: (status: AutoSaveStatus) => void;
}

const AutoSaveContext = createContext<AutoSaveContextType | undefined>(undefined);

interface AutoSaveProviderProps {
  children: ReactNode;
}

export function AutoSaveProvider({ children }: AutoSaveProviderProps) {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

  return (
    <AutoSaveContext.Provider value={{ autoSaveStatus, setAutoSaveStatus }}>
      {children}
    </AutoSaveContext.Provider>
  );
}

export function useAutoSave() {
  const context = useContext(AutoSaveContext);
  if (context === undefined) {
    throw new Error('useAutoSave must be used within an AutoSaveProvider');
  }
  return context;
}
