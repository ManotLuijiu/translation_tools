import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

export type TranslationPDFSettings = {
  default_model_provider: 'openai' | 'claude';
  default_model: string;
  openai_api_key: string;
  anthropic_api_key: string;
  batch_size: number;
  temperature: number;
  auto_save: boolean;
  preserve_formatting: boolean;
};

export type TestGithubConnection = {
  success: boolean;
  messages: string;
  error: string;
};

export type TranslationToolsSettings = {
  default_model_provider: 'openai' | 'claude';
  default_model: string;
  openai_api_key: string;
  anthropic_api_key: string;
  batch_size: number;
  temperature: number;
  auto_save: boolean;
  preserve_formatting: boolean;
  github_enable: boolean;
  github_repo: string;
  github_token: string;
};

/**
 * Get translation settings
 */
export function useGetTranslationSettings() {
  console.log('Fetching translation settings...');
  return useFrappeGetCall<{ message: TranslationToolsSettings }>(
    'translation_tools.api.settings.get_translation_settings',
    {}
  );
}

/**
 * Test Github Connection
 */
export function useTestGithubConnection() {
  console.log('Testing Github Connection...');
  return useFrappePostCall<{ message: TestGithubConnection }>(
    'translation_tools.api.settings.test_github_connection'
    // {}
  );
}

/**
 * Save translation settings
 */
export function useSaveTranslationSettings() {
  return useFrappePostCall<{ success: boolean }>(
    'translation_tools.api.settings.save_translation_settings'
  );
}

/**
 * Save API key
 */
export function useSaveApiKey() {
  return useFrappePostCall<{ message: string; status: string }>(
    'translation_tools.api.settings.save_api_key'
  );
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
  return useFrappePostCall<{
    success: boolean;
    message?: string;
    error?: string;
  }>('translation_tools.api.settings.save_translation_settings_file');
}
