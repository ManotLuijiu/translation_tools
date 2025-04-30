import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/context/TranslationContext';

export default function TranslationOptionsSettings({
  settings,
  onSliderChange,
  onSwitchChange,
  onSave,
  statusMessage,
  loading,
}: any) {
  const { translate: __ } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{__('Translation Options')}</CardTitle>
        <CardDescription>
          {__('Configure how translations are processed')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>
            {__('Batch Size:')} {settings.batch_size}
          </Label>
          <Slider
            value={[settings.batch_size]}
            min={1}
            max={50}
            step={1}
            onValueChange={(val) => onSliderChange('batch_size', val)}
          />

          <Label>
            {__('Temperature:')} {settings.temperature.toFixed(2)}
          </Label>
          <Slider
            value={[settings.temperature]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(val) => onSliderChange('temperature', val)}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto_save"
              checked={settings.auto_save}
              onCheckedChange={(checked) =>
                onSwitchChange('auto_save', checked)
              }
            />
            <Label htmlFor="auto_save">{__('AI Auto-save Translations')}</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="preserve_formatting"
              checked={settings.preserve_formatting}
              onCheckedChange={(checked) =>
                onSwitchChange('preserve_formatting', checked)
              }
            />
            <Label htmlFor="preserve_formatting">
              {__('Preserve Formatting')}
            </Label>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSave} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {__('Save All Settings')}
        </Button>
        {statusMessage && (
          <Alert
            variant={statusMessage.type === 'error' ? 'destructive' : 'default'}
            className="ml-4"
          >
            {statusMessage.type === 'success' && <Check className="h-4 w-4" />}
            {statusMessage.type === 'error' && (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>{__(statusMessage.type)}</AlertTitle>
            <AlertDescription>{statusMessage.message}</AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
}
