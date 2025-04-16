import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

/**
 * Get translation settings
 */
export function useGetTranslationSettings() {
  return useFrappeGetCall(
    'translation_tools.api.settings.get_translation_settings',
    {}
  );
}

/**
 * Save translation settings
 */
export function useSaveTranslationSettings() {
  return useFrappePostCall(
    'translation_tools.api.settings.save_translation_settings'
  );
}

/**
 * Save API key
 */
export function useSaveApiKey() {
  return useFrappePostCall('translation_tools.api.settings.save_api_key');
}

/**
 * Get translation settings from file
 */
export function useGetTranslationSettingsFile() {
  return useFrappeGetCall(
    'translation_tools.api.settings.get_translation_settings_file',
    {}
  );
}

/**
 * Save translation settings to file
 */
export function useSaveTranslationSettingsFile() {
  return useFrappePostCall(
    'translation_tools.api.settings.save_translation_settings_file'
  );
}
