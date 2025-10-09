import React, { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

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
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<CSVAnalysisResult | null>(null);

  // Translation configuration
  const [sourceColumn, setSourceColumn] = useState<string>('');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [direction, setDirection] = useState<'th_to_en' | 'en_to_th'>('th_to_en');
  const [modelProvider, setModelProvider] = useState<'openai' | 'claude'>('openai');
  const [skipEmpty, setSkipEmpty] = useState(true);
  const [skipExisting, setSkipExisting] = useState(true);

  // Translation result
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);

  // API calls
  const { call: analyzeCSV, loading: analyzing } = useFrappePostCall('translation_tools.api.csv_translation.analyze_csv_file');
  const { call: translateCSV, loading: translating } = useFrappePostCall('translation_tools.api.csv_translation.translate_csv_column');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setAnalysisResult(null);
    setTranslationResult(null);

    // Read file content
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);

      // Analyze CSV
      try {
        const result = await analyzeCSV({
          file_content: content,
          filename: file.name
        });

        if (result.success) {
          setAnalysisResult(result as CSVAnalysisResult);

          // Auto-select columns based on analysis
          const thaiColumn = result.column_analysis.find((col: ColumnAnalysis) => col.type === 'thai');
          const englishColumn = result.column_analysis.find((col: ColumnAnalysis) => col.type === 'english' || col.name.toLowerCase().includes('en'));

          if (thaiColumn) {
            setSourceColumn(thaiColumn.name);
            setDirection('th_to_en');
          }

          if (englishColumn && thaiColumn) {
            setTargetColumn(englishColumn.name);
          } else {
            // Suggest creating new column
            setTargetColumn(thaiColumn ? `${thaiColumn.name}_en` : 'translation');
          }
        }
      } catch (error) {
        console.error('Analysis failed:', error);
      }
    };

    reader.readAsText(file);
  };

  const handleTranslate = async () => {
    if (!sourceColumn || !targetColumn || !fileContent) {
      alert('Please select source and target columns');
      return;
    }

    try {
      const result = await translateCSV({
        file_content: fileContent,
        source_column: sourceColumn,
        target_column: targetColumn,
        direction: direction,
        model_provider: modelProvider,
        batch_size: 20,
        skip_empty: skipEmpty,
        skip_existing: skipExisting
      });

      setTranslationResult(result as TranslationResult);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleDownload = () => {
    if (!translationResult?.csv_content) return;

    const blob = new Blob([translationResult.csv_content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `translated_${selectedFile?.name || 'output.csv'}`);
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
      unknown: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || colors.unknown;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">CSV Translation Tool</h2>
        <p className="text-gray-600 mt-1">
          Upload CSV files and translate specific columns between Thai and English
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
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><FileSpreadsheet className="w-4 h-4 mr-2" /> Select CSV File</>
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
        </CardContent>
      </Card>

      {/* Step 2: Analysis Result */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Column Analysis</CardTitle>
            <CardDescription>
              {analysisResult.columns.length} columns detected, ~{analysisResult.total_rows} rows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Column List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisResult.column_analysis.map((col) => (
                <div key={col.name} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{col.name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${getColumnBadgeColor(col.type)}`}>
                      {col.type}
                    </span>
                  </div>
                  {col.sample_values.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <div className="font-medium mb-1">Sample:</div>
                      <div className="space-y-1">
                        {col.sample_values.slice(0, 2).map((val, idx) => (
                          <div key={idx} className="truncate">{val || '(empty)'}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Column */}
              <div className="space-y-2">
                <Label>Source Column (Translate FROM)</Label>
                <Select value={sourceColumn} onValueChange={setSourceColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source column" />
                  </SelectTrigger>
                  <SelectContent>
                    {analysisResult.columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Column */}
              <div className="space-y-2">
                <Label>Target Column (Translate TO)</Label>
                <Select value={targetColumn} onValueChange={setTargetColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target column" />
                  </SelectTrigger>
                  <SelectContent>
                    {analysisResult.columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                    <SelectItem value="__new__">Create New Column...</SelectItem>
                  </SelectContent>
                </Select>
                {targetColumn === '__new__' && (
                  <input
                    type="text"
                    placeholder="New column name"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    onChange={(e) => setTargetColumn(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* Translation Direction */}
            <div className="space-y-2">
              <Label>Translation Direction</Label>
              <Select value={direction} onValueChange={(val) => setDirection(val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="th_to_en">Thai → English</SelectItem>
                  <SelectItem value="en_to_th">English → Thai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Provider */}
            <div className="space-y-2">
              <Label>AI Model Provider</Label>
              <Select value={modelProvider} onValueChange={(val) => setModelProvider(val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4o-mini)</SelectItem>
                  <SelectItem value="claude">Anthropic (Claude)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3 border-t pt-4">
              <Label>Translation Options</Label>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Skip Empty Values</div>
                  <div className="text-xs text-gray-600">Don't translate empty source cells</div>
                </div>
                <Switch checked={skipEmpty} onCheckedChange={setSkipEmpty} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Skip Existing Translations</div>
                  <div className="text-xs text-gray-600">Don't overwrite existing target values</div>
                </div>
                <Switch checked={skipExisting} onCheckedChange={setSkipExisting} />
              </div>
            </div>

            {/* Translate Button */}
            <Button
              onClick={handleTranslate}
              disabled={!sourceColumn || !targetColumn || translating}
              className="w-full"
              size="lg"
            >
              {translating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Translating...</>
              ) : (
                <>Translate CSV</>
              )}
            </Button>
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
                      <div className="font-medium">{translationResult.message}</div>
                      <div className="text-sm text-gray-600">
                        Translated: {translationResult.translated_count} / {translationResult.total_rows} rows
                        {translationResult.skipped_count > 0 && ` (Skipped: ${translationResult.skipped_count})`}
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
