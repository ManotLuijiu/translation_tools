/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
// import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
// import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
// import { InfoCircle, AlertCircle, HelpCircle } from "lucide-react";
import { Info, HelpCircle } from "lucide-react";

// Note: This is a simplified settings component. In a real application,
// you would connect this to the API to save/load settings.

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"api" | "translation" | "about">(
    "api"
  );

  // API Settings
  const [apiConfig, setApiConfig] = useState({
    openaiApiKey: "******************************", // Masked for security
    anthropicApiKey: "******************************", // Masked for security
    defaultProvider: "openai",
  });

  // Translation Settings
  const [translationSettings, setTranslationSettings] = useState({
    defaultModel: "gpt-4-1106-preview",
    batchSize: "10",
    temperature: "0.3",
    maxTokens: "512",
    useGlossary: true,
  });

  // About information
  const appInfo = {
    version: "0.0.1",
    author: "Manot Luijiu",
    email: "moocoding@gmail.com",
    repository: "https://github.com/ManotLuijiu/translation_tools",
    license: "MIT",
  };

  const handleApiConfigChange = (
    key: keyof typeof apiConfig,
    value: string
  ) => {
    setApiConfig({ ...apiConfig, [key]: value });
  };

  const handleTranslationSettingChange = (
    key: keyof typeof translationSettings,
    value: any
  ) => {
    setTranslationSettings({ ...translationSettings, [key]: value });
  };

  const handleSaveApiSettings = () => {
    console.log("API settings saved:", apiConfig);
    // In a real application, this would call the API to save settings
    alert("API settings saved successfully!");
  };

  const handleSaveTranslationSettings = () => {
    console.log("Translation settings saved:", translationSettings);
    // In a real application, this would call the API to save settings
    alert("Translation settings saved successfully!");
  };

  return (
    <div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="api">API Settings</TabsTrigger>
          <TabsTrigger value="translation">Translation Settings</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your AI service provider API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  API keys are stored in the .erpnext_translate_config file in
                  your bench directory. Changes made here will update that file.
                </AlertDescription>
              </Alert>

              <div className="grid gap-2">
                <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                <Input
                  id="openai-api-key"
                  type="password"
                  value={apiConfig.openaiApiKey}
                  onChange={(e) =>
                    handleApiConfigChange("openaiApiKey", e.target.value)
                  }
                  placeholder="sk-..."
                />
                <p className="text-xs text-muted-foreground">
                  Your OpenAI API key for GPT models. Get one at{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="anthropic-api-key">Anthropic API Key</Label>
                <Input
                  id="anthropic-api-key"
                  type="password"
                  value={apiConfig.anthropicApiKey}
                  onChange={(e) =>
                    handleApiConfigChange("anthropicApiKey", e.target.value)
                  }
                  placeholder="sk_ant_..."
                />
                <p className="text-xs text-muted-foreground">
                  Your Anthropic API key for Claude models. Get one at{" "}
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="default-provider">Default Provider</Label>
                <Select
                  value={apiConfig.defaultProvider}
                  onValueChange={(value) =>
                    handleApiConfigChange("defaultProvider", value)
                  }
                >
                  <SelectTrigger id="default-provider">
                    <SelectValue placeholder="Select default provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                    <SelectItem value="claude">Anthropic (Claude)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveApiSettings}>Save API Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="translation">
          <Card>
            <CardHeader>
              <CardTitle>Translation Settings</CardTitle>
              <CardDescription>
                Configure how translations are processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="default-model">Default Model</Label>
                <Select
                  value={translationSettings.defaultModel}
                  onValueChange={(value) =>
                    handleTranslationSettingChange("defaultModel", value)
                  }
                >
                  <SelectTrigger id="default-model">
                    <SelectValue placeholder="Select default model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-1106-preview">
                      GPT-4 Turbo
                    </SelectItem>
                    <SelectItem value="claude-3-haiku-20240307">
                      Claude 3 Haiku
                    </SelectItem>
                    <SelectItem value="claude-3-sonnet-20240229">
                      Claude 3 Sonnet
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The default AI model to use for translations
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="batch-size">Batch Size</Label>
                <Input
                  id="batch-size"
                  type="number"
                  min="1"
                  max="50"
                  value={translationSettings.batchSize}
                  onChange={(e) =>
                    handleTranslationSettingChange("batchSize", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Number of entries to translate in each API call (1-50)
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={translationSettings.temperature}
                  onChange={(e) =>
                    handleTranslationSettingChange(
                      "temperature",
                      e.target.value
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Controls randomness in AI responses (0-1). Lower values are
                  more deterministic.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={translationSettings.maxTokens}
                  onChange={(e) =>
                    handleTranslationSettingChange("maxTokens", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum tokens to generate per API call
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="use-glossary"
                  checked={translationSettings.useGlossary}
                  onCheckedChange={(checked) =>
                    handleTranslationSettingChange("useGlossary", checked)
                  }
                />
                <Label htmlFor="use-glossary">Use Thai Glossary</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Include Thai glossary terms in translation prompts for
                consistency
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveTranslationSettings}>
                Save Translation Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About Translation Tools</CardTitle>
              <CardDescription>
                AI-powered translation utility for ERPNext
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded">
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Version:</dt>
                    <dd>{appInfo.version}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Author:</dt>
                    <dd>{appInfo.author}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Email:</dt>
                    <dd>
                      <a
                        href={`mailto:${appInfo.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {appInfo.email}
                      </a>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Repository:</dt>
                    <dd>
                      <a
                        href={appInfo.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        GitHub
                      </a>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">License:</dt>
                    <dd>{appInfo.license}</dd>
                  </div>
                </dl>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>About this tool</AlertTitle>
                <AlertDescription>
                  Translation Tools is a standalone app for ERPNext that
                  provides powerful machine translation capabilities for
                  localizing ERPNext to other languages, with special support
                  for Thai language translation.
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="font-medium mb-2">Features:</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>OpenAI GPT integration for high-quality translations</li>
                  <li>
                    Anthropic Claude integration as an alternative AI service
                  </li>
                  <li>Specialized handling of software localization</li>
                  <li>Preservation of formatting tags and placeholders</li>
                  <li>Thai language glossary for consistent terminology</li>
                  <li>
                    Batch processing for efficiency and rate limit management
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
