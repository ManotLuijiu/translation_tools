/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  useGetPOFileEntries,
  useTranslateSingleEntry,
  useSaveTranslation,
  useSaveGithubToken,
} from '../api';
import type { POFile, TranslationSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  //   DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TranslationStats from './TranslationStats';
import { StatusToast } from '@/components/StatusToast';
import { useStatusMessage } from '@/hooks/useStatusMessage';
import { useTranslation } from '@/context/TranslationContext';

interface TranslationEditorProps {
  selectedFile: POFile | null;
  settings: TranslationSettings | null;
}

export default function TranslationEditor({
  selectedFile,
  settings,
}: TranslationEditorProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entryFilter, setEntryFilter] = useState<
    'all' | 'untranslated' | 'translated'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editedTranslation, setEditedTranslation] = useState('');
  // const [statusMessage, setStatusMessage] = useState<{
  //   type: 'success' | 'error' | 'info';
  //   message: string;
  // } | null>(null);
  const [pushToGithub, setPushToGithub] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [previousFile, setPreviousFile] = useState(selectedFile);
  const { statusMessage, showMessage, clearMessage } = useStatusMessage();
  const [showPassword, setShowPassword] = useState(false);
  const { translate: __, isReady } = useTranslation();

  console.log('previousFile', previousFile);
  console.log('showTokenDialog', showTokenDialog);

  //   const [translation, setTranslation] = useState('');
  //   const [isSaving, setIsSaving] = useState(false);

  const { data, error, isLoading, mutate } = useGetPOFileEntries(
    selectedFile?.file_path || null
  );

  console.log('selectedFile_translationEditor', selectedFile);
  console.log('Push to Github', pushToGithub);

  const translateEntry = useTranslateSingleEntry();
  const saveTranslation = useSaveTranslation.call({});
  const saveGithubToken = useSaveGithubToken();

  // Reset selected entry when file changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setSelectedEntryId(null);
    setEditedTranslation('');
    // setStatusMessage(null);
    clearMessage();
  }, [selectedFile]);

  // Update edited translation when selected entry changes
  useEffect(() => {
    if (!data?.message?.entries || !selectedEntryId) return;

    const entry = data.message.entries.find((e) => e.id === selectedEntryId);
    if (entry) {
      setEditedTranslation(entry.msgstr || '');
    }
  }, [selectedEntryId, data]);

  if (!selectedFile) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            {__('Please select a PO file to start translation')}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !isReady) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="ml-2">{__('Loading file contents...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {__('Failed to load file:')} {error.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  const fileData = data?.message;
  if (!fileData) {
    return (
      <div className="p-8 text-center">
        <p>{__('No data available for this file')}</p>
      </div>
    );
  }

  const { entries, stats, metadata } = fileData;
  console.log('metadata', metadata);

  // Filter entries based on user selection
  const filteredEntries = entries.filter((entry) => {
    // First filter by translation status
    if (entryFilter === 'untranslated' && entry.is_translated) return false;
    if (entryFilter === 'translated' && !entry.is_translated) return false;

    // Then filter by search term
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      entry.msgid.toLowerCase().includes(term) ||
      entry.msgstr.toLowerCase().includes(term)
    );
  });

  const selectedEntry = selectedEntryId
    ? entries.find((e) => e.id === selectedEntryId)
    : null;

  console.log('selectedEntry', selectedEntry);

  const handleTranslate = async () => {
    if (!selectedEntry || !selectedFile.file_path) return;

    // setStatusMessage({ type: 'info', message: 'Translating...' });
    showMessage('Translating...', 'info');

    try {
      const result = await translateEntry.call({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        model_provider: settings?.default_model_provider || 'openai',
        model: settings?.default_model || undefined,
      });

      if (result.success && result.translation) {
        setEditedTranslation(result.translation);
        // setStatusMessage({
        //   type: 'success',
        //   message: 'Translation completed',
        // });
        showMessage('Translation completed', 'success');

        // If auto-save is enabled, also save the translation
        if (settings?.auto_save) {
          await handleSave();
        }
      } else {
        console.error(result.error);
        // setStatusMessage({
        //   type: 'error',
        //   message: result.error || 'Translation failed',
        // });
        showMessage('Translation Failed', 'error');
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred during translation';
      // setStatusMessage({
      //   type: 'error',
      //   message: errorMessage,
      // });
      showMessage(errorMessage, 'error');
    }
  };

  const handleTokenSubmit = async () => {
    if (!githubToken.trim()) {
      // toast('Please enter a valid GitHub token', {
      //   description: 'Github token',
      // });
      <StatusToast type="info" message="Please enter a valid Github token" />;
      return;
    }

    try {
      // Save the token to settings
      await saveGithubToken.call({ token: githubToken });

      if (!selectedEntry || !selectedFile.file_path) return;

      // Try saving and pushing again
      const response = await saveTranslation.call({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        translation: editedTranslation,
        push_to_github: true,
      });

      if (response?.success) {
        setShowTokenDialog(false);
        // toast('Translation saved and pushed to GitHub successfully!');
        <StatusToast
          type="info"
          message="Translation saved and pushed to GitHub successfully!"
        />;
      } else {
        // toast(`GitHub push failed: ${response.error || 'Unknown error'}`);
        <StatusToast type="error" message="GitHub push failed" />;

        console.error(
          `GitHub push failed: ${response.error || 'Unknown error'}`
        );
      }
    } catch (err) {
      console.error('Token save error:', err);
      // toast(`Error saving token: ${err}`);

      <StatusToast type="error" message="Error saving token" />;
    }
  };

  const handleDialogCancel = () => {
    setPreviousFile(selectedFile);

    setGithubToken('');
    setShowTokenDialog(false);
    // setStatusMessage(null);
    clearMessage();

    console.log('Selected file before cancel:', selectedFile?.file_path);
    setEntryFilter('all');
    console.log('Selected file after cancel:', selectedFile?.file_path);

    // setSelectedEntryId(null);
    setEditedTranslation('');

    mutate(undefined, { revalidate: true })
      .then((newData) => console.log('Got new data:', newData))
      .catch((err) => console.error('Mutate error:', err));

    // if (selectedFile?.file_path) {
    //   console.log('after setEntryFilter');
    //   // Refetch the file data
    //   mutate();
    // }
    // setStatusMessage({
    //   type: 'info',
    //   message: 'GitHub sharing was cancelled. Translation saved locally only.',
    // });

    showMessage(
      'GitHub sharing was cancelled. Translation saved locally only.',
      'info'
    );
  };

  const handleSave = async () => {
    // setIsSaving(true);

    if (!selectedEntry || !selectedFile.file_path) return;

    // setStatusMessage({ type: 'info', message: 'Saving...' });
    showMessage('Saving...', 'info');

    try {
      const result = await saveTranslation.call({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        translation: editedTranslation,
        push_to_github: pushToGithub,
      });

      console.log('result', result);

      const message =
        typeof result.message === 'string'
          ? JSON.parse(result.message)
          : result.message;
      if (message?.success) {
        let msg = 'Translation saved successfully';
        if (pushToGithub) {
          console.log('pushToGithub');
          const githubResult = message.github;

          //   Check for missing token
          if (githubResult?.error === 'missing_token') {
            console.log('Github token is missing, showing dialog');
            setShowTokenDialog(true);
            console.log('selectedEntryId', selectedEntry.id);
            return;
          }

          //   Check if push was successful
          if (githubResult?.github_pushed) {
            msg += ' and shared on GitHub!';
          } else {
            msg += `. However, Github sharing failed: ${githubResult.error || 'Unknown error'}`;
          }
        }
        // toast(msg);

        // setStatusMessage({
        //   type: 'success',
        //   message: msg,
        // });

        showMessage(msg, 'success');

        // Refresh file data to update translation stats
        mutate();
      } else {
        console.error('Save error');
        // setStatusMessage({
        //   type: 'error',
        //   message: result.message || 'Failed to save translation',
        // });
        showMessage(result.message, 'error');
      }
    } catch (err: unknown) {
      console.error('Save error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred while saving';
      // setStatusMessage({
      //   type: 'error',
      //   message: errorMessage,
      // });
      showMessage(errorMessage, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedFile.filename}</h2>
          <p className="text-muted-foreground">app: {selectedFile.app}</p>
        </div>

        <TranslationStats stats={stats} />
      </div>

      <div className="flex space-x-4">
        <div className="w-1/3 rounded-lg border">
          <div className="border-b p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Entries</h3>
              <Select
                value={entryFilter}
                onValueChange={(value: 'all' | 'untranslated' | 'translated') =>
                  setEntryFilter(value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter entries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entries</SelectItem>
                  <SelectItem value="untranslated">
                    Untranslated only
                  </SelectItem>
                  <SelectItem value="translated">Translated only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder={__('Search in entries...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
          </div>

          <div className="h-[calc(100vh-400px)] overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center">
                No entries match your filter
              </div>
            ) : (
              <ul className="divide-y">
                {filteredEntries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`hover:bg-muted/50 w-full p-3 text-left transition-colors ${
                        selectedEntryId === entry.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedEntryId(entry.id)}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <Badge
                          variant={entry.is_translated ? 'default' : 'outline'}
                          className={entry.is_translated ? 'bg-green-500' : ''}
                        >
                          {entry.is_translated ? 'Translated' : 'Untranslated'}
                        </Badge>
                      </div>
                      <p className="truncate text-sm">{entry.msgid}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="w-2/3">
          {selectedEntry ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>Translation</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="push-to-github"
                      checked={pushToGithub}
                      onCheckedChange={setPushToGithub}
                    />
                    <Label
                      htmlFor="push-to-github"
                      className={cn(
                        'cursor-pointer',
                        pushToGithub ? 'text-green-600' : ''
                      )}
                    >
                      Push to Github
                    </Label>
                  </div>
                </div>
                <CardDescription>
                  {selectedEntry.context && (
                    <Badge variant="outline" className="mb-1">
                      Context: {selectedEntry.context}
                    </Badge>
                  )}
                  {selectedEntry.comments &&
                    selectedEntry.comments.length > 0 && (
                      <div className="text-muted-foreground mt-2 text-xs">
                        {selectedEntry.comments.map((comment) => (
                          <p key={comment}>{comment}</p>
                        ))}
                      </div>
                    )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="source-english"
                      className="mb-1 block text-sm font-medium"
                    >
                      Source (English)
                    </label>
                    <div
                      id="source-english"
                      className="bg-muted whitespace-pre-wrap rounded-md p-3"
                    >
                      {selectedEntry.msgid}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="translation-thai"
                      className="mb-1 block text-sm font-medium"
                    >
                      Translation (Thai)
                    </label>
                    <Textarea
                      id="translation-thai"
                      rows={5}
                      value={editedTranslation}
                      onChange={(e) => setEditedTranslation(e.target.value)}
                      placeholder="Enter translation here..."
                      className="min-h-32 resize-y"
                    />
                  </div>

                  {statusMessage && (
                    <Alert
                      variant={
                        statusMessage.type === 'error'
                          ? 'destructive'
                          : 'default'
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
                            : 'text-red-600'
                        }
                      >
                        {statusMessage.type === 'success'
                          ? 'Success'
                          : statusMessage.type === 'error'
                            ? 'Error'
                            : 'Info'}
                      </AlertTitle>
                      <AlertDescription>
                        {statusMessage.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSelectedEntryId(selectedEntryId);
                      const entry = entries.find(
                        (e) => e.id === selectedEntryId
                      );
                      if (entry) setEditedTranslation(entry.msgstr);
                      // setStatusMessage(null);
                      clearMessage();
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Find next untranslated entry
                      const untranslatedEntries = entries.filter(
                        (e) => !e.is_translated
                      );
                      if (untranslatedEntries.length > 0) {
                        setSelectedEntryId(untranslatedEntries[0].id);
                      }
                    }}
                  >
                    Next Untranslated
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTranslate}
                    disabled={translateEntry.loading}
                  >
                    {translateEntry.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Translate
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveTranslation.loading}
                  >
                    {saveTranslation.loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>

                {/* GitHub Token Dialog */}
                <Dialog
                  open={showTokenDialog}
                  onOpenChange={(open) => {
                    if (!open) {
                      handleDialogCancel();
                    }
                    setShowTokenDialog(open);
                  }}
                >
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        GitHub Personal Access Token Required
                      </DialogTitle>
                      <DialogDescription>
                        To share translations on GitHub, you need to provide a
                        GitHub Personal Access Token with repository
                        permissions.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                      <Label
                        htmlFor="github-token"
                        className="text-sm font-medium"
                      >
                        GitHub Token (github_pat_xxxxxxxxxxxxxxxx)
                      </Label>
                      <div className="relative mt-2">
                        <Input
                          id="github-token"
                          type={showPassword ? 'text' : 'password'}
                          className="mt-2 pr-10 py-2"
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          placeholder="github_pat_xxxxxxxxxxxxxxxx"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-0 transform translate-y-1/2"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                        >
                          {showPassword ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                                clipRule="evenodd"
                              />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gray-500"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {__('You can create a token at')}{' '}
                        <a
                          href="https://github.com/settings/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {__('GitHub Settings')}
                        </a>{' '}
                        {__("with 'repo' access.")}
                      </p>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={handleDialogCancel}>
                        Cancel
                      </Button>
                      <Button
                        className="bg-blue-500 text-white"
                        onClick={handleTokenSubmit}
                      >
                        {__('Save & Push')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border p-8">
              <p className="text-muted-foreground">
                {__('Select an entry to start translating')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
