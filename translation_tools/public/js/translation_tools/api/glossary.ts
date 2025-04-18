import {
  useQuery,
  useMutation,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';

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
export function useGetGlossaryTerms(): UseQueryResult<GlossaryTerm[], Error> {
  return useQuery({
    queryKey: ['glossary-terms'],

    queryFn: () =>
      frappe
        .call<GlossaryTerm[]>({
          method: 'translation_tools.api.glossary.get_glossary_terms',
          args: {},
        })
        .then((r) => r.message),
  });
}

/**
 * Add a new glossary term
 */
// export function useAddGlossaryTerm(args: {
//   source_term: string;
//   thai_translation: string;
//   context?: string;
//   category?: string;
//   module?: string;
// }): Promise<{ success: boolean; name: string }> {
//   return frappe
//     .call<{ success: boolean; name: string }>({
//       method: 'translation_tools.api.glossary.add_glossary_term',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useAddGlossaryTerm(): UseMutationResult<
  { success: boolean; name: string },
  Error,
  {
    source_term: string;
    thai_translation: string;
    context?: string;
    category?: string;
    module?: string;
  }
> {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call<{ success: boolean; name: string }>({
          method: 'translation_tools.api.glossary.add_glossary_term',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['add-glossary-term'],
  });
}

/**
 * Update an existing glossary term
 */
// export function useUpdateGlossaryTerm(args: {
//   name: string;
//   source_term: string;
//   thai_translation: string;
//   context?: string;
//   category?: string;
//   module?: string;
//   is_approved: boolean;
// }): Promise<{ success: boolean }> {
//   return frappe
//     .call<{ success: boolean }>({
//       method: 'translation_tools.api.glossary.update_glossary_term',
//       args,
//     })
//     .then((r) => r.message);
// }

export function useUpdateGlossaryTerm(): UseMutationResult<
  { success: boolean },
  Error,
  {
    name: string;
    source_term: string;
    thai_translation: string;
    context?: string;
    category?: string;
    module?: string;
    is_approved: boolean;
  }
> {
  return useMutation({
    mutationFn: (args) =>
      frappe
        .call<{ success: boolean }>({
          method: 'translation_tools.api.glossary.update_glossary_term',
          args,
        })
        .then((r) => r.message),
    mutationKey: ['update-glossary-term'],
  });
}

/**
 * Delete a glossary term
 */
// export function useDeleteGlossaryTerm(
//   name: string
// ): Promise<{ success: boolean }> {
//   return frappe
//     .call<{ success: boolean }>({
//       method: 'translation_tools.api.glossary.delete_glossary_term',
//       args: { name },
//     })
//     .then((r) => r.message);
// }

export function useDeleteGlossaryTerm(): UseMutationResult<
  { success: boolean },
  Error,
  string
> {
  return useMutation({
    mutationFn: (name) =>
      frappe
        .call<{ success: boolean }>({
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
export function useGetERPNextModules(): UseQueryResult<ERPNextModule[], Error> {
  return useQuery({
    queryKey: ['erpnext-modules'],
    queryFn: () =>
      frappe
        .call<{ message: ERPNextModule[] }>({
          method: 'translation_tools.api.glossary.get_erpnext_modules',
          args: {},
        })
        .then((r) => r.message),
  });
}
