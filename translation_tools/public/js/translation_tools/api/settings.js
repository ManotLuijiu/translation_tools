import { useQuery, useMutation, QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();

// export type TranslationSettings = {
//   default_model_provider: 'openai' | 'claude';
//   default_model: string;
//   openai_api_key: string;
//   anthropic_api_key: string;
//   batch_size: number;
//   temperature: number;
//   auto_save: boolean;
//   preserve_formatting: boolean;
// };

/**
 * Get translation settings
 */
export function useGetTranslationSettings() {
  return useQuery({
    queryKey: ['translation_settings'],
    queryFn: () =>
      frappe
        .call({
          method: 'translation_tools.api.settings.get_translation_settings',
          args: {},
        })
        .then((r) => r.message),
  });
}

export function useSaveTranslationSettings() {
  return useMutation({
    mutationFn: (settings) =>
      frappe
        .call({
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

export function useSaveApiKey() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
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

export function useGetTranslationSettingsFile() {
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
        .call({
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

export function useSaveTranslationSettingsFile() {
  return useMutation({
    mutationFn: (settings) =>
      frappe
        .call({
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
