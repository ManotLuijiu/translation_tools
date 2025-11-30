/**
 * Account Import Mapper - One Stop Service
 *
 * Multi-step wizard for importing Chart of Accounts with custom fields.
 * Steps:
 * 1. Upload - Upload source CSV file
 * 2. Company - Select existing or create new company
 * 3. Mapping - Review column mapping (auto-detected)
 * 4. Preview - Preview data before import
 * 5. Import - Import with progress and results
 */

import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import Papa from 'papaparse';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useFrappePostCall } from 'frappe-react-sdk';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { __ } from '@/utils/translation';

// Types
interface CSVRow {
  [key: string]: string;
}

interface Company {
  name: string;
  abbr: string;
  default_currency: string;
  country?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  total_accounts: number;
  existing_accounts: number;
  new_accounts: number;
}

interface ImportResult {
  created: string[];
  skipped: string[];
  failed: Array<{ account: string; error: string }>;
  total: number;
  success: boolean;
}

// Wizard Steps
const STEPS = [
  { id: 1, name: 'Upload', icon: Upload },
  { id: 2, name: 'Company', icon: Building2 },
  { id: 3, name: 'Mapping', icon: Copy },
  { id: 4, name: 'Preview', icon: FileSpreadsheet },
  { id: 5, name: 'Import', icon: Check },
];

// Column mapping configuration
const COLUMN_MAPPING = [
  {
    source: 'ID',
    target: 'Account ID',
    description: 'Unique identifier with company suffix',
  },
  {
    source: 'Account Name',
    target: 'account_name',
    description: 'English account name',
  },
  {
    source: 'Company',
    target: 'company',
    description: 'Will be replaced with selected company',
  },
  {
    source: 'Parent Account',
    target: 'parent_account',
    description: 'Parent account reference',
  },
  {
    source: 'Account Name (TH)',
    target: 'account_name_th',
    description: 'Thai translation (custom field)',
    custom: true,
  },
  {
    source: 'Auto Translate to Thai',
    target: 'auto_translate_to_thai',
    description: 'Auto-translate flag (custom field)',
    custom: true,
  },
  {
    source: 'Account Number',
    target: 'account_number',
    description: 'Account number for sorting',
  },
  {
    source: 'Is Group',
    target: 'is_group',
    description: 'Whether this is a group account',
  },
  {
    source: 'Root Type',
    target: 'root_type',
    description: 'Asset, Liability, Equity, Income, Expense',
  },
  {
    source: 'Report Type',
    target: 'report_type',
    description: 'Balance Sheet or Profit and Loss',
  },
  {
    source: 'Thai Translation Notes',
    target: 'thai_translation_notes',
    description: 'Notes about translation (custom field)',
    custom: true,
  },
  {
    source: 'Currency',
    target: 'account_currency',
    description: 'Default: THB',
  },
  {
    source: 'Account Type',
    target: 'account_type',
    description: 'Bank, Cash, Receivable, etc.',
  },
  {
    source: 'Tax Rate',
    target: 'tax_rate',
    description: 'Tax percentage for this account',
  },
  {
    source: 'Frozen',
    target: 'freeze_account',
    description: 'Whether account is frozen',
  },
  {
    source: 'Balance must be',
    target: 'balance_must_be',
    description: 'Debit or Credit constraint',
  },
];

