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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/context/TranslationContext';
import PasswordVisibilityToggle from '../PasswordVisibilityToggle';

// const modelOptions = {
//   openai: [
//     { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 mini' },
//     { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1' },
//     { value: 'chatgpt-4o-latest', label: 'ChatGPT-4o' },
//     { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o mini' },
//     { value: 'o4-mini-2025-04-16', label: 'o4-mini' },
//   ],
//   claude: [
//     { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
//     { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
//     { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet v2' },
//     { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
//     { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
//     { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
//   ],
// };

type Props = {
  settings: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onSave: () => void;
  statusMessage: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null;
  showOpenAi: boolean;
  setShowOpenAi: (val: boolean) => void;
  showClaudeAi: boolean;
  setShowClaudeAi: (val: boolean) => void;
  loading: boolean;
  models: {
    message: {
      openai: { id: string; label: string }[];
      claude: { id: string; label: string }[];
    };
  };
  modelLoading: boolean;
  modelError: any;
};

export default function AiModelsSettings({
  settings,
  onInputChange,
  onSelectChange,
  onSave,
  statusMessage,
  showOpenAi,
  setShowOpenAi,
  showClaudeAi,
  setShowClaudeAi,
  loading,
  models,
  modelLoading,
  modelError,
}: Props) {
  const { translate: __ } = useTranslation();

  const currentModels =
    settings.default_model_provider === 'openai'
      ? (models?.message?.openai ?? [])
      : (models?.message?.claude ?? []);

  // console.log('models', models);

  // console.log(
  //   'settings.default_model_provider',
  //   settings.default_model_provider
  // );
  // console.log('settings in AiModelsSettings.tsx', settings);
  // console.log('currentModels in AiModelsSettings.tsx', currentModels);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{__('AI Translation Models')}</CardTitle>
        <CardDescription>
          {__('Configure which AI models to use for translations')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{__('Default Model Provider')}</Label>
          <Select
            value={settings.default_model_provider}
            onValueChange={(value) =>
              onSelectChange('default_model_provider', value)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">{__('OpenAI')}</SelectItem>
              <SelectItem value="anthropic">
                {__('Anthropic Claude')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{__('Default Model')}</Label>
          {modelLoading ? (
            <Skeleton className="h-10 w-full rounded-md" />
          ) : (
            <Select
              value={settings.default_model || ''}
              onValueChange={(value) => onSelectChange('default_model', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={__('Select model')} />
              </SelectTrigger>
              <SelectContent>
                {currentModels.length > 0 ? (
                  currentModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.label}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-4 py-2 text-muted-foreground text-sm">
                    {__('No models available')}
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
          {modelError && (
            <p className="text-sm text-red-600">
              {__('Failed to fetch models. Please refresh or check API key.')}
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <Label htmlFor="openai_api_key">{__('OpenAI API Key')}</Label>
          <div className="relative">
            <Input
              id="openai_api_key"
              type={showOpenAi ? 'text' : 'password'}
              name="openai_api_key"
              value={settings.openai_api_key || ''}
              onChange={onInputChange}
              placeholder={__('Enter OpenAI API Key')}
            />
            <PasswordVisibilityToggle
              isVisible={showOpenAi}
              onToggle={() => setShowOpenAi(!showOpenAi)}
            />
            {/* <button
              type="button"
              className="absolute right-2 top-0 transform translate-y-1/2"
              onClick={() => setShowOpenAi(!showOpenAi)}
            >
              {showOpenAi ? '🙈' : '👁️'}
            </button> */}
          </div>

          <Label htmlFor="anthropic_api_key">{__('Anthropic API Key')}</Label>
          <div className="relative">
            <Input
              id="anthropic_api_key"
              type={showClaudeAi ? 'text' : 'password'}
              name="anthropic_api_key"
              value={settings.anthropic_api_key || ''}
              onChange={onInputChange}
              placeholder={__('Enter Anthropic API Key')}
            />
            <PasswordVisibilityToggle
              isVisible={showClaudeAi}
              onToggle={() => setShowClaudeAi(!showClaudeAi)}
            />
            {/* <button
              type="button"
              className="absolute right-2 top-0 transform translate-y-1/2"
              onClick={() => setShowClaudeAi(!showClaudeAi)}
            >
              {showClaudeAi ? '🙈' : '👁️'}
            </button> */}
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
