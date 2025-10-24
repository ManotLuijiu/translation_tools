import { Progress } from '@/components/ui/progress';
import { formatPercentage } from '../utils/helpers';
import { useTranslation } from '@/context/TranslationContext';
import { Loader2 } from 'lucide-react';

interface TranslationStatsProps {
  stats: {
    total: number;
    translated: number;
    untranslated: number;
    percentage: number;
  };
}

export default function TranslationStats({ stats }: TranslationStatsProps) {
  const { translate: __, isReady } = useTranslation();

  // console.log('stats', stats);

  if (!isReady) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="ml-2">{__('Loading file contents...')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
      <div className="text-center">
        <div className="text-xl sm:text-2xl font-bold text-sky-600">{stats.total}</div>
        <div className="text-muted-foreground text-xs">{__('Total')}</div>
      </div>

      <div className="text-center">
        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-500">
          {stats.translated}
        </div>
        <div className="text-muted-foreground text-xs">{__('Translated')}</div>
      </div>

      <div className="text-center">
        <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-500">
          {stats.untranslated}
        </div>
        <div className="text-muted-foreground text-xs">
          {__('Untranslated')}
        </div>
      </div>

      <div className="w-full sm:w-48">
        <div className="mb-1 flex justify-between">
          <span className="text-sm font-medium">{__('Progress')}</span>
          <span className="text-sm font-medium">
            {formatPercentage(stats.percentage)}
          </span>
        </div>
        <Progress value={stats.percentage} className="h-2" />
      </div>
    </div>
  );
}
