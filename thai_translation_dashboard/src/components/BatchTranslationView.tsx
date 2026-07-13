import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useFrappePostCall } from 'frappe-react-sdk';
import { __ } from '@/utils/translation';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { POEntry, POFile, TranslationToolsSettings } from '../types';

// Thai text detection
const THAI_PATTERN = /[\u0E00-\u0E7F]/;
const containsThai = (text: string) => THAI_PATTERN.test(text);

// New components
import AutoModeConfigCard from './AutoModeConfigCard';
import AutoModeProgressPanel from './AutoModeProgressPanel';
import BatchActionFooter from './BatchActionFooter';

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
  const [selectedEntries, setSelectedEntries] = useState<POEntry[]>([]);
  const [translatedEntries, setTranslatedEntries] = useState<{
    [key: string]: string;
  }>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [pushToGithub, setPushToGithub] = useState(false);

  // ── Auto Mode state ──
  const [autoMode, setAutoMode] = useState(false);
  const [englishOnly, setEnglishOnly] = useState(true); // Default: skip Thai entries
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

  // ── Budget estimation state ──
  const [budgetInfo, setBudgetInfo] = useState<{
    balance: number;
    currency: string;
    model: string;
    modelLabel: string;
    costPerEntry: number;
    estimatedEntries: number;
    estimatedWords: number;
    avgWordsPerEntry: number;
  } | null>(null);
  const [loadingBudget, setLoadingBudget] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Select entries that need translation, filtered by English Only if enabled
  const untranslatedEntries = useMemo(() => {
    const untranslated = entries.filter((entry) => !entry.is_translated);
    if (englishOnly) {
      return untranslated.filter((entry) => !containsThai(entry.msgid));
    }
    return untranslated;
  }, [entries, englishOnly]);
  const isReady = true; // Simplified - assume ready since no context needed

  // Calculate chunks based on budget and untranslated entries
  const maxChunksFromBudget = useMemo(() => {
    if (!budgetInfo || budgetInfo.estimatedEntries === 0) return 0;
    return Math.floor(budgetInfo.estimatedEntries / 20);
  }, [budgetInfo]);

  const maxChunksFromEntries = useMemo(() => {
    return Math.ceil(untranslatedEntries.length / 20);
  }, [untranslatedEntries.length]);

  const maxChunks = useMemo(() => {
    return maxChunksFromEntries; // Don't limit by budget - user chooses
  }, [maxChunksFromEntries]);

  // selectedChunks state for user selection
  const [chunksToProcess, setChunksToProcess] = useState<number>(5);

  // Set initial chunksToProcess based on budget when budgetInfo loads
  useEffect(() => {
    if (budgetInfo && maxChunks > 0) {
      const recommended = Math.min(Math.max(5, Math.ceil(maxChunks * 0.25)), 10);
      setChunksToProcess(recommended);
    }
  }, [budgetInfo, maxChunks]);

  // Frappe hooks
  const {
    call: translateBatchCall,
    loading: translateLoading,
    error: translateError,
  } = useFrappePostCall('translation_tools.api.ai_translation.translate_batch');

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

  // Fetch budget info when Auto Mode is enabled
  useEffect(() => {
    if (autoMode && !activeJobId) {
      fetchBudgetInfo();
    }
  }, [autoMode, activeJobId, settings?.default_model_provider]);

  const fetchBudgetInfo = async () => {
    setLoadingBudget(true);
    try {
      const result = await fetch(
        `/api/method/translation_tools.api.ai_models.get_api_balance_and_estimation?model_provider=${encodeURIComponent(settings?.default_model_provider || 'openai')}&model=${encodeURIComponent(settings?.default_model || 'gpt-4o-mini-2024-07-18')}`
      );
      const msg = await result.json();
      if (msg?.message?.success) {
        setBudgetInfo({
          balance: msg.message.balance,
          currency: msg.message.currency,
          model: msg.message.model,
          modelLabel: msg.message.model_label,
          costPerEntry: msg.message.cost_per_entry_usd,
          estimatedEntries: msg.message.estimated_entries,
          estimatedWords: msg.message.estimated_words,
          avgWordsPerEntry: msg.message.avg_words_per_entry,
        });
      }
    } catch (err) {
      console.error('Failed to fetch budget info:', err);
    } finally {
      setLoadingBudget(false);
    }
  };

  // Polling for job status
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

      if (
        msg.message.status &&
        ['completed', 'completed_with_skips', 'failed', 'cancelled'].includes(
          msg.message.status
        )
      ) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsTranslating(false);
        onTranslationComplete();
        if (
          msg.message.status === 'completed' ||
          msg.message.status === 'completed_with_skips'
        ) {
          const skippedInfo =
            msg.message.skipped_count > 0
              ? `, ${msg.message.skipped_count} skipped`
              : '';
          toast.success(
            `Auto Mode finished — ${msg.message.translated_count}/${msg.message.total_untranslated}${skippedInfo} entries`
          );
        } else if (msg.message.status === 'failed') {
          toast.error(msg.message.last_error || 'Auto Mode job failed');
        } else {
          toast.info(`Auto Mode job ${msg.message.status}`);
        }
      }
    } catch {
      // silent polling failure
    }
  }, [onTranslationComplete]);

  // Batch translation
  const {
    call: saveBatchCall,
    loading: saveLoading,
    error: saveError,
  } = useFrappePostCall(
    'translation_tools.api.ai_translation.save_batch_translations_with_single_github_push'
  );

  // Monitor errors
  useEffect(() => {
    if (translateError) {
      toast.error(translateError.message || 'Translation failed');
    }
    if (saveError) {
      toast.error(saveError.message || 'Failed to save translations');
    }
  }, [translateError, saveError, __]);

  // Auto Mode handlers
  const handleStartAutoMode = async () => {
    if (!selectedFile?.file_path) return;
    setIsTranslating(true);
    toast.info('Starting Auto Mode…');

    const maxEntries = chunksToProcess * 20;
    const result = await startJob({
      file_path: selectedFile.file_path,
      push_to_github: pushToGithub,
      github_branch: settings?.github_branch || undefined,
      model_provider: settings?.default_model_provider || 'openai',
      model: settings?.default_model || undefined,
      max_chunk_size: 20,
      max_entries: maxEntries,
      english_only: englishOnly,
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
        `Auto Mode started — ${msg.total_untranslated} entries to translate`
      );
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(
        () => pollJobStatus(msg.job_id),
        2000
      );
    } else {
      toast.error(msg?.error || 'Failed to start Auto Mode');
      setIsTranslating(false);
    }
  };

  const handlePauseAutoMode = async () => {
    if (!activeJobId) return;
    const result = await pauseJob({ job_id: activeJobId });
    if (result?.message?.success) {
      setJobStatus('paused');
      if (pollingRef.current) clearInterval(pollingRef.current);
      toast.info('Auto Mode paused');
    }
  };

  const handleResumeAutoMode = async () => {
    if (!activeJobId) return;
    setIsTranslating(true);
    const result = await resumeJob({ job_id: activeJobId });
    if (result?.message?.success) {
      setJobStatus('running');
      toast.info('Auto Mode resumed');
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(
        () => pollJobStatus(activeJobId),
        2000
      );
    } else {
      toast.error(result?.message?.error || 'Failed to resume');
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
      toast.info('Auto Mode cancelled');
    }
  };

  // Manual batch translation
  const translateBatch = async () => {
    if (!selectedFile?.file_path || selectedEntries.length === 0) return;

    setIsTranslating(true);
    toast.info(
      `Translating batch of ${selectedEntries.length} entries...`
    );

    try {
      const response = await translateBatchCall({
        file_path: selectedFile.file_path,
        entry_ids: selectedEntries.map((e) => e.id),
        model_provider: settings?.default_model_provider || 'openai',
        model: settings?.default_model || undefined,
      });

      if (response?.message?.success) {
        const newTranslations = response?.message?.translations;
        setTranslatedEntries((prev) => ({ ...prev, ...newTranslations }));
        toast.success('Batch translation completed successfully');

        if (settings?.auto_save) {
          await saveBatchTranslations();
        }
      } else {
        toast.error(
          response?.message?.error || 'Translation failed'
        );
      }
    } catch (err) {
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const saveBatchTranslations = async () => {
    if (
      !selectedFile?.file_path ||
      Object.keys(translatedEntries).length === 0
    )
      return;

    toast.info('Saving translations...');

    try {
      const result = await saveBatchCall({
        file_path: selectedFile.file_path,
        translations: translatedEntries,
        push_to_github: pushToGithub,
      });

      if (result?.message?.success) {
        toast.success('Translations saved successfully');
        onTranslationComplete();
        setTranslatedEntries({});
        setSelectedEntries([]);
      } else {
        toast.error(result?.message?.error || 'Failed to save translations');
      }
    } catch (err) {
      toast.error('Failed to save translations');
    }
  };

  // Prepare batches
  const batches = [];
  for (let i = 0; i < untranslatedEntries.length; i += batchSize) {
    batches.push(untranslatedEntries.slice(i, i + batchSize));
  }

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
            {__('Select entries to translate in batch')} ({__('current batch size:')} {batchSize})
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
                    <h3 className="font-medium">{__('Batch')} {batchIndex + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allSelected = batch.every((entry) =>
                          selectedEntries.some((e) => e.id === entry.id)
                        );

                        if (allSelected) {
                          setSelectedEntries(
                            selectedEntries.filter(
                              (entry) =>
                                !batch.some((e) => e.id === entry.id)
                            )
                          );
                        } else {
                          setSelectedEntries([
                            ...selectedEntries,
                            ...batch.filter(
                              (entry) =>
                                !selectedEntries.some(
                                  (e) => e.id === entry.id
                                )
                            ),
                          ]);
                        }
                      }}
                    >
                      {batch.every((entry) =>
                        selectedEntries.some((e) => e.id === entry.id)
                      )
                        ? __('Deselect All')
                        : __('Select All')}
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
                                selectedEntries.filter(
                                  (e) => e.id !== entry.id
                                )
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

        {/* ── Auto Mode Configuration Card ─────────────────────────────── */}
        <CardContent className="pt-0">
          <AutoModeConfigCard
            autoMode={autoMode}
            budgetInfo={budgetInfo}
            jobProgress={jobProgress}
            isJobRunning={jobStatus === 'running' || jobStatus === 'paused'}
            loadingBudget={loadingBudget}
            chunksToProcess={chunksToProcess}
            setChunksToProcess={setChunksToProcess}
            maxChunks={maxChunks}
            untranslatedCount={untranslatedEntries.length}
          />
        </CardContent>

        {/* ── Auto Mode progress panel ───────────────────────────────────── */}
        {activeJobId && (jobStatus === 'running' || jobStatus === 'paused') && (
          <CardContent className="pt-0 pb-2">
            <AutoModeProgressPanel
              jobStatus={jobStatus}
              jobProgress={jobProgress}
              onPause={handlePauseAutoMode}
              onResume={handleResumeAutoMode}
              onStop={handleStopAutoMode}
            />
          </CardContent>
        )}

        {/* ── Action Footer ─────────────────────────────────────────────── */}
        <CardFooter
          id="batch__translation__view__footer__card"
          className="justify-between flex-wrap gap-2"
        >
          <BatchActionFooter
            autoMode={autoMode}
            setAutoMode={setAutoMode}
            englishOnly={englishOnly}
            setEnglishOnly={setEnglishOnly}
            selectedEntriesLength={selectedEntries.length}
            translatedEntriesCount={Object.keys(translatedEntries).length}
            githubEnabled={!!settings?.github_enable}
            pushToGithub={pushToGithub}
            setPushToGithub={setPushToGithub}
            isTranslating={isTranslating}
            translateLoading={translateLoading}
            saveLoading={saveLoading}
            hasFile={!!selectedFile?.file_path}
            onStartAutoMode={handleStartAutoMode}
            onTranslateBatch={translateBatch}
            onSaveBatch={saveBatchTranslations}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
