import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/context/TranslationContext';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import PasswordVisibilityToggle from '../PasswordVisibilityToggle';

export default function GithubIntegrationSettings({
  settings,
  onInputChange,
  onSwitchChange,
  onSave,
  onTest,
  onTestSync,
  showPassword,
  setShowPassword,
  loading,
}: any) {
  const { translate: __ } = useTranslation();

  const useOwnRepo = !!settings.use_own_repo;

  const { data: tokenCheck } = useFrappeGetCall<{
    message: { has_token: boolean };
  }>('translation_tools.api.settings.has_site_config_token', undefined, undefined, {
    revalidateOnFocus: false,
  });

  const hasSiteConfigToken = tokenCheck?.message?.has_token ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{__('Github Integration')}</CardTitle>
        <CardDescription>
          {__('Sync translations with a GitHub repository. By default, the official translation repo is used with server-side authentication.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable + Use Own Repo on the same row */}
        <div className="flex items-center justify-between">
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
          <div className="flex items-center space-x-2">
            <Switch
              id="use_own_repo"
              checked={useOwnRepo}
              disabled={!settings.github_enable}
              onCheckedChange={(checked) =>
                onSwitchChange('use_own_repo', checked)
              }
            />
            <Label htmlFor="use_own_repo" className="whitespace-nowrap">
              {__('Use Own Repo')}
            </Label>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {useOwnRepo
                ? __('Using your own repository')
                : __('Using default translation repo')}
            </span>
          </div>
        </div>

        {/* Repo URL */}
        <div className="space-y-1.5">
          <Label>{__('Github Repo URL')}</Label>
          {useOwnRepo ? (
            <Input
              name="github_repo"
              value={settings.github_repo || ''}
              onChange={onInputChange}
              disabled={!settings.github_enable}
              placeholder="https://github.com/your-org/your-translation-repo.git"
            />
          ) : (
            <Input
              value={settings.github_repo || ''}
              disabled
              className="bg-muted text-muted-foreground"
            />
          )}
        </div>

        {/* Token section — conditional on toggle */}
        {useOwnRepo ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="github_token">
                {__('Github Token')}
                <span className="ml-2 text-xs text-muted-foreground">
                  github_pat_xxx... {__('or')} ghp_xxx...
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
                  placeholder={__('Enter Github Personal Access Token')}
                />
                <PasswordVisibilityToggle
                  isVisible={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                />
              </div>
            </div>

            {/* Required permissions */}
            <div className="rounded-md border border-border bg-muted/50 p-4 text-sm space-y-3">
              <p className="font-medium">{__('Required Token Permissions')}</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>{__('Read access to metadata (repo info)')}</li>
                <li>{__('Read and Write access to code (commit/push files)')}</li>
                <li>{__('Read and Write access to pull requests (create PRs)')}</li>
              </ul>

              <p className="font-medium pt-2">{__('How to create a Fine-grained Token')}</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>
                  {__('Go to')}{' '}
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-foreground"
                  >
                    github.com/settings/personal-access-tokens/new
                  </a>
                </li>
                <li>{__('Token name: any descriptive name (e.g. "Translation Tools")')}</li>
                <li>{__('Expiration: choose your preferred duration')}</li>
                <li>{__('Repository access: select "Only select repositories" and pick your translation repo')}</li>
                <li>
                  {__('Under "Repository permissions", set:')}
                  <ul className="list-disc pl-5 mt-1">
                    <li><strong>Contents</strong> — {__('Read and Write')}</li>
                    <li><strong>Metadata</strong> — {__('Read-only (auto-selected)')}</li>
                    <li><strong>Pull requests</strong> — {__('Read and Write')}</li>
                  </ul>
                </li>
                <li>{__('Click "Generate token" and paste it above')}</li>
              </ol>
            </div>

            {/* Step-by-step: How to set up your own repo */}
            <div className="rounded-md border border-border bg-muted/50 p-4 text-sm space-y-3">
              <p className="font-medium">{__('How to Set Up Your Own Translation Repo')}</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>
                  {__('Go to')}{' '}
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-foreground"
                  >
                    github.com/new
                  </a>
                  {' '}{__('to create a new repository')}
                </li>
                <li>{__('Repository name: e.g. "my-erpnext-translations"')}</li>
                <li>{__('Set visibility to Private (recommended for proprietary translations)')}</li>
                <li>{__('Check "Add a README file" to initialize the repo')}</li>
                <li>{__('Click "Create repository"')}</li>
                <li>
                  {__('Copy the repo URL (e.g.')}{' '}
                  <code className="bg-muted px-1 rounded text-foreground">
                    https://github.com/your-org/my-erpnext-translations.git
                  </code>
                  {') '}{__('and paste it in the Repo URL field above')}
                </li>
                <li>{__('Create a Fine-grained Token with access to this repo (see steps above)')}</li>
                <li>{__('Paste the token in the Github Token field above')}</li>
                <li>{__('Click "Test Connect" to verify everything works')}</li>
              </ol>
              <p className="text-xs text-muted-foreground pt-2">
                {__('The repo should contain .po translation files. When you sync, translations will be pushed to and pulled from this repo.')}
              </p>
            </div>
          </>
        ) : (
          /* Default repo mode — show site_config token status */
          <div className="rounded-md border border-border bg-muted/50 p-4 text-sm space-y-2">
            <div className="flex items-center space-x-2">
              {hasSiteConfigToken ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-green-700 dark:text-green-400">
                    {__('Using token from server configuration')}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-red-700 dark:text-red-400">
                    {__('No server token found')}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasSiteConfigToken
                ? __('Authentication is handled via github_pat_token in site_config.json or common_site_config.json. No additional token is needed.')
                : __('Ask your system administrator to add github_pat_token to site_config.json or common_site_config.json.')}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex space-x-2">
        <Button className="cursor-pointer" onClick={onSave} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {__('Save All Settings')}
        </Button>
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={() => onTest(settings.github_repo, useOwnRepo ? settings.github_token : null)}
          disabled={
            !settings.github_enable ||
            !settings.github_repo ||
            (useOwnRepo && !settings.github_token) ||
            (!useOwnRepo && !hasSiteConfigToken)
          }
        >
          {__('Test Connect')}
        </Button>
        {onTestSync && (
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onTestSync(settings.github_repo, useOwnRepo ? settings.github_token : null)}
            disabled={
              !settings.github_enable ||
              !settings.github_repo ||
              (useOwnRepo && !settings.github_token) ||
              (!useOwnRepo && !hasSiteConfigToken)
            }
          >
            {__('Test Sync')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
