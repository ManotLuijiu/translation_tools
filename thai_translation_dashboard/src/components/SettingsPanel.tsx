import React, { useState, useEffect } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Loader2, Save, Key } from "lucide-react";
import { toast } from "sonner";

type SettingsData = {
  default_model_provider: string;
  default_model: string;
  openai_api_key: string;
  anthropic_api_key: string;
  batch_size: number;
  temperature: number;
  auto_save: boolean;
  preserve_formatting: boolean;
};

const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData>({
    default_model_provider: "openai",
    default_model: "gpt-4-1106-preview",
    openai_api_key: "",
    anthropic_api_key: "",
    batch_size: 10,
    temperature: 0.3,
    auto_save: false,
    preserve_formatting: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data, error, isValidating, mutate } = useFrappeGetCall<{
    message: SettingsData;
  }>("translation_tools.api.get_translation_settings", {});

  const { call: saveSettings } = useFrappePostCall(
    "translation_tools.api.save_translation_settings"
  );

  useEffect(() => {
    if (data?.message) {
      setSettings(data.message);
    }
  }, [data]);

  const handleSaveSettings = async () => {
    setIsSaving(true);

    try {
      await saveSettings({
        settings: settings,
      });

      toast("Your settings have been saved successfully.");

      mutate();
    } catch (error) {
      toast((error as Error).message || "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Translation Settings</CardTitle>
        <CardDescription>
          Configure your AI translation settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isValidating && !data ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-muted-foreground">Loading settings...</p>
          </div>
        ) : error ? (
          <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
            {error.message || "Failed to load settings"}
          </div>
        ) : (
          <Tabs defaultValue="api" className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
              <TabsTrigger value="api">API Keys</TabsTrigger>
              <TabsTrigger value="models">AI Models</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
            </TabsList>

            <TabsContent value="api" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="openai_api_key"
                    className="text-sm font-medium"
                  >
                    OpenAI API Key
                  </Label>
                  <div className="flex mt-1.5">
                    <Input
                      id="openai_api_key"
                      type="password"
                      value={settings.openai_api_key}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          openai_api_key: e.target.value,
                        })
                      }
                      className="flex-1"
                      placeholder="sk-..."
                    />
                    <Button
                      variant="outline"
                      className="ml-2"
                      type="button"
                      onClick={() => {
                        const newVal = prompt("Enter your OpenAI API key");
                        if (newVal !== null) {
                          setSettings({ ...settings, openai_api_key: newVal });
                        }
                      }}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your OpenAI API key to use OpenAI models for
                    translation
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="anthropic_api_key"
                    className="text-sm font-medium"
                  >
                    Anthropic API Key
                  </Label>
                  <div className="flex mt-1.5">
                    <Input
                      id="anthropic_api_key"
                      type="password"
                      value={settings.anthropic_api_key}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          anthropic_api_key: e.target.value,
                        })
                      }
                      className="flex-1"
                      placeholder="sk_ant_..."
                    />
                    <Button
                      variant="outline"
                      className="ml-2"
                      type="button"
                      onClick={() => {
                        const newVal = prompt("Enter your Anthropic API key");
                        if (newVal !== null) {
                          setSettings({
                            ...settings,
                            anthropic_api_key: newVal,
                          });
                        }
                      }}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your Anthropic API key to use Claude models for
                    translation
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    Default Model Provider
                  </Label>
                  <Select
                    value={settings.default_model_provider}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        default_model_provider: value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select model provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="claude">Anthropic Claude</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Default Model</Label>
                  <Select
                    value={settings.default_model}
                    onValueChange={(value) =>
                      setSettings({ ...settings, default_model: value })
                    }
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4-1106-preview">
                        GPT-4 Turbo (Best Quality)
                      </SelectItem>
                      <SelectItem value="gpt-3.5-turbo">
                        GPT-3.5 Turbo (Faster)
                      </SelectItem>
                      <SelectItem value="claude-3-haiku">
                        Claude 3 Haiku (Fast)
                      </SelectItem>
                      <SelectItem value="claude-3-sonnet">
                        Claude 3 Sonnet (High Quality)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-4" />

                <div>
                  <Label htmlFor="batch_size" className="text-sm font-medium">
                    Batch Size
                  </Label>
                  <Input
                    id="batch_size"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.batch_size}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        batch_size: parseInt(e.target.value) || 10,
                      })
                    }
                    className="mt-1.5"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Number of entries to translate in a single API call (5-20
                    recommended)
                  </p>
                </div>

                <div>
                  <Label htmlFor="temperature" className="text-sm font-medium">
                    Temperature
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        temperature: parseFloat(e.target.value) || 0.3,
                      })
                    }
                    className="mt-1.5"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Controls randomness in AI responses (0.1-0.5 recommended for
                    translations)
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto_save" className="text-sm font-medium">
                      Auto-save Translations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save AI-generated translations without
                      confirmation
                    </p>
                  </div>
                  <Switch
                    id="auto_save"
                    checked={settings.auto_save}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, auto_save: checked })
                    }
                  />
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <div>
                    <Label
                      htmlFor="preserve_formatting"
                      className="text-sm font-medium"
                    >
                      Preserve Formatting
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Ensure AI preserves tags and placeholders like {"{0}"} in
                      translations
                    </p>
                  </div>
                  <Switch
                    id="preserve_formatting"
                    checked={settings.preserve_formatting}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, preserve_formatting: checked })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SettingsPanel;
