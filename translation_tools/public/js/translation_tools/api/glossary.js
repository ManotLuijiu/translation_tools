import { useQuery, useMutation } from '@tanstack/react-query';

/**
 * Update category for term
 */
export function useUpdateGlossaryTermCategories() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
          method:
            'translation_tools.api.glossary.update_glossary_term_categories',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['update-glossary-term-categories'],
  });
}

/**
 * Remove duplicate term
 */
export function useCleanDuplicateGlossaryTerms() {
  return useMutation({
    mutationFn: (name) =>
      frappe
        .call({
          method:
            'translation_tools.api.glossary.clean_duplicate_glossary_terms',
          args: { name },
        })
        .then((r) => r.message),
    mutationKey: ['delete-duplicate-glossary-term'],
  });
}

/**
 * Get all glossary terms
 */
export function useGetGlossaryTerms() {
  return useQuery({
    queryKey: ['glossary-terms'],

    queryFn: () =>
      frappe
        .call({
          method: 'translation_tools.api.glossary.get_glossary_terms',
          args: {},
        })
        .then((r) => r.message),
  });
}

export function useAddGlossaryTerm() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
          method: 'translation_tools.api.glossary.add_glossary_term',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['add-glossary-term'],
  });
}

export function useUpdateGlossaryTerm() {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call({
          method: 'translation_tools.api.glossary.update_glossary_term',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['update-glossary-term'],
  });
}

export function useDeleteGlossaryTerm() {
  return useMutation({
    mutationFn: (name) =>
      frappe
        .call({
          method: 'translation_tools.api.glossary.delete_glossary_term',
          args: { name },
        })
        .then((r) => r.message),
    mutationKey: ['delete-glossary-term'],
  });
}

/**
 * Get all ERPNext modules
 */
export function useGetERPNextModules() {
  return useQuery({
    queryKey: ['erpnext-modules'],
    queryFn: () =>
      frappe
        .call({
          method: 'translation_tools.api.glossary.get_erpnext_modules',
          args: {},
        })
        .then((r) => r.message),
  });
}
