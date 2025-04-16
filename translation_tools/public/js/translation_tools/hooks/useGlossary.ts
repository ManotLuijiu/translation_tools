/**
 * API functions for glossary management using frappe.call
 * Compatible with Frappe desk pages
 */

// Type definitions
export interface GlossaryTerm {
    name: string;
    source_term: string;
    thai_translation: string;
    context?: string;
    category?: string;
    module?: string;
    is_approved: 0 | 1;
  }
  
  export interface ERPNextModule {
    name: string;
    module_name: string;
    description?: string;
    priority: number;
  }
  
  // API functions for use in Frappe desk pages
  export const getGlossaryTerms = (): Promise<GlossaryTerm[]> => {
    return new Promise((resolve, reject) => {
      frappe.call({
        method: 'translation_tools.api.glossary.get_glossary_terms',
        callback: (r) => {
          if (r.exc) {
            console.error('Error fetching glossary terms:', r.exc);
            reject(r.exc);
          } else {
            resolve(r.message || []);
          }
        }
      });
    });
  };
  
  export const addGlossaryTerm = (termData: Omit<GlossaryTerm, 'name'>): Promise<{success: boolean, name?: string}> => {
    return new Promise((resolve, reject) => {
      frappe.call({
        method: 'translation_tools.api.glossary.add_glossary_term',
        args: termData,
        callback: (r) => {
          if (r.exc) {
            console.error('Error adding glossary term:', r.exc);
            reject(r.exc);
          } else {
            resolve(r.message || { success: false });
          }
        }
      });
    });
  };
  
  export const updateGlossaryTerm = (name: string, termData: Partial<Omit<GlossaryTerm, 'name'>>): Promise<{success: boolean}> => {
    return new Promise((resolve, reject) => {
      frappe.call({
        method: 'translation_tools.api.glossary.update_glossary_term',
        args: {
          name,
          ...termData
        },
        callback: (r) => {
          if (r.exc) {
            console.error('Error updating glossary term:', r.exc);
            reject(r.exc);
          } else {
            resolve(r.message || { success: false });
          }
        }
      });
    });
  };
  
  export const deleteGlossaryTerm = (name: string): Promise<{success: boolean}> => {
    return new Promise((resolve, reject) => {
      frappe.call({
        method: 'translation_tools.api.glossary.delete_glossary_term',
        args: { name },
        callback: (r) => {
          if (r.exc) {
            console.error('Error deleting glossary term:', r.exc);
            reject(r.exc);
          } else {
            resolve(r.message || { success: false });
          }
        }
      });
    });
  };
  
  export const getERPNextModules = (): Promise<ERPNextModule[]> => {
    return new Promise((resolve, reject) => {
      frappe.call({
        method: 'translation_tools.api.glossary.get_erpnext_modules',
        callback: (r) => {
          if (r.exc) {
            console.error('Error fetching ERPNext modules:', r.exc);
            reject(r.exc);
          } else {
            resolve(r.message || []);
          }
        }
      });
    });
  };