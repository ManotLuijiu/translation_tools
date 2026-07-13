import React, { useState, useEffect } from 'react';
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
import { useTranslation } from '@/context/TranslationContext';
import { Loader2, ExternalLink, DollarSign, AlertCircle, Check } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ModelWithPricing } from '@/types';

interface Props {
  settings: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onSave: () => void;
  onTestOpenAI: () => void;
  onTestAnthropic: () => void;
  onRefreshPricing: () => void;
  showOpenAi: boolean;
  setShowOpenAi: (val: boolean) => void;
  showClaudeAi: boolean;
  setShowClaudeAi: (val: boolean) => void;
  loading: boolean;
  models: {
    message: {
      openai: ModelWithPricing[];
      openai_recommended?: ModelWithPricing[];
      claude: ModelWithPricing[];
      claude_recommended?: ModelWithPricing[];
    };
  };
  modelLoading: boolean;
  modelError: any;
  pricingRefreshLoading?: boolean;
};

// Model pricing URL helper (matches backend get_model_pricing_url)
function getModelPricingUrl(modelId: string): string {
  // OpenAI models: gpt-4.1-mini-2025-04-14 -> https://developers.openai.com/api/docs/models/gpt-4.1-mini
  if (modelId.startsWith('gpt-') || modelId.startsWith('o4-') || modelId.startsWith('o3-') || modelId.startsWith('chatgpt-')) {
    const parts = modelId.split('-');
    // Check if last parts are date (YYYY-MM-DD)
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    if (/^\d{2}$/.test(lastPart) && /^\d{4}$/.test(secondLastPart)) {
      // Remove date suffix
      const slug = parts.slice(0, -3).join('-');
      return `https://developers.openai.com/api/docs/models/${slug}`;
    }
    return `https://developers.openai.com/api/docs/models/${modelId}`;
  }
  // Anthropic models
  if (modelId.startsWith('claude-')) {
    return 'https://docs.anthropic.com/en/docs/models-overview';
  }
  return 'https://developers.openai.com/api/docs/models';
}

