import React, { useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, Plus, Check, X, Loader2, Pencil, Trash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";

type GlossaryTerm = {
  name: string;
  source_term: string;
  thai_translation: string;
  context?: string;
  category?: string;
  module?: string;
  is_approved: 0 | 1;
};

type Module = {
  name: string;
  module_name: string;
  description?: string;
};

const GlossaryManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTerm, setEditTerm] = useState<GlossaryTerm | null>(null);
  const [newTerm, setNewTerm] = useState({
    source_term: "",
    thai_translation: "",
    context: "",
    category: "Business",
    module: "",
    is_approved: true,
  });

  const {
    data: termsData,
    error,
    isValidating,
    mutate,
  } = useFrappeGetCall<{ message: GlossaryTerm[] }>(
    "translation_tools.api.get_glossary_terms",
    {}
  );

  const { data: modulesData } = useFrappeGetCall<{ message: Module[] }>(
    "translation_tools.api.get_erpnext_modules",
    {}
  );

  const { call: addTerm, loading: isAdding } = useFrappePostCall(
    "translation_tools.api.add_glossary_term"
  );

  const { call: updateTerm, loading: isUpdating } = useFrappePostCall(
    "translation_tools.api.update_glossary_term"
  );

  const { call: deleteTerm, loading: isDeleting } = useFrappePostCall(
    "translation_tools.api.delete_glossary_term"
  );

  console.log("isDeleting", isDeleting);

  const handleAddTerm = async () => {
    try {
      await addTerm({
        term: {
          ...newTerm,
          is_approved: newTerm.is_approved ? 1 : 0,
        },
      });

      setNewTerm({
        source_term: "",
        thai_translation: "",
        context: "",
        category: "Business",
        module: "",
        is_approved: true,
      });

      setIsAddDialogOpen(false);
      toast("Glossary term has been added successfully.");

      mutate();
    } catch (error) {
      toast((error as Error).message || "Something went wrong");
    }
  };

  const handleUpdateTerm = async () => {
    if (!editTerm) return;

    try {
      await updateTerm({
        term_name: editTerm.name,
        updates: {
          source_term: editTerm.source_term,
          thai_translation: editTerm.thai_translation,
          context: editTerm.context,
          category: editTerm.category,
          module: editTerm.module,
          is_approved: editTerm.is_approved,
        },
      });

      setIsEditDialogOpen(false);
      toast("Glossary term has been updated successfully.");

      mutate();
    } catch (error) {
      toast((error as Error).message || "Something went wrong");
    }
  };

  const handleDeleteTerm = async (termName: string) => {
    if (!confirm("Are you sure you want to delete this term?")) return;

    try {
      await deleteTerm({
        term_name: termName,
      });

      toast("Glossary term has been deleted successfully.");

      mutate();
    } catch (error) {
      toast((error as Error).message || "Something went wrong");
    }
  };

  const filteredTerms = termsData?.message?.filter((term) => {
    const matchesSearch =
      !searchTerm ||
      term.source_term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.thai_translation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || term.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = termsData?.message
    ? [
        ...new Set(
          termsData.message.map((term) => term.category).filter(Boolean)
        ),
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Glossary Manager</CardTitle>
              <CardDescription>
                Manage the Thai translation glossary terms
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Term
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Add New Glossary Term</DialogTitle>
                  <DialogDescription>
                    Add a new term to the Thai translation glossary.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="source_term"
                      className="text-right text-sm font-medium"
                    >
                      Source Term
                    </label>
                    <Input
                      id="source_term"
                      value={newTerm.source_term}
                      onChange={(e) =>
                        setNewTerm({ ...newTerm, source_term: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="thai_translation"
                      className="text-right text-sm font-medium"
                    >
                      Thai Translation
                    </label>
                    <Input
                      id="thai_translation"
                      value={newTerm.thai_translation}
                      onChange={(e) =>
                        setNewTerm({
                          ...newTerm,
                          thai_translation: e.target.value,
                        })
                      }
                      className="col-span-3 font-thai"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="context"
                      className="text-right text-sm font-medium"
                    >
                      Context
                    </label>
                    <Textarea
                      id="context"
                      value={newTerm.context}
                      onChange={(e) =>
                        setNewTerm({ ...newTerm, context: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="category"
                      className="text-right text-sm font-medium"
                    >
                      Category
                    </label>
                    <Select
                      value={newTerm.category}
                      onValueChange={(value) =>
                        setNewTerm({ ...newTerm, category: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="UI">UI</SelectItem>
                        <SelectItem value="Date/Time">Date/Time</SelectItem>
                        <SelectItem value="Status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="module"
                      className="text-right text-sm font-medium"
                    >
                      Module
                    </label>
                    <Select
                      value={newTerm.module}
                      onValueChange={(value) =>
                        setNewTerm({ ...newTerm, module: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a module" />
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label
                      htmlFor="is_approved"
                      className="text-right text-sm font-medium"
                    >
                      Approved
                    </label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Checkbox
                        id="is_approved"
                        checked={newTerm.is_approved}
                        onCheckedChange={(checked) =>
                          setNewTerm({
                            ...newTerm,
                            is_approved: checked as boolean,
                          })
                        }
                      />
                      <label htmlFor="is_approved" className="text-sm">
                        Mark as approved term
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddTerm} disabled={isAdding}>
                    {isAdding && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Term
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Edit Glossary Term</DialogTitle>
                  <DialogDescription>
                    Update the glossary term information.
                  </DialogDescription>
                </DialogHeader>
                {editTerm && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="edit_source_term"
                        className="text-right text-sm font-medium"
                      >
                        Source Term
                      </label>
                      <Input
                        id="edit_source_term"
                        value={editTerm.source_term}
                        onChange={(e) =>
                          setEditTerm({
                            ...editTerm,
                            source_term: e.target.value,
                          })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="edit_thai_translation"
                        className="text-right text-sm font-medium"
                      >
                        Thai Translation
                      </label>
                      <Input
                        id="edit_thai_translation"
                        value={editTerm.thai_translation}
                        onChange={(e) =>
                          setEditTerm({
                            ...editTerm,
                            thai_translation: e.target.value,
                          })
                        }
                        className="col-span-3 font-thai"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="edit_context"
                        className="text-right text-sm font-medium"
                      >
                        Context
                      </label>
                      <Textarea
                        id="edit_context"
                        value={editTerm.context || ""}
                        onChange={(e) =>
                          setEditTerm({ ...editTerm, context: e.target.value })
                        }
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="edit_category"
                        className="text-right text-sm font-medium"
                      >
                        Category
                      </label>
                      <Select
                        value={editTerm.category || "Business"}
                        onValueChange={(value) =>
                          setEditTerm({ ...editTerm, category: value })
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Technical">Technical</SelectItem>
                          <SelectItem value="UI">UI</SelectItem>
                          <SelectItem value="Date/Time">Date/Time</SelectItem>
                          <SelectItem value="Status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="edit_module"
                        className="text-right text-sm font-medium"
                      >
                        Module
                      </label>
                      <Select
                        value={editTerm.module || ""}
                        onValueChange={(value) =>
                          setEditTerm({ ...editTerm, module: value })
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a module" />
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
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label
                        htmlFor="edit_is_approved"
                        className="text-right text-sm font-medium"
                      >
                        Approved
                      </label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <Checkbox
                          id="edit_is_approved"
                          checked={!!editTerm.is_approved}
                          onCheckedChange={(checked) =>
                            setEditTerm({
                              ...editTerm,
                              is_approved: checked ? 1 : 0,
                            })
                          }
                        />
                        <label htmlFor="edit_is_approved" className="text-sm">
                          Mark as approved term
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateTerm} disabled={isUpdating}>
                    {isUpdating && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Update Term
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search glossary terms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              <Loader2
                className={`h-4 w-4 mr-2 ${isValidating ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={categoryFilter === null ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(null)}
            >
              All
            </Button>
            {uniqueCategories.map((category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(category ?? null)}
              >
                {category}
              </Button>
            ))}
          </div>

          {isValidating && !termsData ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-2 text-muted-foreground">
                Loading glossary terms...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
              {error.message || "Failed to load glossary terms"}
            </div>
          ) : (
            <div className="border rounded-md">
              <div className="grid grid-cols-12 p-3 border-b font-medium text-sm">
                <div className="col-span-3">Source Term</div>
                <div className="col-span-3">Thai Translation</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Actions</div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {filteredTerms?.length ? (
                  filteredTerms.map((term) => (
                    <div
                      key={term.name}
                      className="grid grid-cols-12 p-3 border-b text-sm items-center hover:bg-secondary/40"
                    >
                      <div className="col-span-3 font-medium">
                        {term.source_term}
                      </div>
                      <div className="col-span-3 font-thai">
                        {term.thai_translation}
                      </div>
                      <div className="col-span-2">
                        {term.category || "Uncategorized"}
                      </div>
                      <div className="col-span-2">
                        {term.is_approved ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3 mr-1" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <X className="h-3 w-3 mr-1" /> Pending
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditTerm(term);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTerm(term.name)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No matching terms found
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlossaryManager;
