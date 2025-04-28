import React, { useState, useEffect } from 'react';
import {
  useGetTranslationSettings,
  useSaveTranslationSettings,
  useTestGithubConnection,
} from '../api';
import { TranslationPDFSettings, TranslationToolsSettings } from '../types';
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
  const [settings, setSettings] = useState<Partial<TranslationToolsSettings>>({
    default_model_provider: 'openai',
    default_model: 'gpt-4.1-2025-04-14',
    openai_api_key: '',
    anthropic_api_key: '',
    batch_size: 10,
    temperature: 0.3,
    auto_save: false,
    preserve_formatting: true,
    github_enable: false,
    github_repo: '',
    github_token: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showClaudeAi, setShowClaudeAi] = useState(false);

  // const [githubSettings, setGithubSettings] = useState<
  //   Partial<TranslationToolsSettings>
  // >({
  //   github_enable: false,
  //   github_repo: '',
  //   github_token: '',
  // });

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const { data, error, isLoading } = useGetTranslationSettings();
  const saveSettings = useSaveTranslationSettings();
  const testGithub = useTestGithubConnection();
  const { translate: __, isReady } = useTranslation();

  console.log('useGetTranslationSettings data: ', data);

  useEffect(() => {
    if (data?.message) {
      setSettings(data.message);
    }
  }, [data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // const handleGithubInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value, type, checked } = e.target;
  //   setGithubSettings((prev) => ({
  //     ...prev,
  //     [name]: type === 'checkbox' ? checked : value,
  //   }));
  // };

  // const handleGithubSwitchChange = (name: string, checked: boolean) => {
  //   setGithubSettings((prev) => ({ ...prev, [name]: checked }));
  // };

  const handleSelectChange = (name: string, value: string) => {
    console.log('handleSelectChange clicked');
    if (name === 'default_model_provider') {
      // When changing provider, also update the model to a valid default for that provider
      const newModelValue =
        value === 'openai'
          ? modelOptions.openai[0].value
          : modelOptions.claude[0].value;

      setSettings((prev: any) => ({
        ...prev,
        [name]: value,
        default_model: newModelValue,
      }));
    } else {
      setSettings((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setSettings((prev: any) => ({ ...prev, [name]: checked }));
  };

  const handleSliderChange = (name: string, value: number[]) => {
    setSettings((prev: any) => ({ ...prev, [name]: value[0] }));
  };

  const handleTestGitHubConnection = async (
    github_repo: string,
    github_token: string
  ) => {
    setStatusMessage({ type: 'info', message: 'Testing GitHub connection...' });

    try {
      // Make an API call to test the GitHub connection
      const { message } = await testGithub.call({
        github_repo,
        github_token,
      });

      console.log('message from github testing', message);

      if (message?.success) {
        setStatusMessage({
          type: 'success',
          message: 'Successfully connected to GitHub!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          message: message?.error || 'Failed to connect to GitHub',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        message:
          err.message || 'An error occurred while testing the connection',
      });
    }
  };

  const handleSaveSettings = async () => {
    setStatusMessage({ type: 'info', message: 'Saving settings...' });

    try {
      const result: {
        success: boolean;
        warnings?: string[];
        _server_messages?: [];
        message?: {
          success: boolean;
          message: string;
          warnings: [];
        };
      } = await saveSettings.call({ settings });

      console.log('result SettingsPanel.tsx', result);

      if (result.message?.success) {
        // Check if there are any warnings
        if (result.message?.warnings && result.message?.warnings.length > 0) {
          setStatusMessage({
            type: 'warning',
            message: result.message.warnings.join(' '),
          });
        } else {
          setStatusMessage({
            type: 'success',
            message: result.message.message || 'Settings saved successfully',
          });
        }
      } else {
        setStatusMessage({
          type: 'error',
          message: 'Failed to save settings',
        });
      }
    } catch (err: any) {
      const errorMessage =
        err.message || 'An error occurred while saving settings';
      setStatusMessage({
        type: 'error',
        message: errorMessage,
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
      { value: 'gpt-4.1-2025-04-14', label: 'GPT-4.1' },
      { value: 'chatgpt-4o-latest', label: 'ChatGPT-4o' },
      { value: 'gpt-4o-mini-2024-07-18', label: 'GPT-4o mini' },
      { value: 'o4-mini-2025-04-16', label: 'o4-mini' },
    ],
    claude: [
      { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet v2' },
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
          <TabsTrigger className="cursor-pointer" value="ai-models">
            {__('AI Models')}
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="translation-options">
            {__('Translation Options')}
          </TabsTrigger>
          <TabsTrigger className="cursor-pointer" value="github-integration">
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
                  <div className="relative">
                    <Input
                      id="openai_api_key"
                      name="openai_api_key"
                      type={showOpenAi ? 'text' : 'password'}
                      value={settings.openai_api_key || ''}
                      onChange={handleInputChange}
                      placeholder={
                        settings.openai_api_key
                          ? '********'
                          : __('Enter OpenAI API key')
                      }
                    />

                    <button
                      type="button"
                      className="absolute right-2 top-0 transform translate-y-1/2"
                      onClick={() => setShowOpenAi(!showOpenAi)}
                      aria-label={
                        showOpenAi ? 'Hide password' : 'Show password'
                      }
                    >
                      {showOpenAi ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                            clipRule="evenodd"
                          />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {__('Your OpenAI API key for GPT models')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anthropic_api_key">
                    {__('Anthropic API Key')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="anthropic_api_key"
                      name="anthropic_api_key"
                      type={showClaudeAi ? 'text' : 'password'}
                      value={settings.anthropic_api_key || ''}
                      onChange={handleInputChange}
                      placeholder={
                        settings.anthropic_api_key
                          ? '********'
                          : __('Enter Anthropic API key')
                      }
                    />

                    <button
                      type="button"
                      className="absolute right-2 top-0 transform translate-y-1/2"
                      onClick={() => setShowClaudeAi(!showClaudeAi)}
                      aria-label={
                        showClaudeAi ? 'Hide password' : 'Show password'
                      }
                    >
                      {showClaudeAi ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                            clipRule="evenodd"
                          />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
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
                    checked={!!settings.github_enable}
                    onCheckedChange={(checked) =>
                      handleSwitchChange('github_enable', checked)
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
                  <Label htmlFor="github_repo">{__('Github Repo URL')}</Label>
                  <Input
                    id="github_repo"
                    name="github_repo"
                    type="text"
                    value={settings.github_repo || ''}
                    disabled={!settings.github_enable}
                    onChange={handleInputChange}
                    placeholder={__('Enter Github repo URL for th.po files')}
                  />
                  <p className="text-sm text-muted-foreground">
                    {__('Github repo url for th.po files')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github_token">
                    {__('Github Token')}{' '}
                    <span className="text-xs text-muted-foreground">
                      ghp_xxxxxxxxxxxxxxxx
                    </span>
                  </Label>
                  <div className="relative mt-2">
                    <Input
                      id="github_token"
                      name="github_token"
                      type={showPassword ? 'text' : 'password'}
                      value={settings.github_token || ''}
                      onChange={handleInputChange}
                      disabled={!settings.github_enable}
                      placeholder={
                        settings.github_token
                          ? '********'
                          : __('Enter Github Token')
                      }
                    />

                    <button
                      type="button"
                      className="absolute right-2 top-0 transform translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                            clipRule="evenodd"
                          />
                          <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-500"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {__('Your Github Personal Access Token')}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex space-x-2">
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

                <Button
                  variant="outline"
                  onClick={() =>
                    handleTestGitHubConnection(
                      settings.github_repo || '',
                      settings.github_token || ''
                    )
                  }
                  disabled={
                    !settings.github_enable ||
                    !settings.github_repo ||
                    !settings.github_token
                  }
                >
                  {__('Test Connect')}
                </Button>
              </div>

              {statusMessage && (
                <Alert
                  variant={
                    statusMessage.type === 'error' ? 'destructive' : 'default'
                  }
                  className="ml-4"
                >
                  {statusMessage.type === 'success' && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                  {statusMessage.type === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {statusMessage.type === 'info' && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <AlertTitle>
                    {statusMessage.type === 'success'
                      ? __('Success')
                      : statusMessage.type === 'error'
                        ? __('Error')
                        : __('Info')}
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
