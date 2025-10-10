import React, { useState, useEffect } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useGetTranslationSettings } from '@/api/settings';

interface ColumnAnalysis {
  name: string;
  type: 'thai' | 'english' | 'mixed' | 'numeric' | 'unknown';
  suggested_direction: 'th_to_en' | 'en_to_th' | null;
  sample_values: string[];
}

interface CSVAnalysisResult {
  success: boolean;
  filename: string;
  columns: string[];
  column_analysis: ColumnAnalysis[];
  total_rows: number;
  sample_rows: any[];
  message?: string;
  error?: string;
}

interface TranslationResult {
  success: boolean;
  translated_count: number;
  total_rows: number;
  skipped_count: number;
  csv_content: string;
  message?: string;
  error?: string;
}

export default function CSVTranslationTab() {
  // Get global AI settings
  const { data: settingsData, isLoading: settingsLoading } =
    useGetTranslationSettings();
  const settings = settingsData?.message;

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  // Analysis state
  const [analysisResult, setAnalysisResult] =
    useState<CSVAnalysisResult | null>(null);

  // Translation configuration
  const [translationMode, setTranslationMode] = useState<'bidirectional' | 'oneway'>('bidirectional');
  const [thaiColumn, setThaiColumn] = useState<string>('');
  const [englishColumn, setEnglishColumn] = useState<string>('');
  const [direction, setDirection] = useState<'th_to_en' | 'en_to_th'>('th_to_en');
  const [modelProvider, setModelProvider] = useState<'openai' | 'anthropic'>(
    'openai'
  );
  const [model, setModel] = useState<string>('');
  const [skipEmpty, setSkipEmpty] = useState(true);

  // Translation result
  const [translationResult, setTranslationResult] =
    useState<TranslationResult | null>(null);

  // Progress tracking
  const [translationProgress, setTranslationProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
    previewRows: any[];
  } | null>(null);

  // Error state
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Initialize with global settings
  useEffect(() => {
    if (settings) {
      setModelProvider(
        settings.default_model_provider === 'anthropic' ? 'anthropic' : 'openai'
      );
      setModel(settings.default_model || '');
    }
  }, [settings]);

  // API calls
  const { call: analyzeCSV, loading: analyzing } = useFrappePostCall(
    'translation_tools.api.csv_translation.analyze_csv_file'
  );
  const { call: translateCSV, loading: translating } = useFrappePostCall(
    'translation_tools.api.csv_translation.translate_csv_column'
  );

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setAnalysisResult(null);
    setTranslationResult(null);
    setErrorMessage('');

    // Read file content
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);

      // Analyze CSV
      try {
        const response = await analyzeCSV({
          file_content: content,
          filename: file.name,
        });

        // Frappe wraps response in 'message' property
        const result = response.message || response;

        if (result.success) {
          setAnalysisResult(result as CSVAnalysisResult);
          setErrorMessage('');

          // Auto-select columns based on analysis
          const thaiCol = result.column_analysis.find(
            (col: ColumnAnalysis) => col.type === 'thai'
          );
          const englishCol = result.column_analysis.find(
            (col: ColumnAnalysis) =>
              col.type === 'english' || col.name.toLowerCase().includes('en')
          );

          if (thaiCol) {
            setThaiColumn(thaiCol.name);
          }

          if (englishCol) {
            setEnglishColumn(englishCol.name);
          }
        } else {
          setErrorMessage(
            result.error ||
              'Failed to analyze CSV file. Please check the file format.'
          );
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        setErrorMessage(
          `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    };

    reader.readAsText(file);
  };

  const handleTranslate = async () => {
    if (!thaiColumn || !englishColumn || !fileContent) {
      alert('Please select Thai and English columns');
      return;
    }

    // Helper to check if value is empty (empty string, whitespace, or "-")
    const isEmpty = (value: string) => {
      const trimmed = value?.trim() || '';
      return trimmed === '' || trimmed === '-';
    };

    // Reset states
    setTranslationResult(null);
    setTranslationProgress({
      current: 0,
      total: 0,
      percentage: 0,
      previewRows: [],
    });

    try {
      const lines = fileContent.trim().split('\n');
      const headerLine = lines[0];
      const headers = headerLine.split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));
      const thaiColIndex = headers.indexOf(thaiColumn);
      const englishColIndex = headers.indexOf(englishColumn);

      const totalRows = lines.length - 1;
      const batchSize = 20;
      const totalBatches = Math.ceil(totalRows / batchSize);

      let allTranslatedRows: any[] = [];
      let finalCSVLines: string[] = [headerLine];
      let translatedCount = 0;

      if (translationMode === 'oneway') {
        // ONE-WAY MODE: Simple source → target translation
        const sourceCol = direction === 'th_to_en' ? thaiColumn : englishColumn;
        const targetCol = direction === 'th_to_en' ? englishColumn : thaiColumn;
        const sourceIdx = direction === 'th_to_en' ? thaiColIndex : englishColIndex;
        const targetIdx = direction === 'th_to_en' ? englishColIndex : thaiColIndex;

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startRow = batchIndex * batchSize;
          const endRow = Math.min(startRow + batchSize, totalRows);
          const batchLines = lines.slice(startRow + 1, endRow + 1);
          const batchContent = [headerLine, ...batchLines].join('\n');

          setTranslationProgress({
            current: batchIndex + 1,
            total: totalBatches,
            percentage: Math.round(((batchIndex + 1) / totalBatches) * 100),
            previewRows: allTranslatedRows,
          });

          const response = await translateCSV({
            file_content: batchContent,
            source_column: sourceCol,
            target_column: targetCol,
            direction: direction,
            model_provider: modelProvider,
            model: model || undefined,
            batch_size: batchSize,
            skip_empty: skipEmpty,
            skip_existing: false,
          });

          const result = response.message || response;
          if (result.success && result.csv_content) {
            const resultLines = result.csv_content.trim().split('\n').slice(1);
            finalCSVLines.push(...resultLines);

            resultLines.forEach((line: string) => {
              const columns = line.split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
              allTranslatedRows.push({
                source: columns[sourceIdx] || '',
                target: columns[targetIdx] || '',
              });
              translatedCount++;
            });
          }

          setTranslationProgress({
            current: batchIndex + 1,
            total: totalBatches,
            percentage: Math.round(((batchIndex + 1) / totalBatches) * 100),
            previewRows: [...allTranslatedRows],
          });
        }
      } else {
        // BIDIRECTIONAL MODE: Smart translation based on empty cells
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startRow = batchIndex * batchSize;
          const endRow = Math.min(startRow + batchSize, totalRows);
          const batchDataLines = lines.slice(startRow + 1, endRow + 1);

          const thToEnLines: string[] = [];
          const enToThLines: string[] = [];

          batchDataLines.forEach((line: string) => {
            const columns = line.split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
            const thaiValue = columns[thaiColIndex] || '';
            const englishValue = columns[englishColIndex] || '';

            // Use isEmpty to detect empty values including "-"
            if (!isEmpty(thaiValue) && isEmpty(englishValue)) {
              thToEnLines.push(line);
            } else if (!isEmpty(englishValue) && isEmpty(thaiValue)) {
              enToThLines.push(line);
            } else {
              // Row has both values filled or both empty - no translation needed
              finalCSVLines.push(line);
              if (!isEmpty(thaiValue) || !isEmpty(englishValue)) {
                allTranslatedRows.push({
                  source: thaiValue || englishValue,
                  target: englishValue || thaiValue,
                });
              }
            }
          });

          setTranslationProgress({
            current: batchIndex + 1,
            total: totalBatches,
            percentage: Math.round(((batchIndex + 1) / totalBatches) * 100),
            previewRows: allTranslatedRows,
          });

          // Translate Thai → English subset
          if (thToEnLines.length > 0) {
            const thToEnBatch = [headerLine, ...thToEnLines].join('\n');
            const response = await translateCSV({
              file_content: thToEnBatch,
              source_column: thaiColumn,
              target_column: englishColumn,
              direction: 'th_to_en',
              model_provider: modelProvider,
              model: model || undefined,
              batch_size: batchSize,
              skip_empty: skipEmpty,
              skip_existing: false,
            });

            const result = response.message || response;
            if (result.success && result.csv_content) {
              const resultLines = result.csv_content.trim().split('\n').slice(1);
              finalCSVLines.push(...resultLines);

              resultLines.forEach((line: string) => {
                const columns = line.split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
                allTranslatedRows.push({
                  source: columns[thaiColIndex] || '',
                  target: columns[englishColIndex] || '',
                });
                translatedCount++;
              });
            }
          }

          // Translate English → Thai subset
          if (enToThLines.length > 0) {
            const enToThBatch = [headerLine, ...enToThLines].join('\n');
            const response = await translateCSV({
              file_content: enToThBatch,
              source_column: englishColumn,
              target_column: thaiColumn,
              direction: 'en_to_th',
              model_provider: modelProvider,
              model: model || undefined,
              batch_size: batchSize,
              skip_empty: skipEmpty,
              skip_existing: false,
            });

            const result = response.message || response;
            if (result.success && result.csv_content) {
              const resultLines = result.csv_content.trim().split('\n').slice(1);
              finalCSVLines.push(...resultLines);

              resultLines.forEach((line: string) => {
                const columns = line.split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
                allTranslatedRows.push({
                  source: columns[englishColIndex] || '',
                  target: columns[thaiColIndex] || '',
                });
                translatedCount++;
              });
            }
          }

          setTranslationProgress({
            current: batchIndex + 1,
            total: totalBatches,
            percentage: Math.round(((batchIndex + 1) / totalBatches) * 100),
            previewRows: [...allTranslatedRows],
          });
        }
      }

      const finalCSV = finalCSVLines.join('\n');

      setTranslationResult({
        success: true,
        translated_count: allTranslatedRows.length,
        total_rows: totalRows,
        skipped_count: totalRows - allTranslatedRows.length,
        csv_content: finalCSV,
        message: `Successfully translated ${allTranslatedRows.length} rows ${translationMode === 'bidirectional' ? '(bidirectional)' : '(one-way)'}`,
      });
      setTranslationProgress(null);
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslationProgress(null);
      setTranslationResult({
        success: false,
        translated_count: 0,
        total_rows: 0,
        skipped_count: 0,
        csv_content: '',
        error: error instanceof Error ? error.message : 'Translation failed',
      });
    }
  };

  const handleDownload = () => {
    if (!translationResult?.csv_content) return;

    const blob = new Blob([translationResult.csv_content], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `translated_${selectedFile?.name || 'output.csv'}`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getColumnBadgeColor = (type: string) => {
    const colors = {
      thai: 'bg-blue-100 text-blue-800',
      english: 'bg-green-100 text-green-800',
      mixed: 'bg-yellow-100 text-yellow-800',
      numeric: 'bg-gray-100 text-gray-800',
      unknown: 'bg-red-100 text-red-800',
    };
    return colors[type as keyof typeof colors] || colors.unknown;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">CSV Translation Tool</h2>
        <p className="text-gray-600 mt-1">
          Upload CSV files and translate specific columns between Thai and
          English
        </p>
      </div>

      {/* Step 1: Upload CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Step 1: Upload CSV File
          </CardTitle>
          <CardDescription>
            Select a CSV file to analyze and translate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button asChild disabled={analyzing}>
                <span>
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" /> Select CSV
                      File
                    </>
                  )}
                </span>
              </Button>
            </label>
            {selectedFile && (
              <span className="text-sm text-gray-600">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          {/* Error Display */}
          {errorMessage && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Analysis Result */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Column Analysis</CardTitle>
            <CardDescription>
              {analysisResult.columns.length} columns detected, ~
              {analysisResult.total_rows} rows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Column List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisResult.column_analysis.map((col) => (
                <div key={col.name} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{col.name}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getColumnBadgeColor(col.type)}`}
                    >
                      {col.type}
                    </span>
                  </div>
                  {col.sample_values.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <div className="font-medium mb-1">Sample:</div>
                      <div className="space-y-1">
                        {col.sample_values.slice(0, 2).map((val, idx) => (
                          <div key={idx} className="truncate">
                            {val || '(empty)'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Translation Configuration */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Translation Configuration</CardTitle>
            <CardDescription>
              Select columns and translation direction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Key Warning */}
            {settings &&
              !settings.openai_api_key &&
              !settings.anthropic_api_key && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No AI API keys configured. Please configure API keys in
                    ASEAN Translations → Settings → AI Models.
                  </AlertDescription>
                </Alert>
              )}
            {/* Translation Mode Selector */}
            <div className="space-y-2">
              <Label>Translation Mode</Label>
              <Select value={translationMode} onValueChange={(val) => setTranslationMode(val as 'bidirectional' | 'oneway')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bidirectional">
                    <div className="flex flex-col">
                      <span className="font-medium">Bidirectional (Reconcile)</span>
                      <span className="text-xs text-gray-500">Automatically translate both ways based on empty cells</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="oneway">
                    <div className="flex flex-col">
                      <span className="font-medium">One-Way</span>
                      <span className="text-xs text-gray-500">Traditional source → target translation</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {translationMode === 'bidirectional' && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-xs">
                    💡 Smart mode: Translates Thai → English for empty English cells, and English → Thai for empty Thai cells
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Thai Column */}
              <div className="space-y-2">
                <Label>
                  {translationMode === 'oneway' && direction === 'th_to_en' ? 'Source Column (Thai)' :
                   translationMode === 'oneway' && direction === 'en_to_th' ? 'Target Column (Thai)' :
                   'Thai Column'}
                </Label>
                <Select value={thaiColumn} onValueChange={setThaiColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Thai column" />
                  </SelectTrigger>
                  <SelectContent>
                    {analysisResult.columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* English Column */}
              <div className="space-y-2">
                <Label>
                  {translationMode === 'oneway' && direction === 'th_to_en' ? 'Target Column (English)' :
                   translationMode === 'oneway' && direction === 'en_to_th' ? 'Source Column (English)' :
                   'English Column'}
                </Label>
                <Select value={englishColumn} onValueChange={setEnglishColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select English column" />
                  </SelectTrigger>
                  <SelectContent>
                    {analysisResult.columns.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Direction selector - only for one-way mode */}
            {translationMode === 'oneway' && (
              <div className="space-y-2">
                <Label>Translation Direction</Label>
                <Select value={direction} onValueChange={(val) => setDirection(val as 'th_to_en' | 'en_to_th')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th_to_en">Thai → English</SelectItem>
                    <SelectItem value="en_to_th">English → Thai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Model Provider - Using Global Settings */}
            <div className="space-y-2">
              <Label>AI Model Provider</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={modelProvider}
                  onValueChange={(val) =>
                    setModelProvider(val as 'openai' | 'anthropic')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">
                      Anthropic (Claude)
                    </SelectItem>
                  </SelectContent>
                </Select>
                {settings && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Using: {model || settings.default_model || 'default'}
                  </span>
                )}
              </div>
              {settings && (
                <p className="text-xs text-muted-foreground">
                  Global settings from ASEAN Translations → Settings → AI Models
                </p>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3 border-t pt-4">
              <Label>Translation Options</Label>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Skip Empty Values</div>
                  <div className="text-xs text-gray-600">
                    Don't translate empty source cells
                  </div>
                </div>
                <Switch checked={skipEmpty} onCheckedChange={setSkipEmpty} />
              </div>
            </div>

            {/* Translate Button */}
            <Button
              onClick={handleTranslate}
              disabled={
                !thaiColumn ||
                !englishColumn ||
                translating ||
                (settings &&
                  !settings.openai_api_key &&
                  !settings.anthropic_api_key)
              }
              className="w-full"
              size="lg"
            >
              {translating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{' '}
                  Translating...
                </>
              ) : (
                <>Translate CSV</>
              )}
            </Button>
            {settings &&
              !settings.openai_api_key &&
              !settings.anthropic_api_key && (
                <p className="text-xs text-red-600 text-center">
                  Configure API keys in Settings before translating
                </p>
              )}
          </CardContent>
        </Card>
      )}

      {/* Progress Preview */}
      {translationProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              Translation in Progress
            </CardTitle>
            <CardDescription>
              Batch {translationProgress.current} of {translationProgress.total}{' '}
              ({translationProgress.percentage}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${translationProgress.percentage}%` }}
              />
            </div>

            {/* Preview Table */}
            {translationProgress.previewRows.length > 0 && (
              <div className="space-y-2">
                <Label>Preview (Latest 5 translations)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          Source {translationMode === 'oneway' && `(${direction === 'th_to_en' ? thaiColumn : englishColumn})`}
                        </th>
                        <th className="px-3 py-2 text-left">
                          Target {translationMode === 'oneway' && `(${direction === 'th_to_en' ? englishColumn : thaiColumn})`}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {translationProgress.previewRows
                        .slice(-5)
                        .map((row, idx) => (
                          <tr key={idx} className="">
                            <td className="px-3 py-2 max-w-xs truncate">
                              {row.source}
                            </td>
                            <td className="px-3 py-2 max-w-xs truncate text-green-600">
                              {row.target}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {translationProgress.previewRows.length} rows translated so
                  far
                </p>
              </div>
            )}

            <Alert>
              <AlertDescription className="text-sm">
                💡 Tip: Translations are processed in batches of 20. If you need
                to stop, close this tab and check back later - partial results
                won't be saved automatically.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Translation Result */}
      {translationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {translationResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              Translation Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {translationResult.success ? (
              <>
                <Alert>
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {translationResult.message}
                      </div>
                      <div className="text-sm text-gray-600">
                        Translated: {translationResult.translated_count} /{' '}
                        {translationResult.total_rows} rows
                        {translationResult.skipped_count > 0 &&
                          ` (Skipped: ${translationResult.skipped_count})`}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                <Button onClick={handleDownload} className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download Translated CSV
                </Button>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>{translationResult.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
