import { useEffect, useRef, useState } from 'react';
import { Loader2, ScrollText } from 'lucide-react';
import { __ } from '@/utils/translation';

interface BudgetInfo {
  balance: number;
  currency: string;
  model: string;
  modelLabel: string;
  costPerEntry: number;
  estimatedEntries: number;
  estimatedWords: number;
  avgWordsPerEntry: number;
}

interface AutoModeConfigCardProps {
  autoMode: boolean;
  budgetInfo: BudgetInfo | null;
  loadingBudget: boolean;
  chunksToProcess: number;
  setChunksToProcess: (value: number) => void;
  maxChunks: number;
  untranslatedCount: number;
  jobProgress?: {
    total_untranslated: number;
    translated_count: number;
    saved_count: number;
    skipped_count: number;
    current_chunk_size: number;
    last_error: string;
  };
  isJobRunning?: boolean;
}

interface LogEntry {
  time: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export default function AutoModeConfigCard({
  autoMode,
  budgetInfo,
  loadingBudget,
  chunksToProcess,
  setChunksToProcess,
  maxChunks,
  untranslatedCount,
  jobProgress,
  isJobRunning,
}: AutoModeConfigCardProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentActivity, setCurrentActivity] = useState<string>('');
  const [activityLevel, setActivityLevel] = useState<'info' | 'warn' | 'error' | 'success'>('info');
  const prevProgressRef = useRef(jobProgress);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Add new log entry to top (prepend)
  const addLog = (message: string, level: 'info' | 'warn' | 'error' | 'success') => {
    setLogs(prev => [{ time: formatTime(), message, level }, ...prev].slice(0, 50));
  };

  // Update current activity and log based on progress changes
  useEffect(() => {
    if (!jobProgress) return;
    
    const prev = prevProgressRef.current || jobProgress;
    const now = jobProgress;

    if (now.last_error && now.last_error !== prev.last_error) {
      addLog(now.last_error.substring(0, 60), 'error');
      setCurrentActivity(now.last_error.substring(0, 40));
      setActivityLevel('error');
    } else if (now.saved_count > prev.saved_count) {
      const diff = now.saved_count - prev.saved_count;
      addLog(`💾 +${diff} saved`, 'success');
      setCurrentActivity(`Saved ${diff} entries`);
      setActivityLevel('success');
    } else if (now.translated_count > prev.translated_count) {
      const diff = now.translated_count - prev.translated_count;
      addLog(`✓ +${diff} [${now.translated_count}/${now.total_untranslated}]`, 'info');
      setCurrentActivity(`Translating... +${diff}`);
      setActivityLevel('info');
    } else if (now.skipped_count > prev.skipped_count) {
      const diff = now.skipped_count - prev.skipped_count;
      addLog(`⏭ +${diff} skipped`, 'warn');
      setCurrentActivity(`Skipped ${diff} (Thai)`);
      setActivityLevel('warn');
    }

    prevProgressRef.current = now;
  }, [jobProgress]);

  // Initialize when job starts
  useEffect(() => {
    if (isJobRunning && logs.length === 0) {
      addLog('🚀 Job started', 'info');
      setCurrentActivity('Starting...');
    } else if (!isJobRunning) {
      setLogs([]);
      setCurrentActivity('');
      setActivityLevel('info');
    }
  }, [isJobRunning]);

  if (!autoMode) return null;

  const getLogColor = (level: typeof activityLevel) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      default: return 'text-blue-600';
    }
  };

  const estimatedCost = chunksToProcess > 0 && budgetInfo
    ? (chunksToProcess * 20 * budgetInfo.costPerEntry).toFixed(4)
    : null;

  return (
    <div className="border rounded-lg bg-muted/20 p-4 space-y-4">
      <div className="flex items-center justify-end">
        <span className="text-xs text-muted-foreground">
          {untranslatedCount} {__('entries available')}
        </span>
      </div>

      {/* Equal height 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Budget */}
        <div className="bg-background rounded-md p-3 flex flex-col min-h-[140px]">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 shrink-0">
            {__('Budget')}
          </h4>
          <div className="flex-1 flex flex-col justify-between">
            {loadingBudget ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {__('Checking...')}
              </div>
            ) : budgetInfo ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <div>
                    <div className="font-semibold text-lg">
                      ${budgetInfo.balance.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ≈ {budgetInfo.estimatedEntries.toLocaleString()} {__('entries')}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {budgetInfo.estimatedWords.toLocaleString()} {__('words')}
                </div>
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <div>{__('Model:')} {budgetInfo.modelLabel}</div>
                  <div>{__('Avg:')} {budgetInfo.avgWordsPerEntry} {__('words/entry')}</div>
                  <div>{__('Cost:')} ${budgetInfo.costPerEntry.toFixed(5)}/{__('entry')}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {__('No budget info')}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Process + Est. Cost */}
        <div className="bg-background rounded-md p-3 flex flex-col min-h-[140px]">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 shrink-0">
            {__('Process')}
          </h4>
          <div className="flex-1 flex flex-col justify-between">
            {/* Chunk selector */}
            <div className="space-y-1">
              <select
                value={chunksToProcess}
                onChange={(e) => setChunksToProcess(Number(e.target.value))}
                className="w-full h-9 px-3 text-sm border rounded bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isJobRunning || maxChunks === 0}
              >
                {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? __('chunk') : __('chunks')} ({n * 20} {__('entries')})
                  </option>
                ))}
              </select>
              <div className="text-xs text-muted-foreground">
                {__('Available:')} {maxChunks || 0} {__('chunks')} ({maxChunks * 20} {__('entries')})
              </div>
            </div>

            {/* Estimated Cost */}
            <div className="border-t pt-2 space-y-1 mt-auto">
              <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {__('Est. Cost')}
              </h5>
              {estimatedCost ? (
                <div>
                  <span className="text-xl font-semibold text-green-600">
                    ${estimatedCost}
                  </span>
                  <div className="text-[10px] text-muted-foreground">
                    {chunksToProcess * 20} × ${budgetInfo?.costPerEntry.toFixed(5)}/{__('entry')}
                  </div>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Live Status - Terminal style */}
        <div className="bg-background rounded-md p-3 flex flex-col min-h-[140px]">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 shrink-0 flex items-center gap-1">
            <ScrollText className="h-3 w-3" />
            {__('Live Status')}
          </h4>
          
          {/* Log container with terminal behavior */}
          <div className="flex-1 flex flex-col justify-between min-h-0">
            {/* Logs history - older logs at top, newest prepends */}
            <div
              ref={logsContainerRef}
              className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-muted/50 rounded border space-y-0.5"
              style={{ maxHeight: '70px' }}
            >
              {logs.length === 0 ? (
                <div className="text-muted-foreground text-center py-2">{__('No activity yet')}</div>
              ) : (
                <div className="space-y-0.5">
                  {logs.map((log, index) => (
                    <div key={index} className={`truncate ${getLogColor(log.level)}`}>
                      <span className="text-muted-foreground mr-1">[{log.time}]</span>
                      {log.message}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current activity - ALWAYS at bottom */}
            <div className={`mt-2 p-2 font-mono text-xs bg-muted rounded border text-center ${getLogColor(activityLevel)}`}>
              {isJobRunning ? (
                <><span className="animate-pulse mr-1">●</span>{currentActivity}</>
              ) : (
                <span className="text-muted-foreground">{__('Ready')}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