// Password visibility toggle component
function PasswordVisibilityToggle({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
      tabIndex={-1}
    >
      {isVisible ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.94-5.94m-2.76-2.76a18.45 18.45 0 0 1-5.94-5.94" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-8-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

export default function AiModelsSettings({
  settings,
  onInputChange,
  onSelectChange,
  onSave,
  onTestOpenAI,
  onTestAnthropic,
  onRefreshPricing,
  showOpenAi,
  setShowOpenAi,
  showClaudeAi,
  setShowClaudeAi,
  loading,
  models,
  modelLoading,
  modelError,
  pricingRefreshLoading,
}: Props) {
  const { translate: __ } = useTranslation();
  const [refreshingPricing, setRefreshingPricing] = useState(false);
  const [showAllModels, setShowAllModels] = useState(false);

  const handleRefreshPricing = async () => {
    setRefreshingPricing(true);
    await onRefreshPricing();
    setRefreshingPricing(false);
  };

  const currentModels =
    settings.default_model_provider === 'openai'
      ? (showAllModels
          ? (models?.message?.openai ?? [])
          : (models?.message?.openai_recommended ?? models?.message?.openai ?? []))
      : (models?.message?.claude ?? []);

  // Match by id OR by snapshot (for legacy saved settings)
  const selectedModel = currentModels.find(
    m => m.id === settings.default_model || m.snapshot === settings.default_model
  );
  // Use pricing_url from backend, fallback to local mapping
  const selectedModelUrl = selectedModel?.pricing_url || getModelPricingUrl(settings.default_model || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{__('AI Translation Models')}</CardTitle>
        <CardDescription>
          {__('Configure which AI models to use for translations')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div id='ai__models__settings__wrapper' className="grid grid-cols-2 gap-6">
          {/* Left Panel - Model Selection */}
          <div id='ai__models__settings__left__panel' className="space-y-4">
            <div id='ai__models__settings__default__model__provider' className="space-y-2">
              <Label>{__('Default Model Provider')}</Label>
              <Select
                value={settings.default_model_provider}
                onValueChange={(value) =>
                  onSelectChange('default_model_provider', value)
                }
              >
                <SelectTrigger className='text-left p-2 w-full cursor-pointer'>
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

            <div id='ai__models__settings__default__model' className="space-y-2">
              <Label>{__('Default Model')}</Label>
              {modelLoading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <Select
                  value={settings.default_model || ''}
                  onValueChange={(value) => onSelectChange('default_model', value)}
                >
                  <SelectTrigger id='ai__models__settings__default__model__select__trigger' className="text-left p-2 w-full cursor-pointer">
                    <SelectValue placeholder={__('Select model')} />
                  </SelectTrigger>
                  <SelectContent id='ai__models__settings__default__model__select__content'>
                    {currentModels.length > 0 ? (
                      <>
                        {currentModels.map((model: any) => (
                          <SelectItem id={`ai__models__settings__default__model__select__item__${model.id}`} key={model.id} value={model.id} className="py-2">
                            <div className="flex flex-col leading-none">
                              <span className="font-medium leading-none">{model.label || model.id}</span>
                              {model.snapshot && (
                                <span className="text-xs text-muted-foreground">{model.snapshot}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        {/* Show All / Show Recommended toggle inside dropdown */}
                        {settings.default_model_provider === 'openai' && (models?.message?.openai?.length ?? 0) > (models?.message?.openai_recommended?.length ?? 0) && (
                          <div className="border-t mt-1 pt-1">
                            {showAllModels ? (
                              <div
                                className="px-2 py-2 text-xs text-blue-600 cursor-pointer hover:text-blue-800 hover:underline text-center"
                                onClick={() => setShowAllModels(false)}
                              >
                                {__('Show Recommended Only')} ({models?.message?.openai_recommended?.length ?? 0})
                              </div>
                            ) : (
                              <div
                                className="px-2 py-2 text-xs text-blue-600 cursor-pointer hover:text-blue-800 hover:underline text-center"
                                onClick={() => setShowAllModels(true)}
                              >
                                {__('Show All Models')} ({models?.message?.openai?.length ?? 0})
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-4 py-2 text-muted-foreground text-sm">
                        {__('No models available')}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
              
              {/* Pricing URL Link */}
              {selectedModelUrl && (
                <a
                  href={selectedModelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {__('Pricing source')}: {selectedModelUrl.replace('https://', '')}
                </a>
              )}
              
              {modelError && (
                <p className="text-sm text-red-600">
                  {__('Failed to fetch models. Please refresh or check API key.')}
                </p>
              )}
            </div>

            {/* Refresh Pricing Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPricing}
                disabled={refreshingPricing || pricingRefreshLoading}
                className="cursor-pointer"
              >
                {refreshingPricing || pricingRefreshLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {__('Refresh Pricing')}
              </Button>
            </div>
          </div>

          {/* Right Panel - Pricing Display */}
          <div id='ai__models__settings__right__panel' className="space-y-4">
            <div className="space-y-2">
              <Label>{__('Model Pricing')}</Label>
              {selectedModel ? (
                <div className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>{__('Model')}</span>
                  <span className="font-mono text-sm">{selectedModel.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>{__('Input (per 1M tokens)')}</span>
                  <span className="font-mono">${selectedModel.input_cost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{__('Output (per 1M tokens)')}</span>
                  <span className="font-mono">${selectedModel.output_cost.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>{__('Total/1M')}</span>
                  <span className="font-mono text-green-600">
                    ${(selectedModel.input_cost + selectedModel.output_cost).toFixed(2)}/1M
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                {__('Select a model to see pricing')}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* API Keys Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{__('API Keys')}</h3>
          
          {/* OpenAI API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="openai_api_key">{__('OpenAI API Key')}</Label>
              {(settings as any).openai_api_key_configured && (
                <span className="text-xs text-green-600">✓ API Key configured</span>
              )}
            </div>
            <div className="flex justify-center items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="openai_api_key"
                  type={showOpenAi ? 'text' : 'password'}
                  name="openai_api_key"
                  value={
                    (settings as any).openai_api_key_configured && !settings.openai_api_key
                      ? '****'
                      : settings.openai_api_key || ''
                  }
                  onChange={onInputChange}
                  placeholder={__('Enter OpenAI API Key')}
                />
                <PasswordVisibilityToggle
                  isVisible={showOpenAi}
                  onToggle={() => setShowOpenAi(!showOpenAi)}
                />
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={onTestOpenAI}
                disabled={
                  (!settings.openai_api_key && !(settings as any).openai_api_key_configured) || loading
                }
                className="h-stretch min-w-[120px] cursor-pointer"
              >
                {__('Test')}
              </Button>
            </div>
          </div>

          {/* Anthropic API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="anthropic_api_key">{__('Anthropic API Key')}</Label>
              {(settings as any).anthropic_api_key_configured && (
                <span className="text-xs text-green-600">✓ API Key configured</span>
              )}
            </div>
            <div className="flex justify-center items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="anthropic_api_key"
                  type={showClaudeAi ? 'text' : 'password'}
                  name="anthropic_api_key"
                  value={
                    (settings as any).anthropic_api_key_configured && !settings.anthropic_api_key
                      ? '****'
                      : settings.anthropic_api_key || ''
                  }
                  onChange={onInputChange}
                  placeholder={__('Enter Anthropic API Key')}
                />
                <PasswordVisibilityToggle
                  isVisible={showClaudeAi}
                  onToggle={() => setShowClaudeAi(!showClaudeAi)}
                />
              </div>
              <Button
                variant="outline"
                size="lg"
                onClick={onTestAnthropic}
                disabled={
                  (!settings.anthropic_api_key && !(settings as any).anthropic_api_key_configured) || loading
                }
                className="h-stretch min-w-[120px] cursor-pointer"
              >
                {__('Test')}
              </Button>
            </div>
          </div>
        </div>

        {/* Cost Estimation */}
        <div className="space-y-2 p-4 border rounded-lg">
          <h3 className="text-sm font-medium">{__('Cost Estimation')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="openai_balance_usd" className="text-xs">
                {__('OpenAI Balance (USD)')}
              </Label>
              <Input
                id="openai_balance_usd"
                name="openai_balance_usd"
                type="number"
                step="0.01"
                min="0"
                value={settings.openai_balance_usd ?? ''}
                onChange={onInputChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="anthropic_balance_usd" className="text-xs">
                {__('Anthropic Balance (USD)')}
              </Label>
              <Input
                id="anthropic_balance_usd"
                name="anthropic_balance_usd"
                type="number"
                step="0.01"
                min="0"
                value={settings.anthropic_balance_usd ?? ''}
                onChange={onInputChange}
                placeholder="0.00"
              />
            </div>
            {selectedModel && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{__('Cost/Entry')}</span>
                  <span className="font-mono">${selectedModel.cost_per_entry_usd?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{__('Est. Entries')}</span>
                  <span className="font-mono">{selectedModel.estimated_entries || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>

      </CardContent>
      <CardFooter>
        <Button className="cursor-pointer" onClick={onSave} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {__('Save All Settings')}
        </Button>
      </CardFooter>
    </Card>
  );
}
