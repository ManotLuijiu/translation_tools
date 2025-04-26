import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
const queryClient = new QueryClient();

// export type TranslationResult = {
//   success: boolean;
//   translation?: string;
//   log_file?: string;
//   translated_count?: number;
//   error?: string;
// };

// export type BatchTranslationResult = {
//   success: boolean;
//   translations?: Record<string, string>;
//   error?: string;
// };

// export type LogAnalysis = {
//   api_calls: number;
//   api_responses: number;
//   errors: string[];
// };

export function useTranslateSingleEntry() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
          method: 'translation_tools.api.translation.translate_single_entry',
          args,
        })
        .then((r) =>
          r.message.success
            ? {
                success: r.message.success,
                translation: r.message.translation,
                log_file: r.message.log_file,
                translated_count: r.message.translated_count,
              }
            : { success: false }
        ),
    mutationKey: ['translate-single-entry'],
    onSuccess: () => {
      // Invalidate the cached PO files to refresh the list
      queryClient.invalidateQueries({ queryKey: ['po-files'] });
    },
  });
}

export function useTranslatePOFile() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
          method: 'translation_tools.api.translation.translate_po_file',
          args,
        })
        .then((r) =>
          r.message.success
            ? {
                success: r.message.success,
                translation: r.message.translation,
                log_file: r.message.log_file,
                translated_count: r.message.translated_count,
              }
            : { success: false }
        ),
    mutationKey: ['translate-po-file'],
    onSuccess: () => {
      // Invalidate the cached PO files to refresh the list
      queryClient.invalidateQueries({ queryKey: ['po-files'] });
    },
  });
}

export function useTranslateBatch() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
          method: 'translation_tools.api.translation.translate_batch',
          args,
        })
        .then((r) =>
          r.message.success
            ? {
                success: r.message.success,
                translations: r.message.translations,
              }
            : { success: false }
        ),
    mutationKey: ['translate-batch'],
    onSuccess: () => {
      // Invalidate the cached PO files to refresh the list
      queryClient.invalidateQueries({ queryKey: ['po-files'] });
    },
  });
}

export function useGetTranslationLogs(args) {
  return useQuery({
    queryKey: ['translation-logs', args],
    queryFn: () =>
      frappe
        .call({
          method: 'translation_tools.api.translation.get_translation_logs',
          args,
        })
        .then((r) => r.message),
  });
}

export function useStartTranslation() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
          method: 'translation_tools.api.translation.start_translation',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['start-translation'],
  });
}
