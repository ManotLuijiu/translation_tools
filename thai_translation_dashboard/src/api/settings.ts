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
  message?: string;
  messages?: string;
  error?: string;
  sync_triggered?: boolean;
  sync_apps?: number;
};

export type TestAiConnection = {
  success: boolean;
  provider: string;
  model?: string;
  message?: string;
  error?: string;
};

export type TranslationToolsSettings = {
  default_model_provider: 'openai' | 'anthropic';
  default_model: string;
  openai_model?: string;
  anthropic_model?: string;
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
export function useGetAiModels() {
  const {
    data: modelData,
    error: modelError,
    isLoading: modelLoading,
  } = useFrappeGetCall('translation_tools.api.ai_models.get_cached_models', {});
  return {
    modelData,
    modelError,
    modelLoading,
  };
}

/**
 * Get translation settings
 */
export function useGetTranslationSettings() {
  // console.log('Fetching translation settings...');
  return useFrappeGetCall<{ message: TranslationToolsSettings }>(
    'translation_tools.api.settings.get_translation_settings',
    {}
  );
}

/**
 * Test Github Connection
 */
export function useTestGithubConnection() {
  return useFrappePostCall<{ message: TestGithubConnection }>(
    'translation_tools.api.settings.test_github_connection'
  );
}

/**
 * Test Github Sync — checks connection + lists all site apps with sync readiness
 */
export function useTestGithubSync() {
  return useFrappePostCall<{ message: {
    success: boolean;
    error?: string;
    message?: string;
    repo?: string;
    branch?: string;
    github_apps_count?: number;
    installed_apps_count?: number;
    apps?: Array<{
      app: string;
      status: 'ready' | 'no_po' | 'no_github';
      message?: string;
      translated?: number;
      total?: number;
      percentage?: number;
      github_file?: string;
    }>;
  } }>(
    'translation_tools.api.settings.test_github_sync'
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

/**
 * Test AI API connection (OpenAI or Anthropic)
 */
export function useTestAiConnection() {
  return useFrappePostCall<{ message: TestAiConnection }>(
    'translation_tools.api.ai_translation.test_ai_connection'
  );
}
