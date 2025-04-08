import React, { useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle
// } from './ui/card';
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Search, Plus } from "lucide-react";

interface GlossaryTerm {
  source_term: string;
  thai_translation: string;
  context?: string;
  category?: string;
  is_approved: boolean;
  module?: string;
}

interface GlossaryData {
  terms: GlossaryTerm[];
  modules: Record<string, string>;
}

const categoryOptions = [
  { value: "Business", label: "Business" },
  { value: "Technical", label: "Technical" },
  { value: "UI", label: "UI" },
  { value: "Date/Time", label: "Date/Time" },
  { value: "Status", label: "Status" },
];

const GlossaryManager: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isAddTermDialogOpen, setIsAddTermDialogOpen] = useState(false);
  const [newTerm, setNewTerm] = useState<Partial<GlossaryTerm>>({
    source_term: "",
    thai_translation: "",
    context: "",
    category: "",
    module: "",
  });

  const { data, error, isLoading, mutate } = useFrappeGetCall<{
    message: GlossaryData;
  }>("translation_tools.api.get_glossary_terms", {});

  const {
    call: addTermCall,
    loading: addingTerm,
    error: addTermError,
  } = useFrappePostCall("translation_tools.api.add_glossary_term");

  // Filter terms
  const filteredTerms =
    data?.message?.terms?.filter((term) => {
      const matchesSearch = searchTerm
        ? term.source_term.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.thai_translation.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesCategory =
        categoryFilter && categoryFilter !== "all"
          ? term.category === categoryFilter
          : true;

      return matchesSearch && matchesCategory;
    }) || [];

  // Handle adding a new term
  const handleAddTerm = async () => {
    if (!newTerm.source_term || !newTerm.thai_translation) return;

    try {
      const result = await addTermCall({
        source_term: newTerm.source_term,
        thai_translation: newTerm.thai_translation,
        context: newTerm.context,
        category: newTerm.category,
        module: newTerm.module,
      });

      if (result?.message?.success) {
        // Reset form and close dialog
        setNewTerm({
          source_term: "",
          thai_translation: "",
          context: "",
          category: "",
          module: "",
        });
        setIsAddTermDialogOpen(false);

        // Refresh the terms list
        mutate();
      }
    } catch (err) {
      console.error("Error adding term:", err);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Thai Translation Glossary</h2>

        <Button
          onClick={() => setIsAddTermDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Add New Term
        </Button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded m-4">
              <p className="font-medium">Error loading glossary</p>
              <p>{error.message || "Unknown error occurred"}</p>
              <Button
                onClick={() => mutate()}
                variant="destructive"
                size="sm"
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source Term (EN)</TableHead>
                    <TableHead>Thai Translation</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTerms.length > 0 ? (
                    filteredTerms.map((term) => (
                      <TableRow key={term.source_term}>
                        <TableCell className="font-medium">
                          {term.source_term}
                        </TableCell>
                        <TableCell>{term.thai_translation}</TableCell>
                        <TableCell>
                          {term.category ? (
                            <Badge variant="outline">{term.category}</Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {term.module ? (
                            data?.message?.modules[term.module] || term.module
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {term.is_approved ? (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 hover:bg-green-100"
                            >
                              Approved
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                            >
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No terms found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Term Dialog */}
      <Dialog open={isAddTermDialogOpen} onOpenChange={setIsAddTermDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Glossary Term</DialogTitle>
            <DialogDescription>
              Add a new term to the Thai translation glossary
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="source_term" className="required">
                Source Term (English)
              </Label>
              <Input
                id="source_term"
                value={newTerm.source_term}
                onChange={(e) =>
                  setNewTerm({ ...newTerm, source_term: e.target.value })
                }
                placeholder="Enter the English term"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="thai_translation" className="required">
                Thai Translation
              </Label>
              <Input
                id="thai_translation"
                value={newTerm.thai_translation}
                onChange={(e) =>
                  setNewTerm({ ...newTerm, thai_translation: e.target.value })
                }
                placeholder="Enter the Thai translation"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="context">Context</Label>
              <Textarea
                id="context"
                value={newTerm.context || ""}
                onChange={(e) =>
                  setNewTerm({ ...newTerm, context: e.target.value })
                }
                placeholder="Optional: Provide context for when this term should be used"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={newTerm.category || ""}
                onValueChange={(value) =>
                  setNewTerm({ ...newTerm, category: value })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="module">Module</Label>
              <Select
                value={newTerm.module || ""}
                onValueChange={(value) =>
                  setNewTerm({ ...newTerm, module: value })
                }
              >
                <SelectTrigger id="module">
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {data?.message?.modules &&
                    Object.entries(data.message.modules).map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {addTermError && (
              <div className="p-2 border border-red-200 bg-red-50 text-red-700 rounded">
                <p className="font-medium">Error</p>
                <p className="text-sm">
                  {addTermError.message ||
                    "An error occurred while adding the term"}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddTermDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTerm}
              disabled={
                addingTerm || !newTerm.source_term || !newTerm.thai_translation
              }
            >
              {addingTerm ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>Add Term</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlossaryManager;
