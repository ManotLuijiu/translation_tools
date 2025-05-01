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
    'translation_tools.api.translation.translate_entry'
  );
}

/**
 * Translate an entire PO file using AI
 */
export function useTranslatePOFile() {
  return useFrappePostCall<TranslationResult>(
    'translation_tools.api.translation.translate_po_file'
  );
}

/**
 * Translate multiple entries in a batch
 */
export function useTranslateBatch() {
  return useFrappePostCall<BatchTranslationResult>(
    // 'translation_tools.api.translation.translate_batch'
    'translation_tools.api.ai_translation.translate_batch'
  );
}

/**
 * Translate multiple entries in a batch
 */
export function useSaveBatchTranslations() {
  return useFrappePostCall<BatchTranslationResult>(
    'translation_tools.api.ai_translation.save_batch_translations'
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
  }>('translation_tools.api.translation.get_translation_logs');
}

/**
 * Start translation process in background
 */
export function useStartTranslation() {
  return useFrappePostCall<{
    message: string;
    status: string;
  }>('translation_tools.api.translation.start_translation');
}
