import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

/**
 * Get all glossary terms
 */
export function useGetGlossaryTerms() {
  return useFrappeGetCall(
    'translation_tools.api.glossary.get_glossary_terms',
    {}
  );
}

/**
 * Add a new glossary term
 */
export function useAddGlossaryTerm() {
  return useFrappePostCall('translation_tools.api.glossary.add_glossary_term');
}

/**
 * Update an existing glossary term
 */
export function useUpdateGlossaryTerm() {
  return useFrappePostCall(
    'translation_tools.api.glossary.update_glossary_term'
  );
}

/**
 * Delete a glossary term
 */
export function useDeleteGlossaryTerm() {
  return useFrappePostCall(
    'translation_tools.api.glossary.delete_glossary_term'
  );
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
