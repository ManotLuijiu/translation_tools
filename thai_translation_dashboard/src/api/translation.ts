import { useFrappePostCall } from 'frappe-react-sdk';

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
export function useTranslateSingleEntry() {
  return useFrappePostCall<TranslationResult>(
    'translation_tools.api.translate_single_entry'
  );
}

/**
 * Translate an entire PO file using AI
 */
export function useTranslatePOFile() {
  return useFrappePostCall<TranslationResult>(
    'translation_tools.api.translate_po_file'
  );
}

/**
 * Save a translation to a PO file
 */
export function useSaveTranslation() {
  return useFrappePostCall<{ success: boolean }>(
    'translation_tools.api.save_translation'
  );
}

/**
 * Translate multiple entries in a batch
 */
export function useTranslateBatch() {
  return useFrappePostCall<BatchTranslationResult>(
    'translation_tools.api.translate_batch'
  );
}

/**
 * Get translation logs
 */
export function useGetTranslationLogs() {
  return useFrappePostCall<{ 
    success: boolean;
    logs?: string;
    analysis?: LogAnalysis;
    error?: string;
  }>('translation_tools.api.get_translation_logs');
}

/**
 * Save multiple translations to a PO file
 */
export function useSaveTranslations() {
  return useFrappePostCall<{
    success?: boolean;
    message?: string;
    error?: string;
  }>('translation_tools.api.save_translations');
}

/**
 * Start translation process in background
 */
export function useStartTranslation() {
  return useFrappePostCall<{
    message: string;
    status: string;
  }>('translation_tools.api.start_translation');
}