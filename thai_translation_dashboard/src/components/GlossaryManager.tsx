/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
// import useGetFrappeAuth, { useGetFrappeUser } from '@/hooks/useFrappeAuth';
import {
  useGetGlossaryTerms,
  useAddGlossaryTerm,
  useUpdateGlossaryTerm,
  useDeleteGlossaryTerm,
  useCleanDuplicateGlossaryTerms,
  useUpdateGlossaryTermCategories,
  useSyncGlossaryFromFile,
  useSyncGlossaryFromGitHub,
} from '../api';
import type { GlossaryTerm as GlossaryTermType } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Loader2,
  Plus,
  Search,
  Check,
  Trash,
  Pencil,
  AlertCircle,
  TagIcon,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';

import { useTranslation } from '@/context/TranslationContext';

export default function GlossaryManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTermType | null>(
    null
  );
  const [formData, setFormData] = useState<Partial<GlossaryTermType>>({
    source_term: '',
    thai_translation: '',
    context: '',
    category: '',
    // module: '',
    is_approved: false,
  });
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [pushToGithub, setPushToGithub] = useState(false);

  const [currentTab, setCurrentTab] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({
    all: 1,
    Business: 1,
    Technical: 1,
    UI: 1,
    'Date/Time': 1,
    Status: 1,
  });

  // API hooks
  const {
    data: termsData,
    error: termsError,
    isLoading: isLoadingTerms,
    mutate: refreshTerms,
  } = useGetGlossaryTerms();

  // console.log('termsData', termsData);

  const addTerm = useAddGlossaryTerm();
  const updateTerm = useUpdateGlossaryTerm();
  const deleteTerm = useDeleteGlossaryTerm();
  const cleanDuplicates = useCleanDuplicateGlossaryTerms();
  // const updateCategories = useUpdateGlossaryTermCategories();
  const syncFromFile = useSyncGlossaryFromFile();
  const syncFromGitHub = useSyncGlossaryFromGitHub();
  const { translate: __, isReady } = useTranslation();

  // Fetch glossary at component mount
  useEffect(() => {
    // Trigger a refresh of the glossary terms data when the component mounts
    refreshTerms();
  }, [refreshTerms]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_approved: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      source_term: '',
      thai_translation: '',
      context: '',
      category: '',
      // module: '',
      is_approved: false,
    });
    setSelectedTerm(null);
  };

  const openEditDialog = (term: GlossaryTermType) => {
    setSelectedTerm(term);
    setFormData({
      source_term: term.source_term,
      thai_translation: term.thai_translation,
      context: term.context,
      category: term.category,
      // module: term.module,
      is_approved: term.is_approved,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (term: GlossaryTermType) => {
    setSelectedTerm(term);
    setIsDeleteDialogOpen(true);
  };

  const handleAddTerm = async () => {
    try {
      if (!formData.source_term || !formData.thai_translation) {
        setStatusMessage({
          type: 'error',
          message: 'Source term and Thai translation are required',
        });
        return;
      }

      const result = await addTerm.call({
        term: formData,
        push_to_github: pushToGithub,
      });
      const { message } = result;

      // console.log('result GlossaryManager', result);
      // console.log('message GlossaryManager', message);

      if (message && message.success) {
        let successMessage = 'Term added successfully';

        // Add GitHub status to success message
        if (pushToGithub && message.github) {
          if (message.github.github_pushed) {
            const gh = message.github as { push_mode?: string; pr_url?: string; branch?: string; github_pushed: boolean };
            if (gh.push_mode === 'pr' && gh.pr_url) {
              successMessage += ` and PR created: ${gh.pr_url}`;
            } else if (gh.push_mode === 'pr' && gh.branch) {
              successMessage += ` and pushed to branch: ${gh.branch}`;
            } else {
              successMessage += ' and pushed to GitHub';
            }
          } else {
            successMessage += ` (GitHub: ${message.github.message})`;
          }
        }

        setStatusMessage({
          type: 'success',
          message: successMessage,
        });
        toast(successMessage);
        resetForm();
        setIsAddDialogOpen(false);
        refreshTerms();
      } else if (message && message.success === false) {
        setStatusMessage({
          type: 'error',
          message: message.message || 'Failed to add term',
        });
        toast.error(message.message);
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Unexpected response: Failed to add term',
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setStatusMessage({
        type: 'error',
        message: errorMessage,
      });
    }
  };

  const handleUpdateTerm = async () => {
    try {
      if (
        !selectedTerm ||
        !formData.source_term ||
        !formData.thai_translation
      ) {
        setStatusMessage({
          type: 'error',
          message: 'Source term and Thai translation are required',
        });
        return;
      }

      const result = await updateTerm.call({
        term_name: selectedTerm.name,
        updates: formData,
        push_to_github: pushToGithub,
      });

      if (result.success) {
        let successMessage = 'Term updated successfully';

        // Add GitHub status to success message
        if (pushToGithub && result.github) {
          if (result.github.github_pushed) {
            const gh = result.github as { push_mode?: string; pr_url?: string; branch?: string; github_pushed: boolean };
            if (gh.push_mode === 'pr' && gh.pr_url) {
              successMessage += ` and PR created: ${gh.pr_url}`;
            } else if (gh.push_mode === 'pr' && gh.branch) {
              successMessage += ` and pushed to branch: ${gh.branch}`;
            } else {
              successMessage += ' and pushed to GitHub';
            }
          } else {
            successMessage += ` (GitHub: ${result.github.message})`;
          }
        }

        setStatusMessage({
          type: 'success',
          message: successMessage,
        });
        toast(successMessage);
        resetForm();
        setIsEditDialogOpen(false);
        refreshTerms();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to update term',
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setStatusMessage({
        type: 'error',
        message: errorMessage,
      });
    }
  };

  const handleDeleteTerm = async () => {
    try {
      if (!selectedTerm) return;

      const result = await deleteTerm.call({
        term_name: selectedTerm.name,
        push_to_github: pushToGithub,
      });

      if (result.success) {
        let successMessage = 'Term deleted successfully';
        if (pushToGithub && result.github) {
          if (result.github.github_pushed) {
            successMessage += ` and pushed to GitHub (${result.github.terms_count} terms)`;
          } else {
            successMessage += `. GitHub sync failed: ${result.github.message}`;
          }
        }

        setStatusMessage({
          type: 'success',
          message: successMessage,
        });
        resetForm();
        setIsDeleteDialogOpen(false);
        refreshTerms();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to delete term',
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred';
      setStatusMessage({
        type: 'error',
        message: errorMessage,
      });
    }
  };

  const handleCleanupDuplicates = async () => {
    try {
      const result = await cleanDuplicates.call({});

      if (result.message.success) {
        // Show success message
        setStatusMessage({
          type: 'success',
          message: result.message.message,
        });

        // Refresh the glossary terms
        refreshTerms();
      }
    } catch {
      setStatusMessage({
        type: 'error',
        message: 'Failed to clean up duplicates',
      });
    }
  };

  // const handleUpdateCategories = async () => {
  //   // console.log('clicked');
  //   try {
  //     const result = await updateCategories;

  //     // console.log('result', result);

  //     if (result?.result?.success) {
  //       setStatusMessage({
  //         type: 'success',
  //         message: result.result?.message,
  //       });

  //       refreshTerms();
  //     }
  //     // setStatusMessage({
  //     //   type: 'success',
  //     //   message: result.result?.message || 'Categories updated successfully',
  //     // });
  //   } catch (err) {
  //     setStatusMessage({
  //       type: 'error',
  //       message: `Failed to update categories ${err}`,
  //     });
  //   }
  // };

  const handleSyncFromFile = async () => {
    try {
      const result = await syncFromFile.call({});

      if (result.message) {
        setStatusMessage({
          type: 'success',
          message: 'Successfully synced glossary terms from local file',
        });
        toast.success('Glossary synced from file');
        refreshTerms();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sync from file';
      setStatusMessage({
        type: 'error',
        message: errorMessage,
      });
      toast.error(errorMessage);
    }
  };

  const handleSyncFromGitHub = async () => {
    try {
      const response = await syncFromGitHub.call({});

      // Frappe wraps the response in a message property
      const result = response?.message || response;

      // Ensure result is properly structured
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from server');
      }

      if (result.success) {
        const stats = result.stats || { added: 0, updated: 0, skipped: 0 };
        const message = `GitHub sync completed: ${stats.added} added, ${stats.updated} updated, ${stats.skipped} unchanged`;

        setStatusMessage({
          type: 'success',
          message: message,
        });
        toast.success(message);
        refreshTerms();
      } else {
        const errorMessage =
          typeof result.message === 'string'
            ? result.message
            : 'Failed to sync from GitHub';
        setStatusMessage({
          type: 'error',
          message: errorMessage,
        });
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('GitHub sync error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to sync from GitHub';
      setStatusMessage({
        type: 'error',
        message: errorMessage,
      });
      toast.error(errorMessage);
    }
  };

  // Filter and categorize terms
  const categorizedTerms = useMemo(() => {
    if (!termsData?.message) return { all: [] };

    const filtered = termsData.message.filter((term) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        term.source_term.toLowerCase().includes(searchLower) ||
        term.thai_translation.toLowerCase().includes(searchLower)
      );
    });

    // Group by category
    return filtered.reduce(
      (acc: Record<string, GlossaryTermType[]>, term) => {
        // Add to 'all' category
        if (!acc.all) acc.all = [];
        acc.all.push(term);

        // Add to specific category
        const category = term.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(term);

        return acc;
      },
      { all: [] }
    );
  }, [termsData?.message, searchTerm]);

  // Pagination
  const paginatedTerms = useMemo(() => {
    const result: Record<string, GlossaryTermType[]> = {};

    for (const [category, terms] of Object.entries(categorizedTerms)) {
      const pageIndex = (currentPages[category] || 1) - 1;
      const startIndex = pageIndex * pageSize;
      result[category] = terms.slice(startIndex, startIndex + pageSize);
    }

    return result;
  }, [categorizedTerms, currentPages, pageSize]);

  const totalPages = useMemo(() => {
    const result: Record<string, number> = {};

    for (const [category, terms] of Object.entries(categorizedTerms)) {
      result[category] = Math.ceil(terms.length / pageSize);
    }

    return result;
  }, [categorizedTerms, pageSize]);

  const handlePageChange = (category: string, page: number) => {
    setCurrentPages((prev) => ({
      ...prev,
      [category]: page,
    }));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    // Reset current pages when changing page size
    setCurrentPages({
      all: 1,
      Business: 1,
      Technical: 1,
      UI: 1,
      'Date/Time': 1,
      Status: 1,
    });
  };

  // const filteredTerms =
  //   termsData?.message?.filter((term) => {
  //     if (!searchTerm) return true;

  //     const searchLower = searchTerm.toLowerCase();
  //     return (
  //       term.source_term.toLowerCase().includes(searchLower) ||
  //       term.thai_translation.toLowerCase().includes(searchLower)
  //     );
  //   }) || [];

  const categories = [
    { value: 'Business', label: 'Business' },
    { value: 'Technical', label: 'Technical' },
    { value: 'UI', label: 'UI' },
    { value: 'Date/Time', label: 'Date/Time' },
    { value: 'Status', label: 'Status' },
  ];

  // Count terms by category for tab badges
  const categoryCounts = useMemo(() => {
    return Object.entries(categorizedTerms).reduce(
      (acc, [category, terms]) => {
        acc[category] = terms.length;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [categorizedTerms]);

  // console.log('frappeAuth', frappeAuth);
  // console.log('frappeAll', frappeAll.data.message.email);
  // console.log('mooCoding', mooCoding);

  // Render glossary table
  const renderGlossaryTable = (category: string) => {
    const terms = paginatedTerms[category] || [];
    const currentPage = currentPages[category] || 1;
    const totalPagesForCategory = totalPages[category] || 1;

    return (
      <div className="space-y-4">
        {terms.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            {searchTerm
              ? 'No terms match your search'
              : 'No glossary terms found in this category. Click "Add Term" to create one.'}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>English Term</TableHead>
                    <TableHead>Thai Translation</TableHead>
                    {category === 'all' && <TableHead>Category</TableHead>}
                    {/* <TableHead>Module</TableHead> */}
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((term) => (
                    <TableRow key={term.name}>
                      <TableCell className="font-medium">
                        {term.source_term}
                      </TableCell>
                      <TableCell>{term.thai_translation}</TableCell>
                      {category === 'all' && (
                        <TableCell>{term.category || '-'}</TableCell>
                      )}
                      {/* <TableCell>{term.module || '-'}</TableCell> */}
                      <TableCell>
                        {term.is_approved ? (
                          <Badge variant="default" className="bg-green-500">
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(term)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(term)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label htmlFor="pageSize">Rows per page:</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) =>
                    handlePageSizeChange(Number.parseInt(value))
                  }
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue placeholder={pageSize.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(
                    currentPage * pageSize,
                    categorizedTerms[category]?.length || 0
                  )}{' '}
                  of {categorizedTerms[category]?.length || 0} entries
                </span>
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        handlePageChange(category, Math.max(1, currentPage - 1))
                      }
                      className={
                        currentPage === 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>

                  {/* First page */}
                  {currentPage > 2 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(category, 1)}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Ellipsis if needed */}
                  {currentPage > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Previous page if not first */}
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() =>
                          handlePageChange(category, currentPage - 1)
                        }
                      >
                        {currentPage - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Current page */}
                  <PaginationItem>
                    <PaginationLink isActive>{currentPage}</PaginationLink>
                  </PaginationItem>

                  {/* Next page if not last */}
                  {currentPage < totalPagesForCategory && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() =>
                          handlePageChange(category, currentPage + 1)
                        }
                      >
                        {currentPage + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {/* Ellipsis if needed */}
                  {currentPage < totalPagesForCategory - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {/* Last page if not current */}
                  {currentPage < totalPagesForCategory - 1 &&
                    totalPagesForCategory > 1 && (
                      <PaginationItem>
                        <PaginationLink
                          onClick={() =>
                            handlePageChange(category, totalPagesForCategory)
                          }
                        >
                          {totalPagesForCategory}
                        </PaginationLink>
                      </PaginationItem>
                    )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        handlePageChange(
                          category,
                          Math.min(totalPagesForCategory, currentPage + 1)
                        )
                      }
                      className={
                        currentPage === totalPagesForCategory
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </div>
    );
  };

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>{!isReady ? 'Loading translation...' : 'Accessing...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{__('Translation Glossary')}</h2>

        <div className="flex justify-between space-x-2">
          <div className="flex space-x-2">
            <Button
              onClick={handleSyncFromFile}
              variant={'outline'}
              disabled={syncFromFile.loading}
            >
              {syncFromFile.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Syncing...')}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {__('Sync from File')}
                </>
              )}
            </Button>

            <Button
              onClick={handleSyncFromGitHub}
              variant={'outline'}
              disabled={syncFromGitHub.loading}
            >
              {syncFromGitHub.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Syncing from GitHub...')}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {__('Sync from GitHub')}
                </>
              )}
            </Button>

            <Button
              onClick={handleCleanupDuplicates}
              variant={'outline'}
              disabled={cleanDuplicates.loading}
              className="hidden"
            >
              {cleanDuplicates.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Cleaning...')}
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  {__('Clean Duplicates')}
                </>
              )}
            </Button>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {__('Add Term')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{__('Add New Glossary Term')}</DialogTitle>
                <DialogDescription>
                  {__('Add a new term to the translation glossary.')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source_term">
                      {__('English Term')}{' '}
                      <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="source_term"
                      name="source_term"
                      value={formData.source_term || ''}
                      onChange={handleInputChange}
                      placeholder="Enter source term"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thai_translation">
                      {__('Thai Translation')}{' '}
                      <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="thai_translation"
                      name="thai_translation"
                      value={formData.thai_translation || ''}
                      onChange={handleInputChange}
                      placeholder={__('Enter Thai translation')}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">{__('Context')}</Label>
                  <Textarea
                    id="context"
                    name="context"
                    value={formData.context || ''}
                    onChange={handleInputChange}
                    placeholder={__('Provide context for this term (optional)')}
                    className="h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">{__('Category')}</Label>
                    <Select
                      value={formData.category || ''}
                      onValueChange={(value) =>
                        handleSelectChange('category', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* <div className="space-y-2">
                    <Label htmlFor="module">Module</Label>
                    <Select
                      value={formData.module || ''}
                      onValueChange={(value) =>
                        handleSelectChange('module', value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modulesData?.message?.map(
                          (module: { name: string; module_name: string }) => (
                            <SelectItem key={module.name} value={module.name}>
                              {module.module_name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div> */}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!!formData.is_approved}
                    onCheckedChange={handleSwitchChange}
                    id="is_approved"
                  />
                  <Label htmlFor="is_approved">{__('Approved Term')}</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="push-to-github"
                    checked={pushToGithub}
                    onCheckedChange={setPushToGithub}
                  />
                  <Label
                    htmlFor="push-to-github"
                    className={cn(
                      'cursor-pointer',
                      pushToGithub ? 'text-green-600' : ''
                    )}
                  >
                    {__('Push to Github')}
                  </Label>
                </div>

                {statusMessage && (
                  <Alert
                    variant={
                      statusMessage.type === 'error' ? 'destructive' : 'default'
                    }
                  >
                    {statusMessage.type === 'success' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {statusMessage.type === 'success' ? 'Success' : 'Error'}
                    </AlertTitle>
                    <AlertDescription>{statusMessage.message}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddTerm} disabled={addTerm.loading}>
                  {addTerm.loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {__('Adding...')}
                    </>
                  ) : (
                    __('Save Term')
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
        <Input
          placeholder={__('Search terms...')}
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoadingTerms ? (
        <div className="flex justify-center py-8">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : termsError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {termsError.message || __('Failed to load glossary terms')}
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="w-full border-b">
            <TabsTrigger value="all" className="cursor-pointer">
              All
              <Badge variant="secondary" className="ml-2">
                {categoryCounts.all || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="Business" className="cursor-pointer">
              Business
              <Badge variant="secondary" className="ml-2">
                {categoryCounts.Business || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="Technical" className="cursor-pointer">
              Technical
              <Badge variant="secondary" className="ml-2">
                {categoryCounts.Technical || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="UI" className="cursor-pointer">
              UI
              <Badge variant="secondary" className="ml-2">
                {categoryCounts.UI || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="Date/Time" className="cursor-pointer">
              Date/Time
              <Badge variant="secondary" className="ml-2">
                {categoryCounts['Date/Time'] || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="Status" className="cursor-pointer">
              Status
              <Badge variant="secondary" className="ml-2">
                {categoryCounts.Status || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">{renderGlossaryTable('all')}</TabsContent>

          <TabsContent value="Business">
            {renderGlossaryTable('Business')}
          </TabsContent>

          <TabsContent value="Technical">
            {renderGlossaryTable('Technical')}
          </TabsContent>

          <TabsContent value="UI">{renderGlossaryTable('UI')}</TabsContent>

          <TabsContent value="Date/Time">
            {renderGlossaryTable('Date/Time')}
          </TabsContent>

          <TabsContent value="Status">
            {renderGlossaryTable('Status')}
          </TabsContent>
        </Tabs>
        // <div className="rounded-md border">
        //   <Table>
        //     <TableHeader>
        //       <TableRow>
        //         <TableHead>English Term</TableHead>
        //         <TableHead>Thai Translation</TableHead>
        //         <TableHead>Category</TableHead>
        //         <TableHead>Module</TableHead>
        //         <TableHead>Status</TableHead>
        //         <TableHead className="w-[100px]">Actions</TableHead>
        //       </TableRow>
        //     </TableHeader>
        //     <TableBody>
        //       {filteredTerms.map((term) => (
        //         <TableRow key={term.name}>
        //           <TableCell className="font-medium">
        //             {term.source_term}
        //           </TableCell>
        //           <TableCell>{term.thai_translation}</TableCell>
        //           <TableCell>{term.category || '-'}</TableCell>
        //           <TableCell>{term.module || '-'}</TableCell>
        //           <TableCell>
        //             {term.is_approved ? (
        //               <Badge variant="default" className="bg-green-500">
        //                 Approved
        //               </Badge>
        //             ) : (
        //               <Badge variant="outline">Pending</Badge>
        //             )}
        //           </TableCell>
        //           <TableCell>
        //             <div className="flex space-x-2">
        //               <Button
        //                 variant="ghost"
        //                 size="icon"
        //                 onClick={() => openEditDialog(term)}
        //               >
        //                 <Pencil className="h-4 w-4" />
        //               </Button>
        //               <Button
        //                 variant="ghost"
        //                 size="icon"
        //                 onClick={() => openDeleteDialog(term)}
        //               >
        //                 <Trash className="h-4 w-4" />
        //               </Button>
        //             </div>
        //           </TableCell>
        //         </TableRow>
        //       ))}
        //     </TableBody>
        //   </Table>
        // </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{__('Edit Glossary Term')}</DialogTitle>
            <DialogDescription>
              {__('Update the translation glossary term.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Same form fields as in Add Dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_source_term">
                  English Term <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="edit_source_term"
                  name="source_term"
                  value={formData.source_term || ''}
                  onChange={handleInputChange}
                  placeholder={__('Enter source term')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_thai_translation">
                  {__('Thai Translation')}{' '}
                  <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="edit_thai_translation"
                  name="thai_translation"
                  value={formData.thai_translation || ''}
                  onChange={handleInputChange}
                  placeholder={__('Enter Thai translation')}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_context">{__('Context')}</Label>
              <Textarea
                id="edit_context"
                name="context"
                value={formData.context || ''}
                onChange={handleInputChange}
                placeholder={__('Provide context for this term (optional)')}
                className="h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_category">{__('Category')}</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) =>
                    handleSelectChange('category', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={__('Select category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="edit_module">Module</Label>
                <Select
                  value={formData.module || ''}
                  onValueChange={(value) => handleSelectChange('module', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modulesData?.message?.map(
                      (module: { name: string; module_name: string }) => (
                        <SelectItem key={module.name} value={module.name}>
                          {module.module_name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div> */}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={!!formData.is_approved}
                onCheckedChange={handleSwitchChange}
                id="edit_is_approved"
              />
              <Label htmlFor="edit_is_approved">{__('Approved Term')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-push-to-github"
                checked={pushToGithub}
                onCheckedChange={setPushToGithub}
              />
              <Label
                htmlFor="edit-push-to-github"
                className={cn(
                  'cursor-pointer',
                  pushToGithub ? 'text-green-600' : ''
                )}
              >
                {__('Push to Github')}
              </Label>
            </div>

            {statusMessage && (
              <Alert
                variant={
                  statusMessage.type === 'error' ? 'destructive' : 'default'
                }
              >
                {statusMessage.type === 'success' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {statusMessage.type === 'success' ? 'Success' : 'Error'}
                </AlertTitle>
                <AlertDescription>{statusMessage.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateTerm} disabled={updateTerm.loading}>
              {updateTerm.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Updating...')}
                </>
              ) : (
                __('Update Term')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the glossary term "
              {selectedTerm?.source_term}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTerm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTerm.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Deleting...')}
                </>
              ) : (
                __('Delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
