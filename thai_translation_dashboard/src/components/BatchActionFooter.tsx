import { GitBranch, Loader2, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { __ } from '@/utils/translation';
import AutoModeToggle from './AutoModeToggle';

interface BatchActionFooterProps {
  autoMode: boolean;
  setAutoMode: (value: boolean) => void;
  englishOnly: boolean;
  setEnglishOnly: (value: boolean) => void;
  selectedEntriesLength: number;
  translatedEntriesCount: number;
  githubEnabled: boolean;
  pushToGithub: boolean;
  setPushToGithub: (value: boolean) => void;
  isTranslating: boolean;
  translateLoading: boolean;
  saveLoading: boolean;
  hasFile: boolean;
  onStartAutoMode: () => void;
  onTranslateBatch: () => void;
  onSaveBatch: () => void;
}

export default function BatchActionFooter({
  autoMode,
  setAutoMode,
  englishOnly,
  setEnglishOnly,
  selectedEntriesLength,
  translatedEntriesCount,
  githubEnabled,
  pushToGithub,
  setPushToGithub,
  isTranslating,
  translateLoading,
  saveLoading,
  hasFile,
  onStartAutoMode,
  onTranslateBatch,
  onSaveBatch,
}: BatchActionFooterProps) {
  const isLoading = isTranslating || translateLoading;

  return (
    <div id="batch__action__footer__wrapper" className="flex items-center gap-4 flex-wrap justify-between w-full">
      {/* Manual mode: entry count */}
      {!autoMode && (
        <div className="text-sm text-muted-foreground">
          {selectedEntriesLength} {__('entries selected')}
        </div>
      )}

      {/* Toggles - grouped together */}
      <div className="flex items-center gap-4">
        {/* Push to Github */}
        {githubEnabled && (
          <div className="flex items-center space-x-2">
            <Switch
              id="batch-push-to-github"
              checked={pushToGithub}
              onCheckedChange={setPushToGithub}
              className="cursor-pointer"
            />
            <Label
              htmlFor="batch-push-to-github"
              className={`cursor-pointer whitespace-nowrap text-sm ${
                pushToGithub ? 'text-green-600' : ''
              }`}
            >
              <GitBranch className="mr-1 inline h-3.5 w-3.5" />
              {__('Push to Github')}
            </Label>
          </div>
        )}

        {/* Auto Mode Toggle */}
        <AutoModeToggle autoMode={autoMode} setAutoMode={setAutoMode} />

        {/* English Only Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="batch-english-only"
            checked={englishOnly}
            onCheckedChange={setEnglishOnly}
            className="cursor-pointer"
          />
          <Label
            htmlFor="batch-english-only"
            className={`cursor-pointer whitespace-nowrap text-sm ${
              englishOnly ? 'text-orange-600' : ''
            }`}
          >
            {__('English Only')}
          </Label>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <div className="space-x-2">
        {/* Primary action button */}
        <Button
          variant="outline"
          onClick={autoMode ? onStartAutoMode : onTranslateBatch}
          className="cursor-pointer"
          disabled={
            isLoading ||
            (!autoMode && selectedEntriesLength === 0) ||
            !hasFile
          }
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {autoMode ? __('Processing…') : __('Translating...')}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {autoMode ? __('Start Auto Translation') : __('AI Translate Batch')}
            </>
          )}
        </Button>

        {/* Save — manual mode only */}
        {!autoMode && (
          <Button
            onClick={onSaveBatch}
            className="cursor-pointer"
            disabled={isTranslating || saveLoading || translatedEntriesCount === 0}
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
    </div>
  );
}
