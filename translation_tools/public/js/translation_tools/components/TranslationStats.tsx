import React from 'react';
import { Progress } from '@/components/ui/progress';
import { formatPercentage } from '../utils/helpers';

interface TranslationStatsProps {
  stats: {
    total: number;
    translated: number;
    untranslated: number;
    percentage: number;
  };
}

export default function TranslationStats({ stats }: TranslationStatsProps) {
  return (
    <div className="tw-flex tw-items-center tw-space-x-4">
      <div className="tw-text-center">
        <div className="tw-text-2xl tw-font-bold">{stats.total}</div>
        <div className="tw-text-xs tw-text-muted-foreground">Total</div>
      </div>

      <div className="tw-text-center">
        <div className="tw-text-2xl tw-font-bold tw-text-green-600 dark:tw-text-green-500">
          {stats.translated}
        </div>
        <div className="tw-text-xs tw-text-muted-foreground">Translated</div>
      </div>

      <div className="tw-text-center">
        <div className="tw-text-2xl tw-font-bold tw-text-orange-600 dark:tw-text-orange-500">
          {stats.untranslated}
        </div>
        <div className="tw-text-xs tw-text-muted-foreground">Untranslated</div>
      </div>

      <div className="tw-w-48">
        <div className="tw-mb-1 tw-flex tw-justify-between">
          <span className="tw-text-sm tw-font-medium">Progress</span>
          <span className="tw-text-sm tw-font-medium">
            {formatPercentage(stats.percentage)}
          </span>
        </div>
        <Progress value={stats.percentage} className="tw-h-2" />
      </div>
    </div>
  );
}
