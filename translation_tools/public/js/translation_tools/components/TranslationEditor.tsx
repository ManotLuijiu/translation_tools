/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  useGetPOFileEntries,
  useTranslateSingleEntry,
  useSaveTranslation,
} from '../api';
import { POFile, TranslationSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TranslationStats from './TranslationStats';

interface TranslationEditorProps {
  selectedFile: POFile | null;
  settings: TranslationSettings | null;
}

export default function TranslationEditor({
  selectedFile,
  settings,
}: TranslationEditorProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entryFilter, setEntryFilter] = useState<
    'all' | 'untranslated' | 'translated'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editedTranslation, setEditedTranslation] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const {
    data,
    error,
    isLoading,
    refetch: mutate,
  } = useGetPOFileEntries(selectedFile?.file_path || null);

  // const entries = fileData?.entries || [];
  // const stats = fileData?.stats || {
  //   total: 0,
  //   translated: 0,
  //   untranslated: 0,
  //   percentage: 0,
  // };
  // const metadata = fileData?.metadata || {
  //   language: '',
  //   project: '',
  //   last_updated: '',
  // };

  const translateEntry = useTranslateSingleEntry();
  const saveTranslation = useSaveTranslation({ args: {} });

  // Reset selected entry when file changes
  useEffect(() => {
    setSelectedEntryId(null);
    setEditedTranslation('');
    setStatusMessage(null);
  }, [selectedFile]);

  // Update edited translation when selected entry changes
  useEffect(() => {
    if (!data?.entries || !selectedEntryId) return;

    const entry = data.entries.find((e) => e.id === selectedEntryId);
    if (entry) {
      setEditedTranslation(entry.msgstr || '');
    }
  }, [selectedEntryId, data]);

  if (!selectedFile) {
    return (
      <div className="tw-flex tw-h-[calc(100vh-200px)] tw-items-center tw-justify-center">
        <div className="tw-space-y-4 tw-text-center">
          <p className="tw-text-muted-foreground">
            Please select a PO file to start translation
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="tw-flex tw-h-[calc(100vh-200px)] tw-items-center tw-justify-center">
        <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
        <span className="tw-ml-2">Loading file contents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="tw-mb-4">
        <AlertCircle className="tw-h-4 tw-w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load file: {error.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  const fileData = data;
  if (!fileData) {
    return (
      <div className="tw-p-8 tw-text-center">
        <p>No data available for this file</p>
      </div>
    );
  }

  const { entries, stats, metadata } = fileData;
  console.log('metadata', metadata);

  // Filter entries based on user selection
  const filteredEntries = entries.filter((entry) => {
    // First filter by translation status
    if (entryFilter === 'untranslated' && entry.is_translated) return false;
    if (entryFilter === 'translated' && !entry.is_translated) return false;

    // Then filter by search term
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      entry.msgid.toLowerCase().includes(term) ||
      entry.msgstr.toLowerCase().includes(term)
    );
  });

  const selectedEntry = selectedEntryId
    ? entries.find((e: any) => e.id === selectedEntryId)
    : null;

  const handleTranslate = async () => {
    if (!selectedEntry || !selectedFile.file_path) return;

    setStatusMessage({ type: 'info', message: 'Translating...' });

    try {
      const result = await translateEntry.mutateAsync({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        model_provider: settings?.default_model_provider || 'openai',
        model: settings?.default_model || undefined,
      });

      if (result.success && result.translation) {
        setEditedTranslation(result.translation);
        setStatusMessage({ type: 'success', message: 'Translation completed' });

        // If auto-save is enabled, also save the translation
        if (settings?.auto_save) {
          await handleSave();
        }
      } else {
        setStatusMessage({
          type: 'error',
          message: result.error || 'Translation failed',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred during translation',
      });
    }
  };

  const handleSave = async () => {
    if (!selectedEntry || !selectedFile.file_path) return;

    setStatusMessage({ type: 'info', message: 'Saving...' });

    try {
      const result = await saveTranslation.mutateAsync({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        translation: editedTranslation,
      });

      if (result.success) {
        setStatusMessage({ type: 'success', message: 'Translation saved' });

        // Refresh file data to update translation stats
        mutate();
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to save translation',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred while saving',
      });
    }
  };

  return (
    <div className="tw-space-y-6">
      <div className="tw-flex tw-items-center tw-justify-between">
        <div>
          <h2 className="tw-text-2xl tw-font-bold">{selectedFile.filename}</h2>
          <p className="tw-text-muted-foreground">{selectedFile.app}</p>
        </div>

        <TranslationStats stats={stats} />
      </div>

      <div className="tw-flex tw-space-x-4">
        <div className="tw-w-1/3 tw-rounded-lg tw-border">
          <div className="tw-border-b tw-p-4">
            <div className="tw-mb-4 tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-font-medium">Entries</h3>
              <Select
                value={entryFilter}
                onValueChange={(value: any) => setEntryFilter(value)}
              >
                <SelectTrigger className="tw-w-[180px]">
                  <SelectValue placeholder="Filter entries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entries</SelectItem>
                  <SelectItem value="untranslated">
                    Untranslated only
                  </SelectItem>
                  <SelectItem value="translated">Translated only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Search in entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tw-mb-2"
            />
          </div>

          <div className="tw-h-[calc(100vh-400px)] tw-overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="tw-p-4 tw-text-center tw-text-muted-foreground">
                No entries match your filter
              </div>
            ) : (
              <ul className="tw-divide-y">
                {filteredEntries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      className={`tw-w-full tw-p-3 tw-text-left tw-transition-colors hover:tw-bg-muted/50 ${
                        selectedEntryId === entry.id ? 'tw-bg-muted' : ''
                      }`}
                      onClick={() => setSelectedEntryId(entry.id)}
                    >
                      <div className="tw-mb-1 tw-flex tw-items-center tw-justify-between">
                        <Badge
                          variant={entry.is_translated ? 'default' : 'outline'}
                        >
                          {entry.is_translated ? 'Translated' : 'Untranslated'}
                        </Badge>
                      </div>
                      <p className="tw-truncate tw-text-sm">{entry.msgid}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="tw-w-2/3">
          {selectedEntry ? (
            <Card>
              <CardHeader>
                <CardTitle>Translation</CardTitle>
                <CardDescription>
                  {selectedEntry.context && (
                    <Badge variant="outline" className="tw-mb-1">
                      Context: {selectedEntry.context}
                    </Badge>
                  )}
                  {selectedEntry.comments &&
                    selectedEntry.comments.length > 0 && (
                      <div className="tw-mt-2 tw-text-xs tw-text-muted-foreground">
                        {selectedEntry.comments.map((comment, i) => (
                          <p key={i}>{comment}</p>
                        ))}
                      </div>
                    )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="tw-space-y-4">
                  <div>
                    <label className="tw-mb-1 tw-block tw-text-sm tw-font-medium">
                      Source (English)
                    </label>
                    <div className="tw-whitespace-pre-wrap tw-rounded-md tw-bg-muted tw-p-3">
                      {selectedEntry.msgid}
                    </div>
                  </div>
                  <div>
                    <label className="wt-mb-1 tw-block tw-text-sm tw-font-medium">
                      Translation (Thai)
                    </label>
                    <Textarea
                      rows={5}
                      value={editedTranslation}
                      onChange={(e) => setEditedTranslation(e.target.value)}
                      placeholder="Enter translation here..."
                      className="tw-min-h-32 tw-resize-y"
                    />
                  </div>

                  {statusMessage && (
                    <Alert
                      variant={
                        statusMessage.type === 'error'
                          ? 'destructive'
                          : 'default'
                      }
                    >
                      {statusMessage.type === 'success' && (
                        <Check className="tw-h-4 tw-w-4" />
                      )}
                      {statusMessage.type === 'error' && (
                        <AlertCircle className="tw-h-4 tw-w-4" />
                      )}
                      {statusMessage.type === 'info' && (
                        <Loader2 className="tw-h-4 tw-w-4 tw-animate-spin" />
                      )}
                      <AlertTitle>
                        {statusMessage.type === 'success'
                          ? 'Success'
                          : statusMessage.type === 'error'
                            ? 'Error'
                            : 'Info'}
                      </AlertTitle>
                      <AlertDescription>
                        {statusMessage.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="tw-justify-between">
                <div className="tw-flex tw-space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const entry = entries.find(
                        (e) => e.id === selectedEntryId
                      );
                      if (entry) setEditedTranslation(entry.msgstr);
                      setStatusMessage(null);
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Find next untranslated entry
                      const untranslatedEntries = entries.filter(
                        (e) => !e.is_translated
                      );
                      if (untranslatedEntries.length > 0) {
                        setSelectedEntryId(untranslatedEntries[0].id);
                      }
                    }}
                  >
                    Next Untranslated
                  </Button>
                </div>
                <div className="tw-flex tw-space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleTranslate}
                    disabled={translateEntry.isLoading}
                  >
                    {translateEntry.isLoading ? (
                      <>
                        <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="tw-mr-2 tw-h-4 tw-w-4" />
                        Translate
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveTranslation.isLoading}
                  >
                    {saveTranslation.isLoading ? (
                      <>
                        <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="tw-mr-2 tw-h-4 tw-w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ) : (
            <div className="tw-flex tw-h-full tw-items-center tw-justify-center tw-rounded-lg tw-border tw-p-8">
              <p className="tw-text-muted-foreground">
                Select an entry to start translating
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
