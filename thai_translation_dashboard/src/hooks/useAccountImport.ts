/**
 * Account Import API Hooks
 *
 * React hooks for the Account Import One-Stop Service feature.
 * Provides type-safe API calls to the backend.
 */

import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useMutation, useQuery } from '@tanstack/react-query';

// Types
export interface Company {
  name: string;
  abbr: string;
  default_currency: string;
  country?: string;
}

export interface CreateCompanyResult {
  name: string;
  abbr: string;
  default_currency: string;
  exists: boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  total_accounts: number;
  existing_accounts: number;
  new_accounts: number;
}

export interface ImportResult {
  created: string[];
  skipped: string[];
  failed: Array<{ account: string; error: string }>;
  total: number;
  success: boolean;
  custom_fields_available: Record<string, boolean>;
}

export interface AccountRow {
  ID: string;
  'Account Name': string;
  Company: string;
  'Parent Account': string;
  'Account Name (TH)': string;
  'Auto Translate to Thai': string;
  'Account Number': string;
  'Is Group': string;
  'Root Type': string;
  'Report Type': string;
  'Thai Translation Notes': string;
  Currency: string;
  'Account Type': string;
  'Tax Rate': string;
  Frozen: string;
  'Balance must be': string;
  [key: string]: string;
}

// API Base Path
const API_BASE = 'translation_tools.api.account_import';

/**
 * Hook to get list of existing companies
 */
export function useGetCompanies() {
  const { call, loading, error } = useFrappeGetCall<{ message: Company[] }>(
    `${API_BASE}.get_companies`
  );

  return {
    companies: call?.message || [],
    loading,
    error,
    refetch: () => call,
  };
}

/**
 * Hook to generate company abbreviation
 */
export function useGenerateAbbr() {
  const { call, loading, error, result } = useFrappePostCall<{ message: string }>(
    `${API_BASE}.generate_abbr`
  );

  const generateAbbr = async (companyName: string): Promise<string> => {
    const response = await call({ company_name: companyName });
    return response?.message || '';
  };

  return {
    generateAbbr,
    loading,
    error,
    abbr: result?.message,
  };
}

/**
 * Hook to create a new company
 */
export function useCreateCompany() {
  const { call, loading, error, result } = useFrappePostCall<{
    message: CreateCompanyResult;
  }>(`${API_BASE}.create_company`);

  const createCompany = async (params: {
    company_name: string;
    abbr?: string;
    default_currency?: string;
    country?: string;
  }): Promise<CreateCompanyResult> => {
    const response = await call(params);
    return response?.message as CreateCompanyResult;
  };

  return {
    createCompany,
    loading,
    error,
    result: result?.message,
  };
}

/**
 * Hook to validate accounts before import
 */
export function useValidateAccounts() {
  const { call, loading, error, result } = useFrappePostCall<{
    message: ValidationResult;
  }>(`${API_BASE}.validate_accounts`);

  const validateAccounts = async (
    accounts: AccountRow[],
    company: string
  ): Promise<ValidationResult> => {
    const response = await call({
      accounts_json: JSON.stringify(accounts),
      company,
    });
    return response?.message as ValidationResult;
  };

  return {
    validateAccounts,
    loading,
    error,
    result: result?.message,
  };
}

/**
 * Hook to import accounts
 */
export function useImportAccounts() {
  const { call, loading, error, result } = useFrappePostCall<{
    message: ImportResult;
  }>(`${API_BASE}.import_accounts`);

  const importAccounts = async (
    accounts: AccountRow[],
    company: string,
    abbr: string
  ): Promise<ImportResult> => {
    const response = await call({
      accounts_json: JSON.stringify(accounts),
      company,
      abbr,
    });
    return response?.message as ImportResult;
  };

  return {
    importAccounts,
    loading,
    error,
    result: result?.message,
  };
}

/**
 * Combined hook for the full import wizard flow
 */
export function useAccountImportWizard() {
  const companiesHook = useGetCompanies();
  const abbrHook = useGenerateAbbr();
  const createCompanyHook = useCreateCompany();
  const validateHook = useValidateAccounts();
  const importHook = useImportAccounts();

  return {
    // Company operations
    companies: companiesHook.companies,
    companiesLoading: companiesHook.loading,
    generateAbbr: abbrHook.generateAbbr,
    createCompany: createCompanyHook.createCompany,
    createCompanyLoading: createCompanyHook.loading,

    // Validation
    validateAccounts: validateHook.validateAccounts,
    validationLoading: validateHook.loading,
    validationResult: validateHook.result,

    // Import
    importAccounts: importHook.importAccounts,
    importLoading: importHook.loading,
    importResult: importHook.result,
  };
}
