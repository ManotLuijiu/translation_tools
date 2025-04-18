// Re-export types from API modules
export * from "../api/poFiles";
export * from "../api/settings";
export * from "../api/translation";
export * from "../api/glossary";

// App-specific types
export type TabType = "files" | "editor" | "glossary" | "settings";

export type ModelProvider = "openai" | "claude";

export interface TranslationRequest {
  filePath: string;
  entryId: string;
  modelProvider?: ModelProvider;
  model?: string;
}

export interface TranslationStatistics {
  total: number;
  translated: number;
  untranslated: number;
  percentage: number;
}

export interface StatusMessage {
  type: "success" | "error" | "info" | "warning";
  message: string;
  key?: string;
}
