import { useState, useEffect } from 'react';

export function useGetTranslationSettings() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await frappe.call({
          method: 'translation_tools.api.settings.get_translation_settings',
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

export function useSaveTranslationSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveTranslationSettings = async (data) => {
    setIsSaving(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.settings.save_translation_settings',
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

  return { saveTranslationSettings, isSaving, error };
}

export function useSaveApiKey() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveApiKey = async (apiKey) => {
    setIsSaving(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.settings.save_api_key',
        args: { api_key: apiKey },
      });
      return response.message.success;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { saveApiKey, isSaving, error };
}

export function useGetTranslationSettingsFile() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await frappe.call({
          method:
            'translation_tools.api.settings.get_translation_settings_file',
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

import { useState } from 'react';

export function useSaveTranslationSettingsFile() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveTranslationSettingsFile = async (data) => {
    setIsSaving(true);
    try {
      const response = await frappe.call({
        method: 'translation_tools.api.settings.save_translation_settings_file',
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

  return { saveTranslationSettingsFile, isSaving, error };
}
