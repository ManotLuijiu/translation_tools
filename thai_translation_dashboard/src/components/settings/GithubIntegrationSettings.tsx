// import React from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';
import PasswordVisibilityToggle from '../PasswordVisibilityToggle';

export default function GithubIntegrationSettings({
  settings,
  onInputChange,
  onSwitchChange,
  onSave,
  onTest,
  statusMessage,
  showPassword,
  setShowPassword,
  loading,
}: any) {
  const { translate: __ } = useTranslation();

  return (
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
            github.com/settings/tokens
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="github_enable"
            checked={settings.github_enable}
            onCheckedChange={(checked) =>
              onSwitchChange('github_enable', checked)
            }
          />
          <Label htmlFor="github_enable">
            {__('Enable Github Integration')}
          </Label>
        </div>

        <Label>{__('Github Repo URL')}</Label>
        <Input
          name="github_repo"
          value={settings.github_repo || ''}
          onChange={onInputChange}
          disabled={!settings.github_enable}
        />

        <Label htmlFor="github_token">
          {__('Github Token')}
          <span className="text-xs text-muted-foreground">
            ghp_xxxxxxxxxxxxxxxx
          </span>
        </Label>
        <div className="relative">
          <Input
            id="github_token"
            name="github_token"
            type={showPassword ? 'text' : 'password'}
            value={settings.github_token || ''}
            onChange={onInputChange}
            disabled={!settings.github_enable}
            placeholder={__('Enter Github Token')}
          />
          <PasswordVisibilityToggle
            isVisible={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
          />
          {/* <button
            type="button"
            className="absolute right-2 top-0 transform translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </button> */}
        </div>
      </CardContent>
      <CardFooter className="flex space-x-2">
        <Button onClick={onSave} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {__('Save All Settings')}
        </Button>
        <Button
          variant="outline"
          onClick={() => onTest(settings.github_repo, settings.github_token)}
          disabled={
            !settings.github_enable ||
            !settings.github_repo ||
            !settings.github_token
          }
        >
          {__('Test Connect')}
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
