import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type GlossaryTerm = {
  name: string;
  source_term: string;
  thai_translation: string;
  context?: string;
  category?: string;
  module?: string;
  is_approved: boolean;
};

export type ERPNextModule = {
  name: string;
  module_name: string;
  description?: string;
};

/**
 * Update category for term
 */
export function useUpdateGlossaryTermCategories() {
  return useFrappePostCall<{ success: boolean; message: string }>(
    'translation_tools.api.glossary.update_glossary_term_categories'
  );
}

/**
 * Remove duplicate term
 */
export function useCleanDuplicateGlossaryTerms() {
  const { call, loading, error } = useFrappePostCall(
    'translation_tools.api.glossary.clean_duplicate_glossary_terms'
  );

  return {
    call,
    loading,
    error,
  };
}

/**
 * Get all glossary terms
 */
export function useGetGlossaryTerms() {
  return useFrappeGetCall<{ message: GlossaryTerm[] }>(
    'translation_tools.api.glossary.get_glossary_terms',
    {}
  );
}

/**
 * Sync glossary terms from file
 */
export function useSyncGlossaryFromFile() {
  return useFrappePostCall<{ message: GlossaryTerm[] }>(
    'translation_tools.api.glossary.sync_glossary_from_file'
  );
}

/**
 * Sync glossary terms from GitHub
 */
export function useSyncGlossaryFromGitHub() {
  return useFrappePostCall<{ 
    success: boolean; 
    message: string;
    stats: { added: number; updated: number; skipped: number; errors: number };
    site?: string;
  }>('translation_tools.api.sync_public_glossary.sync_glossary_from_public_github');
}

/**
 * Add a new glossary term
 */
export function useAddGlossaryTerm() {
  const { call, result, loading, error, isCompleted, reset } =
    useFrappePostCall<{
      success: boolean;
      name: string;
      message: {
        success: boolean;
        message: string;
        name: string;
      };
    }>('translation_tools.api.glossary.add_glossary_term');
  return {
    call,
    result,
    loading,
    error,
    isCompleted,
    reset,
  };
}

/**
 * Update an existing glossary term
 */
export function useUpdateGlossaryTerm() {
  return useFrappePostCall<{ success: boolean }>(
    'translation_tools.api.glossary.update_glossary_term'
  );
}

/**
 * Delete a glossary term
 */
export function useDeleteGlossaryTerm() {
  return useFrappePostCall<{ 
    success: boolean;
    github?: {
      github_pushed: boolean;
      message: string;
      terms_count?: number;
      commit_url?: string;
    };
  }>('translation_tools.api.glossary.delete_glossary_term');
}

/**
 * Get all ERPNext modules
 */
export function useGetERPNextModules() {
  return useFrappeGetCall(
    'translation_tools.api.glossary.get_erpnext_modules',
    {}
  );
}
