import { useState, useEffect } from 'react';

export function useGetCachedPOFiles() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await frappe.call({
          method: 'translation_tools.api.po_files.get_cached_po_files',
          args: {},
        });
        setData(response.message);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, isLoading, error };
}

export function useScanPOFiles() {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  const scanFiles = async () => {
    setIsScanning(true);
    try {
      await frappe.call({
        method: 'translation_tools.api.po_files.scan_po_files',
        args: {},
      });
    } catch (err) {
      setError(err);
    } finally {
      setIsScanning(false);
    }
  };

  return { scanFiles, isScanning, error };
}

export function useGetPOFileEntries(filePath) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filePath) return; // Don't fetch data if filePath is not provided

    async function fetchData() {
      try {
        const response = await frappe.call({
          method: 'translation_tools.api.po_files.get_po_file_entries',
          args: { file_path: filePath },
        });
        setData(response.message);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [filePath]);

  return { data, isLoading, error };
}

export function useGetPOFileContents(filePath, limit = 100, offset = 0) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!filePath) return; // Don't fetch data if filePath is not provided

    async function fetchData() {
      try {
        const response = await frappe.call({
          method: 'translation_tools.api.po_files.get_po_file_contents',
          args: { file_path: filePath, limit, offset },
        });
        setData(response.message);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [filePath, limit, offset]);

  return { data, isLoading, error };
}

export function useSaveTranslation() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveTranslation = async (data) => {
    setIsSaving(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.po_files.save_translation',
        args: data,
      });
      return response.message.success;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveTranslation, isSaving, error };
}

export function useSaveTranslations() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveTranslations = async (data) => {
    setIsSaving(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.po_files.save_translations',
        args: data,
      });
      return response.message.success;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveTranslations, isSaving, error };
}
