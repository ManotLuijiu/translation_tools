import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';

export interface AppSyncSettings {
  [appName: string]: {
    enabled: boolean;
    last_updated?: string;
  };
}

export interface AppSyncSettingsResponse {
  success: boolean;
  app_settings: AppSyncSettings;
  global_enabled: boolean;
  repository_url?: string;
  branch?: string;
}

export interface ToggleAppSyncResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Hook to get app sync settings
export function useGetAppSyncSettings() {
  const { data, error, isLoading, isValidating, mutate } = useFrappeGetCall<AppSyncSettingsResponse>(
    'translation_tools.api.app_sync_settings.get_app_sync_settings',
    {}
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  };
}

// Hook to toggle app autosync
export function useToggleAppAutosync() {
  const { call, loading, error, result, reset } = useFrappePostCall<ToggleAppSyncResponse>(
    'translation_tools.api.app_sync_settings.toggle_app_autosync'
  );

  return {
    call: async (appName: string, enabled: boolean) => {
      return await call({
        app_name: appName,
        enabled: enabled
      });
    },
    loading,
    error,
    result,
    reset
  };
}

// Hook to trigger sync for all enabled apps
export function useTriggerAllAppsSync() {
  const { call, loading, error, result } = useFrappePostCall(
    'translation_tools.api.app_sync_settings.trigger_all_apps_sync'
  );

  return {
    call,
    loading,
    error,
    result
  };
}