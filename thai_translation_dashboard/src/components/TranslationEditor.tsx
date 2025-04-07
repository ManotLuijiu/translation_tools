import React, { useState, useEffect } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
import { Badge } from "./ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "./ui/card";
import { Card, CardContent, CardFooter } from "./ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AlertCircle, Save, Cpu, RefreshCw, Search } from "lucide-react";

interface TranslationEditorProps {
  filePath: string;
  onTranslationComplete: (logFile: string) => void;
}

interface TranslationEntry {
  msgid: string;
  msgstr: string;
  msgctxt?: string;
  is_translated: boolean;
  is_fuzzy: boolean;
  locations: Array<[string, string]>;
  entry_type: "translated" | "untranslated" | "fuzzy";
}

interface PoFileContents {
  metadata: Record<string, string>;
  statistics: {
    total: number;
    translated: number;
    untranslated: number;
    fuzzy: number;
    percent_translated: number;
  };
  entries: TranslationEntry[];
  has_more: boolean;
}

const modelOptions = [
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-4-1106-preview", label: "GPT-4 Turbo" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
];

const TranslationEditor: React.FC<TranslationEditorProps> = ({
  filePath,
  onTranslationComplete,
}) => {
  const [filter, setFilter] = useState<
    "all" | "untranslated" | "translated" | "fuzzy"
  >("untranslated");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<TranslationEntry[]>(
    []
  );
  const [editedTranslations, setEditedTranslations] = useState<
    Record<string, string>
  >({});
  const [page, setPage] = useState(1);
  const [isTranslateDialogOpen, setIsTranslateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEditEntry, setCurrentEditEntry] =
    useState<TranslationEntry | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt-4-1106-preview");
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [temperature, setTemperature] = useState("0.3");
  const [isSaving, setIsSaving] = useState(false);
  const pageSize = 25;

  // Fetch file contents
  const { data, error, isLoading, mutate } = useFrappeGetCall<{
    message: PoFileContents;
  }>("translation_tools.api.get_po_file_contents", {
    file_path: filePath,
  });

  // For AI translation
  const {
    call: translateCall,
    loading: translating,
    error: translateError,
  } = useFrappePostCall(
    "translation_tools.api.translate_entries"
  );

  // For saving translations
  const {
    call: saveTranslationsCall,
    // loading: saving,
    // error: saveError,
  } = useFrappePostCall(
    "translation_tools.api.save_translations"
  );

  // Reset page and selected entries when file changes
  useEffect(() => {
    setPage(1);
    setSelectedEntries([]);
    setEditedTranslations({});
    setSearchTerm("");

    if (filePath) {
      mutate();
    }
  }, [filePath, mutate]);

  // Filter and paginate the entries
  const filteredEntries =
    data?.message?.entries?.filter((entry) => {
      if (searchTerm) {
        return (
          entry.msgid.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.msgstr.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (filter === "all") return true;
      if (filter === "untranslated") return !entry.is_translated;
      if (filter === "translated")
        return entry.is_translated && !entry.is_fuzzy;
      if (filter === "fuzzy") return entry.is_fuzzy;

      return true;
    }) || [];

  const paginatedEntries = filteredEntries.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.ceil(filteredEntries.length / pageSize);

  // Handle selection toggle for a single entry
  const toggleEntrySelection = (entry: TranslationEntry) => {
    if (selectedEntries.some((e) => e.msgid === entry.msgid)) {
      setSelectedEntries(
        selectedEntries.filter((e) => e.msgid !== entry.msgid)
      );
    } else {
      setSelectedEntries([...selectedEntries, entry]);
    }
  };

  // Handle selection toggle for all entries on the current page
  const toggleSelectAll = () => {
    if (selectedEntries.length === paginatedEntries.length) {
      // Deselect all on current page
      const currentPageIds = new Set(paginatedEntries.map((e) => e.msgid));
      setSelectedEntries(
        selectedEntries.filter((e) => !currentPageIds.has(e.msgid))
      );
    } else {
      // Select all on current page
      const newSelected = [...selectedEntries];
      paginatedEntries.forEach((entry) => {
        if (!newSelected.some((e) => e.msgid === entry.msgid)) {
          newSelected.push(entry);
        }
      });
      setSelectedEntries(newSelected);
    }
  };

  // Handle translation dialog
  const openTranslateDialog = () => {
    if (selectedEntries.length === 0) return;
    setIsTranslateDialogOpen(true);
  };

  // Handle edit dialog
  const openEditDialog = (entry: TranslationEntry) => {
    setCurrentEditEntry(entry);
    setIsEditDialogOpen(true);
  };

  // Handle translation with AI
  const handleTranslate = async () => {
    try {
      const result = await translateCall({
        file_path: filePath,
        entries: selectedEntries,
        model: selectedModel,
        model_provider: selectedProvider,
        temperature: parseFloat(temperature),
      });

      if (result?.message?.success) {
        // Apply the translations
        const newTranslations: Record<string, string> = {};
        result.message.results.forEach(
          (item: { msgid: string; msgstr: string }) => {
            newTranslations[item.msgid] = item.msgstr;
          }
        );

        setEditedTranslations({ ...editedTranslations, ...newTranslations });

        // Close dialog and show log
        setIsTranslateDialogOpen(false);

        // If there's a log file, notify the parent
        if (result.message.log_file) {
          onTranslationComplete(result.message.log_file);
        }

        // Refresh the data
        mutate();
      } else if (result?.message?.error) {
        console.error("Translation error:", result.message.error);
        if (result.message.log_file) {
          onTranslationComplete(result.message.log_file);
        }
      }
    } catch (err) {
      console.error("Error during translation:", err);
    }
  };

  // Handle saving translations
  const handleSaveTranslations = async () => {
    if (Object.keys(editedTranslations).length === 0) return;

    setIsSaving(true);

    try {
      // Convert edited translations to the format expected by the API
      const translations = Object.entries(editedTranslations).map(
        ([msgid, msgstr]) => ({
          msgid,
          msgstr,
        })
      );

      const result = await saveTranslationsCall({
        file_path: filePath,
        translations,
      });

      if (result?.message?.success) {
        // Clear edited translations and refresh data
        setEditedTranslations({});
        mutate();
      }
    } catch (err) {
      console.error("Error saving translations:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle update of a translation
  const handleTranslationUpdate = (msgid: string, msgstr: string) => {
    setEditedTranslations({ ...editedTranslations, [msgid]: msgstr });
  };

  // Handle edit submission
  const handleEditSubmit = () => {
    if (!currentEditEntry) return;

    const newValue =
      editedTranslations[currentEditEntry.msgid] || currentEditEntry.msgstr;
    handleTranslationUpdate(currentEditEntry.msgid, newValue);
    setIsEditDialogOpen(false);
    setCurrentEditEntry(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
        <p className="font-medium">Error loading translation file</p>
        <p>{error.message || "Unknown error occurred"}</p>
      </div>
    );
  }

  if (!data?.message) {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onValueChange={(value) => setFilter(value as any)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entries</SelectItem>
              <SelectItem value="untranslated">Untranslated</SelectItem>
              <SelectItem value="translated">Translated</SelectItem>
              <SelectItem value="fuzzy">Fuzzy</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full md:w-60"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            disabled={selectedEntries.length === 0}
            onClick={openTranslateDialog}
            className="flex items-center gap-2"
          >
            <Cpu size={16} />
            <span>AI Translate ({selectedEntries.length})</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => mutate()}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} />
            <span className="hidden md:inline">Refresh</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleSaveTranslations}
            disabled={Object.keys(editedTranslations).length === 0 || isSaving}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            <span className="hidden md:inline">Save Changes</span>
            {Object.keys(editedTranslations).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {Object.keys(editedTranslations).length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={
                        selectedEntries.length > 0 &&
                        selectedEntries.length === paginatedEntries.length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Source Text</TableHead>
                  <TableHead>Thai Translation</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntries.length > 0 ? (
                  paginatedEntries.map((entry) => (
                    <TableRow
                      key={entry.msgid}
                      className={entry.is_fuzzy ? "bg-yellow-50" : ""}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedEntries.some(
                            (e) => e.msgid === entry.msgid
                          )}
                          onChange={() => toggleEntrySelection(entry)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs font-mono text-sm break-words">
                          {entry.msgid}
                        </div>
                        {entry.msgctxt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Context: {entry.msgctxt}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md font-mono text-sm break-words">
                          {editedTranslations[entry.msgid] !== undefined
                            ? editedTranslations[entry.msgid]
                            : entry.msgstr}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.is_fuzzy ? (
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          >
                            Fuzzy
                          </Badge>
                        ) : entry.is_translated ? (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            Translated
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-800 hover:bg-gray-100"
                          >
                            Untranslated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(entry)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No entries found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedEntries.length} of {filteredEntries.length}{" "}
            entries
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    aria-disabled={page === 1}
                  />
                </PaginationItem>
                <PaginationItem className="flex items-center">
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    aria-disabled={page === 1}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardFooter>
      </Card>

      {/* AI Translation Dialog */}
      <Dialog
        open={isTranslateDialogOpen}
        onOpenChange={setIsTranslateDialogOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Translation Settings</DialogTitle>
            <DialogDescription>
              Translate {selectedEntries.length} entries with AI
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="provider" className="text-right">
                Provider
              </Label>
              <Select
                value={selectedProvider}
                onValueChange={setSelectedProvider}
              >
                <SelectTrigger id="provider" className="col-span-3">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model" className="col-span-3">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions
                    .filter((model) => {
                      if (selectedProvider === "openai") {
                        return model.value.includes("gpt");
                      } else {
                        return model.value.includes("claude");
                      }
                    })
                    .map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="temperature" className="text-right">
                Temperature
              </Label>
              <div className="col-span-3 flex items-center gap-4">
                <Input
                  id="temperature"
                  value={temperature}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === "" ||
                      (/^\d*\.?\d*$/.test(value) && parseFloat(value) <= 1)
                    ) {
                      setTemperature(value);
                    }
                  }}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  0 (deterministic) to 1 (creative)
                </span>
              </div>
            </div>

            {translateError && (
              <div className="col-span-4 p-2 border border-red-200 bg-red-50 text-red-700 rounded flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">
                    {translateError.message ||
                      "An error occurred during translation"}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTranslateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleTranslate} disabled={translating}>
              {translating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Translating...
                </>
              ) : (
                <>Translate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Translation</DialogTitle>
          </DialogHeader>

          {currentEditEntry && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="source">Source Text</Label>
                <Textarea
                  id="source"
                  value={currentEditEntry.msgid}
                  readOnly
                  rows={3}
                  className="font-mono"
                />
              </div>

              {currentEditEntry.msgctxt && (
                <div className="grid gap-2">
                  <Label htmlFor="context">Context</Label>
                  <Input
                    id="context"
                    value={currentEditEntry.msgctxt}
                    readOnly
                    className="font-mono"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="translation">Thai Translation</Label>
                <Textarea
                  id="translation"
                  value={
                    editedTranslations[currentEditEntry.msgid] !== undefined
                      ? editedTranslations[currentEditEntry.msgid]
                      : currentEditEntry.msgstr
                  }
                  onChange={(e) =>
                    handleTranslationUpdate(
                      currentEditEntry.msgid,
                      e.target.value
                    )
                  }
                  rows={5}
                  className="font-mono"
                />
              </div>

              {currentEditEntry.locations &&
                currentEditEntry.locations.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Used in</Label>
                    <div className="text-sm text-muted-foreground max-h-24 overflow-y-auto">
                      {currentEditEntry.locations.map((location, index) => (
                        <div key={index} className="mb-1">
                          {location[0]}:{location[1]}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TranslationEditor;
