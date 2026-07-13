import React, { useState, useEffect, useCallback } from 'react';
import {
  useGetTranslationSettings,
  useSaveTranslationSettings,
  useTestGithubConnection,
  useTestGithubSync,
  useTestAiConnection,
  useGetAiModels,
} from '../api';
import { toast } from 'sonner';
import { TranslationToolsSettings } from '../types';

import AiModelsSettings from './settings/AiModelsSettings';
import TranslationOptionsSettings from './settings/TranslationOptionsSettings';
import GithubIntegrationSettings from './settings/GithubIntegrationSettings';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DEFAULT_SETTINGS: Partial<TranslationToolsSettings> = {
  default_model_provider: 'openai',
  default_model: '',
  openai_api_key: '',
  anthropic_api_key: '',
  openai_balance_usd: 0,
  anthropic_balance_usd: 0,
  batch_size: 10,
  temperature: 0.3,
  auto_save: false,
  preserve_formatting: true,
  github_enable: false,
  github_repo: '',
  github_token: '',
  github_branch: '',
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Partial<TranslationToolsSettings>>(DEFAULT_SETTINGS);
  // isDirty blocks revalidation from clobbering unsaved user edits
  const [isDirty, setIsDirty] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showClaudeAi, setShowClaudeAi] = useState(false);

  const { data, error, isLoading } = useGetTranslationSettings();
  const saveSettings = useSaveTranslationSettings();
  const testGithub = useTestGithubConnection();
  const testSync = useTestGithubSync();
  const testAi = useTestAiConnection();
  const { modelData, modelLoading, modelError } = useGetAiModels();
  const { translate: __, isReady } = useTranslation();

  // Load server settings when data arrives — but never clobber unsaved edits
  useEffect(() => {
    if (!data?.message || isDirty) return;
    const serverSettings = data.message as TranslationToolsSettings;
    console.log('[SettingsPanel] Loading server settings, openai_api_key present:', !!serverSettings.openai_api_key, serverSettings.openai_api_key?.substring(0, 20));
    setSettings((prev) => ({
      ...prev,
      ...serverSettings,
    }));
  }, [data, isDirty]);

  // Apply model default fallback when model list or provider changes
  useEffect(() => {
    if (!modelData?.message) return;
    const provider = settings.default_model_provider || 'openai';
    const models = provider === 'openai'
      ? modelData.message.openai
      : modelData.message.claude;
    if (!models?.length) return;
    // Only apply default if model is not already set
    if (!settings.default_model) {
      setSettings((prev) => ({
        ...prev,
        default_model: models[0].id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelData, settings.default_model_provider]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    console.log(`[handleInputChange] ${name} = "${value}"`);
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      };
      console.log(`[handleInputChange] settings state after update:`, JSON.stringify(newSettings, null, 2));
      return newSettings;
    });
    setIsDirty(true);
  };

  const handleSelectChange = useCallback((name: string, value: string) => {
    if (name === 'default_model_provider') {
      const newModels =
        value === 'openai'
          ? modelData?.message?.openai
          : modelData?.message?.claude;

      setSettings((prev) => ({
        ...prev,
        [name]: value as 'openai' | 'anthropic',
        default_model: newModels?.[0]?.id || '',
      }));
    } else {
      setSettings((prev) => ({ ...prev, [name]: value }));
    }
    setIsDirty(true);
  }, [modelData]);

  const handleSwitchChange = useCallback((name: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: checked }));
    setIsDirty(true);
  }, []);

  const handleSliderChange = useCallback((name: string, value: number[]) => {
    setSettings((prev) => ({ ...prev, [name]: value[0] }));
    setIsDirty(true);
  }, []);

  const handleTestGitHubConnection = useCallback(async (github_repo: string, github_token: string) => {
    toast.info('Testing GitHub connection...');

    try {
      const { message } = await testGithub.call({ github_repo, github_token });

      if (message?.success) {
        if (message.sync_triggered) {
          toast.success(message.message || 'Connected', {
            description: `Background sync started for ${message.sync_apps} apps. Progress will update in File Explorer.`,
            duration: 10000,
          });
        } else {
          toast.success(message.message || 'Successfully connected to GitHub!', { duration: 5000 });
        }
      } else {
        toast.error(message?.error || 'Failed to connect to GitHub');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while testing the connection';
      toast.error(msg);
    }
  }, [testGithub]);

  const handleTestGitHubSync = useCallback(async (
    github_repo: string,
    github_token: string,
    github_branch?: string
  ) => {
    toast.info('Testing GitHub sync for all site apps...');

    try {
      const { message } = await testSync.call({
        github_repo,
        github_token,
        github_branch,
      });

      if (message?.success && message.apps) {
        const ready = message.apps.filter((a) => a.status === 'ready');
        const noPo = message.apps.filter((a) => a.status === 'no_po');
        const noGithub = message.apps.filter((a) => a.status === 'no_github');

        const lines = ready.map((a) =>
          a.github_percentage !== undefined
            ? `${a.app}: local ${a.percentage}% → GitHub ${a.github_percentage}%`
            : `${a.app}: ${a.percentage}%`
        );

        toast.success(message.message, {
          description: [
            `Ready to sync: ${ready.length} apps`,
            ...lines,
            noPo.length ? `No PO file: ${noPo.map((a) => a.app).join(', ')}` : '',
            noGithub.length ? `Not in repo: ${noGithub.map((a) => a.app).join(', ')}` : '',
          ].filter(Boolean).join('\n'),
          duration: 15000,
        });
      } else {
        toast.error(message?.error || 'Sync test failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during sync test';
      toast.error(msg);
    }
  }, [testSync]);

  const handleTestOpenAI = useCallback(async () => {
    toast.info('Testing OpenAI connection...');

    try {
      const { message } = await testAi.call({ provider: 'openai' });

      if (message?.success) {
        toast.success(`Successfully connected to OpenAI! Model: ${message.model}`);
      } else {
        toast.error(message?.error || 'Failed to connect to OpenAI');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while testing OpenAI connection';
      toast.error(msg);
    }
  }, [testAi]);

  const handleTestAnthropic = useCallback(async () => {
    toast.info('Testing Anthropic connection...');

    try {
      const { message } = await testAi.call({ provider: 'anthropic' });

      if (message?.success) {
        toast.success(`Successfully connected to Anthropic! Model: ${message.model}`);
      } else {
        toast.error(message?.error || 'Failed to connect to Anthropic');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while testing Anthropic connection';
      toast.error(msg);
    }
  }, [testAi]);

  const handleRefreshPricing = useCallback(async () => {
    toast.info('Refreshing pricing from OpenAI docs...');

    try {
      const response = await fetch(
        '/api/method/translation_tools.api.ai_models.refresh_model_pricing'
      );
      const result = await response.json();

      if (result?.message?.success) {
        toast.success('Pricing refreshed successfully!');
      } else {
        toast.error(result?.message?.error || 'Failed to refresh pricing');
      }
    } catch (err) {
      console.error('Refresh pricing error:', err);
      toast.error('Failed to refresh pricing');
    }
  }, []);

  const handleSaveSettings = useCallback(async () => {
    setStatusMessage({ type: 'info', message: 'Saving settings...' });

    const settingsToSave = {
      openai_api_key: settings.openai_api_key,
      anthropic_api_key: settings.anthropic_api_key,
      openai_balance_usd: settings.openai_balance_usd,
      anthropic_balance_usd: settings.anthropic_balance_usd,
      default_model: settings.default_model,
      default_model_provider: settings.default_model_provider,
      github_enable: settings.github_enable,
      github_repo: settings.github_repo,
      github_token: settings.github_token,
      github_branch: settings.github_branch,
      use_own_repo: settings.use_own_repo,
    };

    console.log('[handleSaveSettings] github_token:', settings.github_token);
    console.log('[handleSaveSettings] github_enable type:', typeof settings.github_enable, settings.github_enable);
    console.log('[handleSaveSettings] github_repo:', settings.github_repo);
    console.log('[handleSaveSettings] use_own_repo:', settings.use_own_repo);

    try {
      const result = await saveSettings.call({ settings: settingsToSave });
      console.log('[handleSaveSettings] API result:', result);

      if (result?.message?.success) {
        setIsDirty(false);  // clear dirty flag — settings now match server
        // Update settings state to reflect saved values (including openai_api_key)
        setSettings(settingsToSave);
        setStatusMessage({
          type: result.message.warnings?.length ? 'warning' : 'success',
          message:
            result.message.warnings?.join(' ') ||
            result.message.message ||
            'Settings saved successfully',
        });
      } else {
        setStatusMessage({ type: 'error', message: 'Failed to save settings' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving settings';
      setStatusMessage({ type: 'error', message: msg });
    }
  }, [saveSettings, settings]);

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
            onTestOpenAI={handleTestOpenAI}
            onTestAnthropic={handleTestAnthropic}
            onRefreshPricing={handleRefreshPricing}
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
            onTestSync={handleTestGitHubSync}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={saveSettings.loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
