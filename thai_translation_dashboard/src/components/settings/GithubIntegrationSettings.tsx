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
import { useGetGithubBranches } from '@/api/settings';
import { useRef, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, ChevronsUpDown, Loader2, XCircle } from 'lucide-react';
import { useGetAppSyncSettings, useUpdateGithubSyncGlobalSettings } from '@/api/appSyncSettings';
import PasswordVisibilityToggle from '../PasswordVisibilityToggle';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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

  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [btnMinWidth, setBtnMinWidth] = useState<number | undefined>(undefined);
  const [showTokenPermissions, setShowTokenPermissions] = useState(false);
  const [showRepoSetup, setShowRepoSetup] = useState(false);

  const useOwnRepo = !!settings.use_own_repo;
  // Track the last-fetched repo URL — only updates when the URL actually changes,
  // so a new URL always triggers a fresh branch fetch.
  const lastFetchedRepoRef = useRef<string | undefined>(undefined);
  const [fetchedBranches, setFetchedBranches] = useState<string[]>([]);
  const [hasMoreBranches, setHasMoreBranches] = useState(false);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [branchFetchError, setBranchFetchError] = useState<string | null>(null);
  const [repoDefaultBranch, setRepoDefaultBranch] = useState<string | null>(null);
  const { call: fetchBranches } = useGetGithubBranches();

  useEffect(() => {
    if (saveButtonRef.current) {
      setBtnMinWidth(saveButtonRef.current.offsetWidth);
    }
  }, [loading]);

  // Auto-fetch branches when repo URL, token, or own-repo toggle changes.
  // The backend resolves the token: passed-in value → site_config → saved settings.
  useEffect(() => {
    // Skip if own-repo is disabled or no repo URL
    if (!useOwnRepo || !settings.github_repo?.trim()) return;

    const currentRepo = settings.github_repo.trim();

    // DEBUG: log the repo URL being used for auto-fetch
    console.log('[GithubIntegrationSettings] auto-fetch repo URL:', currentRepo);

    // On first run, settings.github_repo is empty ("") — skip so we don't fetch the default repo.
    // When server settings arrive, settings.github_repo becomes the user's real URL — then we fetch.
    // After that, lastFetchedRepoRef blocks re-fetching the same URL on every revalidation.
    if (lastFetchedRepoRef.current === currentRepo) return;

    // Don't update lastFetchedRepoRef for empty string — keep it undefined
    // so the real URL (when it arrives) always triggers a fetch
    if (currentRepo) {
      lastFetchedRepoRef.current = currentRepo;
    }

    setIsFetchingBranches(true);
    setBranchFetchError(null);

    // Always pass undefined for token — the backend resolves it via
    // frappe.conf github_pat_token → Translation Tools Settings github_token → error.
    // Passing settings.github_token would send masked "****" which breaks the fallback.
    fetchBranches({ github_repo: settings.github_repo })
      .then((result: any) => {
        const msg = result?.message;
        if (msg?.success) {
          console.log('[GithubIntegrationSettings] fetched branches:', msg.branches);
          console.log('[GithubIntegrationSettings] total_count:', msg.total_count, 'has_more:', msg.has_more);
          setFetchedBranches(msg.branches || []);
          setHasMoreBranches(msg.has_more || false);
          setShowAllBranches(false);
          setRepoDefaultBranch(msg.default_branch || null);
          // Auto-select saved branch if it exists in fetched list,
          // otherwise auto-select the GitHub repo's default branch
          if (settings.github_branch && (msg.branches || []).includes(settings.github_branch)) {
            // saved branch is valid, keep it — no change needed
          } else if (msg.default_branch) {
            console.log('[GithubIntegrationSettings] auto-selecting default_branch:', msg.default_branch);
            onInputChange({ target: { name: 'github_branch', value: msg.default_branch } } as any);
            console.log('[GithubIntegrationSettings] after onInputChange — github_branch in settings:', settings.github_branch);
          }
          if (!msg.branches?.length) {
            setBranchFetchError('No branches found in this repository.');
          }
        } else {
          setBranchFetchError(msg?.error || 'Failed to fetch branches.');
        }
      })
      .catch(() => {
        setBranchFetchError('Failed to fetch branches. Check your token and repo URL.');
      })
      .finally(() => {
        setIsFetchingBranches(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useOwnRepo, settings.github_repo, settings.github_token]);

  const { data: appSyncData, mutate: refetchAppSync } = useGetAppSyncSettings();
  const { call: updateGlobalSync, loading: savingGlobalSync } = useUpdateGithubSyncGlobalSettings();

  const syncSettings = appSyncData?.message;
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  useEffect(() => {
    if (syncSettings) {
      setGlobalEnabled(!!syncSettings.global_enabled);
      setAutoSyncEnabled(!!syncSettings.auto_sync_enabled);
    }
  }, [syncSettings]);

  const handleSaveGlobalSync = async (newGlobal: boolean, newAuto: boolean) => {
    try {
      const res = await updateGlobalSync(newGlobal, newAuto);
      if (!res?.message?.success) {
        refetchAppSync(); // revert optimistic state to server truth
      }
    } catch {
      refetchAppSync(); // revert optimistic state to server truth
    }
  };

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
        {/* Enable + Use Own Repo — full width */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="github_enable"
              checked={settings.github_enable}
              className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-500"
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
              className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-500"
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

        {/* 2-column grid: left=repo/branch/token, right=auto-sync */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* LEFT column */}
          <div className="space-y-4">
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

            {/* Branch — only when Own Repo enabled */}
            {useOwnRepo && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>{__('Branch')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!settings.github_repo) {
                        setBranchFetchError('Please enter a GitHub Repo URL first.');
                        return;
                      }
                      setIsFetchingBranches(true);
                      setBranchFetchError(null);
                      try {
                        const result = await fetchBranches({
                          github_repo: settings.github_repo,
                          github_token: settings.github_token || undefined,
                          show_all: showAllBranches,
                        });
                        const msg = result?.message;
                        if (msg?.success) {
                          setFetchedBranches(msg.branches || []);
                          setHasMoreBranches(showAllBranches ? false : (msg.has_more || false));
                          if (!showAllBranches) setShowAllBranches(false);
                          setRepoDefaultBranch(msg.default_branch || null);
                          if (
                            settings.github_branch &&
                            (msg.branches || []).includes(settings.github_branch)
                          ) {
                            // already selected, keep it
                          } else if (msg.default_branch) {
                            onInputChange({
                              target: { name: 'github_branch', value: msg.default_branch },
                            } as any);
                          }
                          if (!msg.branches?.length) {
                            setBranchFetchError('No branches found in this repository.');
                          }
                        } else {
                          setBranchFetchError(msg?.error || 'Failed to fetch branches.');
                        }
                      } catch {
                        setBranchFetchError('Failed to fetch branches. Check your token and repo URL.');
                      } finally {
                        setIsFetchingBranches(false);
                      }
                    }}
                    disabled={isFetchingBranches || !settings.github_enable}
                    className="h-7 px-2 text-xs"
                  >
                    {isFetchingBranches
                      ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      : <ChevronDown className="mr-1 h-3 w-3" />}
                    {isFetchingBranches ? __('Fetching...') : __('Fetch Branches')}
                  </Button>
                </div>

                {/* Branch combobox */}
                <Popover open={branchDropdownOpen} onOpenChange={setBranchDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={branchDropdownOpen}
                      className="w-full justify-between font-normal"
                      disabled={!settings.github_enable}
                    >
                      {settings.github_branch || __('Select branch...')}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder={__('Search branches...')} />
                      <CommandList>
                        <CommandEmpty>
                          {fetchedBranches.length === 0 && !isFetchingBranches
                            ? __('No branches fetched yet. Click "Fetch Branches" above.')
                            : __('No matching branches found.')}
                        </CommandEmpty>
                        <CommandGroup>
                          {fetchedBranches.map((branch) => (
                            <CommandItem
                              key={branch}
                              value={branch}
                              onSelect={() => {
                                onInputChange({ target: { name: 'github_branch', value: branch } } as any);
                                setBranchDropdownOpen(false);
                              }}
                            >
                              {branch}
                              {branch === repoDefaultBranch && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({__('default')})
                                </span>
                              )}
                              {branch === settings.github_branch && (
                                <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-green-500" />
                              )}
                            </CommandItem>
                          ))}
                          {/* Show More — fetch all branches */}
                          {hasMoreBranches && !showAllBranches && (
                            <CommandItem
                              value="show-more-branches"
                              onSelect={() => {
                                setShowAllBranches(true);
                                setIsFetchingBranches(true);
                                setBranchFetchError(null);
                                fetchBranches({ github_repo: settings.github_repo, show_all: true })
                                  .then((result: any) => {
                                    const msg = result?.message;
                                    if (msg?.success) {
                                      setFetchedBranches(msg.branches || []);
                                      setHasMoreBranches(false);
                                      setRepoDefaultBranch(msg.default_branch || null);
                                      if (
                                        settings.github_branch &&
                                        (msg.branches || []).includes(settings.github_branch)
                                      ) {
                                        // keep selection
                                      } else if (msg.default_branch) {
                                        onInputChange({ target: { name: 'github_branch', value: msg.default_branch } } as any);
                                      }
                                      if (!msg.branches?.length) {
                                        setBranchFetchError('No branches found.');
                                      }
                                    } else {
                                      setBranchFetchError(msg?.error || 'Failed to fetch all branches.');
                                    }
                                  })
                                  .catch(() => setBranchFetchError('Failed to fetch all branches.'))
                                  .finally(() => setIsFetchingBranches(false));
                              }}
                              className="font-medium text-primary underline cursor-pointer"
                            >
                              <ChevronsUpDown className="mr-1 h-3 w-3 shrink-0" />
                              {__('Show more')}
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Error or hint text */}
                {branchFetchError ? (
                  <p className="text-xs text-destructive">{branchFetchError}</p>
                ) : fetchedBranches.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {showAllBranches
                      ? __('Showing all {count} branches.', { count: fetchedBranches.length })
                      : __('Showing {count} branches (version-*/main/develop). Click "Fetch Branches" to refresh.', { count: fetchedBranches.length })}
                  </p>
                ) : null}
                {/* Fallback hint — shown when no branch is selected */}
                {!settings.github_branch && !isFetchingBranches && (
                  <p className="text-xs text-muted-foreground">
                    {__('Leave empty to use default branch (version-16).')}
                  </p>
                )}
              </div>
            )}

            {/* Token — only when Own Repo */}
            {useOwnRepo ? (
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
                    value={
                      (settings as any).github_token_configured && !settings.github_token
                        ? '****'  // Show masked when configured but no current value
                        : settings.github_token || ''
                    }
                    onChange={onInputChange}
                    disabled={!settings.github_enable}
                    placeholder={__('Enter Github Personal Access Token')}
                  />
                  <PasswordVisibilityToggle
                    isVisible={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                  />
                </div>
                {settings.github_token_configured && !settings.github_token && (
                  <p className="text-xs text-green-600 mt-1">✓ {__('Token configured. Clear field and enter new token to replace.')}</p>
                )}
              </div>
            ) : (
              /* Default repo — compact token status */
              <div className="rounded-md border border-border bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex items-center space-x-2">
                  {hasSiteConfigToken ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="text-green-700 dark:text-green-400 text-sm">
                        {__('Server token configured')}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="text-red-700 dark:text-red-400 text-sm">
                        {__('No server token')}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {hasSiteConfigToken
                    ? __('Uses github_pat_token from site config. No additional token needed.')
                    : __('Ask admin to add github_pat_token to site config.')}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT column — always Auto Sync; help guides only when Own Repo */}
          <div className="space-y-4">
            {/* Auto Sync Settings — always visible */}
            <div className="rounded-md border border-border p-4 space-y-3">
              <p className="text-sm font-medium">{__('Auto Sync (GitHub Sync Settings)')}</p>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="global_sync_enabled">{__('Enable Auto Sync')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {__('Master switch — required for both manual and scheduled sync')}
                  </p>
                </div>
                <Switch
                  id="global_sync_enabled"
                  checked={globalEnabled}
                  disabled={savingGlobalSync}
                  className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-500"
                  onCheckedChange={(checked) => {
                    setGlobalEnabled(checked);
                    handleSaveGlobalSync(checked, autoSyncEnabled);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_sync_enabled">{__('Scheduled Auto Sync')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {__('Daily at midnight Bangkok time (cron: 0 17 * * *)')}
                  </p>
                </div>
                <Switch
                  id="auto_sync_enabled"
                  checked={autoSyncEnabled}
                  disabled={!globalEnabled || savingGlobalSync}
                  className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-500"
                  onCheckedChange={(checked) => {
                    setAutoSyncEnabled(checked);
                    handleSaveGlobalSync(globalEnabled, checked);
                  }}
                />
              </div>
            </div>

            {/* Help guides — only when Own Repo is enabled */}
            {useOwnRepo && (
              <>
                {/* Required Token Permissions */}
                <div className="rounded-md border border-border bg-muted/50 text-sm">
                  <button
                    type="button"
                    onClick={() => setShowTokenPermissions((v) => !v)}
                    className="w-full flex items-center justify-between p-4 font-medium hover:bg-muted/80 transition-colors rounded-md"
                  >
                    <span>{__('Required Token Permissions')}</span>
                    {showTokenPermissions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {showTokenPermissions && (
                    <div className="px-4 pb-4 space-y-3">
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
                  )}
                </div>

                {/* How to Set Up Your Own Repo */}
                <div className="rounded-md border border-border bg-muted/50 text-sm">
                  <button
                    type="button"
                    onClick={() => setShowRepoSetup((v) => !v)}
                    className="w-full flex items-center justify-between p-4 font-medium hover:bg-muted/80 transition-colors rounded-md"
                  >
                    <span>{__('How to Set Up Your Own Translation Repo')}</span>
                    {showRepoSetup ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {showRepoSetup && (
                    <div className="px-4 pb-4 space-y-3">
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
                        <li>{__('Create a Fine-grained Token with access to this repo (see above)')}</li>
                        <li>{__('Paste the token in the Github Token field above')}</li>
                        <li>{__('Click "Test Connect" to verify everything works')}</li>
                      </ol>
                      <p className="text-xs text-muted-foreground pt-2">
                        {__('The repo should contain .po translation files. When you sync, translations will be pushed to and pulled from this repo.')}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
          <Button
            ref={saveButtonRef}
            className="cursor-pointer"
            onClick={onSave}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {__('Save All Settings')}
          </Button>
          <Button
            variant="outline"
            className="cursor-pointer"
            style={btnMinWidth ? { minWidth: btnMinWidth } : undefined}
            onClick={() => onTest(settings.github_repo, useOwnRepo ? settings.github_token : null)}
            disabled={
              !settings.github_enable ||
              !settings.github_repo ||
              (useOwnRepo && !settings.github_token && !(settings as any).github_token_configured) ||
              (!useOwnRepo && !hasSiteConfigToken && !(settings as any).github_token_configured)
            }
          >
            {__('Test Connect')}
          </Button>
          {onTestSync && (
            <Button
              variant="outline"
              className="cursor-pointer"
              style={btnMinWidth ? { minWidth: btnMinWidth } : undefined}
              onClick={() => onTestSync(
                settings.github_repo,
                useOwnRepo ? settings.github_token : null,
                settings.github_branch || undefined
              )}
              disabled={
                !settings.github_enable ||
                !settings.github_repo ||
                (useOwnRepo && !settings.github_token && !(settings as any).github_token_configured) ||
                (!useOwnRepo && !hasSiteConfigToken && !(settings as any).github_token_configured)
              }
            >
              {__('Test Sync')}
            </Button>
          )}
      </CardFooter>
    </Card>
  );
}
