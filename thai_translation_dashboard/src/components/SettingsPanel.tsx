import React, { useState, useEffect } from 'react';
import { useGetTranslationSettings, useSaveTranslationSettings } from '../api';
import { TranslationSettings, TranslationToolsSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Partial<TranslationSettings>>({
    default_model_provider: 'openai',
    default_model: 'gpt-4-1106-preview',
    openai_api_key: '',
    anthropic_api_key: '',
    batch_size: 10,
    temperature: 0.3,
    auto_save: false,
    preserve_formatting: true,
  });

  const [githubSettings, setGithubSettings] = useState<
    Partial<TranslationToolsSettings>
  >({
    github_enable: false,
    github_url: '',
    github_token: '',
  });

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const { data, error, isLoading } = useGetTranslationSettings();
  const saveSettings = useSaveTranslationSettings();
  const { translate: __, isReady } = useTranslation();

  console.log('useGetTranslationSettings data: ', data);

  useEffect(() => {
    if (data?.message) {
      setSettings(data.message);
    }
  }, [data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGithubInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setGithubSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleGithubSwitchChange = (name: string, checked: boolean) => {
    setGithubSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    console.log('handleSelectChange clicked');
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSliderChange = (name: string, value: number[]) => {
    setSettings((prev) => ({ ...prev, [name]: value[0] }));
  };

  const handleSaveSettings = async () => {
    setStatusMessage({ type: 'info', message: 'Saving settings...' });

    try {
      const result = await saveSettings.call({ settings });

      if (result.success) {
        setStatusMessage({
          type: 'success',
          message: 'Settings saved successfully',
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to save settings',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred while saving settings',
      });
    }
  };

  if (isLoading || !isReady) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error.message || 'Failed to load settings'}
        </AlertDescription>
      </Alert>
    );
  }

  const modelOptions = {
    openai: [
      { value: 'gpt-4-1106-preview', label: 'GPT-4 Turbo (1106)' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
    claude: [
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{__('Translation Settings')}</h2>

      <Tabs defaultValue="ai-models" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-models">{__('AI Models')}</TabsTrigger>
          <TabsTrigger value="translation-options">
            {__('Translation Options')}
          </TabsTrigger>
          <TabsTrigger value="github-integration">
            {__('GitHub Integration')}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: AI Models */}
        <TabsContent value="ai-models">
          <Card>
            <CardHeader>
              <CardTitle>{__('AI Translation Models')}</CardTitle>
              <CardDescription>
                {__('Configure which AI models to use for translations')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default_model_provider">
                    {__('Default Model Provider')}
                  </Label>
                  <Select
                    value={settings.default_model_provider}
                    onValueChange={(value) =>
                      handleSelectChange('default_model_provider', value)
                    }
                  >
                    <SelectTrigger id="default_model_provider">
                      <SelectValue placeholder={__('Select model provider')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">{__('OpenAI')}</SelectItem>
                      <SelectItem value="claude">
                        {__('Anthropic Claude')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {__(
                      'Choose which AI provider to use by default for translations'
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_model">{__('Default Model')}</Label>
                  <Select
                    value={settings.default_model}
                    onValueChange={(value) =>
                      handleSelectChange('default_model', value)
                    }
                  >
                    <SelectTrigger id="default_model">
                      <SelectValue placeholder={__('Select model')} />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.default_model_provider === 'openai'
                        ? modelOptions.openai.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))
                        : modelOptions.claude.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                              {model.label}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {__(
                      'Choose which model to use by default for translations'
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">{__('API Keys')}</h3>

                <div className="space-y-2">
                  <Label htmlFor="openai_api_key">{__('OpenAI API Key')}</Label>
                  <Input
                    id="openai_api_key"
                    name="openai_api_key"
                    type="password"
                    value={settings.openai_api_key || ''}
                    onChange={handleInputChange}
                    placeholder={
                      settings.openai_api_key
                        ? '********'
                        : __('Enter OpenAI API key')
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {__('Your OpenAI API key for GPT models')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anthropic_api_key">
                    {__('Anthropic API Key')}
                  </Label>
                  <Input
                    id="anthropic_api_key"
                    name="anthropic_api_key"
                    type="password"
                    value={settings.anthropic_api_key || ''}
                    onChange={handleInputChange}
                    placeholder={
                      settings.anthropic_api_key
                        ? '********'
                        : __('Enter Anthropic API key')
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {__('Your Anthropic API key for Claude models')}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveSettings}
                disabled={saveSettings.loading}
              >
                {saveSettings.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {__('Saving...')}
                  </>
                ) : (
                  __('Save All Settings')
                )}
              </Button>

              {statusMessage && (
                <Alert
                  variant={
                    statusMessage.type === 'error' ? 'destructive' : 'default'
                  }
                  className="ml-4"
                >
                  {statusMessage.type === 'success' && (
                    <Check className="h-4 w-4" />
                  )}
                  {statusMessage.type === 'error' && (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {statusMessage.type === 'info' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <AlertTitle>
                    {statusMessage.type === 'success'
                      ? 'Success'
                      : statusMessage.type === 'error'
                        ? 'Error'
                        : 'Info'}
                  </AlertTitle>
                  <AlertDescription>{statusMessage.message}</AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 2: Translation Options */}
        <TabsContent value="translation-options">
          <Card>
            <CardHeader>
              <CardTitle>{__('Translation Options')}</CardTitle>
              <CardDescription>
                {__('Configure how translations are processed')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-4">
                  <Label htmlFor="batch_size">
                    {__('Batch Size:')} {settings.batch_size}
                  </Label>
                  <Slider
                    id="batch_size"
                    value={[settings.batch_size || 10]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={(value) =>
                      handleSliderChange('batch_size', value)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {__(
                      `Number of entries to translate in a batch (larger batches are more efficient but may hit rate limits)`
                    )}
                  </p>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="temperature">
                    {__('Temperature:')} {settings.temperature?.toFixed(2)}
                  </Label>
                  <Slider
                    id="temperature"
                    value={[settings.temperature || 0.3]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={(value) =>
                      handleSliderChange('temperature', value)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {__(`Controls randomness in translations (lower values are more
                    consistent)`)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_save"
                    checked={!!settings.auto_save}
                    onCheckedChange={(checked) =>
                      handleSwitchChange('auto_save', checked)
                    }
                  />
                  <Label htmlFor="auto_save">
                    {__('Auto-save Translations')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {__(
                    'Automatically save translations after they are generated'
                  )}
                </p>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="preserve_formatting"
                    checked={!!settings.preserve_formatting}
                    onCheckedChange={(checked) =>
                      handleSwitchChange('preserve_formatting', checked)
                    }
                  />
                  <Label htmlFor="preserve_formatting">
                    {__('Preserve Formatting')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {__(
                    'Maintain formatting tokens and placeholders in translations'
                  )}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveSettings}
                disabled={saveSettings.loading}
              >
                {saveSettings.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {__('Saving...')}
                  </>
                ) : (
                  __('Save All Settings')
                )}
              </Button>

              {statusMessage && (
                <Alert
                  variant={
                    statusMessage.type === 'error' ? 'destructive' : 'default'
                  }
                  className="ml-4"
                >
                  {statusMessage.type === 'success' && (
                    <Check className="h-4 w-4" />
                  )}
                  {statusMessage.type === 'error' && (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {statusMessage.type === 'info' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <AlertTitle>
                    {statusMessage.type === 'success'
                      ? 'Success'
                      : statusMessage.type === 'error'
                        ? 'Error'
                        : 'Info'}
                  </AlertTitle>
                  <AlertDescription>{statusMessage.message}</AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Tab 3: GitHub Integration */}
        <TabsContent value="github-integration">
          <Card>
            <CardHeader>
              <CardTitle>{__('Github Integration')}</CardTitle>
              <CardDescription>
                {__('Create a token with "repo" scope at')}{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  https://github.com/settings/tokens
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="github_enable"
                    checked={!!githubSettings.github_enable}
                    onCheckedChange={(checked) =>
                      handleGithubSwitchChange('github_enable', checked)
                    }
                  />
                  <Label htmlFor="github_enable">
                    {__('Enable Github Integration')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {__('Enable GitHub integration for upload th.po files')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="github_url">{__('Github Repo URL')}</Label>
                  <Input
                    id="github_url"
                    name="github_url"
                    type="text"
                    value={githubSettings.github_url || ''}
                    onChange={handleGithubInputChange}
                    placeholder={__('Enter Github repo URL for th.po files')}
                  />
                  <p className="text-sm text-muted-foreground">
                    {__('Github repo url for th.po files')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github_token">{__('Github Token')}</Label>
                  <Input
                    id="github_token"
                    name="github_token"
                    type="password"
                    value={githubSettings.github_token || ''}
                    onChange={handleGithubInputChange}
                    placeholder={
                      githubSettings.github_token
                        ? '********'
                        : __('Enter Github Token')
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {__('Your Github Personal Access Token')}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSaveSettings}
                disabled={saveSettings.loading}
              >
                {saveSettings.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {__('Saving...')}
                  </>
                ) : (
                  __('Save All Settings')
                )}
              </Button>

              {statusMessage && (
                <Alert
                  variant={
                    statusMessage.type === 'error' ? 'destructive' : 'default'
                  }
                  className="ml-4"
                >
                  {statusMessage.type === 'success' && (
                    <Check className="h-4 w-4" />
                  )}
                  {statusMessage.type === 'error' && (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  {statusMessage.type === 'info' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <AlertTitle>
                    {statusMessage.type === 'success'
                      ? 'Success'
                      : statusMessage.type === 'error'
                        ? 'Error'
                        : 'Info'}
                  </AlertTitle>
                  <AlertDescription>{statusMessage.message}</AlertDescription>
                </Alert>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
