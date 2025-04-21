import {
  useQuery,
  useMutation,
  UseQueryResult,
  UseMutationResult,
  QueryClient,
} from '@tanstack/react-query';
const queryClient = new QueryClient();

export type POFile = {
  file_path: string;
  app: string;
  filename: string;
  language: string;
  total_entries: number;
  translated_entries: number;
  translated_percentage: number;
  last_modified: string;
  last_scanned: string;
};

export type POFileEntry = {
  id: string;
  msgid: string;
  msgstr: string;
  is_translated: boolean;
  comments: string[];
  context: string | null;
};

export type POFileContents = {
  path: string;
  metadata: {
    language: string;
    project: string;
    last_updated: string;
  };
  entries: POFileEntry[];
  stats: {
    total: number;
    translated: number;
    untranslated: number;
    percentage: number;
  };
};

/**
 * Get list of all PO files from database
 */
export function useGetCachedPOFiles(): UseQueryResult<POFile[], Error> {
  return useQuery({
    queryKey: ['po-files'],
    queryFn: () =>
      frappe
        .call<{ message: POFile[] }>({
          method: 'translation_tools.api.po_files.get_cached_po_files',
          args: {},
        })
        .then((r) => r.message.message),
  });
}

/**
 * Scan filesystem for PO files and update database
 */
// export function useScanPOFiles(): Promise<any> {
//   return frappe
//     .call({
//       method: 'translation_tools.api.po_files.scan_po_files',
//       args: {},
//     })
//     .then((r) => r.message);
// }

export function useScanPOFiles(): UseMutationResult<
  { success: boolean },
  Error,
  void
> {
  return useMutation({
    mutationFn: () => {
      console.log('Starting API call to scan PO files');
      return frappe
        .call({
          method: 'translation_tools.api.po_files.scan_po_files',
          args: {},
        })
        .then((r) => {
          console.log('Raw API response:', r);
          console.log('Response message:', r.message);

          if (r.message && r.message.message) {
            console.log('Returning message.message:', r.message.message);
            return r.message.message;
          } else if (r.message) {
            console.log('Returning message directly:', r.message);
            return r.message;
          } else {
            console.error('Response has unexpected structure:', r);
            return { success: false };
          }
        })
        .catch((error) => {
          console.error('Error during API call:', error);
          throw error;
        });
    },
    mutationKey: ['scan-po-files'],
    onSuccess: (data) => {
      console.log('Mutation success data:', data);
      // Invalidate the cached PO files to refresh the list
      queryClient.invalidateQueries({ queryKey: ['po-files'] });
    },
    onError: (error) => {
      console.error('Mutation error:', error);
    },
  });
}

/**
 * Get entries from a specific PO file
 */
// export function useGetPOFileEntries(
//   filePath: string | null
// ): Promise<POFileContents> {
//   if (!filePath) {
//     return Promise.reject(new Error('File path is required'));
//   }

//   return frappe
//     .call<POFileContents>({
//       method: 'translation_tools.api.po_files.get_po_file_entries',
//       args: {
//         file_path: filePath,
//       },
//     })
//     .then((r) => r.message);
// }

export function useGetPOFileEntries(
  filePath: string | null
): UseQueryResult<POFileContents, Error> {
  return useQuery({
    queryKey: ['po-file-entries', filePath],
    queryFn: () => {
      if (!filePath) {
        return Promise.reject(new Error('File path is required'));
      }
      return frappe
        .call<{ message: POFileContents }>({
          method: 'translation_tools.api.po_files.get_po_file_entries',
          args: {
            file_path: filePath,
          },
        })
        .then((r) => r.message);
    },
    enabled: !!filePath,
  });
}

/**
 * Get contents of a PO file with pagination
 */
// export function useGetPOFileContents(
//   filePath: string | null,
//   limit = 100,
//   offset = 0
// ): Promise<any> {
//   if (!filePath) {
//     return Promise.reject(new Error('File path is required'));
//   }
//   return frappe
//     .call({
//       method: 'translation_tools.api.po_files.get_po_file_contents',
//       args: {
//         file_path: filePath,
//         limit,
//         offset,
//       },
//     })
//     .then((r) => r.message);
// }

export function useGetPOFileContents(
  filePath: string | null,
  limit = 100,
  offset = 0
): UseQueryResult<POFileContents, Error> {
  return useQuery({
    queryKey: ['po-file-contents', filePath, limit, offset],
    queryFn: () => {
      if (!filePath) {
        return Promise.reject(new Error('File path is required'));
      }
      return frappe
        .call<{ message: POFileContents }>({
          method: 'translation_tools.api.po_files.get_po_file_contents',
          args: {
            file_path: filePath,
            limit,
            offset,
          },
        })
        .then((r) => r.message);
    },
    enabled: !!filePath,
  });
}

/**
 * Save a translation to a PO file
 */
// export function useSaveTranslation(args: any): Promise<{ success: boolean }> {
//   return frappe
//     .call<{ success: boolean }>({
//       method: 'translation_tools.api.po_files.save_translation',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useSaveTranslation(args: any): UseMutationResult<
  { success: boolean },
  Error,
  {
    file_path: string;
    entry_id: string;
    translation: string;
  }
> {
  return useMutation({
    mutationFn: () =>
      frappe
        .call<{ message: { success: boolean } }>({
          method: 'translation_tools.api.po_files.save_translation',
          args,
        })
        .then((r) =>
          r.message.message.success
            ? { success: r.message.message.success }
            : { success: false }
        ),
    mutationKey: ['save-translation'],
    onSuccess: () => {
      // Invalidate the cached PO files to refresh the list
      queryClient.invalidateQueries({ queryKey: ['po-files'] });
    },
  });
}

/**
 * Save multiple translations to a PO file
 */
// export function useSaveTranslations(args: any): Promise<{
//   success?: boolean;
//   message?: string;
//   error?: string;
// }> {
//   return frappe
//     .call({
//       method: 'translation_tools.api.po_files.save_translations',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useSaveTranslations(): UseMutationResult<
  { success?: boolean; message?: string; error?: string },
  Error,
  {
    file_path: string;
    entries: Array<{ entry_id: string; translation: string }>;
  }
> {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call<{
          message: { success?: boolean; message?: string; error?: string };
        }>({
          method: 'translation_tools.api.po_files.save_translations',
          args,
        })
        .then((r) => r.message.message),
    mutationKey: ['save-translations'],
    onSuccess: () => {
      // Invalidate the cached PO files to refresh the list
      queryClient.invalidateQueries({ queryKey: ['po-files'] });
    },
  });
}
