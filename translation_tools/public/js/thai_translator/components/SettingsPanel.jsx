import { useState, useEffect } from 'react';
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

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    default_model_provider: 'openai',
    default_model: 'gpt-4-1106-preview',
    openai_api_key: '',
    anthropic_api_key: '',
    batch_size: 10,
    temperature: 0.3,
    auto_save: false,
    preserve_formatting: true,
  });

  const [statusMessage, setStatusMessage] = useState(null);

  const { data, error, isLoading } = useGetTranslationSettings();
  const saveSettings = useSaveTranslationSettings();

  useEffect(() => {
    if (data?.message) {
      setSettings(data.message);
    }
  }, [data]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name, checked) => {
    setSettings((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSliderChange = (name, value) => {
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
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err.message || 'An error occurred while saving settings',
      });
    }
  };

  if (isLoading) {
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
      <h2 className="text-2xl font-bold">Translation Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>AI Translation Models</CardTitle>
          <CardDescription>
            Configure which AI models to use for translations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_model_provider">
                Default Model Provider
              </Label>
              <Select
                value={settings.default_model_provider}
                onValueChange={(value) =>
                  handleSelectChange('default_model_provider', value)
                }
              >
                <SelectTrigger id="default_model_provider">
                  <SelectValue placeholder="Select model provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="claude">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose which AI provider to use by default for translations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_model">Default Model</Label>
              <Select
                value={settings.default_model}
                onValueChange={(value) =>
                  handleSelectChange('default_model', value)
                }
              >
                <SelectTrigger id="default_model">
                  <SelectValue placeholder="Select model" />
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
                Choose which model to use by default for translations
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-medium">API Keys</h3>

            <div className="space-y-2">
              <Label htmlFor="openai_api_key">OpenAI API Key</Label>
              <Input
                id="openai_api_key"
                name="openai_api_key"
                type="password"
                value={settings.openai_api_key || ''}
                onChange={handleInputChange}
                placeholder={
                  settings.openai_api_key ? '********' : 'Enter OpenAI API key'
                }
              />
              <p className="text-sm text-muted-foreground">
                Your OpenAI API key for GPT models
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anthropic_api_key">Anthropic API Key</Label>
              <Input
                id="anthropic_api_key"
                name="anthropic_api_key"
                type="password"
                value={settings.anthropic_api_key || ''}
                onChange={handleInputChange}
                placeholder={
                  settings.anthropic_api_key
                    ? '********'
                    : 'Enter Anthropic API key'
                }
              />
              <p className="text-sm text-muted-foreground">
                Your Anthropic API key for Claude models
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Translation Options</CardTitle>
          <CardDescription>
            Configure how translations are processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-4">
              <Label htmlFor="batch_size">
                Batch Size: {settings.batch_size}
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
                Number of entries to translate in a batch (larger batches are
                more efficient but may hit rate limits)
              </p>
            </div>

            <div className="space-y-4">
              <Label htmlFor="temperature">
                Temperature: {settings.temperature?.toFixed(2)}
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
                Controls randomness in translations (lower values are more
                consistent)
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
              <Label htmlFor="auto_save">Auto-save Translations</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically save translations after they are generated
            </p>

            <div className="flex items-center space-x-2">
              <Switch
                id="preserve_formatting"
                checked={!!settings.preserve_formatting}
                onCheckedChange={(checked) =>
                  handleSwitchChange('preserve_formatting', checked)
                }
              />
              <Label htmlFor="preserve_formatting">Preserve Formatting</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Maintain formatting tokens and placeholders in translations
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings} disabled={saveSettings.loading}>
            {saveSettings.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
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
    </div>
  );
}
