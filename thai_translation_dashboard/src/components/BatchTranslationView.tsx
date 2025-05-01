import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { useTranslateBatch, useSaveBatchTranslations } from '../api';
import { useStatusMessage } from '@/hooks/useStatusMessage';
import type { POFile, TranslationToolsSettings, POEntry } from '../types';
import { useTranslation } from '@/context/TranslationContext';

interface BatchTranslationViewProps {
  selectedFile: POFile | null;
  entries: POEntry[];
  settings: TranslationToolsSettings;
  batchSize: number;
  onTranslationComplete: () => void;
}

export default function BatchTranslationView({
  selectedFile,
  entries,
  settings,
  batchSize,
  onTranslationComplete,
}: BatchTranslationViewProps) {
  console.log('batchSize BatchTranslationView.tsx', batchSize);
  const [selectedEntries, setSelectedEntries] = useState<POEntry[]>([]);
  const [translatedEntries, setTranslatedEntries] = useState<{
    [key: string]: string;
  }>({});
  const [isTranslating, setIsTranslating] = useState(false);
  // const [currentBatch, setCurrentBatch] = useState<POEntry[]>([]);
  const { statusMessage, showMessage } = useStatusMessage();

  // Select entries that need translation
  const untranslatedEntries = entries.filter((entry) => !entry.is_translated);
  const { translate: __, isReady } = useTranslation();

  // Prepare batches for translation
  const batches = [];
  for (let i = 0; i < untranslatedEntries.length; i += batchSize) {
    batches.push(untranslatedEntries.slice(i, i + batchSize));
  }

  // Clear selection when entries change
  // useEffect(() => {
  //   setSelectedEntries([]);
  //   setTranslatedEntries({});
  //   clearMessage();
  // }, [entries, clearMessage]);

  const translateBatch = async () => {
    if (!selectedFile?.file_path || selectedEntries.length === 0) return;

    setIsTranslating(true);
    showMessage(
      `Translating batch of ${selectedEntries.length} entries...`,
      'info'
    );

    try {
      // API call to translate batch
      const result = await fetch(
        '/api/method/translation_tools.api.ai_translation.translate_batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_path: selectedFile.file_path,
            entry_ids: selectedEntries.map((e) => e.id),
            model_provider: settings?.default_model_provider || 'openai',
            model: settings?.default_model || undefined,
          }),
        }
      );

      const data = await result.json();

      if (data.message?.success) {
        // Update translations
        const newTranslations = data.message.translations;
        setTranslatedEntries((prev) => ({ ...prev, ...newTranslations }));

        showMessage('Batch translation completed successfully', 'success');

        // If auto-save is enabled
        if (settings?.auto_save) {
          await saveBatchTranslations();
        }
      } else {
        console.error('Translation error:', data.message?.error);
        showMessage(data.message?.error || 'Translation failed', 'error');
      }
    } catch (err) {
      console.error('Translation error:', err);
      showMessage('Translation failed', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const saveBatchTranslations = async () => {
    if (!selectedFile?.file_path || Object.keys(translatedEntries).length === 0)
      return;

    showMessage(__('Saving translations...'), 'info');

    try {
      const result = await fetch(
        '/api/method/translation_tools.api.ai_translation.save_batch_translations',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_path: selectedFile.file_path,
            translations: translatedEntries,
            push_to_github: settings?.github_enable && settings?.github_token,
          }),
        }
      );

      const data = await result.json();

      if (data.message?.success) {
        showMessage(__('Translations saved successfully'), 'success');
        onTranslationComplete(); // Refresh data
        setTranslatedEntries({});
        setSelectedEntries([]);
      } else {
        showMessage(
          data.message?.error || 'Failed to save translations',
          'error'
        );
      }
    } catch (err) {
      console.error('Save error:', err);
      showMessage(__('Failed to save translations'), 'error');
    }
  };

  if (!isReady) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="ml-2">{__('Loading...')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{__('AI Batch Translation')}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {__('Select entries to translate in batch')} (
            {__('current batch size:')} {batchSize})
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setSelectedEntries(untranslatedEntries)}
              disabled={untranslatedEntries.length === 0}
            >
              {__('Select All Untranslated')} ({untranslatedEntries.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedEntries([])}
              disabled={selectedEntries.length === 0}
            >
              {__('Clear Selection')}
            </Button>
          </div>

          {batches.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {__('No untranslated entries found in this page')}
            </div>
          ) : (
            <div className="space-y-4">
              {batches.map((batch, batchIndex) => (
                <div
                  key={`batch-${batchIndex}`}
                  className="border rounded-md p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Batch {batchIndex + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Select or deselect all entries in this batch
                        const allSelected = batch.every((entry) =>
                          selectedEntries.some((e) => e.id === entry.id)
                        );

                        if (allSelected) {
                          setSelectedEntries(
                            selectedEntries.filter(
                              (entry) => !batch.some((e) => e.id === entry.id)
                            )
                          );
                        } else {
                          setSelectedEntries([
                            ...selectedEntries,
                            ...batch.filter(
                              (entry) =>
                                !selectedEntries.some((e) => e.id === entry.id)
                            ),
                          ]);
                        }
                      }}
                    >
                      {batch.every((entry) =>
                        selectedEntries.some((e) => e.id === entry.id)
                      )
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {batch.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded"
                      >
                        <Checkbox
                          checked={selectedEntries.some(
                            (e) => e.id === entry.id
                          )}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEntries([...selectedEntries, entry]);
                            } else {
                              setSelectedEntries(
                                selectedEntries.filter((e) => e.id !== entry.id)
                              );
                            }
                          }}
                          id={`entry-${entry.id}`}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`entry-${entry.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {entry.msgid}
                          </label>

                          {translatedEntries[entry.id] && (
                            <div className="mt-2 text-sm p-2 bg-muted rounded">
                              {translatedEntries[entry.id]}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {statusMessage && (
            <div
              className={`mt-4 p-3 rounded ${
                statusMessage.type === 'error'
                  ? 'bg-red-100 text-red-700'
                  : statusMessage.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
              }`}
            >
              {statusMessage.message}
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedEntries.length} {__('entries selected')}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={translateBatch}
              disabled={isTranslating || selectedEntries.length === 0}
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Translating...')}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {__('AI Translate Batch')}
                </>
              )}
            </Button>

            <Button
              onClick={saveBatchTranslations}
              disabled={
                isTranslating || Object.keys(translatedEntries).length === 0
              }
            >
              <Save className="mr-2 h-4 w-4" />
              {__('Save Translations')}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