// Utility functions (pure functions - no state dependency)
const removeQuotes = (value: string): string => {
  if (!value) return value;
  return value.replace(/^["']+|["']+$/g, '').replace(/""/g, '"');
};

const replaceAbbr = (value: string, newAbbr: string): string => {
  if (!value || !newAbbr) return value;
  const abbrPattern = /- [A-Z0-9]+$/i;
  return value.replace(abbrPattern, `- ${newAbbr}`);
};

const AccountMapperPage: React.FC = () => {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Upload state
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [sourceCompanyName, setSourceCompanyName] = useState<string>('');

  // Step 2: Company state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyAbbr, setNewCompanyAbbr] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Step 3: Mapping state (auto-detected)
  const [mappedData, setMappedData] = useState<CSVRow[]>([]);

  // Step 4: Validation state
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // Step 5: Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // API calls
  const { call: getCompaniesCall } = useFrappePostCall(
    'translation_tools.api.account_import.get_companies'
  );
  const { call: generateAbbrCall } = useFrappePostCall(
    'translation_tools.api.account_import.generate_abbr'
  );
  const { call: createCompanyCall } = useFrappePostCall(
    'translation_tools.api.account_import.create_company'
  );
  const { call: validateAccountsCall } = useFrappePostCall(
    'translation_tools.api.account_import.validate_accounts'
  );
  const { call: importAccountsCall } = useFrappePostCall(
    'translation_tools.api.account_import.import_accounts'
  );

  // Load companies function
  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const result = await getCompaniesCall({});
      setCompanies(result?.message || []);
    } catch {
      toast.error(__('Failed to load companies'));
    } finally {
      setLoadingCompanies(false);
    }
  }, [getCompaniesCall]);

  // Load companies on mount
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Step 1: Handle CSV upload
  const onDropCSV = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      Papa.parse(file, {
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const headers = results.data[0] as string[];
            const rows = results.data.slice(1) as string[][];

            const dataObjects = rows
              .filter((row) => row.some((cell) => cell && cell.trim() !== ''))
              .map((row) => {
                const obj: CSVRow = {};
                headers.forEach((header, index) => {
                  obj[header] = row[index] || '';
                });
                return obj;
              });

            setCsvHeaders(headers);
            setCsvData(dataObjects);
            setCsvFileName(file.name);

            // Detect source company from first row
            if (dataObjects.length > 0) {
              const firstCompany = dataObjects[0]['Company'] || '';
              setSourceCompanyName(firstCompany);
            }

            toast.success(
              __('CSV uploaded: ') +
                file.name +
                ` (${dataObjects.length} ${__('accounts')})`
            );
          }
        },
        error: (error) => {
          toast.error(__('Error parsing CSV: ') + error.message);
        },
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCSV,
    accept: { 'text/csv': ['.csv'] },
    multiple: false,
  });

  // Step 2: Handle company creation
  const handleGenerateAbbr = async () => {
    if (!newCompanyName) return;
    try {
      const result = await generateAbbrCall({ company_name: newCompanyName });
      setNewCompanyAbbr(result?.message || '');
    } catch (error) {
      toast.error(__('Failed to generate abbreviation'));
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName || !newCompanyAbbr) {
      toast.error(__('Please enter company name and abbreviation'));
      return;
    }

    setCreatingCompany(true);
    try {
      const result = await createCompanyCall({
        company_name: newCompanyName,
        abbr: newCompanyAbbr,
        default_currency: 'THB',
        country: 'Thailand',
      });

      if (result?.message) {
        const newCompany: Company = {
          name: result.message.name,
          abbr: result.message.abbr,
          default_currency: result.message.default_currency,
        };

        if (result.message.exists) {
          toast.info(__('Company already exists, using existing'));
        } else {
          toast.success(__('Company created successfully'));
        }

        setCompanies((prev) => [...prev, newCompany]);
        setSelectedCompany(newCompany);
        setShowCreateDialog(false);
        setNewCompanyName('');
        setNewCompanyAbbr('');
      }
    } catch (error: any) {
      toast.error(
        __('Failed to create company: ') + (error?.message || 'Unknown error')
      );
    } finally {
      setCreatingCompany(false);
    }
  };

  // Step 3: Map data to new company
  const mapDataToCompany = useCallback(() => {
    if (!csvData.length || !selectedCompany) return;

    const mapped = csvData.map((row) => {
      const newRow: CSVRow = { ...row };

      // Replace company
      newRow['Company'] = selectedCompany.name;

      // Replace abbreviation in ID
      if (newRow['ID']) {
        newRow['ID'] = replaceAbbr(
          removeQuotes(newRow['ID']),
          selectedCompany.abbr
        );
      }

      // Replace abbreviation in Parent Account
      if (newRow['Parent Account']) {
        newRow['Parent Account'] = replaceAbbr(
          removeQuotes(newRow['Parent Account']),
          selectedCompany.abbr
        );
      }

      // Ensure currency is THB
      newRow['Currency'] = newRow['Currency'] || 'THB';

      return newRow;
    });

    setMappedData(mapped);
  }, [csvData, selectedCompany]);

  // Run mapping when company is selected
  useEffect(() => {
    if (selectedCompany && csvData.length > 0) {
      mapDataToCompany();
    }
  }, [selectedCompany, csvData, mapDataToCompany]);

  // Step 4: Validate accounts
  const handleValidate = async () => {
    if (!mappedData.length || !selectedCompany) return;

    setValidating(true);
    try {
      const result = await validateAccountsCall({
        accounts_json: JSON.stringify(mappedData),
        company: selectedCompany.name,
      });

      setValidationResult(result?.message || null);

      if (result?.message?.valid) {
        toast.success(__('Validation passed'));
      } else {
        toast.warning(__('Validation found issues'));
      }
    } catch (error) {
      toast.error(__('Validation failed'));
    } finally {
      setValidating(false);
    }
  };

  // Step 5: Import accounts
  const handleImport = async () => {
    if (!mappedData.length || !selectedCompany) return;

    setImporting(true);
    setImportProgress(0);

    try {
      // Simulate progress (actual import is atomic)
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const result = await importAccountsCall({
        accounts_json: JSON.stringify(mappedData),
        company: selectedCompany.name,
        abbr: selectedCompany.abbr,
      });

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result?.message || null);

      if (result?.message?.success) {
        toast.success(
          __('Import completed: ') +
            result.message.created.length +
            __(' accounts created')
        );
      } else {
        toast.warning(
          __('Import completed with issues: ') +
            (result?.message?.failed?.length || 0) +
            __(' failed')
        );
      }
    } catch (error: any) {
      toast.error(__('Import failed: ') + (error?.message || 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  // Navigation
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return csvData.length > 0;
      case 2:
        return selectedCompany !== null;
      case 3:
        return mappedData.length > 0;
      case 4:
        return validationResult?.valid === true;
      case 5:
        return importResult !== null;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (currentStep < 5 && canGoNext()) {
      // Run validation when entering step 4
      if (currentStep === 3) {
        handleValidate();
      }
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setCsvData([]);
    setCsvHeaders([]);
    setCsvFileName('');
    setSourceCompanyName('');
    setSelectedCompany(null);
    setMappedData([]);
    setValidationResult(null);
    setImportResult(null);
    setImportProgress(0);
  };

  // Download mapped CSV (fallback option)
  const downloadMappedCSV = () => {
    if (!mappedData.length) return;

    const csv = Papa.unparse({
      fields: csvHeaders,
      data: mappedData.map((row) => csvHeaders.map((h) => row[h] || '')),
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accounts_${selectedCompany?.abbr || 'mapped'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(__('Downloaded mapped CSV'));
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderUploadStep();
      case 2:
        return renderCompanyStep();
      case 3:
        return renderMappingStep();
      case 4:
        return renderPreviewStep();
      case 5:
        return renderImportStep();
      default:
        return null;
    }
  };

  // Step 1: Upload
  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-green-500" />
          {__('Upload Account Export CSV')}
        </CardTitle>
        <CardDescription>
          {__(
            'Upload the CSV file exported from your source system (Data Export → Account)'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-green-500 bg-green-500/5'
              : 'border-muted-foreground/25 hover:border-green-500/50'
          }`}
        >
          <input {...getInputProps()} />
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-green-500" />
          {csvFileName ? (
            <div>
              <p className="text-green-600 font-medium text-lg">
                {csvFileName}
              </p>
              <p className="text-muted-foreground mt-1">
                {csvData.length} {__('accounts')} | {csvHeaders.length}{' '}
                {__('columns')}
              </p>
              {sourceCompanyName && (
                <p className="text-sm text-muted-foreground mt-2">
                  {__('Source company:')}{' '}
                  <span className="font-medium">{sourceCompanyName}</span>
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="text-lg font-medium">
                {__('Drop your CSV file here')}
              </p>
              <p className="text-muted-foreground mt-1">
                {__('or click to browse')}
              </p>
            </div>
          )}
        </div>

        {csvData.length > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>{__('File Ready')}</AlertTitle>
            <AlertDescription>
              {__('Found')} {csvData.length} {__('accounts with')}{' '}
              {csvHeaders.length} {__('columns including custom Thai fields')}
            </AlertDescription>
          </Alert>
        )}

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">{__('Expected columns:')}</p>
          <div className="flex flex-wrap gap-1">
            {COLUMN_MAPPING.slice(0, 8).map((col) => (
              <Badge
                key={col.source}
                variant={col.custom ? 'default' : 'secondary'}
                className="text-xs"
              >
                {col.source}
              </Badge>
            ))}
            <Badge variant="outline" className="text-xs">
              +{COLUMN_MAPPING.length - 8} more
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Step 2: Company Selection
  const renderCompanyStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          {__('Select Target Company')}
        </CardTitle>
        <CardDescription>
          {__(
            'Choose an existing company or create a new one for the Chart of Accounts'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{__('Company')}</Label>
          <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                aria-haspopup="listbox"
                aria-expanded={companyOpen}
                className="w-full justify-between"
              >
                {selectedCompany ? (
                  <span>
                    {selectedCompany.name}{' '}
                    <span className="text-muted-foreground">
                      ({selectedCompany.abbr})
                    </span>
                  </span>
                ) : (
                  __('Select company...')
                )}
                <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder={__('Search companies...')} />
                <CommandList>
                  <CommandEmpty>{__('No company found.')}</CommandEmpty>
                  <CommandGroup heading={__('Existing Companies')}>
                    {companies.map((company) => (
                      <CommandItem
                        key={company.name}
                        value={company.name}
                        onSelect={() => {
                          setSelectedCompany(company);
                          setCompanyOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedCompany?.name === company.name
                              ? 'opacity-100'
                              : 'opacity-0'
                          }`}
                        />
                        <div className="flex-1">
                          <p>{company.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {company.abbr} | {company.default_currency}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setCompanyOpen(false);
                        setShowCreateDialog(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {__('Create New Company...')}
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selectedCompany && (
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Building2 className="h-4 w-4" />
            <AlertTitle>{__('Selected Company')}</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p>
                  <span className="font-medium">{__('Name:')}</span>{' '}
                  {selectedCompany.name}
                </p>
                <p>
                  <span className="font-medium">{__('Abbreviation:')}</span>{' '}
                  {selectedCompany.abbr}
                </p>
                <p>
                  <span className="font-medium">{__('Currency:')}</span>{' '}
                  {selectedCompany.default_currency}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Create Company Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{__('Create New Company')}</DialogTitle>
              <DialogDescription>
                {__(
                  'Enter the company details. Abbreviation will be auto-generated.'
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">{__('Company Name')}</Label>
                <Input
                  id="company-name"
                  placeholder="e.g., M Capital Corporation Co., Ltd."
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onBlur={handleGenerateAbbr}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-abbr">{__('Abbreviation')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="company-abbr"
                    placeholder="e.g., MCCCL"
                    value={newCompanyAbbr}
                    onChange={(e) =>
                      setNewCompanyAbbr(e.target.value.toUpperCase())
                    }
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={handleGenerateAbbr}
                    type="button"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {__(
                    'This will be appended to account IDs (e.g., "1000 - Assets - MCCCL")'
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                {__('Cancel')}
              </Button>
              <Button onClick={handleCreateCompany} disabled={creatingCompany}>
                {creatingCompany && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {__('Create Company')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );

  // Step 3: Mapping
  const renderMappingStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Copy className="w-5 h-5 text-purple-500" />
          {__('Column Mapping')}
        </CardTitle>
        <CardDescription>
          {__('Review how columns will be mapped from source to target')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert className="bg-purple-500/10 border-purple-500/30">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>{__('Auto-detected Mapping')}</AlertTitle>
            <AlertDescription>
              {__('All')} {COLUMN_MAPPING.length}{' '}
              {__('columns detected including custom Thai fields')}
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[300px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{__('Source Column')}</TableHead>
                  <TableHead>{__('Target Field')}</TableHead>
                  <TableHead>{__('Description')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COLUMN_MAPPING.map((mapping) => (
                  <TableRow key={mapping.source}>
                    <TableCell className="font-medium">
                      {csvHeaders.includes(mapping.source) ? (
                        <span className="text-green-600">{mapping.source}</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {mapping.source}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {mapping.target}
                      </code>
                      {mapping.custom && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          custom
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {mapping.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">
              {__('Transformations applied:')}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • {__('Company:')}{' '}
                <span className="font-medium">{sourceCompanyName}</span> →{' '}
                <span className="font-medium text-green-600">
                  {selectedCompany?.name}
                </span>
              </li>
              <li>
                • {__('Abbreviation in IDs:')} →{' '}
                <span className="font-medium text-green-600">
                  {selectedCompany?.abbr}
                </span>
              </li>
              <li>• {__('Currency defaults to THB')}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Step 4: Preview
  const renderPreviewStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-orange-500" />
          {__('Preview & Validate')}
        </CardTitle>
        <CardDescription>
          {__('Review the mapped data before importing')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {validating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">{__('Validating accounts...')}</span>
          </div>
        ) : validationResult ? (
          <>
            {validationResult.valid ? (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>{__('Validation Passed')}</AlertTitle>
                <AlertDescription>
                  {validationResult.new_accounts}{' '}
                  {__('new accounts ready to import')}
                  {validationResult.existing_accounts > 0 && (
                    <span className="text-muted-foreground">
                      {' '}
                      ({validationResult.existing_accounts}{' '}
                      {__('will be skipped - already exist')})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{__('Validation Failed')}</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc pl-4">
                    {validationResult.errors.slice(0, 5).map((error, i) => (
                      <li key={error}>{error}</li>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <li>
                        ...{__('and')} {validationResult.errors.length - 5}{' '}
                        {__('more errors')}
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{__('Warnings')}</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-disc pl-4">
                    {validationResult.warnings.map((warning, i) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{__('Validating...')}</AlertTitle>
            <AlertDescription>
              {__('Please wait while we validate the data')}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div>
          <h4 className="font-medium mb-2">
            {__('Preview')} ({__('first 10 rows')}):
          </h4>
          <ScrollArea className="h-[250px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{__('ID')}</TableHead>
                  <TableHead>{__('Account Name')}</TableHead>
                  <TableHead>{__('Parent')}</TableHead>
                  <TableHead>{__('Thai Name')}</TableHead>
                  <TableHead>{__('Root Type')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedData.slice(0, 10).map((row) => (
                  <TableRow key={row['ID'] || row['Account Name']}>
                    <TableCell className="font-mono text-xs">
                      {row['ID']}
                    </TableCell>
                    <TableCell>{row['Account Name']}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {row['Parent Account'] || '-'}
                    </TableCell>
                    <TableCell>{row['Account Name (TH)'] || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row['Root Type']}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleValidate}
            disabled={validating}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${validating ? 'animate-spin' : ''}`}
            />
            {__('Re-validate')}
          </Button>
          <Button variant="outline" onClick={downloadMappedCSV}>
            <Download className="mr-2 h-4 w-4" />
            {__('Download CSV')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 5: Import
  const renderImportStep = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {importResult?.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : importResult ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Upload className="w-5 h-5 text-blue-500" />
          )}
          {importResult ? __('Import Complete') : __('Import Accounts')}
        </CardTitle>
        <CardDescription>
          {importResult
            ? __('Review the import results')
            : __('Click the button below to import accounts to the database')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!importResult && !importing && (
          <div className="text-center py-8">
            <div className="mb-4">
              <p className="text-lg font-medium">
                {__('Ready to import')} {mappedData.length} {__('accounts')}
              </p>
              <p className="text-muted-foreground">
                {__('to')}{' '}
                <span className="font-medium">{selectedCompany?.name}</span>
              </p>
            </div>
            <Button size="lg" onClick={handleImport} className="px-8">
              <Upload className="mr-2 h-5 w-5" />
              {__('Import Now')}
            </Button>
          </div>
        )}

        {importing && (
          <div className="py-8 space-y-4">
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-muted-foreground">
              {__('Importing accounts...')} {importProgress}%
            </p>
          </div>
        )}

        {importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {importResult.created.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {__('Created')}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-yellow-600">
                    {importResult.skipped.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {__('Skipped')}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="pt-6 text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {importResult.failed.length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {__('Failed')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {importResult.failed.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{__('Failed Accounts')}</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="h-[100px] mt-2">
                    <ul className="text-sm space-y-1">
                      {importResult.failed.map((fail) => (
                        <li key={fail.account}>
                          <span className="font-mono">{fail.account}</span>:{' '}
                          {fail.error}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" onClick={resetWizard}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {__('Import Another')}
              </Button>
              <Button
                onClick={() => {
                  window.open(
                    `/app/account?company=${encodeURIComponent(selectedCompany?.name || '')}`,
                    '_blank'
                  );
                }}
              >
                {__('View Accounts')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-500" />
            {__('Chart of Accounts Import')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {__(
              'One-Stop Service for importing accounts with Thai translations'
            )}
          </p>
        </div>
        <Button variant="outline" onClick={resetWizard} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          {__('Reset')}
        </Button>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between px-4">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isActive
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              <span
                className={`ml-2 text-sm font-medium hidden sm:inline ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {__(step.name)}
              </span>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 ${
                    currentStep > step.id
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/30'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      {renderStepContent()}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 1}
          className="cursor-pointer"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {__('Back')}
        </Button>
        {currentStep < 5 ? (
          <Button
            onClick={goNext}
            disabled={!canGoNext()}
            className="cursor-pointer"
          >
            {__('Next')}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          !importResult && (
            <Button
              onClick={handleImport}
              disabled={importing}
              className="cursor-pointer"
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {__('Start Import')}
            </Button>
          )
        )}
      </div>
    </div>
  );
};

export default AccountMapperPage;
