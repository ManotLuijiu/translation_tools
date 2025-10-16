import React, { useState } from 'react';
import {
  Copy,
  RefreshCw,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Generate a random 10-character UUID
 * Format: xxxxxxxxxx (10 characters, lowercase alphanumeric)
 */
const generate10DigitUUID = (): string => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let uuid = '';
  for (let i = 0; i < 10; i++) {
    uuid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uuid;
};

/**
 * Generate multiple unique 10-digit UUIDs
 */
const generateMultipleUUIDs = (count: number): string[] => {
  const uuids = new Set<string>();
  while (uuids.size < count) {
    uuids.add(generate10DigitUUID());
  }
  return Array.from(uuids);
};

/**
 * Parse CSV string into rows and columns
 */
const parseCSV = (csvContent: string): string[][] => {
  const lines = csvContent.trim().split('\n');
  return lines.map((line) => {
    const columns: string[] = [];
    let currentColumn = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        columns.push(currentColumn.trim().replace(/^"|"$/g, ''));
        currentColumn = '';
      } else {
        currentColumn += char;
      }
    }

    columns.push(currentColumn.trim().replace(/^"|"$/g, ''));
    return columns;
  });
};

/**
 * Convert rows back to CSV string
 */
const rowsToCSV = (rows: string[][]): string => {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          // Quote cells that contain commas, quotes, or newlines
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
    .join('\n');
};

