import React, { useState, useEffect } from 'react';
import {
  useGetTranslationSettings,
  useSaveTranslationSettings,
  useTestGithubConnection,
  useGetAiModels,
} from '../api';
import { TranslationPDFSettings, TranslationToolsSettings } from '../types';

import AiModelsSettings from './settings/AiModelsSettings';
import TranslationOptionsSettings from './settings/TranslationOptionsSettings';
import GithubIntegrationSettings from './settings/GithubIntegrationSettings';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Partial<TranslationToolsSettings>>({
    default_model_provider: 'openai',
    default_model: '',
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

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const { data, error, isLoading } = useGetTranslationSettings();
  const saveSettings = useSaveTranslationSettings();
  const testGithub = useTestGithubConnection();
  const { modelData, modelLoading, modelError } = useGetAiModels();
  const { translate: __, isReady } = useTranslation();

  // console.log('useGetTranslationSettings data: ', data);
  // console.log('useGetTranslationSettings data.message: ', data?.message);
  // console.log('useGetAiModels modelData: ', modelData);
  // console.log('useGetTranslationSettings settings: ', settings);

  useEffect(() => {
    if (data?.message) {
      const provider = data.message.default_model_provider || 'openai';

      // console.log('provider from Parent', provider);
      const default_model =
        data.message.default_model ||
        (provider === 'openai'
          ? modelData?.message?.openai?.[0]?.id || ''
          : modelData?.message?.claude?.[0]?.id || '');

      setSettings({
        ...data.message,
        default_model_provider: provider,
        default_model,
      });
    }
  }, [data, modelData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev: any) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    // console.log('name SettingsPanel.tsx', name);
    // console.log('value SettingsPanel.tsx', value);
    // console.log('handleSelectChange clicked');
    if (name === 'default_model_provider') {
      // When provider changes, reset the model selection or select first available model
      const newModels =
        value === 'openai'
          ? modelData.message.openai
          : modelData.message.claude;

      // console.log('newModels', newModels);

      setSettings((prev) => ({
        ...prev,
        [name]: value as 'openai' | 'anthropic', // Ensure the type matches the expected union type
        default_model: newModels.length > 0 ? newModels[0].id : '', // Select first model or empty
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

      // console.log('message from github testing', message);

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

      // console.log('result SettingsPanel.tsx', result);

      if (result.message?.success) {
        // Check if there are any warnings
        setStatusMessage({
          type: result.message.warnings?.length ? 'warning' : 'success',
          message:
            result.message.warnings?.join(' ') ||
            result.message.message ||
            'Settings saved successfully',
        });
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
          <AiModelsSettings
            settings={settings}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            onSave={handleSaveSettings}
            statusMessage={statusMessage}
            showOpenAi={showOpenAi}
            setShowOpenAi={setShowOpenAi}
            showClaudeAi={showClaudeAi}
            setShowClaudeAi={setShowClaudeAi}
            loading={saveSettings.loading}
            models={modelData || { openai: [], claude: [] }}
            modelLoading={modelLoading}
            modelError={modelError}
          />
        </TabsContent>

        {/* Tab 2: Translation Options */}
        <TabsContent value="translation-options">
          <TranslationOptionsSettings
            settings={settings}
            onSliderChange={handleSliderChange}
            onSwitchChange={handleSwitchChange}
            onSave={handleSaveSettings}
            statusMessage={statusMessage}
            loading={saveSettings.loading}
          />
        </TabsContent>

        {/* Tab 3: GitHub Integration */}
        <TabsContent value="github-integration">
          <GithubIntegrationSettings
            settings={settings}
            onInputChange={handleInputChange}
            onSwitchChange={handleSwitchChange}
            onSave={handleSaveSettings}
            onTest={handleTestGitHubConnection}
            statusMessage={statusMessage}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={saveSettings.loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
