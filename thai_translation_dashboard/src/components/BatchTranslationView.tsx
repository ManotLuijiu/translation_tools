import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/context/TranslationContext';
import { useFrappePostCall } from 'frappe-react-sdk';
import { GitBranch, Loader2, RefreshCw, Save, Pause, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import type { POEntry, POFile, TranslationToolsSettings } from '../types';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

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
  // console.log('batchSize BatchTranslationView.tsx', batchSize);

  const [selectedEntries, setSelectedEntries] = useState<POEntry[]>([]);
  const [translatedEntries, setTranslatedEntries] = useState<{
    [key: string]: string;
  }>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [pushToGithub, setPushToGithub] = useState(false);

  // ── Auto Mode state ──
  const [autoMode, setAutoMode] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('idle');
  const [jobProgress, setJobProgress] = useState({
    total_untranslated: 0,
    translated_count: 0,
    saved_count: 0,
    skipped_count: 0,
    current_chunk_size: 20,
    last_error: '',
  });
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Select entries that need translation
  const untranslatedEntries = entries.filter((entry) => !entry.is_translated);
  const { translate: __, isReady } = useTranslation();

  // Use frappe-react-sdk hooks
  const {
    call: translateBatchCall,
    loading: translateLoading,
    error: translateError,
  } = useFrappePostCall('translation_tools.api.ai_translation.translate_batch');

  // ── Auto Mode API hooks ──
  const { call: startJob } = useFrappePostCall(
    'translation_tools.api.ai_translation.start_auto_mode_job'
  );
  const { call: pauseJob } = useFrappePostCall(
    'translation_tools.api.ai_translation.pause_auto_mode_job'
  );
  const { call: resumeJob } = useFrappePostCall(
    'translation_tools.api.ai_translation.resume_auto_mode_job'
  );
  const { call: cancelJob } = useFrappePostCall(
    'translation_tools.api.ai_translation.cancel_auto_mode_job'
  );
  const pollJobStatus = useCallback(async (jobId: string) => {
    if (!jobId) return;
    try {
      const result = await fetch(
        `/api/method/translation_tools.api.ai_translation.get_auto_mode_job_status?job_id=${encodeURIComponent(jobId)}`
      );
      const msg = await result.json();
      if (!msg?.message?.success) return;

      setJobStatus(msg.message.status);
      setJobProgress({
        total_untranslated: msg.message.total_untranslated || 0,
        translated_count: msg.message.translated_count || 0,
        saved_count: msg.message.saved_count || 0,
        skipped_count: msg.message.skipped_count || 0,
        current_chunk_size: msg.message.current_chunk_size || 20,
        last_error: msg.message.last_error || '',
      });

      if (msg.message.status && ['completed', 'completed_with_skips', 'failed', 'cancelled'].includes(msg.message.status)) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsTranslating(false);
        onTranslationComplete();
        if (msg.message.status === 'completed' || msg.message.status === 'completed_with_skips') {
          const skippedInfo = msg.message.skipped_count > 0 ? `, ${msg.message.skipped_count} skipped` : '';
          toast.success(
            `${__('Auto Mode finished')} — ${msg.message.translated_count}/${msg.message.total_untranslated}${skippedInfo} ${__('entries')}`
          );
        } else if (msg.message.status === 'failed') {
          toast.error(msg.message.last_error || __('Auto Mode job failed'));
        } else {
          toast.info(`${__('Auto Mode job')} ${msg.message.status}`);
        }
      }
    } catch {
      // silent polling failure
    }
  }, [onTranslationComplete]);

  const {
    call: saveBatchCall,
    loading: saveLoading,
    error: saveError,
  } = useFrappePostCall(
    'translation_tools.api.ai_translation.save_batch_translations_with_single_github_push'
  );

  // Prepare batches for translation
  const batches = [];
  for (let i = 0; i < untranslatedEntries.length; i += batchSize) {
    batches.push(untranslatedEntries.slice(i, i + batchSize));
  }

  // Monitor errors from SDK
  useEffect(() => {
    if (translateError) {
      toast.error(translateError.message || __('Translation failed'));
    }
    if (saveError) {
      toast.error(saveError.message || __('Failed to save translations'));
    }
  }, [translateError, saveError, __]);

  // Clear selection when entries change
  // useEffect(() => {
  //   setSelectedEntries([]);
  //   setTranslatedEntries({});
  //   clearMessage();
  // }, [entries, clearMessage]);

  const translateBatch = async () => {
    if (!selectedFile?.file_path || selectedEntries.length === 0) return;

    setIsTranslating(true);
    toast.info(
      __('Translating batch of') +
        ` ${selectedEntries.length} ` +
        __('entries...')
    );

    try {
      // API call to translate batch
      // const result = await fetch(
      //   '/api/method/translation_tools.api.ai_translation.translate_batch',
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       file_path: selectedFile.file_path,
      //       entry_ids: selectedEntries.map((e) => e.id),
      //       model_provider: settings?.default_model_provider || 'openai',
      //       model: settings?.default_model || undefined,
      //     }),
      //   }
      // );

      // const data = await result.json();

      // Use SDK hook instead of fetch
      const response = await translateBatchCall({
        file_path: selectedFile.file_path,
        entry_ids: selectedEntries.map((e) => e.id),
        model_provider: settings?.default_model_provider || 'openai',
        model: settings?.default_model || undefined,
      });

      // console.log('response translateBatchCall', response);

      if (response?.message?.success) {
        // Update translations
        const newTranslations = response?.message?.translations;
        setTranslatedEntries((prev) => ({ ...prev, ...newTranslations }));

        toast.success(__('Batch translation completed successfully'));

        // If auto-save is enabled
        if (settings?.auto_save) {
          await saveBatchTranslations();
        }
      } else {
        console.error('Translation error:', response?.message?.error);
        toast.error(response?.message?.error || __('Translation failed'));
      }
    } catch (err) {
      console.error('Translation error:', err);
      toast.error(__('Translation failed'));
    } finally {
      setIsTranslating(false);
    }
  };

  const saveBatchTranslations = async () => {
    if (!selectedFile?.file_path || Object.keys(translatedEntries).length === 0)
      return;

    toast.info(__('Saving translations...'));

    try {
      // const result = await fetch(
      //   '/api/method/translation_tools.api.ai_translation.save_batch_translations',
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //     },
      //     body: JSON.stringify({
      //       file_path: selectedFile.file_path,
      //       translations: translatedEntries,
      //       push_to_github: settings?.github_enable && settings?.github_token,
      //     }),
      //   }
      // );

      // const data = await result.json();

      // Use SDK hook instead of fetch
      const result = await saveBatchCall({
        file_path: selectedFile.file_path,
        translations: translatedEntries,
        push_to_github: pushToGithub,
      });

      // console.log('result saveBatchCall', result);

      if (result?.message?.success) {
        toast.success(__('Translations saved successfully'));
        onTranslationComplete(); // Refresh data
        setTranslatedEntries({});
        setSelectedEntries([]);
      } else {
        toast.error(
          result?.message?.error || __('Failed to save translations')
        );
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(__('Failed to save translations'));
    }
  };

  // ── Auto Mode: start whole-file job ──────────────────────────────────────────

  const handleStartAutoMode = async () => {
    if (!selectedFile?.file_path) return;
    setIsTranslating(true);
    toast.info(__('Starting Auto Mode…'));

    const result = await startJob({
      file_path: selectedFile.file_path,
      push_to_github: pushToGithub,
      github_branch: settings?.github_branch || undefined,
      model_provider: settings?.default_model_provider || 'openai',
      model: settings?.default_model || undefined,
      max_chunk_size: 20,
    });

    const msg = result?.message;
    if (msg?.success) {
      setActiveJobId(msg.job_id);
      setJobStatus('running');
      setJobProgress({
        total_untranslated: msg.total_untranslated,
        translated_count: 0,
        saved_count: 0,
        skipped_count: 0,
        current_chunk_size: msg.planned_initial_chunk_size || 20,
        last_error: '',
      });
      toast.success(
        `${__('Auto Mode started')} — ${msg.total_untranslated} ${__('entries to translate')}`
      );
      // Start polling
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => pollJobStatus(msg.job_id), 2000);
    } else {
      toast.error(msg?.error || __('Failed to start Auto Mode'));
      setIsTranslating(false);
    }
  };

  const handlePauseAutoMode = async () => {
    if (!activeJobId) return;
    const result = await pauseJob({ job_id: activeJobId });
    if (result?.message?.success) {
      setJobStatus('paused');
      if (pollingRef.current) clearInterval(pollingRef.current);
      toast.info(__('Auto Mode paused'));
    }
  };

  const handleResumeAutoMode = async () => {
    if (!activeJobId) return;
    setIsTranslating(true);
    const result = await resumeJob({ job_id: activeJobId });
    if (result?.message?.success) {
      setJobStatus('running');
      toast.info(__('Auto Mode resumed'));
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => pollJobStatus(activeJobId), 2000);
    } else {
      toast.error(result?.message?.error || __('Failed to resume'));
      setIsTranslating(false);
    }
  };

  const handleStopAutoMode = async () => {
    if (!activeJobId) return;
    const result = await cancelJob({ job_id: activeJobId });
    if (result?.message?.success) {
      setJobStatus('cancelled');
      if (pollingRef.current) clearInterval(pollingRef.current);
      setIsTranslating(false);
      onTranslationComplete();
      toast.info(__('Auto Mode cancelled'));
    }
  };

  // When file changes, clear any active job
  useEffect(() => {
    if (activeJobId && jobStatus === 'idle') {
      setActiveJobId(null);
    }
  }, [selectedFile?.file_path]);

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
              className="cursor-pointer"
              disabled={untranslatedEntries.length === 0}
            >
              {__('Select All Untranslated')} ({untranslatedEntries.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedEntries([])}
              className="cursor-pointer"
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
        </CardContent>

        {/* ── Auto Mode progress panel ───────────────────────────────────── */}
        {activeJobId && (jobStatus === 'running' || jobStatus === 'paused') && (
          <CardContent className="pt-0 pb-2">
            <div className="bg-muted/30 rounded-md p-3 space-y-2">
              {/* Status label */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {jobStatus === 'running' ? __('Auto Mode: processing…') : __('Auto Mode: paused')}
                </span>
                <Badge
                  variant={jobStatus === 'running' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {jobStatus}
                </Badge>
              </div>

              {/* Progress bar */}
              <Progress
                value={
                  jobProgress.total_untranslated > 0
                    ? (jobProgress.translated_count / jobProgress.total_untranslated) * 100
                    : 0
                }
                className="h-2"
              />

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="font-semibold tabular-nums">
                    {jobProgress.translated_count}/{jobProgress.total_untranslated}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{__('Translated')}</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {jobProgress.saved_count}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{__('Saved')}</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums text-orange-600">
                    {jobProgress.skipped_count}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{__('Skipped')}</div>
                </div>
                <div>
                  <div className="font-semibold tabular-nums">
                    {jobProgress.current_chunk_size}
                  </div>
                  <div className="text-muted-foreground text-[10px]">{__('Chunk')}</div>
                </div>
              </div>

              {/* Error hint */}
              {jobProgress.last_error && (
                <p className="text-xs text-orange-500 truncate">
                  ⚠ {jobProgress.last_error}
                </p>
              )}

              {/* Controls */}
              <div className="flex gap-2 justify-end">
                {jobStatus === 'running' ? (
                  <Button size="sm" variant="outline" onClick={handlePauseAutoMode}>
                    <Pause className="mr-1 h-3.5 w-3.5" />
                    {__('Pause')}
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleResumeAutoMode}>
                    <Play className="mr-1 h-3.5 w-3.5" />
                    {__('Resume')}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleStopAutoMode}
                >
                  <Square className="mr-1 h-3.5 w-3.5" />
                  {__('Stop')}
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        <CardFooter id="batch__translation__view__footer__card" className="justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Auto Mode toggle — only shown when not actively running */}
            {!activeJobId && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="batch-auto-mode"
                  checked={autoMode}
                  onCheckedChange={setAutoMode}
                  className="cursor-pointer"
                />
                <Label
                  htmlFor="batch-auto-mode"
                  className={`cursor-pointer whitespace-nowrap text-sm ${autoMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                >
                  {__('Auto Mode')}
                </Label>
              </div>
            )}
            {autoMode && !activeJobId && (
              <p className="text-xs text-muted-foreground">
                {__('Translates all remaining untranslated entries automatically in safe batches of up to 20.')}
              </p>
            )}

            {/* Manual mode: entry count */}
            {!autoMode && (
              <div className="text-sm text-muted-foreground">
                {selectedEntries.length} {__('entries selected')}
              </div>
            )}

            {/* Push to Github */}
            {settings?.github_enable ? (
              <div className="flex items-center space-x-2">
                <Switch
                  id="batch-push-to-github"
                  checked={pushToGithub}
                  onCheckedChange={setPushToGithub}
                  className="cursor-pointer"
                />
                <Label
                  htmlFor="batch-push-to-github"
                  className={`cursor-pointer whitespace-nowrap text-sm ${pushToGithub ? 'text-green-600' : ''}`}
                >
                  <GitBranch className="mr-1 inline h-3.5 w-3.5" />
                  {__('Push to Github')}
                </Label>
              </div>
            ) : null}
          </div>

          <div className="space-x-2">
            {/* Primary action button */}
            <Button
              variant="outline"
              onClick={autoMode ? handleStartAutoMode : translateBatch}
              className="cursor-pointer"
              disabled={
                isTranslating ||
                translateLoading ||
                (!autoMode && selectedEntries.length === 0) ||
                !selectedFile?.file_path
              }
            >
              {isTranslating || translateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {autoMode ? __('Processing…') : __('Translating...')}
                </>
              ) : (
                <>
                  {autoMode ? (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {autoMode ? __('Start Auto Translation') : __('AI Translate Batch')}
                </>
              )}
            </Button>

            {/* Save — manual mode only */}
            {!autoMode && (
              <Button
                onClick={saveBatchTranslations}
                className="cursor-pointer"
                disabled={
                  isTranslating ||
                  saveLoading ||
                  Object.keys(translatedEntries).length === 0
                }
              >
                {saveLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {__('Save Translations')}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
