import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";

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
 * Get all glossary terms
 */
export function useGetGlossaryTerms() {
  return useFrappeGetCall<{ message: GlossaryTerm[] }>(
    "translation_tools.api.get_glossary_terms",
    {}
  );
}

/**
 * Add a new glossary term
 */
export function useAddGlossaryTerm() {
  return useFrappePostCall<{ success: boolean; name: string }>(
    "translation_tools.api.add_glossary_term"
  );
}

/**
 * Update an existing glossary term
 */
export function useUpdateGlossaryTerm() {
  return useFrappePostCall<{ success: boolean }>(
    "translation_tools.api.update_glossary_term"
  );
}

/**
 * Delete a glossary term
 */
export function useDeleteGlossaryTerm() {
  return useFrappePostCall<{ success: boolean }>(
    "translation_tools.api.delete_glossary_term"
  );
}

/**
 * Get all ERPNext modules
 */
export function useGetERPNextModules() {
  return useFrappeGetCall<{ message: ERPNextModule[] }>(
    "translation_tools.api.get_erpnext_modules",
    {}
  );
}
