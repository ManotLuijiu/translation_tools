import {
  useQuery,
  useMutation,
  UseQueryResult,
  UseMutationResult,
  QueryClient,
} from '@tanstack/react-query';

const queryClient = new QueryClient();

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
export function useGetTranslationSettings(): UseQueryResult<
  TranslationSettings,
  Error
> {
  return useQuery({
    queryKey: ['translation_settings'],
    queryFn: () =>
      frappe
        .call<{ message: TranslationSettings }>({
          method: 'translation_tools.api.settings.get_translation_settings',
          args: {},
        })
        .then((r) => r.message),
  });
}

/**
 * Save translation settings
 */
// export function useSaveTranslationSettings(
//   settings: Partial<TranslationSettings>
// ): Promise<{ success: boolean }> {
//   return frappe
//     .call<{ success: boolean }>({
//       method: 'translation_tools.api.settings.save_translation_settings',
//       args: settings,
//     })
//     .then((r) => r.message);
// }

export function useSaveTranslationSettings(): UseMutationResult<
  { success: boolean },
  Error,
  Partial<TranslationSettings>
> {
  return useMutation({
    mutationFn: (settings: Partial<TranslationSettings>) =>
      frappe
        .call<{ success: boolean }>({
          method: 'translation_tools.api.settings.save_translation_settings',
          args: settings,
        })
        .then((r) => r.message),
    mutationKey: ['translation_settings'],
    onSuccess: () => {
      // Invalidate the query to refetch the settings
      queryClient.invalidateQueries({ queryKey: ['translation_settings'] });
    },
  });
}

/**
 * Save API key
 */
// export function useSaveApiKey(args: {
//   provider: 'openai' | 'claude';
//   api_key: string;
// }) {
//   return frappe
//     .call<{ message: string; status: string }>({
//       method: 'translation_tools.api.settings.save_api_key',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useSaveApiKey(): UseMutationResult<
  { message: string; status: string },
  Error,
  { provider: 'openai' | 'claude'; api_key: string }
> {
  return useMutation({
    mutationFn: (args: { provider: 'openai' | 'claude'; api_key: string }) =>
      frappe
        .call<{ message: string; status: string }>({
          method: 'translation_tools.api.settings.save_api_key',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['translation_settings'],
    onSuccess: () => {
      // Invalidate the query to refetch the settings
      queryClient.invalidateQueries({ queryKey: ['translation_settings'] });
    },
  });
}

/**
 * Get translation settings from file
 */
// export function useGetTranslationSettingsFile(): Promise<any> {
//   return frappe
//     .call({
//       method: 'translation_tools.api.settings.get_translation_settings_file',
//       args: {},
//     })
//     .then((r) => r.message);
// }

export function useGetTranslationSettingsFile(): UseQueryResult<
  TranslationSettings,
  Error
> {
  return useQuery({
    queryKey: ['translation_settings_file'],
    // queryFn: () =>
    //   frappe
    //     .call<{ message: TranslationSettings }>({
    //       method: 'translation_tools.api.settings.get_translation_settings_file',
    //       args: {},
    //     })
    //     .then((r) => r.message),
    queryFn: () =>
      frappe
        .call<{ message: TranslationSettings }>({
          method:
            'translation_tools.api.settings.get_translation_settings_file',
          args: {},
        })
        .then((r) => {
          const data = r.message;
          queryClient.invalidateQueries({ queryKey: ['translation_settings'] });
          queryClient.setQueryData(['translation_settings'], data);
          return data;
        }),
  });
}

/**
 * Save translation settings to file
 */
// export function useSaveTranslationSettingsFile(
//   settings: TranslationSettings
// ): Promise<{
//   success: boolean;
//   message?: string;
//   error?: string;
// }> {
//   return frappe
//     .call<{
//       success: boolean;
//       message?: string;
//       error?: string;
//     }>({
//       method: 'translation_tools.api.settings.save_translation_settings_file',
//       args: settings,
//     })
//     .then((r) => r.message);
// }

export function useSaveTranslationSettingsFile(): UseMutationResult<
  { success: boolean; message?: string; error?: string },
  Error,
  TranslationSettings
> {
  return useMutation({
    mutationFn: (settings: TranslationSettings) =>
      frappe
        .call<{
          success: boolean;
          message?: string;
          error?: string;
        }>({
          method:
            'translation_tools.api.settings.save_translation_settings_file',
          args: settings,
        })
        .then((r) => r.message),
    mutationKey: ['translation_settings_file'],
    onSuccess: () => {
      // Invalidate the query to refetch the settings
      queryClient.invalidateQueries({
        queryKey: ['translation_settings_file'],
      });
    },
  });
}
