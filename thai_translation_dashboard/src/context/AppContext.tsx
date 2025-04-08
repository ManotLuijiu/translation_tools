import { createContext } from "react";

export interface AppContextType {
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  logFilePath: string | null;
  setLogFilePath: (path: string | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
