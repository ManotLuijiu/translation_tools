import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

/**
 * Get list of all PO files from database
 */
export function useGetCachedPOFiles() {
  return useFrappeGetCall(
    'translation_tools.api.po_files.get_cached_po_files',
    {}
  );
}

/**
 * Scan filesystem for PO files and update database
 */
export function useScanPOFiles() {
  const scanPostCall = useFrappePostCall(
    'translation_tools.api.po_files.scan_po_files'
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
export function useGetPOFileEntries(filePath) {
  return (
    useFrappeGetCall <
    { message: POFileContents } >
    ('translation_tools.api.po_files.get_po_file_entries',
    { file_path: filePath },
    // Only execute when a file path is provided
    filePath ? undefined : { enabled: false })
  );
}

/**
 * Get contents of a PO file with pagination
 */
export function useGetPOFileContents(filePath, limit = 100, offset = 0) {
  return useFrappeGetCall(
    'translation_tools.api.po_files.get_po_file_contents',
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
  return (
    useFrappePostCall <
    { success: boolean } >
    'translation_tools.api.po_files.save_translation'
  );
}

/**
 * Save multiple translations to a PO file
 */
export function useSaveTranslations() {
  return useFrappePostCall('translation_tools.api.po_files.save_translations');
}
