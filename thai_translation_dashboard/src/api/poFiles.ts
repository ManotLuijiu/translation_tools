import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";

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
export function useGetCachedPOFiles() {
  return useFrappeGetCall<{ message: POFile[] }>(
    "translation_tools.api.po_files.get_cached_po_files",
    {}
  );
}

/**
 * Scan filesystem for PO files and update database
 */
export function useScanPOFiles() {
  const scanPostCall = useFrappePostCall(
    "translation_tools.api.po_files.scan_po_files"
  );

  // Wrap the call function to accept no parameters
  const scanFiles = async () => {
    return scanPostCall.call({});
  };

  return {
    ...scanPostCall,
    call: scanFiles,
  };
}

/**
 * Get entries from a specific PO file
 */
export function useGetPOFileEntries(filePath: string | null) {
  return useFrappeGetCall<{ message: POFileContents }>(
    "translation_tools.api.po_files.get_po_file_entries",
    { file_path: filePath },
    // Only execute when a file path is provided
    filePath ? undefined : { enabled: false }
  );
}

/**
 * Get contents of a PO file with pagination
 */
export function useGetPOFileContents(
  filePath: string | null,
  limit = 100,
  offset = 0
) {
  return useFrappeGetCall(
    "translation_tools.api.po_files.get_po_file_contents",
    {
      file_path: filePath,
      limit,
      offset,
    },
    // Only execute when a file path is provided
    filePath ? undefined : { enabled: false }
  );
}

/**
 * Save a translation to a PO file
 */
export function useSaveTranslation() {
  return useFrappePostCall<{ success: boolean }>(
    "translation_tools.api.po_files.save_translation"
  );
}

/**
 * Save multiple translations to a PO file
 */
export function useSaveTranslations() {
  return useFrappePostCall<{
    success?: boolean;
    message?: string;
    error?: string;
  }>("translation_tools.api.po_files.save_translations");
}
