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
export function getCachedPOFiles(): Promise<POFile[]> {
  return frappe
    .call<POFile[]>({
      method: 'translation_tools.api.po_files.get_cached_po_files',
      args: {},
    })
    .then((r) => r.message);
}

/**
 * Scan filesystem for PO files and update database
 */
export function useScanPOFiles(): Promise<any> {
  return frappe
    .call({
      method: 'translation_tools.api.po_files.scan_po_files',
      args: {},
    })
    .then((r) => r.message);
}

/**
 * Get entries from a specific PO file
 */
export function useGetPOFileEntries(
  filePath: string | null
): Promise<POFileContents> {
  if (!filePath) {
    return Promise.reject(new Error('File path is required'));
  }

  return frappe
    .call<POFileContents>({
      method: 'translation_tools.api.po_files.get_po_file_entries',
      args: {
        file_path: filePath,
      },
    })
    .then((r) => r.message);
}

/**
 * Get contents of a PO file with pagination
 */
export function useGetPOFileContents(
  filePath: string | null,
  limit = 100,
  offset = 0
): Promise<any> {
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
}

/**
 * Save a translation to a PO file
 */
export function useSaveTranslation(args: any): Promise<{ success: boolean }> {
  return frappe
    .call<{ success: boolean }>({
      method: 'translation_tools.api.po_files.save_translation',
      args,
    })
    .then((r) => r.message);
}

/**
 * Save multiple translations to a PO file
 */
export function useSaveTranslations(args: any): Promise<{
  success?: boolean;
  message?: string;
  error?: string;
}> {
  return frappe
    .call({
      method: 'translation_tools.api.po_files.save_translations',
      args,
    })
    .then((r) => r.message);
}
