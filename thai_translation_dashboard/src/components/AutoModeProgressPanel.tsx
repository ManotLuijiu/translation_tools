import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { __ } from '@/utils/translation';

interface JobProgress {
  total_untranslated: number;
  translated_count: number;
  saved_count: number;
  skipped_count: number;
  current_chunk_size: number;
  last_error: string;
}

interface AutoModeProgressPanelProps {
  jobStatus: string;
  jobProgress: JobProgress;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export default function AutoModeProgressPanel({
  jobStatus,
  jobProgress,
  onPause,
  onResume,
  onStop,
}: AutoModeProgressPanelProps) {
  const progress =
    jobProgress.total_untranslated > 0
      ? (jobProgress.translated_count / jobProgress.total_untranslated) * 100
      : 0;

  return (
    <div className="bg-muted/30 rounded-md p-3 space-y-2">
      {/* Status label */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          {jobStatus === 'running'
            ? __('Auto Mode: processing…')
            : __('Auto Mode: paused')}
        </span>
        <Badge
          variant={jobStatus === 'running' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {jobStatus}
        </Badge>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-2" />

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
          <Button size="sm" variant="outline" onClick={onPause}>
            <Pause className="mr-1 h-3.5 w-3.5" />
            {__('Pause')}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onResume}>
            <Play className="mr-1 h-3.5 w-3.5" />
            {__('Resume')}
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={onStop}>
          <Square className="mr-1 h-3.5 w-3.5" />
          {__('Stop')}
        </Button>
      </div>
    </div>
  );
}
