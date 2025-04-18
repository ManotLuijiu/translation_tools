/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  useGetGlossaryTerms,
  useAddGlossaryTerm,
  useUpdateGlossaryTerm,
  useDeleteGlossaryTerm,
  useGetERPNextModules,
  GlossaryTerm,
} from '../api';
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
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function GlossaryManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const [formData, setFormData] = useState<Partial<GlossaryTerm>>({
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
    refetch: refreshTerms,
  } = useGetGlossaryTerms();
  const { data: modulesData, isLoading: isLoadingModules } =
    useGetERPNextModules();

  console.log('isLoadingModules', isLoadingModules);
  const addTerm = useAddGlossaryTerm();
  const updateTerm = useUpdateGlossaryTerm();
  const deleteTerm = useDeleteGlossaryTerm();

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

  const openEditDialog = (term: GlossaryTerm) => {
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

  const openDeleteDialog = (term: GlossaryTerm) => {
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

      const result = await addTerm.mutateAsync(formData);

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
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred',
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

      const result = await updateTerm.mutateAsync({
        name: selectedTerm.name,
        ...formData,
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
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred',
      });
    }
  };

  const handleDeleteTerm = async () => {
    try {
      if (!selectedTerm) return;

      const result = await deleteTerm.mutateAsync(selectedTerm.name);

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
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred',
      });
    }
  };

  const filteredTerms =
    termsData?.filter((term) => {
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
    <div className="tw-space-y-6">
      <div className="tw-flex tw-items-center tw-justify-between">
        <h2 className="tw-text-2xl tw-font-bold">Translation Glossary</h2>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="tw-mr-2 tw-h-4 tw-w-4" />
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

            <div className="tw-space-y-4 tw-py-4">
              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                <div className="tw-space-y-2">
                  <Label htmlFor="source_term">English Term *</Label>
                  <Input
                    id="source_term"
                    name="source_term"
                    value={formData.source_term || ''}
                    onChange={handleInputChange}
                    placeholder="Enter source term"
                    required
                  />
                </div>
                <div className="tw-space-y-2">
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

              <div className="tw-space-y-2">
                <Label htmlFor="context">Context</Label>
                <Textarea
                  id="context"
                  name="context"
                  value={formData.context || ''}
                  onChange={handleInputChange}
                  placeholder="Provide context for this term (optional)"
                  className="tw-h-20 tw-resize-none"
                />
              </div>

              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                <div className="tw-space-y-2">
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
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="tw-space-y-2">
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
                      {modulesData?.map((module) => (
                        <SelectItem key={module.name} value={module.name}>
                          {module.module_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="tw-flex tw-items-center tw-space-x-2">
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
                    <Check className="tw-h-4 tw-w-4" />
                  ) : (
                    <AlertCircle className="tw-h-4 tw-w-4" />
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
              <Button onClick={handleAddTerm} disabled={addTerm.isPending}>
                {addTerm.isPending ? (
                  <>
                    <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />
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

      <div className="tw-relative">
        <Search className="tw-absolute tw-left-2 tw-top-2.5 tw-h-4 tw-w-4 tw-text-muted-foreground" />
        <Input
          placeholder="Search terms..."
          className="tw-pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoadingTerms ? (
        <div className="tw-flex tw-justify-center tw-py-8">
          <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        </div>
      ) : termsError ? (
        <Alert variant="destructive">
          <AlertCircle className="tw-h-4 tw-w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {termsError.message || 'Failed to load glossary terms'}
          </AlertDescription>
        </Alert>
      ) : filteredTerms.length === 0 ? (
        <div className="tw-py-8 tw-text-center tw-text-muted-foreground">
          {searchTerm
            ? 'No terms match your search'
            : 'No glossary terms found. Click "Add Term" to create one.'}
        </div>
      ) : (
        <div className="tw-rounded-md tw-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>English Term</TableHead>
                <TableHead>Thai Translation</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="tw-w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerms.map((term) => (
                <TableRow key={term.name}>
                  <TableCell className="tw-font-medium">
                    {term.source_term}
                  </TableCell>
                  <TableCell>{term.thai_translation}</TableCell>
                  <TableCell>{term.category || '-'}</TableCell>
                  <TableCell>{term.module || '-'}</TableCell>
                  <TableCell>
                    {term.is_approved ? (
                      <Badge variant="default" className="tw-bg-green-500">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="tw-flex tw-space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(term)}
                      >
                        <Pencil className="tw-h-4 tw-w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(term)}
                      >
                        <Trash className="tw-h-4 tw-w-4" />
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

          <div className="tw-space-y-4 tw-py-4">
            {/* Same form fields as in Add Dialog */}
            <div className="tw-grid tw-grid-cols-2 tw-gap-4">
              <div className="tw-space-y-2">
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
              <div className="tw-space-y-2">
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

            <div className="tw-space-y-2">
              <Label htmlFor="edit_context">Context</Label>
              <Textarea
                id="edit_context"
                name="context"
                value={formData.context || ''}
                onChange={handleInputChange}
                placeholder="Provide context for this term (optional)"
                className="tw-h-20 tw-resize-none"
              />
            </div>

            <div className="tw-grid tw-grid-cols-2 tw-gap-4">
              <div className="tw-space-y-2">
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

              <div className="tw-space-y-2">
                <Label htmlFor="edit_module">Module</Label>
                <Select
                  value={formData.module || ''}
                  onValueChange={(value) => handleSelectChange('module', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {modulesData?.map((module) => (
                      <SelectItem key={module.name} value={module.name}>
                        {module.module_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="tw-flex tw-items-center tw-space-x-2">
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
                  <Check className="tw-h-4 tw-w-4" />
                ) : (
                  <AlertCircle className="tw-h-4 tw-w-4" />
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
            <Button onClick={handleUpdateTerm} disabled={updateTerm.isPending}>
              {updateTerm.isPending ? (
                <>
                  <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />
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
              className="tw-bg-destructive tw-text-destructive-foreground hover:tw-bg-destructive/90"
            >
              {deleteTerm.isPending ? (
                <>
                  <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />
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
