import { useFrappePostCall } from 'frappe-react-sdk';

/**
 * Translate a single entry using AI
 */
export function useTranslateSingleEntry() {
  return useFrappePostCall(
    'translation_tools.api.translation.translate_single_entry'
  );
}

/**
 * Translate an entire PO file using AI
 */
export function useTranslatePOFile() {
  return useFrappePostCall(
    'translation_tools.api.translation.translate_po_file'
  );
}

/**
 * Translate multiple entries in a batch
 */
export function useTranslateBatch() {
  return useFrappePostCall('translation_tools.api.translation.translate_batch');
}

/**
 * Get translation logs
 */
export function useGetTranslationLogs() {
  return useFrappePostCall(
    'translation_tools.api.translation.get_translation_logs'
  );
}

/**
 * Start translation process in background
 */
export function useStartTranslation() {
  return useFrappePostCall(
    'translation_tools.api.translation.start_translation'
  );
}
