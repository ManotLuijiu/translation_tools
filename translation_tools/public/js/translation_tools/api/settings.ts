export type TranslationSettings = {
  default_model_provider: 'openai' | 'claude';
  default_model: string;
  openai_api_key: string;
  anthropic_api_key: string;
  batch_size: number;
  temperature: number;
  auto_save: boolean;
  preserve_formatting: boolean;
};

/**
 * Get translation settings
 */
export function useGetTranslationSettings(): Promise<TranslationSettings> {
  return frappe
    .call<TranslationSettings>({
      method: 'translation_tools.api.settings.get_translation_settings',
      args: {},
    })
    .then((r) => r.message);
}

/**
 * Save translation settings
 */
export function useSaveTranslationSettings(
  settings: Partial<TranslationSettings>
): Promise<{ success: boolean }> {
  return frappe
    .call<{ success: boolean }>({
      method: 'translation_tools.api.settings.save_translation_settings',
      args: settings,
    })
    .then((r) => r.message);
}

/**
 * Save API key
 */
export function useSaveApiKey(args: {
  provider: 'openai' | 'claude';
  api_key: string;
}) {
  return frappe
    .call<{ message: string; status: string }>({
      method: 'translation_tools.api.settings.save_api_key',
      args,
    })
    .then((r) => r.message);
}

/**
 * Get translation settings from file
 */
export function useGetTranslationSettingsFile(): Promise<any> {
  return frappe
    .call({
      method: 'translation_tools.api.settings.get_translation_settings_file',
      args: {},
    })
    .then((r) => r.message);
}

/**
 * Save translation settings to file
 */
export function useSaveTranslationSettingsFile(
  settings: TranslationSettings
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return frappe
    .call<{
      success: boolean;
      message?: string;
      error?: string;
    }>({
      method: 'translation_tools.api.settings.save_translation_settings_file',
      args: settings,
    })
    .then((r) => r.message);
}
