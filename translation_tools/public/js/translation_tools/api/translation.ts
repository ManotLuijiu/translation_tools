import {
  useQuery,
  useMutation,
  UseQueryResult,
  UseMutationResult,
  QueryClient,
} from '@tanstack/react-query';
const queryClient = new QueryClient();

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
// export function useTranslateSingleEntry(args: any): Promise<TranslationResult> {
//   return frappe
//     .call<TranslationResult>({
//       method: 'translation_tools.api.translation.translate_single_entry',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useTranslateSingleEntry(): UseMutationResult<
  TranslationResult,
  Error,
  {
    file_path: string;
    entry_id: string;
    model_provider?: string;
    model?: string;
  }
> {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call<TranslationResult>({
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

/**
 * Translate an entire PO file using AI
 */
// export function useTranslatePOFile(args: any): Promise<TranslationResult> {
//   return frappe
//     .call<TranslationResult>({
//       method: 'translation_tools.api.translation.translate_po_file',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useTranslatePOFile(): UseMutationResult<
  TranslationResult,
  Error,
  {
    file_path: string;
    model_provider?: string;
    model?: string;
  }
> {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call<TranslationResult>({
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

/**
 * Translate multiple entries in a batch
 */
// export function useTranslateBatch(args: any): Promise<BatchTranslationResult> {
//   return frappe
//     .call<BatchTranslationResult>({
//       method: 'translation_tools.api.translation.translate_batch',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useTranslateBatch(): UseMutationResult<
  BatchTranslationResult,
  Error,
  {
    file_path: string;
    entries: Array<{
      entry_id: string;
      model_provider?: string;
      model?: string;
    }>;
  }
> {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call<BatchTranslationResult>({
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

/**
 * Get translation logs
 */
// export function useGetTranslationLogs(args: any): Promise<{
//   success: boolean;
//   logs?: string;
//   analysis?: LogAnalysis;
//   error?: string;
// }> {
//   return frappe
//     .call({
//       method: 'translation_tools.api.translation.get_translation_logs',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useGetTranslationLogs(args: any): UseQueryResult<
  {
    success: boolean;
    logs?: string;
    analysis?: LogAnalysis;
    error?: string;
  },
  Error
> {
  return useQuery({
    queryKey: ['translation-logs', args],
    queryFn: () =>
      frappe
        .call<{
          success: boolean;
          logs?: string;
          analysis?: LogAnalysis;
          error?: string;
        }>({
          method: 'translation_tools.api.translation.get_translation_logs',
          args,
        })
        .then((r) => r.message),
  });
}

/**
 * Start translation process in background
 */
// export function useStartTranslation(args: any): Promise<{
//   message: string;
//   status: string;
// }> {
//   return frappe
//     .call({
//       method: 'translation_tools.api.translation.start_translation',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useStartTranslation(): UseMutationResult<
  { message: string; status: string },
  Error,
  {
    file_path: string;
    model_provider?: string;
    model?: string;
  }
> {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call<{ message: string; status: string }>({
          method: 'translation_tools.api.translation.start_translation',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['start-translation'],
  });
}