const UUIDGeneratorPage: React.FC = () => {
  // Simple generator state
  const [singleUUID, setSingleUUID] = useState<string>('');
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [bulkUUIDs, setBulkUUIDs] = useState<string[]>([]);

  // CSV generator state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvContent, setCSVContent] = useState<string>('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(false);
  const [processedCSV, setProcessedCSV] = useState<string>('');
  const [generateStats, setGenerateStats] = useState<{
    totalRows: number;
    columnsGenerated: number;
    uuidsCreated: number;
  } | null>(null);

  // Column merge state
  const [enableMerge, setEnableMerge] = useState<boolean>(false);
  const [targetColumn, setTargetColumn] = useState<number>(-1);
  const [sourceColumn1, setSourceColumn1] = useState<number>(-1);
  const [sourceColumn2, setSourceColumn2] = useState<number>(-1);
  const [mergeSeparator, setMergeSeparator] = useState<string>(' - ');

  // UUID generation toggle
  const [enableUUIDGeneration, setEnableUUIDGeneration] =
    useState<boolean>(true);

  const handleGenerateSingle = () => {
    const uuid = generate10DigitUUID();
    setSingleUUID(uuid);
    toast.success('UUID Generated!');
  };

  const handleCopySingle = async () => {
    if (singleUUID) {
      await navigator.clipboard.writeText(singleUUID);
      toast.success('UUID copied to clipboard!');
    }
  };

  const handleGenerateBulk = () => {
    if (bulkCount < 1 || bulkCount > 1000) {
      toast.error('Please enter a count between 1 and 1000');
      return;
    }
    const uuids = generateMultipleUUIDs(bulkCount);
    setBulkUUIDs(uuids);
    toast.success(`Generated ${uuids.length} unique UUIDs!`);
  };

  const handleCopyBulk = async () => {
    if (bulkUUIDs.length > 0) {
      const text = bulkUUIDs.join('\n');
      await navigator.clipboard.writeText(text);
      toast.success(`${bulkUUIDs.length} UUIDs copied to clipboard!`);
    }
  };

  const handleDownloadBulk = () => {
    if (bulkUUIDs.length > 0) {
      const text = bulkUUIDs.join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uuids-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('UUIDs downloaded!');
    }
  };

  const handleDownloadBulkCSV = () => {
    if (bulkUUIDs.length > 0) {
      const csvContent = 'UUID\n' + bulkUUIDs.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uuids-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('UUIDs downloaded as CSV!');
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setProcessedCSV('');
    setGenerateStats(null);
    setSelectedColumns([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCSVContent(content);

      try {
        const parsedRows = parseCSV(content);
        if (parsedRows.length > 0) {
          setColumns(parsedRows[0]);
          setRows(parsedRows);
          toast.success(
            `CSV loaded: ${parsedRows[0].length} columns, ${parsedRows.length - 1} rows`
          );
        }
      } catch (error) {
        toast.error('Failed to parse CSV file');
        console.error(error);
      }
    };

    reader.readAsText(file);
  };

  const toggleColumn = (columnIndex: number) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnIndex)) {
        return prev.filter((idx) => idx !== columnIndex);
      } else {
        return [...prev, columnIndex];
      }
    });
  };

  const handleGenerateUUIDs = () => {
    if (selectedColumns.length === 0) {
      toast.error('Please select at least one column for UUID generation');
      return;
    }

    const newRows = rows.map((row, rowIndex) => {
      if (rowIndex === 0) return row; // Keep header row unchanged

      const newRow = [...row];
      selectedColumns.forEach((colIndex) => {
        // Generate UUID if cell is empty OR if overwrite is enabled
        const isEmpty = !newRow[colIndex] || newRow[colIndex].trim() === '';
        if (isEmpty || overwriteExisting) {
          newRow[colIndex] = generate10DigitUUID();
        }
      });
      return newRow;
    });

    const csvOutput = rowsToCSV(newRows);
    setProcessedCSV(csvOutput);

    // Calculate stats
    let uuidsCreated = 0;
    for (let i = 1; i < newRows.length; i++) {
      selectedColumns.forEach((colIndex) => {
        if (newRows[i][colIndex] !== rows[i][colIndex]) {
          uuidsCreated++;
        }
      });
    }

    setGenerateStats({
      totalRows: newRows.length - 1,
      columnsGenerated: selectedColumns.length,
      uuidsCreated: uuidsCreated,
    });

    toast.success(
      `Generated ${uuidsCreated} UUIDs in ${selectedColumns.length} column(s)`
    );
  };

  const handleDownloadProcessedCSV = () => {
    if (!processedCSV) return;

    const blob = new Blob([processedCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuid_generated_${selectedFile?.name || 'output.csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  };

  const handleMergeColumns = () => {
    if (targetColumn === -1 || sourceColumn1 === -1 || sourceColumn2 === -1) {
      toast.error('Please select all columns (target and two source columns)');
      return;
    }

    const newRows = [...rows];
    const usedNames = new Set<string>();
    let mergedCount = 0;

    // Process each row (skip header)
    for (let i = 1; i < newRows.length; i++) {
      const source1Value = newRows[i][sourceColumn1] || '';
      const source2Value = newRows[i][sourceColumn2] || '';

      // Create merged name
      let mergedName = '';
      if (source1Value && source2Value) {
        mergedName = `${source1Value}${mergeSeparator}${source2Value}`;
      } else if (source1Value) {
        mergedName = source1Value;
      } else if (source2Value) {
        mergedName = source2Value;
      }

      // Handle duplicates by appending numbers
      let finalName = mergedName;
      let counter = 1;
      while (usedNames.has(finalName)) {
        finalName = `${mergedName} (${counter})`;
        counter++;
      }

      usedNames.add(finalName);
      newRows[i][targetColumn] = finalName;
      mergedCount++;
    }

    const csvOutput = rowsToCSV(newRows);
    setProcessedCSV(csvOutput);
    setRows(newRows);

    toast.success(
      `Merged ${mergedCount} rows! ${usedNames.size < mergedCount ? 'Duplicates handled with numbers.' : 'All names are unique.'}`
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">UUID Generator</h1>
        <p className="text-muted-foreground">
          Generate random 10-digit alphanumeric UUIDs for Asset Categories and
          other purposes
        </p>
      </div>

      {/* CSV UUID Generator Section */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Automation Tools
          </CardTitle>
          <CardDescription>
            Workflow: Upload CSV → (Optional) Merge Columns → (Optional)
            Generate UUIDs → Download
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Upload CSV */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Step 1: Upload CSV File
            </Label>
            <p className="text-sm text-muted-foreground">
              📌 Skip this if you only need the Single/Bulk UUID generators
              below
            </p>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Select CSV File
                </label>
              </Button>
              {selectedFile && (
                <span className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}{' '}
                  KB)
                </span>
              )}
            </div>
          </div>

          {/* Step 2: Merge Columns (Optional) */}
          {columns.length > 0 && (
            <div
              className={`space-y-4 border-l-4 pl-4 transition-opacity ${enableMerge ? 'border-blue-500' : 'border-gray-300 opacity-50'}`}
            >
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Step 2: Merge Columns
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable-merge"
                    checked={enableMerge}
                    onCheckedChange={(checked) =>
                      setEnableMerge(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="enable-merge"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Enable this step
                  </label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                💡 Combine two columns (e.g., Category Code + Sub Category) into
                one with automatic duplicate handling
              </p>

              <div
                className={`flex flex-col md:flex-row space-x-2 ${!enableMerge && 'pointer-events-none opacity-60'}`}
              >
                <div className="space-y-2 md:w-1/3">
                  <Label htmlFor="target-column">Target Column (A)</Label>
                  <Select
                    value={targetColumn.toString()}
                    onValueChange={(v) => setTargetColumn(Number(v))}
                    disabled={!enableMerge}
                  >
                    <SelectTrigger id="target-column" className="w-full">
                      <SelectValue placeholder="Select target column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {col || `Column ${idx + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:w-1/3">
                  <Label htmlFor="source-column-1">Source Column 1 (B)</Label>
                  <Select
                    value={sourceColumn1.toString()}
                    onValueChange={(v) => setSourceColumn1(Number(v))}
                    disabled={!enableMerge}
                  >
                    <SelectTrigger id="source-column-1" className="w-full">
                      <SelectValue placeholder="Select source 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {col || `Column ${idx + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:w-1/3">
                  <Label htmlFor="source-column-2">Source Column 2 (C)</Label>
                  <Select
                    value={sourceColumn2.toString()}
                    onValueChange={(v) => setSourceColumn2(Number(v))}
                    disabled={!enableMerge}
                  >
                    <SelectTrigger id="source-column-2" className="w-full">
                      <SelectValue placeholder="Select source 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {col || `Column ${idx + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 md:w-1/3">
                <Label htmlFor="merge-separator">Separator</Label>
                <Input
                  id="merge-separator"
                  value={mergeSeparator}
                  onChange={(e) => setMergeSeparator(e.target.value)}
                  placeholder="Enter separator (e.g., ' - ', ', ')"
                  className="max-w-xs"
                  disabled={!enableMerge}
                />
              </div>

              <Button
                onClick={handleMergeColumns}
                disabled={
                  !enableMerge ||
                  targetColumn === -1 ||
                  sourceColumn1 === -1 ||
                  sourceColumn2 === -1
                }
                variant="secondary"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Merge Columns (Handles Duplicates)
              </Button>

              {targetColumn !== -1 &&
                sourceColumn1 !== -1 &&
                sourceColumn2 !== -1 && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      📝 Preview: "{columns[sourceColumn1]}" + "{mergeSeparator}
                      " + "{columns[sourceColumn2]}" → "{columns[targetColumn]}"
                      <br />
                      Duplicates will be handled with "(1)", "(2)", etc.
                    </AlertDescription>
                  </Alert>
                )}

              {/* Download after merge (optional) */}
              {processedCSV && !generateStats && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    ✅ Columns merged! Download now or continue to Step 3 for
                    UUID generation.
                  </p>
                  <Button
                    onClick={handleDownloadProcessedCSV}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV (After Merge Only)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Columns for UUID */}
          {columns.length > 0 && (
            <div
              className={`space-y-4 transition-opacity ${enableUUIDGeneration ? '' : 'opacity-50'}`}
            >
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Step 3: Select Columns for UUID Generation
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable-uuid-generation"
                    checked={enableUUIDGeneration}
                    onCheckedChange={(checked) =>
                      setEnableUUIDGeneration(checked as boolean)
                    }
                  />
                  <label
                    htmlFor="enable-uuid-generation"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Enable this step
                  </label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                💡 Select which columns need UUID generation
              </p>
              <div
                className={`border rounded-lg p-4 ${!enableUUIDGeneration && 'pointer-events-none opacity-60'}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {columns.map((column, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${index}`}
                        checked={selectedColumns.includes(index)}
                        onCheckedChange={() => toggleColumn(index)}
                        disabled={!enableUUIDGeneration}
                      />
                      <label
                        htmlFor={`column-${index}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {column || `Column ${index + 1}`}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedColumns.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Selected {selectedColumns.length} column(s):{' '}
                    {selectedColumns.map((idx) => columns[idx]).join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {columns.length > 0 && enableUUIDGeneration && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Step 4: Generate UUIDs
              </Label>

              {/* Overwrite option */}
              <div className="flex items-center space-x-2 border rounded-lg p-4 bg-muted">
                <Checkbox
                  id="overwrite-existing"
                  checked={overwriteExisting}
                  onCheckedChange={(checked) =>
                    setOverwriteExisting(checked as boolean)
                  }
                />
                <label
                  htmlFor="overwrite-existing"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Overwrite existing values (replace all cells in selected
                  columns)
                </label>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  {overwriteExisting ? (
                    <span>
                      ⚠️ <strong>All cells</strong> in selected columns will be
                      replaced with new UUIDs.
                    </span>
                  ) : (
                    <span>
                      💡 UUIDs will only be generated for{' '}
                      <strong>empty cells</strong> in selected columns.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleGenerateUUIDs}
                disabled={selectedColumns.length === 0}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate UUIDs for Selected Columns
              </Button>
            </div>
          )}

          {/* Step 5: Results */}
          {generateStats && (
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Step 5: Download Result
              </Label>
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">UUID Generation Complete!</div>
                    <div className="text-sm text-muted-foreground">
                      Generated {generateStats.uuidsCreated} UUIDs across{' '}
                      {generateStats.columnsGenerated} column(s) in{' '}
                      {generateStats.totalRows} rows
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleDownloadProcessedCSV}
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV with UUIDs
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row w-full space-x-2">
        {/* Single UUID Generator */}
        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>Single UUID Generator</CardTitle>
            <CardDescription>
              Generate a single 10-character alphanumeric UUID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Input
                value={singleUUID}
                readOnly
                placeholder="Click 'Generate' to create a UUID"
                className="font-mono text-lg"
              />
              <Button onClick={handleGenerateSingle} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate
              </Button>
              <Button
                onClick={handleCopySingle}
                variant="outline"
                disabled={!singleUUID}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk UUID Generator */}
        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle>Bulk UUID Generator</CardTitle>
            <CardDescription>
              Generate multiple unique 10-character UUIDs at once (max 1000)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="bulkCount">Number of UUIDs</Label>
                <Input
                  id="bulkCount"
                  type="number"
                  value={bulkCount}
                  onChange={(e) =>
                    setBulkCount(Number.parseInt(e.target.value) || 0)
                  }
                  min={1}
                  max={1000}
                  className="font-mono"
                />
              </div>
              <Button onClick={handleGenerateBulk} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>

            {bulkUUIDs.length > 0 && (
              <>
                <div className="flex gap-2">
                  <Button onClick={handleCopyBulk} variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy All
                  </Button>
                  <Button
                    onClick={handleDownloadBulk}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download TXT
                  </Button>
                  <Button
                    onClick={handleDownloadBulkCSV}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                </div>

                <div className="border rounded-md p-4 bg-muted max-h-96 overflow-y-auto">
                  <div className="font-mono text-sm space-y-1">
                    {bulkUUIDs.map((uuid, index) => (
                      <div key={uuid} className="flex items-center gap-2">
                        <span className="text-muted-foreground w-12">
                          {index + 1}.
                        </span>
                        <span className="font-semibold">{uuid}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Total: {bulkUUIDs.length} unique UUIDs generated
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>UUID Format Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm space-y-2">
            <p>
              <strong>Format:</strong> 10-character lowercase alphanumeric
              string (0-9, a-z)
            </p>
            <p>
              <strong>Example:</strong>{' '}
              <code className="bg-muted px-2 py-1 rounded">pf3u0rn9rt</code>
            </p>
            <p>
              <strong>Use Case:</strong> Asset Category UUID field (Column D in
              Asset Category.csv)
            </p>
            <p>
              <strong>Uniqueness:</strong> Each generated UUID is unique within
              the batch
            </p>
            <p>
              <strong>Total Combinations:</strong> 36^10 = 3,656,158,440,062,976
              possible UUIDs
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UUIDGeneratorPage;
