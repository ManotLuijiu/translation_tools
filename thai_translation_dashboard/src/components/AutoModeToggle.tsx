import { HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { __ } from '@/utils/translation';

interface AutoModeToggleProps {
  autoMode: boolean;
  setAutoMode: (value: boolean) => void;
}

export default function AutoModeToggle({ autoMode, setAutoMode }: AutoModeToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="batch-auto-mode"
        checked={autoMode}
        onCheckedChange={setAutoMode}
        className="cursor-pointer"
      />
      <Label
        htmlFor="batch-auto-mode"
        className={`cursor-pointer whitespace-nowrap text-sm ${
          autoMode ? 'text-green-600' : ''
        }`}
      >
        {__('Auto Mode')}
      </Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs space-y-1">
              <p>{__('Translates untranslated entries automatically in safe batches.')}</p>
              <p className="text-muted-foreground text-[10px]">
                {__('Each chunk = 20 entries. Choose chunk count based on your budget.')}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
