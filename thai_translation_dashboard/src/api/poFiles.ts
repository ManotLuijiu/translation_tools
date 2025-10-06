import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

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

export interface POEntry {
  id: string;
  msgid: string;
  msgstr: string;
  is_translated: boolean;
  context?: string | null;
  comments?: string[] | string;
  orig_index?: number;
}

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

export type POFileContentsPaginated = {
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
  total_pages: number;
  total_entries: number;
};

/**
 * Get list of all PO files from database
 * @param language - Optional language code to filter (e.g., 'th', 'vi', 'lo', 'km', 'my'). Returns all ASEAN languages if not specified.
 */
export function useGetCachedPOFiles(language?: string) {
  return useFrappeGetCall<{ message: POFile[] }>(
    'translation_tools.api.po_files.get_po_files',
    language ? { language } : {},
  );
}

/**
 * Scan filesystem for PO files and update database
 */
export function useScanPOFiles() {
  const scanPostCall = useFrappePostCall(
    'translation_tools.api.po_files.scan_po_files',
  );

  // console.log('scanPostCall', scanPostCall);

  // Wrap the call function to accept no parameters
  const scanFiles = async () => {
    return scanPostCall.call({});
  };

  // console.log('scanFiles', scanFiles);

  return {
    ...scanPostCall,
    call: scanFiles,
  };
}

/**
 * Get entries from a specific PO file
 */
export function useGetPOFileEntries(filePath: string | null) {
  //   const enabled = !!filePath
  const shouldFetch = !!filePath;
  // if (!filePath) {
  //   throw new Error('filePath cannot be null or undefined')
  // }

  // console.log('filePath', filePath);

  return useFrappeGetCall<{ message: POFileContents }>(
    'translation_tools.api.po_files.get_po_file_entries',
    // { file_path: filePath },
    shouldFetch ? { file_path: filePath } : undefined,
  );
}

/**
 * Get entries from a specific PO file that supports pagination
 */
export function useGetPOFileEntriesPaginated(
  filePath: string | null,
  page = 1,
  pageSize = 20,
  filterType: 'all' | 'translated' | 'untranslated' = 'all',
  searchTerm = '',
) {
  //   const enabled = !!filePath
  const enabled = !!filePath;
  // if (!filePath) {
  //   throw new Error('filePath cannot be null or undefined')
  // }

  // console.log('filePath', filePath);

  const { data, error, isLoading, mutate } = useFrappeGetCall<{
    message: POFileContentsPaginated;
  }>(
    'translation_tools.api.po_files.get_po_file_entries_paginated',
    {
      file_path: filePath,
      page: page,
      page_size: pageSize,
      filter_type: filterType,
      search_term: searchTerm,
    },
    // shouldFetch ? { file_path: filePath } : undefined

    // Only execute the API call if we have a file path
    { enabled },
  );

  return {
    data,
    error,
    isLoading,
    mutate,
    // Add additional helper properties for convenience
    entries: data?.message?.entries || [],
    stats: data?.message?.stats,
    metadata: data?.message?.metadata || {},
    totalPages: data?.message?.total_pages || 0,
    totalEntries: data?.message?.total_entries || 0,
  };
}

/**
 * Get contents of a PO file with pagination
 */
export function useGetPOFileContents(
  filePath: string | null,
  limit = 100,
  offset = 0,
) {
  return useFrappeGetCall(
    'translation_tools.api.po_files.get_po_file_contents',
    {
      file_path: filePath,
      limit,
      offset,
    },
    // Only execute when a file path is provided
    filePath ? undefined : { enabled: false },
  );
}

/**
 * Save a translation to a PO file
 */
export function useSaveTranslation() {
  return useFrappePostCall<{
    success: boolean;
    message: string;
    error: string;
    github_pushed: boolean;
  }>('translation_tools.api.po_files.save_translation');
}

/**
 * Save a github token
 */
export function useSaveGithubToken() {
  return useFrappePostCall<{
    success: boolean;
    message: string;
    error: string;
  }>('translation_tools.api.po_files.save_github_token');
}

/**
 * Save multiple translations to a PO file
 */
export function useSaveTranslations() {
  return useFrappePostCall<{
    success?: boolean;
    message?: string;
    error?: string;
  }>('translation_tools.api.po_files.save_translations');
}

/**
 * Delete multiple PO files
 */
export function useDeletePOFiles() {
  return useFrappePostCall<{
    success: boolean;
    deleted_count: number;
    total_requested: number;
    message?: string;
    failed_files?: Array<{file: string; error: string}>;
    partial_success?: boolean;
    error?: string;
  }>('translation_tools.api.po_files.delete_po_files');
}

/**
 * Force refresh PO file statistics from filesystem
 */
export function useForceRefreshPOStats() {
  return useFrappePostCall<{
    success: boolean;
    message?: string;
    updated_count: number;
    failed_count: number;
    error?: string;
  }>('translation_tools.api.po_files.force_refresh_po_stats');
}

/**
 * Debug PO file statistics comparison
 */
export function useDebugPOFileStats() {
  return useFrappeGetCall<{
    success: boolean;
    files: Array<{
      file_path: string;
      app_name: string;
      filename: string;
      cached_stats: {
        total: number;
        translated: number;
        percentage: number;
      };
      fresh_stats: {
        total_entries: number;
        translated_entries: number;
        translation_status: number;
      };
      needs_update: boolean;
      last_scanned: string;
    }>;
    total_files: number;
    error?: string;
  }>('translation_tools.api.po_files.debug_po_file_stats');
}
