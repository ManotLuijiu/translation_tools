import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type GlossaryTerm = {
  name: string
  source_term: string
  thai_translation: string
  context?: string
  category?: string
  module?: string
  is_approved: boolean
}

export type ERPNextModule = {
  name: string
  module_name: string
  description?: string
}

/**
 * Update category for term
 */
export function useUpdateGlossaryTermCategories() {
  return useFrappePostCall<{ success: boolean; message: string }>(
    'translation_tools.api.glossary.update_glossary_term_categories',
  )
}

/**
 * Remove duplicate term
 */
export function useCleanDuplicateGlossaryTerms() {
  const { call, loading, error } = useFrappePostCall(
    'translation_tools.api.glossary.clean_duplicate_glossary_terms',
  )

  return {
    call,
    loading,
    error,
  }
}

/**
 * Get all glossary terms
 */
export function useGetGlossaryTerms() {
  return useFrappeGetCall<{ message: GlossaryTerm[] }>(
    // 'translation_tools.api.glossary.get_glossary_terms',
    'translation_tools.api.glossary.sync_glossary_from_file',
    {},
  )
}

/**
 * Add a new glossary term
 */
export function useAddGlossaryTerm() {
  return useFrappePostCall<{ success: boolean; name: string }>(
    'translation_tools.api.glossary.add_glossary_term',
  )
}

/**
 * Update an existing glossary term
 */
export function useUpdateGlossaryTerm() {
  return useFrappePostCall<{ success: boolean }>(
    'translation_tools.api.glossary.update_glossary_term',
  )
}

/**
 * Delete a glossary term
 */
export function useDeleteGlossaryTerm() {
  return useFrappePostCall<{ success: boolean }>(
    'translation_tools.api.glossary.delete_glossary_term',
  )
}

/**
 * Get all ERPNext modules
 */
export function useGetERPNextModules() {
  return useFrappeGetCall(
    'translation_tools.api.glossary.get_erpnext_modules',
    {},
  )
}
