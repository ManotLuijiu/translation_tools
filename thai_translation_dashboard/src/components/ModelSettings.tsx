import { useState, useEffect } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';

export default function ModelSettings() {
  const [settings, setSettings] = useState({
    model_provider: 'openai',
    openai_api_key: '',
    openai_model: '',
    anthropic_api_key: '',
    claude_model: '',
    batch_size: 10,
    temperature: 0.3,
    max_tokens: 512,
  });
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [statusMessageTimer, setStatusMessageTimer] = useState<NodeJS.Timeout | null>(null);
  const { translate: __, isReady } = useTranslation();
  
  // Get settings API call
  const { 
    data, 
    error, 
    isLoading, 
    mutate: refreshSettings 
  } = useFrappeGetCall('translation_tools.api.settings.get_translation_settings');
  
  // Save settings API call
  const saveSettings = useFrappePostCall('translation_tools.api.settings.save_translation_settings');
  
  // Refresh models API call
  const refreshModels = useFrappePostCall('translation_tools.api.ai_models.get_available_ai_models');
  
  // Set timed status message with auto-dismiss
  const setTimedStatusMessage = (message:any, duration = 5000) => {
    // Clear any existing timer
    if (statusMessageTimer) {
      clearTimeout(statusMessageTimer);
    }
    
    // Set the message
    setStatusMessage(message);
    
    // Set a timer to clear the message
    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, duration);
    
    setStatusMessageTimer(timer);
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (statusMessageTimer) {
        clearTimeout(statusMessageTimer);
      }
    };
  }, [statusMessageTimer]);
  
  // Update local state when API data is loaded
  useEffect(() => {
    if (data?.message) {
      setSettings({
        model_provider: data.message.model_provider || 'openai',
        openai_api_key: data.message.openai_api_key || '',
        openai_model: data.message.openai_model || '',
        anthropic_api_key: data.message.anthropic_api_key || '',
        claude_model: data.message.claude_model || '',
        batch_size: data.message.batch_size || 10,
        temperature: data.message.temperature || 0.3,
        max_tokens: data.message.max_tokens || 512,
      });
    }
  }, [data]);
  
  const handleInputChange = (e:any) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string | number) => {
      setSettings(prev => ({ ...prev, [name]: value }));
    };
  
  const handleSliderChange = (name: string, value: number[]) => {
    setSettings(prev => ({ ...prev, [name]: value[0] }));
  };
  
  const handleSaveSettings = async () => {
    try {
      const result = await saveSettings.call({ settings });
      
      if (result.message.success) {
        setTimedStatusMessage({
          type: 'success',
          message: __('Settings saved successfully'),
        });
        refreshSettings();
      } else {
        setTimedStatusMessage({
          type: 'error',
          message: __('Failed to save settings'),
        });
      }
    } catch (err:any) {
      const errorMessage = err.message || __('An error occurred');
      setTimedStatusMessage({
        type: 'error',
        message: errorMessage,
      });
    }
  };
  
  const handleRefreshModels = async () => {
    try {
      await refreshModels.call({});
      
      setTimedStatusMessage({
        type: 'success',
        message: __('AI models refreshed successfully'),
      });
      
      // Refresh settings to get the updated models
      refreshSettings();
    } catch (err:any) {
      const errorMessage = err.message || __('Failed to refresh models');
      setTimedStatusMessage({
        type: 'error',
        message: errorMessage,
      });
    }
  };
  
  if (isLoading || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>{__('Loading settings...')}</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{__('Error')}</AlertTitle>
        <AlertDescription>
          {error.message || __('Failed to load settings')}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Get available models from the API response
  const availableModels = data?.message?.available_models || { openai: [], claude: [] };
  const lastUpdated = availableModels.last_updated || '';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{__('AI Translation Settings')}</h2>
        
        <Button 
          onClick={handleRefreshModels} 
          variant="outline"
          disabled={refreshModels.loading}
        >
          {refreshModels.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {__('Refreshing...')}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {__('Refresh Models')}
            </>
          )}
        </Button>
      </div>
      
      {lastUpdated && (
        <p className="text-sm text-muted-foreground">
          {__('Models last updated')}: {lastUpdated}
        </p>
      )}
      
      {statusMessage && (
        <Alert
          variant={statusMessage.type === 'error' ? 'destructive' : 'default'}
          className={statusMessage.type === 'success' ? 'bg-green-50' : ''}
        >
          {statusMessage.type === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {statusMessage.type === 'success' ? __('Success') : __('Error')}
          </AlertTitle>
          <AlertDescription>{statusMessage.message}</AlertDescription>
        </Alert>
      )}
      
      <Tabs value={settings.model_provider} onValueChange={(value) => handleSelectChange('model_provider', value)}>
        <TabsList className="w-full">
          <TabsTrigger value="openai">{__('OpenAI')}</TabsTrigger>
          <TabsTrigger value="claude">{__('Anthropic Claude')}</TabsTrigger>
        </TabsList>
        
        {/* OpenAI Settings */}
        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <CardTitle>{__('OpenAI Settings')}</CardTitle>
              <CardDescription>
                {__('Configure your OpenAI API settings for translations')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai_api_key">{__('API Key')}</Label>
                <Input
                  id="openai_api_key"
                  name="openai_api_key"
                  type="password"
                  placeholder="sk-..."
                  value={settings.openai_api_key}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="openai_model">{__('Model')}</Label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={settings.openai_model}
                    onValueChange={(value) => handleSelectChange('openai_model', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={__('Select model')} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.openai.length > 0 ? (
                        availableModels.openai.map((model:any) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          {__('No models available')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {availableModels.openai.length === 0 && settings.openai_api_key && (
                  <p className="text-sm text-amber-600">
                    {__('Add your API key and click "Refresh Models" to see available models')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Claude Settings */}
        <TabsContent value="claude">
          <Card>
            <CardHeader>
              <CardTitle>{__('Anthropic Claude Settings')}</CardTitle>
              <CardDescription>
                {__('Configure your Anthropic Claude API settings for translations')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anthropic_api_key">{__('API Key')}</Label>
                <Input
                  id="anthropic_api_key"
                  name="anthropic_api_key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={settings.anthropic_api_key}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="claude_model">{__('Model')}</Label>
                <Select
                  value={settings.claude_model}
                  onValueChange={(value) => handleSelectChange('claude_model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={__('Select model')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.claude.length > 0 ? (
                      availableModels.claude.map((model:any) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>
                        {__('No models available')}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {availableModels.claude.length === 0 && settings.anthropic_api_key && (
                  <p className="text-sm text-amber-600">
                    {__('Add your API key and click "Refresh Models" to see available models')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Common Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{__('Translation Parameters')}</CardTitle>
          <CardDescription>
            {__('Configure common parameters for both translation providers')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="batch_size">{__('Batch Size')}</Label>
              <span className="text-sm text-muted-foreground">{settings.batch_size}</span>
            </div>
            <Slider
              id="batch_size"
              min={1}
              max={50}
              step={1}
              value={[settings.batch_size]}
              onValueChange={(value) => handleSliderChange('batch_size', value)}
            />
            <p className="text-sm text-muted-foreground">
              {__('Number of entries to translate in a batch')}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="temperature">{__('Temperature')}</Label>
              <span className="text-sm text-muted-foreground">{settings.temperature.toFixed(2)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.01}
              value={[settings.temperature]}
              onValueChange={(value) => handleSliderChange('temperature', value)}
            />
            <p className="text-sm text-muted-foreground">
              {__('Lower values give more consistent translations, higher values more creative')}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="max_tokens">{__('Max Tokens')}</Label>
              <span className="text-sm text-muted-foreground">{settings.max_tokens}</span>
            </div>
            <Slider
              id="max_tokens"
              min={100}
              max={2048}
              step={1}
              value={[settings.max_tokens]}
              onValueChange={(value) => handleSliderChange('max_tokens', value)}
            />
            <p className="text-sm text-muted-foreground">
              {__('Maximum tokens to generate per API call')}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saveSettings.loading}>
            {saveSettings.loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {__('Saving...')}
              </>
            ) : (
              __('Save Settings')
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}