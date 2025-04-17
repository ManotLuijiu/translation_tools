import { useState } from 'react';

export function useTranslateSingleEntry() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  const translateSingleEntry = async (data) => {
    setIsTranslating(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.translation.translate_single_entry',
        args: data,
      });
      return response.message; // Adjust based on API response
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translateSingleEntry, isTranslating, error };
}

export function useTranslatePOFile() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  const translatePOFile = async (filePath) => {
    setIsTranslating(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.translation.translate_po_file',
        args: { file_path: filePath },
      });
      return response.message; // Adjust based on API response
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translatePOFile, isTranslating, error };
}

export function useTranslateBatch() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  const translateBatch = async (batchData) => {
    setIsTranslating(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.translation.translate_batch',
        args: { batch_data: batchData },
      });
      return response.message; // Adjust based on API response
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  return { translateBatch, isTranslating, error };
}

export function useGetTranslationLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await frappe.call({
          method: 'translation_tools.api.translation.get_translation_logs',
          args: {},
        });
        setLogs(response.message); // Adjust based on API response
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, []);

  return { logs, isLoading, error };
}

export function useStartTranslation() {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState(null);

  const startTranslation = async (data) => {
    setIsStarting(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.translation.start_translation',
        args: data,
      });
      return response.message; // Adjust based on API response
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  return { startTranslation, isStarting, error };
}
