import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  // useGetPOFileEntries,
  useGetPOFileEntriesPaginated,
  useTranslateSingleEntry,
  // useTranslateBatch,
  useSaveTranslation,
  useSaveGithubToken,
  useTestGithubConnection,
} from '../api';
import type { POFile, TranslationToolsSettings } from '../types';
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
import {
  Loader2,
  Save,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import TranslationStats from './TranslationStats';
// import { StatusToast } from '@/components/StatusToast';
import BatchTranslationView from './BatchTranslationView';
import { useStatusMessage } from '@/hooks/useStatusMessage';
import { useTranslation } from '@/context/TranslationContext';
import { toast } from 'sonner';

// Pagination settings
const ENTRIES_PER_PAGE = 20;

interface TranslationEditorProps {
  translationMode: string;
  selectedFile: POFile | null;
  settings: TranslationToolsSettings;
}

export default function TranslationEditor({
  translationMode,
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
  const testGithub = useTestGithubConnection();

  // console.log('settings TranslationEditor', settings);
  const { github_token, batch_size } = settings;

  // console.log('github_token', github_token);
  console.info('previousFile', previousFile);
  console.info('batch_size', batch_size);
  // console.log('translationMode', translationMode);

  const batchSize = settings?.batch_size || 10; // Get from settings

  interface PendingPushEntry {
    file_path: string;
    entry_id: string;
    translation: string;
  }

  const [pendingPushEntry, setPendingPushEntry] =
    useState<PendingPushEntry | null>(null);
  const { translate: __, isReady } = useTranslation();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // console.log('currentPage', currentPage);
  // console.log('previousFile', previousFile);
  // console.log('showTokenDialog', showTokenDialog);

  //   const [translation, setTranslation] = useState('');
  //   const [isSaving, setIsSaving] = useState(false);

  // const { data, error, isLoading, mutate } = useGetPOFileEntries(
  //   selectedFile?.file_path || null
  // );

  // Use the paginated API hook
  const {
    // data,
    error,
    isLoading,
    mutate,
    entries = [],
    stats,
    // metadata = {},
    totalPages = 0,
    totalEntries = 0,
  } = useGetPOFileEntriesPaginated(
    selectedFile?.file_path || null,
    currentPage,
    ENTRIES_PER_PAGE,
    entryFilter,
    searchTerm
  );

  // console.log('data paginated', data);
  // console.log('stats paginated', stats);
  // console.log('selectedFile_translationEditor', selectedFile);
  // console.log('Push to Github', pushToGithub);

  const translateEntry = useTranslateSingleEntry();
  const saveTranslation = useSaveTranslation.call({});
  const saveGithubToken = useSaveGithubToken();
  // const { data, error, isLoading } = useGetTranslationSettings();

  // Reset selected entry when file changes
  useEffect(() => {
    // console.log('TranslationEditor Clicked');
    setSelectedEntryId(null);
    setEditedTranslation('');
    // setStatusMessage(null);
    setCurrentPage(1);
    clearMessage();
  }, [selectedFile?.file_path]);

  // Effect to fetch data when page, filter, or search term changes
  useEffect(() => {
    if (selectedFile?.file_path) {
      mutate();
    }
  }, [currentPage, entryFilter, searchTerm, selectedFile?.file_path, mutate]);

  // Update edited translation when selected entry changes
  // useEffect(() => {
  //   if (!data?.message?.entries || !selectedEntryId) return;

  //   const entry = data.message.entries.find((e) => e.id === selectedEntryId);
  //   if (entry) {
  //     setEditedTranslation(entry.msgstr || '');
  //   }
  // }, [selectedEntryId, data]);

  useEffect(() => {
    if (!entries || !selectedEntryId) return;

    const entry = entries.find((e) => e.id === selectedEntryId);
    if (entry) {
      setEditedTranslation(entry.msgstr || '');
    }
  }, [selectedEntryId, entries]);

  // Use the settings to pre-fill the GitHub token
  useEffect(() => {
    // Pre-fill GitHub token from settings when available
    if (github_token) {
      setGithubToken(github_token);
    }
  }, [github_token]);

  // Reset token input when dialog opens
  useEffect(() => {
    if (showTokenDialog && settings?.github_token) {
      setGithubToken(settings.github_token);
    }
  }, [showTokenDialog, settings]);

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

  if ((isLoading && !entries.length) || !isReady) {
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

  if (!entries) {
    return (
      <div className="p-8 text-center">
        <p>{__('No entries available for this file')}</p>
      </div>
    );
  }

  // const fileData = data?.message;
  // if (!fileData) {
  //   return (
  //     <div className="p-8 text-center">
  //       <p>{__('No data available for this file')}</p>
  //     </div>
  //   );
  // }

  // const { entries, stats, metadata } = fileData;
  // console.log('metadata', metadata);

  // Filter entries based on user selection
  // const filteredEntries = entries.filter((entry) => {
  //   // First filter by translation status
  //   if (entryFilter === 'untranslated' && entry.is_translated) return false;
  //   if (entryFilter === 'translated' && !entry.is_translated) return false;

  //   // Then filter by search term
  //   if (!searchTerm) return true;

  //   const term = searchTerm.toLowerCase();
  //   return (
  //     entry.msgid.toLowerCase().includes(term) ||
  //     entry.msgstr.toLowerCase().includes(term)
  //   );
  // });

  // Calculate pagination values
  // const totalPages = Math.ceil(filteredEntries.length / ENTRIES_PER_PAGE);
  // const pageStartIndex = (currentPage - 1) * ENTRIES_PER_PAGE;
  // const pageEndIndex = pageStartIndex + ENTRIES_PER_PAGE;

  // Get entries for current page
  // const paginatedEntries = filteredEntries.slice(pageStartIndex, pageEndIndex);

  // console.log('paginatedEntries', paginatedEntries);

  const selectedEntry = selectedEntryId
    ? entries.find((e) => e.id === selectedEntryId)
    : null;

  // console.log('selectedEntryId', selectedEntryId);
  // console.log('selectedEntry', selectedEntry);

  const handleTestGitHubConnection = async (
    github_repo: string,
    github_token: string
  ) => {
    // console.log('testing github', github_token);

    try {
      // Make an API call to test the GitHub connection
      const { message } = await testGithub.call({
        github_repo,
        github_token,
      });

      // console.log('message from github testing', message);

      if (message?.success) {
        // console.log('github_test_success', message?.success);
        toast.success('Github Test Success');
      } else {
        toast.warning('Github Test has warning');
        // console.log('else_github_test');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error(String(err));
      }
      // console.log('github_test_err', err);
    }
  };

  const handleTranslate = async () => {
    if (!selectedEntry || !selectedFile.file_path) return;

    // console.log('selectedEntry in handleTranslate', selectedEntry);

    // setStatusMessage({ type: 'info', message: 'Translating...' });
    showMessage('Translating...', 'info');

    try {
      const result = await translateEntry.call({
        file_path: selectedFile.file_path,
        msgid: selectedEntry.msgid,
        entry_id: selectedEntry.id,
        model_provider: settings?.default_model_provider || 'openai',
        model: settings?.default_model || undefined,
      });

      console.log('result in handleTranslate', result);

      if (result.message.success && result.message.translation) {
        setEditedTranslation(result.message.translation);
        // setStatusMessage({
        //   type: 'success',
        //   message: 'Translation completed',
        // });
        showMessage('Translation completed', 'success');

        // If auto-save is enabled, also save the translation
        if (settings?.auto_save) {
          await handleSave();
        }
        return;
      }

      console.error(result.error);
      // setStatusMessage({
      //   type: 'error',
      //   message: result.error || 'Translation failed',
      // });
      showMessage('Translation Failed', 'error');
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
    if (!githubToken) {
      showMessage('Please enter a valid GitHub token', 'error');
      return;
    }

    showMessage('Saving token...', 'info');

    try {
      // Save the token first
      const tokenResult = await saveGithubToken.call({ token: githubToken });

      if (!tokenResult.success) {
        showMessage(
          `Failed to save token: ${tokenResult.error || 'Unknown error'}`,
          'error'
        );
        return;
      }

      // If we have a pending push, execute it now
      if (pendingPushEntry) {
        showMessage('Pushing translation to GitHub...', 'info');

        const pushResult = await saveTranslation.call({
          file_path: pendingPushEntry.file_path,
          entry_id: pendingPushEntry.entry_id,
          translation: pendingPushEntry.translation,
          push_to_github: true,
        });

        // console.log('Push result after token save:', pushResult);

        const message =
          typeof pushResult.message === 'string'
            ? JSON.parse(pushResult.message)
            : pushResult.message;

        if (message?.success && message.github?.github_pushed) {
          showMessage(
            'Token saved and translation successfully pushed to GitHub!',
            'success'
          );
        } else {
          showMessage(
            `Token saved but GitHub push failed: ${message.github?.error || 'Unknown error'}`,
            'warning'
          );
        }

        // Clear the pending push
        setPendingPushEntry(null);
      } else {
        showMessage('GitHub token saved successfully', 'success');
      }

      // Close the dialog
      setShowTokenDialog(false);
      setGithubToken('');

      // Refresh data
      mutate();
    } catch (err) {
      console.error('Token save error:', err);
      showMessage(
        err instanceof Error ? err.message : 'Failed to save GitHub token',
        'error'
      );
    }
  };

  // const tryPushTranslation = async () => {
  //   try {
  //     const response = await saveTranslation.call({
  //       file_path: selectedFile.file_path,
  //       entry_id: selectedEntry?.id,
  //       translation: editedTranslation,
  //       push_to_github: true,
  //       github_token: githubToken,
  //     });

  //     if (response?.success) {
  //       showMessage(
  //         'Translation saved and pushed to GitHub successfully!',
  //         'success'
  //       );
  //     } else {
  //       const errorMsg = response?.error || 'Unknown error';
  //       console.error(`GitHub push failed: ${errorMsg}`);
  //       // showMessage(`GitHub push failed: ${errorMsg}`, 'error');

  //       // If the error is related to authentication, show the token dialog again
  //       if (
  //         errorMsg.includes('authentication') ||
  //         errorMsg.includes('token') ||
  //         errorMsg.includes('unauthorized') ||
  //         errorMsg.includes('auth')
  //       ) {
  //         showMessage(
  //           'GitHub token issue. Please provide a valid token.',
  //           'error'
  //         );
  //         setShowTokenDialog(true);
  //       } else {
  //         showMessage(`GitHub push failed: ${errorMsg}`, 'error');
  //       }
  //     }
  //   } catch (err: any) {
  //     console.error('Translation push error:', err);
  //     // showMessage(
  //     //   `Error pushing translation: ${err.message || 'Unknown error'}`,
  //     //   'error'
  //     // );

  //     // Check if the error is related to authentication
  //     const errorMsg = err.message || 'Unknown error';
  //     if (
  //       errorMsg.includes('authentication') ||
  //       errorMsg.includes('token') ||
  //       errorMsg.includes('unauthorized') ||
  //       errorMsg.includes('auth')
  //     ) {
  //       showMessage(
  //         'GitHub authentication failed. Please provide a valid token.',
  //         'error'
  //       );
  //       setShowTokenDialog(true);
  //     } else {
  //       showMessage(`Error pushing translation: ${errorMsg}`, 'error');
  //     }
  //   }
  // };

  const handleDialogCancel = () => {
    setPreviousFile(selectedFile);

    setGithubToken('');
    setShowTokenDialog(false);
    setGithubToken(settings?.github_token || '');
    // setStatusMessage(null);
    clearMessage();

    // console.log('Selected file before cancel:', selectedFile?.file_path);
    // setEntryFilter('all');
    // console.log('Selected file after cancel:', selectedFile?.file_path);

    // setSelectedEntryId(null);
    // setEditedTranslation('');

    // mutate(undefined, { revalidate: true })
    //   .then((newData) => console.log('Got new data:', newData))
    //   .catch((err) => console.error('Mutate error:', err));

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
    if (!selectedEntry || !selectedFile.file_path) return;

    showMessage('Saving...', 'info');

    try {
      const result = await saveTranslation.call({
        file_path: selectedFile.file_path,
        entry_id: selectedEntry.id,
        translation: editedTranslation,
        push_to_github: pushToGithub,
      });

      // console.log('Save result:', result);

      // Parse message if it's a string
      const message =
        typeof result.message === 'string'
          ? JSON.parse(result.message)
          : result.message;

      // Check if the basic save operation was successful
      if (message?.success) {
        let msg = 'Translation saved successfully';

        // Handle GitHub pushing if enabled
        if (pushToGithub) {
          // console.log('GitHub push enabled');
          const githubResult = message.github;

          // Token missing cases - show dialog
          if (githubResult?.error === 'missing_token') {
            // console.log('GitHub token missing, showing dialog');

            // Show success message for the save
            showMessage(
              'Translation saved successfully. Please provide a GitHub token to push changes.',
              'info'
            );

            // Open token dialog
            setShowTokenDialog(true);

            // Store current entry info for when token is provided
            setPendingPushEntry({
              file_path: selectedFile.file_path,
              entry_id: selectedEntry.id,
              translation: editedTranslation,
            });

            return;
          }
          // GitHub push succeeded
          else if (githubResult?.github_pushed) {
            msg += ' and shared on GitHub!';
          }
          // Other GitHub errors
          else if (githubResult) {
            const errorMsg = githubResult.error || 'Unknown error';
            msg += `. However, GitHub sharing failed: ${errorMsg}`;
          }
        }

        showMessage(msg, 'success');

        // Refresh file data to update translation stats
        mutate();
      } else {
        // Basic save operation failed
        console.error('Save operation failed');
        showMessage(message.error || 'Failed to save translation', 'error');
      }
    } catch (err: unknown) {
      // Handle exceptions
      const errorObj = err as unknown;
      console.error('Save error:', errorObj);

      // Check for server messages that might contain error details
      let errorMessage = 'An error occurred while saving';
      let serverMessages: string[] = [];

      // Try to extract server messages if they exist
      if (
        typeof errorObj === 'object' &&
        errorObj !== null &&
        '_server_messages' in errorObj
      ) {
        try {
          serverMessages = JSON.parse(
            (errorObj as { _server_messages: string })._server_messages
          );
        } catch (parseErr) {
          console.error('Error parsing server messages:', parseErr);
        }
      }

      // Check for token errors in server messages or the main error
      const isTokenError =
        // Check server messages for token errors
        (serverMessages.length > 0 &&
          serverMessages.some((msg: string) => {
            try {
              const parsedMsg = JSON.parse(msg);
              return (
                parsedMsg.message &&
                (parsedMsg.message.includes('Password not found') ||
                  parsedMsg.message.includes('GitHub token'))
              );
            } catch {
              return false;
            }
          })) ||
        // Check the error message itself
        (typeof errorObj === 'object' &&
          errorObj !== null &&
          'message' in errorObj &&
          typeof (errorObj as { message?: string }).message === 'string' &&
          ((errorObj as { message: string }).message.includes(
            'Password not found'
          ) ||
            (errorObj as { message: string }).message.includes(
              'GitHub token'
            ) ||
            (errorObj as { message: string }).message.includes(
              'missing_token'
            )));

      if (isTokenError) {
        // console.log('Token error detected, showing token dialog');

        // Show message
        showMessage(
          'Translation saved, but GitHub token is required for pushing.',
          'info'
        );

        // Open token dialog
        setShowTokenDialog(true);

        // Store current entry info for when token is provided
        setPendingPushEntry({
          file_path: selectedFile.file_path,
          entry_id: selectedEntry.id,
          translation: editedTranslation,
        });

        return;
      }

      // For other errors, try to extract a useful message
      if (serverMessages.length > 0) {
        try {
          // Try to get the first message
          const firstMsg = JSON.parse(serverMessages[0]);
          if (firstMsg.message) {
            errorMessage = firstMsg.message;
          }
        } catch {
          // If parsing fails, fallback to standard error message
        }
      } else if (
        typeof errorObj === 'object' &&
        errorObj !== null &&
        'message' in errorObj &&
        typeof (errorObj as { message?: string }).message === 'string'
      ) {
        errorMessage = (errorObj as { message: string }).message;
      }

      showMessage(errorMessage, 'error');
    }
  };

  // Pagination functions
  const goToNextPage = () => {
    // console.log('currentPage', currentPage);
    // console.log('totalPages', totalPages);
    // console.log('entries', entries);
    // console.log('clicked next page');
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Find next untranslated entry
  const goToNextUntranslated = async () => {
    // First check if there's an untranslated entry in the current page
    const currentPageUntranslated = entries.find(
      (e, index) =>
        !e.is_translated &&
        entries.indexOf(selectedEntry as (typeof entries)[0]) < index
    );

    if (currentPageUntranslated) {
      setSelectedEntryId(currentPageUntranslated.id);
      return;
    }

    // If not in current page, need to look in next pages
    if (currentPage < totalPages) {
      showMessage('Searching for untranslated entries...', 'info');

      // Use API to find the next untranslated entry
      try {
        const response = await fetch(
          `/api/method/translation_tools.api.find_next_untranslated_entry?file_path=${
            selectedFile.file_path
          }&current_page=${currentPage}&page_size=${ENTRIES_PER_PAGE}`
        );

        const result = await response.json();

        if (result.message) {
          const { page, entry_id } = result.message;
          setCurrentPage(page);
          // Wait for the page to load
          setTimeout(() => {
            setSelectedEntryId(entry_id);
          }, 100);
        } else {
          showMessage('No more untranslated entries found', 'info');
        }
      } catch (error) {
        console.error('Error finding next untranslated entry:', error);
        showMessage('Error finding next untranslated entry', 'error');
      }
    } else {
      showMessage('No more untranslated entries found', 'info');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedFile.filename}</h2>
          <p className="text-muted-foreground">app: {selectedFile.app}</p>
        </div>

        <div>
          {/* Pagination Controls */}
          <div className="p-3 flex items-center justify-between space-x-2">
            <div className="text-sm text-muted-foreground">
              {totalEntries > 0 ? (
                <span>
                  {(currentPage - 1) * ENTRIES_PER_PAGE + 1}-
                  {Math.min(currentPage * ENTRIES_PER_PAGE, totalEntries)}{' '}
                  {__('of')} {totalEntries}
                </span>
              ) : (
                <span>{__('0 entries')}</span>
              )}
            </div>
            <div className="flex space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TranslationStats
          stats={
            stats || { total: 0, translated: 0, untranslated: 0, percentage: 0 }
          }
        />
      </div>

      {/* Separate Manual or AI Mode */}
      {translationMode === 'manual' ? (
        <div className="flex space-x-4">
          <div className="w-1/3 rounded-lg border">
            <div className="border-b p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium">Entries</h3>
                <Select
                  value={entryFilter}
                  onValueChange={(
                    value: 'all' | 'untranslated' | 'translated'
                  ) => {
                    setEntryFilter(value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={__('Filter entries')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{__('All entries')}</SelectItem>
                    <SelectItem value="untranslated">
                      {__('Untranslated only')}
                    </SelectItem>
                    <SelectItem value="translated">
                      {__('Translated only')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder={__('Search in entries...')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when search term changes
                }}
                className="mb-2"
              />
            </div>

            <div className="h-[calc(100vh-400px)] overflow-y-auto">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : entries.length === 0 ? (
                <div className="text-muted-foreground p-4 text-center">
                  {__('No entries match your filter')}
                </div>
              ) : (
                <ul className="divide-y">
                  {entries.map((entry, index) => (
                    <li key={`entry-${entry.id}-${index}`}>
                      <button
                        type="button"
                        className={`hover:bg-muted/50 w-full p-3 text-left transition-colors ${
                          selectedEntryId === entry.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedEntryId(entry.id)}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <Badge
                            variant={
                              entry.is_translated ? 'default' : 'outline'
                            }
                            className={
                              entry.is_translated ? 'bg-green-500' : ''
                            }
                          >
                            {entry.is_translated
                              ? __('Translated')
                              : __('Untranslated')}
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
                  <div className="flex justify-between items-center">
                    <CardTitle>{__('Translation')}</CardTitle>
                    <div className="flex space-x-2">
                      {pushToGithub ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleTestGitHubConnection(
                              settings.github_repo || '',
                              settings.github_token || ''
                            )
                          }
                          disabled={
                            !settings.github_enable ||
                            !settings.github_repo ||
                            !settings.github_token
                          }
                        >
                          {__('Test Connect')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant={'outline'}
                          onClick={() => setShowTokenDialog(true)}
                        >
                          <div className="flex justify-center items-center">
                            {__('Github Token')}
                          </div>
                        </Button>
                      )}
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
                          {__('Push to Github')}
                        </Label>
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    {selectedEntry.context && (
                      <Badge variant="outline" className="mb-1">
                        {__('Context:')} {selectedEntry.context}
                      </Badge>
                    )}
                    {selectedEntry.comments &&
                      selectedEntry.comments.length > 0 && (
                        <div className="text-muted-foreground mt-2 text-xs">
                          <p>{selectedEntry.comments}</p>
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
                        {__('Source (English)')}
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
                        {__('Translation (Thai)')}
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

                        // console.log('entry reset button', entry);
                        if (entry) setEditedTranslation(entry.msgstr);
                        // setStatusMessage(null);
                        clearMessage();
                      }}
                    >
                      {__('Reset')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToNextUntranslated}
                      disabled={isLoading}
                      // onClick={() => {
                      //   // Find next untranslated entry
                      //   const untranslatedEntries = entries.filter(
                      //     (e) => !e.is_translated
                      //   );
                      //   if (untranslatedEntries.length > 0) {
                      //     setSelectedEntryId(untranslatedEntries[0].id);
                      //   }
                      // }}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {__('Next Untranslated')}
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
                          {__('AI Translating...')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {__('AI Translate')}
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
                          {__('Saving...')}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {__('Save')}
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
                          {__('GitHub Personal Access Token Required')}
                        </DialogTitle>
                        <DialogDescription>
                          {__(
                            'To share translations on GitHub, you need to provide a GitHub Personal Access Token with repository permissions.'
                          )}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-4">
                        <Label
                          htmlFor="github-token"
                          className="text-sm font-medium"
                        >
                          {__('GitHub Token (ghp_xxxxxxxxxxxxxxxx)')}
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="github-token"
                            type={showPassword ? 'text' : 'password'}
                            className="mt-2 pr-10 py-2"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxx"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-0 transform translate-y-1/2"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={
                              showPassword
                                ? 'Hide GitHub token'
                                : 'Show GitHub token'
                            }
                            title={
                              showPassword
                                ? 'Hide GitHub token'
                                : 'Show GitHub token'
                            }
                          >
                            {showPassword ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <title>Hide GitHub token</title>
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
                                <title>Show GitHub token</title>
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
                          {__('Cancel')}
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
      ) : (
        <BatchTranslationView
          selectedFile={selectedFile}
          entries={entries}
          settings={settings}
          batchSize={batchSize}
          onTranslationComplete={() => mutate()}
        />
      )}
    </div>
  );
}
