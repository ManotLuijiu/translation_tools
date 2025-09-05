import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

// Frappe API response wrapper - can be wrapped in message or direct
export type FrappeResponse<T> = {
  message: T;
} | T;

// Helper function to extract data from Frappe response
export function extractFrappeData<T>(response: FrappeResponse<T> | undefined): T | undefined {
  if (!response) return undefined;
  
  // Check if response has message property (wrapped format)
  if (typeof response === 'object' && response !== null && 'message' in response) {
    return (response as { message: T }).message;
  }
  
  // Direct format
  return response as T;
}

export type FrappeApp = {
  name: string;
  path: string;
  has_pot: boolean;
  pot_entries: number;
  pot_last_modified: string | null;
  is_frappe_app: boolean;
};

export type POTGenerationResult = {
  success: boolean;
  app_name?: string;
  message?: string;
  pot_file?: string;
  entries_count?: number;
  command_output?: string;
  generated_at?: string;
  error?: string;
};

export type POTGenerationProgress = {
  current_app?: string;
  completed: number;
  total: number;
  percentage: number;
  status: 'processing' | 'completed' | 'error';
  results?: POTGenerationResult[];
  error?: string;
};

export type BatchPOTResult = {
  success: boolean;
  message?: string;
  job_id?: string;
  apps_count?: number;
  error?: string;
};

/**
 * Get list of installed Frappe apps that can have POT files generated
 */
export function useGetInstalledApps() {
  return useFrappeGetCall<FrappeResponse<{
    success: boolean;
    apps: FrappeApp[];
    total_apps: number;
    error?: string;
  }>>('translation_tools.api.pot_generation.get_installed_apps');
}

/**
 * Generate POT file for a single app
 */
export function useGeneratePOTFile() {
  return useFrappePostCall<POTGenerationResult>(
    'translation_tools.api.pot_generation.generate_pot_file'
  );
}

/**
 * Generate POT files for multiple apps (batch operation)
 */
export function useGeneratePOTFilesBatch() {
  return useFrappePostCall<BatchPOTResult>(
    'translation_tools.api.pot_generation.generate_pot_files_batch'
  );
}

/**
 * Get progress of batch POT generation job
 */
export function useGetPOTGenerationProgress(jobId: string | null) {
  const shouldFetch = !!jobId;
  
  return useFrappeGetCall<{
    success: boolean;
    progress?: POTGenerationProgress;
    error?: string;
  }>(
    'translation_tools.api.pot_generation.get_pot_generation_progress',
    shouldFetch ? { job_id: jobId } : undefined,
    { 
      enabled: shouldFetch,
      // Poll every 2 seconds when job is active
      refetchInterval: shouldFetch ? 2000 : false,
      // Don't retry if no job ID
      retry: shouldFetch ? 3 : false
    }
  );
}

/**
 * Enhanced scan that generates POT files before scanning PO files
 */
export function useEnhancedScanWithPOT() {
  return useFrappePostCall<{
    success: boolean;
    pot_generation?: BatchPOTResult;
    po_scan?: any;
    error?: string;
  }>('translation_tools.api.pot_generation.enhanced_scan_with_pot_generation');
}