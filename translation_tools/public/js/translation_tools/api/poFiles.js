import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';
const queryClient = new QueryClient();

// export type POFile = {
//   file_path: string;
//   app: string;
//   filename: string;
//   language: string;
//   total_entries: number;
//   translated_entries: number;
//   translated_percentage: number;
//   last_modified: string;
//   last_scanned: string;
// };

// export type POFileEntry = {
//   id: string;
//   msgid: string;
//   msgstr: string;
//   is_translated: boolean;
//   comments: string[];
//   context: string | null;
// };

// export type POFileContents = {
//   path: string;
//   metadata: {
//     language: string;
//     project: string;
//     last_updated: string;
//   };
//   entries: POFileEntry[];
//   stats: {
//     total: number;
//     translated: number;
//     untranslated: number;
//     percentage: number;
//   };
// };

/**
 * Get list of all PO files from database
 */
export function useGetCachedPOFiles() {
  return useQuery({
    queryKey: ['po-files'],
    queryFn: () =>
      frappe
        .call({
          // method: 'translation_tools.api.po_files.get_cached_po_files',
          method: 'translation_tools.api.po_files.get_po_files',
          args: {},
        })
        .then((r) => r.message),
  });
}

export function useScanPOFiles() {
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

export function useGetPOFileEntries(filePath) {
  return useQuery({
    queryKey: ['po-file-entries', filePath],
    queryFn: () => {
      if (!filePath) {
        return Promise.reject(new Error('File path is required'));
      }
      return frappe
        .call({
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

export function useGetPOFileContents(filePath, limit = 100, offset = 0) {
  return useQuery({
    queryKey: ['po-file-contents', filePath, limit, offset],
    queryFn: () => {
      if (!filePath) {
        return Promise.reject(new Error('File path is required'));
      }
      return frappe
        .call({
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

export function useSaveTranslation(args) {
  return useMutation({
    mutationFn: () =>
      frappe
        .call({
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

export function useSaveTranslations() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
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
