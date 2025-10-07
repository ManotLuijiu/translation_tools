import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Download, Check, AlertCircle } from 'lucide-react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { useTranslation } from '@/context/TranslationContext';
import type { POFile } from '../types';
import githubIconLight from '../assets/github-mark/github-mark.svg';
import githubIconDark from '../assets/github-mark/github-mark-white.svg';
import { useStatusMessage } from '@/hooks/useStatusMessage';

interface GithubSyncProps {
  selectedFile: POFile | null;
  onSyncComplete: () => void;
  onFilesFound?: () => void;
}

export default function GithubSync({
  selectedFile,
  onSyncComplete,
  // onFilesFound,
}: GithubSyncProps) {
  // console.log('selectedFile Accessing', selectedFile);
  // console.log('onFilesFound Beginning Access', onFilesFound);

  const [isOpen, setIsOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState(
    'https://github.com/ManotLuijiu/erpnext-thai-translation.git'
  );
  const [branch, setBranch] = useState('main');
  const [syncMode, setSyncMode] = useState<'preview' | 'apply'>('preview');

  console.info('Sync Mode', syncMode);

  const [availableFiles, setAvailableFiles] = useState<
    { path: string; matchScore: number }[]
  >([]);

  const { statusMessage, showMessage } = useStatusMessage();

  const [selectedRepoFiles, setSelectedRepoFiles] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<{
    added: number;
    updated: number;
    unchanged: number;
    github_entries: number;
    local_entries: number;
    github_translated: number;
    github_untranslated: number;
    local_translated: number;
    local_untranslated: number;
  } | null>(null);
  const [currentTab, setCurrentTab] = useState('repository');

  const { translate: __ } = useTranslation();

  // console.log('syncMode GithubSync.tsx', syncMode);
  // console.log('selectedFile before api call', selectedFile);

  // API calls
  const {
    call: findTranslationFiles,
    loading: findingFiles,
    error: findError,
  } = useFrappePostCall(
    'translation_tools.api.github_sync.find_translation_files'
  );

  const {
    call: previewSync,
    loading: previewLoading,
    error: previewError,
  } = useFrappePostCall('translation_tools.api.github_sync.preview_sync');

  const {
    call: applySync,
    loading: applyLoading,
    error: applyError,
  } = useFrappePostCall('translation_tools.api.github_sync.apply_sync');

  // Step 1: Find translation files in the repository
  const searchRepository = async () => {
    if (!repoUrl) return;

    try {
      const response = await findTranslationFiles({
        repo_url: repoUrl,
        branch: branch,
        target_language: selectedFile?.language || 'th',
      });

      // console.log('response searchRepository', response);

      if (response?.message?.files) {
        setAvailableFiles(response.message.files);
        setSelectedRepoFiles([]); // Reset selection
        setPreviewData(null); // Reset preview
        setSyncMode('preview');

        // Switch to the "files" tab within the dialog
        setCurrentTab('files');
      } else {
        console.error('Error finding files:', response?.message?.error);
      }
    } catch (err) {
      console.error('Error searching repository:', err);
    }
  };

  //   Step 1.1: Handle GitHub file selection for sync
  const handleFileSelect = (filePath: string) => {
    // Only track which GitHub file is selected for sync operation
    // Do NOT replace the local selectedFile
    setSelectedRepoFiles([filePath]);

    // Note: onSelectGithubFile callback removed - GitHub file selection
    // is only for determining sync source, not for changing active file
    console.log('Selected GitHub file for sync:', filePath);
  };

  // Step 2: Preview sync changes
  const handlePreviewSync = async () => {
    // console.log('clicked');

    if (!selectedFile || selectedRepoFiles.length === 0) return;

    // console.log('selectedFile handlePreviewSync', selectedFile);

    try {
      const response = await previewSync({
        repo_url: repoUrl,
        branch: branch,
        repo_files: selectedRepoFiles,
        local_file_path: selectedFile.file_path,
      });

      // console.log('response handlePreviewSync', response);

      const data = response.message.preview;
      // const { added } = response.message.preview;

      // console.log('data in preview', added);

      if (response?.message?.preview) {
        setPreviewData(data);

        setCurrentTab('preview');
      }
    } catch (err) {
      console.error('Error previewing sync:', err);
      showMessage(`Error previewing sync: ${err}`, 'error');
    }
  };

  // Step 3: Apply sync changes
  const handleApplySync = async () => {
    if (!selectedFile || selectedRepoFiles.length === 0) return;

    try {
      const response = await applySync({
        repo_url: repoUrl,
        branch: branch,
        repo_files: selectedRepoFiles,
        local_file_path: selectedFile.file_path,
      });

      console.log('GitHub sync response:', response);

      // Handle both direct success and wrapped message response
      const isSuccess = response?.success || response?.message?.success;
      const error = response?.error || response?.message?.error;

      if (isSuccess) {
        console.log('🚀 GitHub sync successful, calling onSyncComplete');
        console.log('🚀 onSyncComplete function exists:', !!onSyncComplete);
        
        // Call the callback for refresh logic
        console.log('🚀 About to call onSyncComplete...');
        onSyncComplete();
        console.log('🚀 onSyncComplete called successfully');
        
        setIsOpen(false);
        showMessage('GitHub sync completed successfully!', 'success');
      } else {
        console.error('GitHub sync failed:', error);
        showMessage(`GitHub sync failed: ${error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error('Error applying sync:', err);
      showMessage(`Error applying sync: ${err}`, 'error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!selectedFile) return;
                    setIsOpen(true);
                  }}
                  className={
                    !selectedFile
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }
                >
                  <img
                    src={githubIconDark}
                    className="h-4 w-4 hidden dark:block"
                    alt="Github Icon Dark"
                  />
                  <img
                    src={githubIconLight}
                    className="h-4 w-4 block dark:hidden"
                    alt="Github Icon Light"
                  />
                  {__('Sync from GitHub')}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {selectedFile ? (
                <p>{__('Click to sync')}</p>
              ) : (
                <p>{__('Please select PO File first')}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{__('Sync Translations from GitHub')}</DialogTitle>
          <DialogDescription>
            {__(
              'Import translations from existing PO files in a GitHub repository'
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="repository">{__('Repository')}</TabsTrigger>
            <TabsTrigger value="files" disabled={availableFiles.length === 0}>
              {__('Files')}
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!previewData}>
              {__('Preview')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repository" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="repo-url" className="text-right">
                  {__('Repository URL')}
                </Label>
                <Input
                  id="repo-url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch" className="text-right">
                  {__('Branch')}
                </Label>
                <Input
                  id="branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="col-span-3"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={searchRepository}
                disabled={!repoUrl || findingFiles}
              >
                {findingFiles ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {__('Find Translation Files')}
              </Button>
            </DialogFooter>

            {findError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {findError.message || __('Error searching repository')}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="files" className="space-y-4 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">
                {__('Available Translation Files')}
              </h3>

              {availableFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {__('No translation files found')}
                </p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  {availableFiles.map((file) => (
                    <div
                      key={file.path}
                      className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded"
                    >
                      <Checkbox
                        checked={selectedRepoFiles.includes(file.path)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newSelectedFiles = [
                              ...selectedRepoFiles,
                              file.path,
                            ];
                            setSelectedRepoFiles(newSelectedFiles);
                            handleFileSelect(file.path);
                          } else {
                            setSelectedRepoFiles(
                              selectedRepoFiles.filter(
                                (path) => path !== file.path
                              )
                            );
                          }
                        }}
                        id={`file-${file.path}`}
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={`file-${file.path}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {file.path}
                        </label>
                        <div className="text-xs text-muted-foreground">
                          {__('Match score')}:{' '}
                          {Math.round(file.matchScore * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handlePreviewSync}
                disabled={selectedRepoFiles.length === 0 || previewLoading}
              >
                {previewLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {__('Preview Changes')}
              </Button>
            </DialogFooter>

            {previewError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {previewError.message || __('Error previewing changes')}
                </AlertDescription>
              </Alert>
            )}

            {statusMessage && (
              <Alert
                variant={
                  statusMessage.type === 'error' ? 'destructive' : 'default'
                }
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
                <AlertTitle
                  className={
                    statusMessage.type === 'success'
                      ? 'text-green-600'
                      : statusMessage.type === 'info'
                        ? 'text-blue-600'
                        : 'text-red-600'
                  }
                >
                  {statusMessage.type === 'success'
                    ? 'Success'
                    : statusMessage.type === 'error'
                      ? 'Error'
                      : 'Info'}
                </AlertTitle>
                <AlertDescription>{statusMessage.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Preview tab */}
          <TabsContent value="preview" className="space-y-4 py-4">
            {previewData && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 p-4 bg-muted rounded-md text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {previewData.added}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {__('New Translations')}
                    </div>
                  </div>
                  <div className="space-y-2 p-4 bg-muted rounded-md text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {previewData.updated}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {__('Updated Translations')}
                    </div>
                  </div>
                  <div className="space-y-2 p-4 bg-muted rounded-md text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {previewData.unchanged}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {__('Unchanged')}
                    </div>
                  </div>
                </div>

                {/* Add a new section for translation status */}
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-3">
                    {__('Translation Status')}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div className="border-b pb-2">
                      <span className="font-medium">
                        {__('GitHub Repository')}:
                      </span>
                    </div>
                    <div className="border-b pb-2">
                      <span className="font-medium">{__('Local File')}:</span>
                    </div>

                    <div className="flex justify-between">
                      <span>{__('Total Entries')}:</span>
                      <span className="font-semibold">
                        {previewData.github_entries}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{__('Total Entries')}:</span>
                      <span className="font-semibold">
                        {previewData.local_entries}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>{__('Translated')}:</span>
                      <span className="text-green-600 font-semibold">
                        {previewData.github_translated}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{__('Translated')}:</span>
                      <span className="text-green-600 font-semibold">
                        {previewData.local_translated}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>{__('Untranslated')}:</span>
                      <span className="text-red-600 font-semibold">
                        {previewData.github_untranslated}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{__('Untranslated')}:</span>
                      <span className="text-red-600 font-semibold">
                        {previewData.local_untranslated}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>{__('Percent Complete')}:</span>
                      <span className="font-semibold">
                        {previewData.github_entries > 0
                          ? Math.round(
                              (previewData.github_translated /
                                previewData.github_entries) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{__('Percent Complete')}:</span>
                      <span className="font-semibold">
                        {previewData.local_entries > 0
                          ? Math.round(
                              (previewData.local_translated /
                                previewData.local_entries) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">
                    {__('Applying these changes will:')}
                  </h4>
                  <ul className="space-y-1 list-disc pl-5 text-sm">
                    <li>
                      {__('Add')} {previewData.added}{' '}
                      {__('new translations from GitHub')}
                    </li>
                    <li>
                      {__('Update')} {previewData.updated}{' '}
                      {__('existing translations')}
                    </li>
                    <li>
                      {previewData.unchanged}{' '}
                      {__('translations will remain unchanged')}
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setCurrentTab('files')}>
                {__('Back')}
              </Button>
              <Button onClick={handleApplySync} disabled={applyLoading}>
                {applyLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {__('Apply Changes')}
              </Button>
            </DialogFooter>

            {applyError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {applyError.message || __('Error applying changes')}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
