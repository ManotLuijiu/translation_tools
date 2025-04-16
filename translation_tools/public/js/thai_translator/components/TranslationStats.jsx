import { Progress } from "@/components/ui/progress";
import { formatPercentage } from "../../translation_tools/utils/helpers.js";

export default function TranslationStats({ stats }) {
  return (
    <div className="flex items-center space-x-4">
      <div className="text-center">
        <div className="text-2xl font-bold">{stats.total}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-green-600 dark:text-green-500">
          {stats.translated}
        </div>
        <div className="text-xs text-muted-foreground">Translated</div>
      </div>

      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">
          {stats.untranslated}
        </div>
        <div className="text-xs text-muted-foreground">Untranslated</div>
      </div>

      <div className="w-48">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm font-medium">
            {formatPercentage(stats.percentage)}
          </span>
        </div>
        <Progress value={stats.percentage} className="h-2" />
      </div>
    </div>
  );
}
