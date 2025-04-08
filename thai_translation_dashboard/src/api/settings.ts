import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";

export type TranslationSettings = {
  default_model_provider: "openai" | "claude";
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
export function useGetTranslationSettings() {
  return useFrappeGetCall<{ message: TranslationSettings }>(
    "translation_tools.api.get_translation_settings",
    {}
  );
}

/**
 * Save translation settings
 */
export function useSaveTranslationSettings() {
  return useFrappePostCall<{ success: boolean }>(
    "translation_tools.api.save_translation_settings"
  );
}

/**
 * Save API key
 */
export function useSaveApiKey() {
  return useFrappePostCall<{ message: string; status: string }>(
    "translation_tools.api.save_api_key"
  );
}
