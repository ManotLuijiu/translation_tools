/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
  useGetGlossaryTerms,
  useAddGlossaryTerm,
  useUpdateGlossaryTerm,
  useDeleteGlossaryTerm,
  useGetERPNextModules,
  useCleanDuplicateGlossaryTerms,
  useUpdateGlossaryTermCategories,
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
import {
  Loader2,
  Plus,
  Search,
  Check,
  Trash,
  Pencil,
  AlertCircle,
  TagIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    module: '',
    is_approved: false,
  });
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // API hooks
  const {
    data: termsData,
    error: termsError,
    isLoading: isLoadingTerms,
    mutate: refreshTerms,
  } = useGetGlossaryTerms();

  console.log('termsData', termsData);

  const { data: modulesData, isLoading: isLoadingModules } =
    useGetERPNextModules();

  console.log('isLoadingModules', isLoadingModules);
  const addTerm = useAddGlossaryTerm();
  const updateTerm = useUpdateGlossaryTerm();
  const deleteTerm = useDeleteGlossaryTerm();
  const cleanDuplicates = useCleanDuplicateGlossaryTerms();
  const updateCategories = useUpdateGlossaryTermCategories();

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
      module: '',
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
      module: term.module,
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

      const result = await addTerm.call({ term: formData });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Term added successfully',
        });
        resetForm();
        setIsAddDialogOpen(false);
        refreshTerms();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to add term',
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
      });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Term updated successfully',
        });
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
      });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Term deleted successfully',
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

  const handleUpdateCategories = async () => {
    console.log('clicked');
    try {
      const result = await updateCategories.call({});

      console.log('result', result);

      if (result?.success) {
        setStatusMessage({
          type: 'success',
          message: result.message,
        });

        refreshTerms();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: `Failed to update categories ${err}`,
      });
    }
  };

  const filteredTerms =
    termsData?.message?.filter((term) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        term.source_term.toLowerCase().includes(searchLower) ||
        term.thai_translation.toLowerCase().includes(searchLower)
      );
    }) || [];

  const categories = [
    { value: 'Business', label: 'Business' },
    { value: 'Technical', label: 'Technical' },
    { value: 'UI', label: 'UI' },
    { value: 'Date/Time', label: 'Date/Time' },
    { value: 'Status', label: 'Status' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Translation Glossary</h2>

        <div className="flex justify-between space-x-2">
          <Button
            onClick={handleCleanupDuplicates}
            disabled={cleanDuplicates.loading}
          >
            {cleanDuplicates.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash className="mr-2 h-4 w-4" />
                Clean Duplicates
              </>
            )}
          </Button>
          <Button
            onClick={handleUpdateCategories}
            disabled={updateCategories.loading}
          >
            {updateCategories.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating Categories...
              </>
            ) : (
              <>
                <TagIcon className="mr-2 h-4 w-4" />
                Update Categories
              </>
            )}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Term
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Glossary Term</DialogTitle>
                <DialogDescription>
                  Add a new term to the translation glossary.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source_term">
                      English Term <span className="text-red-600">*</span>
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
                    <Label htmlFor="thai_translation">Thai Translation *</Label>
                    <Input
                      id="thai_translation"
                      name="thai_translation"
                      value={formData.thai_translation || ''}
                      onChange={handleInputChange}
                      placeholder="Enter Thai translation"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="context">Context</Label>
                  <Textarea
                    id="context"
                    name="context"
                    value={formData.context || ''}
                    onChange={handleInputChange}
                    placeholder="Provide context for this term (optional)"
                    className="h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
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

                  <div className="space-y-2">
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
                        {modulesData?.message?.map((module) => (
                          <SelectItem key={module.name} value={module.name}>
                            {module.module_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!!formData.is_approved}
                    onCheckedChange={handleSwitchChange}
                    id="is_approved"
                  />
                  <Label htmlFor="is_approved">Approved Term</Label>
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
                      Adding...
                    </>
                  ) : (
                    'Save Term'
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
          placeholder="Search terms..."
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
            {termsError.message || 'Failed to load glossary terms'}
          </AlertDescription>
        </Alert>
      ) : filteredTerms.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          {searchTerm
            ? 'No terms match your search'
            : 'No glossary terms found. Click "Add Term" to create one.'}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>English Term</TableHead>
                <TableHead>Thai Translation</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerms.map((term) => (
                <TableRow key={term.name}>
                  <TableCell className="font-medium">
                    {term.source_term}
                  </TableCell>
                  <TableCell>{term.thai_translation}</TableCell>
                  <TableCell>{term.category || '-'}</TableCell>
                  <TableCell>{term.module || '-'}</TableCell>
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
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Glossary Term</DialogTitle>
            <DialogDescription>
              Update the translation glossary term.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Same form fields as in Add Dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_source_term">English Term *</Label>
                <Input
                  id="edit_source_term"
                  name="source_term"
                  value={formData.source_term || ''}
                  onChange={handleInputChange}
                  placeholder="Enter source term"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_thai_translation">
                  Thai Translation *
                </Label>
                <Input
                  id="edit_thai_translation"
                  name="thai_translation"
                  value={formData.thai_translation || ''}
                  onChange={handleInputChange}
                  placeholder="Enter Thai translation"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_context">Context</Label>
              <Textarea
                id="edit_context"
                name="context"
                value={formData.context || ''}
                onChange={handleInputChange}
                placeholder="Provide context for this term (optional)"
                className="h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_category">Category</Label>
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
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_module">Module</Label>
                <Select
                  value={formData.module || ''}
                  onValueChange={(value) => handleSelectChange('module', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modulesData?.message?.map((module) => (
                      <SelectItem key={module.name} value={module.name}>
                        {module.module_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={!!formData.is_approved}
                onCheckedChange={handleSwitchChange}
                id="edit_is_approved"
              />
              <Label htmlFor="edit_is_approved">Approved Term</Label>
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
                  Updating...
                </>
              ) : (
                'Update Term'
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
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
