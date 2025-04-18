export type TranslationResult = {
  success: boolean;
  translation?: string;
  log_file?: string;
  translated_count?: number;
  error?: string;
};

export type BatchTranslationResult = {
  success: boolean;
  translations?: Record<string, string>;
  error?: string;
};

export type LogAnalysis = {
  api_calls: number;
  api_responses: number;
  errors: string[];
};

/**
 * Translate a single entry using AI
 */
export function useTranslateSingleEntry(args: any): Promise<TranslationResult> {
  return frappe
    .call<TranslationResult>({
      method: 'translation_tools.api.translation.translate_single_entry',
      args,
    })
    .then((r) => r.message);
}

/**
 * Translate an entire PO file using AI
 */
export function useTranslatePOFile(args: any): Promise<TranslationResult> {
  return frappe
    .call<TranslationResult>({
      method: 'translation_tools.api.translation.translate_po_file',
      args,
    })
    .then((r) => r.message);
}

/**
 * Translate multiple entries in a batch
 */
export function useTranslateBatch(args: any): Promise<BatchTranslationResult> {
  return frappe
    .call<BatchTranslationResult>({
      method: 'translation_tools.api.translation.translate_batch',
      args,
    })
    .then((r) => r.message);
}

/**
 * Get translation logs
 */
export function useGetTranslationLogs(args: any): Promise<{
  success: boolean;
  logs?: string;
  analysis?: LogAnalysis;
  error?: string;
}> {
  return frappe
    .call({
      method: 'translation_tools.api.translation.get_translation_logs',
      args,
    })
    .then((r) => r.message);
}

/**
 * Start translation process in background
 */
export function useStartTranslation(args: any): Promise<{
  message: string;
  status: string;
}> {
  return frappe
    .call({
      method: 'translation_tools.api.translation.start_translation',
      args,
    })
    .then((r) => r.message);
}
