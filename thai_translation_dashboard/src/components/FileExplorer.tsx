import { useState, useMemo, useEffect } from 'react';
import { useGetLivePOFiles, useScanPOFiles, useDeletePOFiles, useGetAppSyncSettings, useToggleAppAutosync } from '../api';
import { POFile } from '../types';
import { formatPercentage, formatDate } from '../utils/helpers';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Search, FileText, Trash2, CheckCircle, GitBranch, Globe, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/context/TranslationContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FileExplorerProps {
  onFileSelect: (file: POFile) => void;
  selectedFilePath: string | null;
  onRefreshFunctionReady?: (refreshFn: () => void) => void;
}

export default function FileExplorer({
  onFileSelect,
  selectedFilePath,
  onRefreshFunctionReady,
}: FileExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('th'); // Default to Thai
  const { data, error, isLoading, mutate } = useGetLivePOFiles(activeTab);
  const scanFiles = useScanPOFiles();
  const deletePOFiles = useDeletePOFiles();
  const [isScanningFiles, setIsScanningFiles] = useState(false);
  const [isGeneratingAsean, setIsGeneratingAsean] = useState(false);
  const [jobProgress, setJobProgress] = useState<{
    progress: number;
    current_app: string;
    current_locale: string;
    processed_apps: number;
    total_apps: number;
  } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });
  const { translate: __, isReady } = useTranslation();

  // ASEAN languages configuration
  const aseanLanguages = [
    { code: 'th', name: 'Thai', flag: '🇹🇭' },
    { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
    { code: 'lo', name: 'Lao', flag: '🇱🇦' },
    { code: 'km', name: 'Khmer', flag: '🇰🇭' },
    { code: 'my', name: 'Myanmar', flag: '🇲🇲' },
  ];
  
  // App sync settings
  const { data: appSyncData, mutate: refetchAppSyncData } = useGetAppSyncSettings();
  const { call: toggleAppSync } = useToggleAppAutosync();
  const [appSyncSettings, setAppSyncSettings] = useState<Record<string, boolean>>({});
  const [syncStatus, setSyncStatus] = useState<{ app: string; status: 'idle' | 'syncing' | 'success' | 'error'; message?: string } | null>(null);
  

  // console.log('selectedFilePath', selectedFilePath);

  // Update local state when app sync data changes
  useEffect(() => {
    // Frappe's @frappe.whitelist() decorator wraps response in 'message' field
    const actualData = appSyncData?.message;
    console.log('🔄 App Sync Data Update:', { 
      rawData: appSyncData, 
      actualData,
      success: actualData?.success,
      hasAppSettings: !!actualData?.app_settings 
    });
    
    if (actualData?.success && actualData.app_settings) {
      const settings: Record<string, boolean> = {};
      for (const appName in actualData.app_settings) {
        settings[appName] = actualData.app_settings[appName].enabled || false;
      }
      console.log('📊 Extracted App Sync Settings:', settings);
      setAppSyncSettings(settings);
    } else if (actualData && !actualData.success) {
      console.error('❌ App Sync API returned error:', (actualData as any).error);
    }
  }, [appSyncData]);

  // Provide refresh function to parent component
  // Since we're using get_live_po_files (direct filesystem read), no cache invalidation needed
  useEffect(() => {
    console.log('📁 FileExplorer: Setting up refresh function');
    console.log('📁 onRefreshFunctionReady exists:', !!onRefreshFunctionReady);
    console.log('📁 mutate function exists:', !!mutate);
    if (onRefreshFunctionReady) {
      console.log('📁 FileExplorer: Providing simple refresh function (live read, no cache)');
      // Simple refresh - just refetch from filesystem
      const refreshFunction = async () => {
        console.log('🔄 FileExplorer: Refreshing live statistics from filesystem');
        try {
          await mutate();
          console.log('✅ FileExplorer: Live statistics refreshed');
        } catch (error) {
          console.error('❌ FileExplorer: Refresh error:', error);
        }
      };
      onRefreshFunctionReady(refreshFunction);
    }
  }, [onRefreshFunctionReady, mutate, activeTab]);

  // Log when active tab changes to verify API refetch
  useEffect(() => {
    console.log(`🌐 Language tab changed to: ${activeTab}`);
    console.log(`📡 API will fetch files for language: ${activeTab}`);
  }, [activeTab]);

  const handleToggleAppSync = async (appName: string, enabled: boolean) => {
    console.log('=== Auto Sync Toggle Debug ===');
    console.log('App Name:', appName);
    console.log('Enabled:', enabled);
    console.log('Current appSyncSettings:', appSyncSettings);
    
    // Set sync status to show it's processing
    setSyncStatus({ 
      app: appName, 
      status: 'syncing', 
      message: enabled ? `Enabling auto-sync for ${appName}...` : `Disabling auto-sync for ${appName}...` 
    });
    
    try {
      console.log('Calling toggleAppSync API...');
      const result = await toggleAppSync(appName, enabled);
      console.log('API Response:', result);
      
      // Handle both direct result and wrapped message response
      const actualResult = (result as any)?.message || result;
      console.log('Actual Result:', actualResult);
      
      if (actualResult?.success) {
        console.log('Success! Updating local state...');
        // Update local state immediately for UI responsiveness
        setAppSyncSettings(prev => {
          const newSettings = {
            ...prev,
            [appName]: enabled
          };
          console.log('New appSyncSettings:', newSettings);
          return newSettings;
        });
        
        // Show success status
        setSyncStatus({ 
          app: appName, 
          status: 'success', 
          message: actualResult.message || `Auto-sync ${enabled ? 'enabled' : 'disabled'} for ${appName}` 
        });
        
        // Small delay to ensure database commit completes
        console.log('Waiting 100ms for database commit...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Refetch data to ensure consistency
        console.log('Refetching app sync data...');
        await refetchAppSyncData();
        console.log('Refetch complete');
        
        // Clear status after 3 seconds
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        console.error('API call was not successful:', actualResult);
        setSyncStatus({ 
          app: appName, 
          status: 'error', 
          message: actualResult?.error || 'Failed to toggle auto-sync' 
        });
        setTimeout(() => setSyncStatus(null), 5000);
      }
    } catch (error) {
      console.error('Error toggling app sync:', error);
      console.error('Error details:', {
        message: (error as any)?.message,
        stack: (error as any)?.stack
      });
      
      // Show error status
      setSyncStatus({ 
        app: appName, 
        status: 'error', 
        message: `Error: ${(error as any)?.message || 'Failed to toggle auto-sync'}` 
      });
      
      // Revert local state on error
      setAppSyncSettings(prev => ({
        ...prev,
        [appName]: !enabled
      }));
      console.log('Reverted appSyncSettings due to error');
      
      // Clear status after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000);
    }
    console.log('=== End Auto Sync Toggle Debug ===');
  };

  const handleScan = async () => {
    setIsScanningFiles(true);
    try {
      await scanFiles.call();
      await mutate(); // Refresh the data
    } catch (error) {
      console.error('Error scanning files:', error);
    } finally {
      setIsScanningFiles(false);
    }
  };

  const handleGenerateAseanTranslations = async () => {
    setIsGeneratingAsean(true);
    setJobProgress(null); // Reset progress
    try {
      // Step 1: Start background job
      const response = await fetch('/api/method/translation_tools.api.bulk_translation.generate_all_apps_asean_translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).csrf_token || ''
        },
        body: JSON.stringify({
          force_regenerate_pot: false
        })
      });

      const result = await response.json();

      if (!result.message?.success) {
        throw new Error(result.message?.error || 'Failed to start translation job');
      }

      const jobId = result.message.job_id;
      console.log('Translation job started:', jobId);

      // Step 2: Poll for job status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(
            `/api/method/translation_tools.api.bulk_translation.get_bulk_translation_job_status?job_id=${jobId}`,
            {
              headers: {
                'X-Frappe-CSRF-Token': (window as any).csrf_token || ''
              }
            }
          );

          const statusResult = await statusResponse.json();

          if (statusResult.message?.success) {
            const jobStatus = statusResult.message;
            console.log('Job progress:', jobStatus.progress, '%', jobStatus.current_app);

            // Update progress state
            setJobProgress({
              progress: jobStatus.progress || 0,
              current_app: jobStatus.current_app || '',
              current_locale: jobStatus.current_locale || '',
              processed_apps: jobStatus.processed_apps || 0,
              total_apps: jobStatus.total_apps || 0,
            });

            // Check if job completed
            if (jobStatus.status === 'Completed') {
              clearInterval(pollInterval);

              const results = jobStatus.results;

              // Show success toast
              toast.success('🌏 ASEAN Translations Completed!', {
                description: `${results.processed_apps}/${results.total_apps} apps processed • ${results.skipped_apps} skipped • ${results.error_apps} errors`,
                duration: 5000,
              });

              await mutate();
              setIsGeneratingAsean(false);
              setJobProgress(null); // Clear progress
            } else if (jobStatus.status === 'Failed' || jobStatus.status === 'Cancelled') {
              clearInterval(pollInterval);
              setJobProgress(null); // Clear progress on error
              throw new Error(jobStatus.error_log || `Job ${jobStatus.status.toLowerCase()}`);
            }
          }
        } catch (pollError) {
          console.error('Error polling job status:', pollError);
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      console.error('Error generating ASEAN translations:', error);
      toast.error('Translation Error', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000,
      });
      setIsGeneratingAsean(false);
      setJobProgress(null); // Clear progress on error
    }
  };



  // console.log('data', data);

  const filteredFiles =
    data?.message?.filter((file) => {
      // Filter by language (based on filename ending, e.g., th.po, en.po, etc.)
      const languageMatch = file.filename.endsWith(`${activeTab}.po`);
      
      // Filter by search term
      if (!searchTerm) return languageMatch;

      const searchLower = searchTerm.toLowerCase();
      const searchMatch = 
        file.filename.toLowerCase().includes(searchLower) ||
        file.app.toLowerCase().includes(searchLower);
      
      return languageMatch && searchMatch;
    }) || [];

  // console.log('filteredFiles', filteredFiles);

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    // Sort by app name first, then filename
    if (a.app !== b.app) return a.app.localeCompare(b.app);
    return a.filename.localeCompare(b.filename);
  });

  // console.log('sortedFiles', sortedFiles);

  // Check if all files are selected
  const allFilesSelected = useMemo(() => {
    if (sortedFiles.length === 0) return false;
    return sortedFiles.every(file => selectedFiles.has(file.file_path));
  }, [sortedFiles, selectedFiles]);

  // Check if some files are selected
  const someFilesSelected = useMemo(() => {
    if (sortedFiles.length === 0) return false;
    return sortedFiles.some(file => selectedFiles.has(file.file_path)) && !allFilesSelected;
  }, [sortedFiles, selectedFiles, allFilesSelected]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allPaths = new Set(sortedFiles.map(file => file.file_path));
      setSelectedFiles(allPaths);
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleFileSelect = (filePath: string, checked: boolean) => {
    const newSelection = new Set(selectedFiles);
    if (checked) {
      newSelection.add(filePath);
    } else {
      newSelection.delete(filePath);
    }
    setSelectedFiles(newSelection);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    setIsDeleting(true);
    try {
      const result = await deletePOFiles.call({
        file_paths: Array.from(selectedFiles)
      });
      
      if ((result as any)?.success || (result as any)?.message?.success) {
        const deletedCount = (result as any)?.deleted_count || (result as any)?.message?.deleted_count || selectedFiles.size;
        
        // Show success message
        setDeleteSuccess({ show: true, count: deletedCount });
        
        // Clear selection
        setSelectedFiles(new Set());
        
        // Close dialog
        setShowDeleteDialog(false);
        
        // Force refresh the file list after a short delay
        setTimeout(async () => {
          await mutate();
          // Also trigger a scan to ensure database is updated
          await scanFiles.call();
        }, 500);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setDeleteSuccess({ show: false, count: 0 });
        }, 3000);
      } else {
        console.error('Failed to delete files:', result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error deleting files:', error);
    } finally {
      setIsDeleting(false);
    }
  };


  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p>{!isReady ? 'Loading translation...' : 'Accessing...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sync Status Display */}
      {syncStatus && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 ${
          syncStatus.status === 'syncing' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' :
          syncStatus.status === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
          syncStatus.status === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
          'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200'
        }`}>
          {syncStatus.status === 'syncing' && (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              <span className="font-medium">Syncing {syncStatus.app}...</span>
            </>
          )}
          {syncStatus.status === 'success' && (
            <>
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">{syncStatus.message}</span>
            </>
          )}
          {syncStatus.status === 'error' && (
            <>
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{syncStatus.message}</span>
            </>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{__('ASEAN Translation Files')}</h2>
        {deleteSuccess.show && (
          <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-3 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span>{__('Successfully deleted {count} file(s)', { count: deleteSuccess.count })}</span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          {selectedFiles.size > 0 && (
            <Button 
              onClick={() => setShowDeleteDialog(true)} 
              variant="destructive"
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {__('Delete')} ({selectedFiles.size})
            </Button>
          )}
          <Button onClick={handleScan} disabled={isScanningFiles} variant="outline">
            {isScanningFiles ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {__('Scanning...')}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {__('Scan Files')}
              </>
            )}
          </Button>
          <Button 
            onClick={handleGenerateAseanTranslations} 
            disabled={isGeneratingAsean} 
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGeneratingAsean ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {__('Generating...')}
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                {__('Generate ASEAN Translations')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress indicator for ASEAN translation job */}
      {isGeneratingAsean && jobProgress && (
        <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {jobProgress.current_app}
              {jobProgress.current_locale && ` (${jobProgress.current_locale})`}
            </span>
            <span className="text-muted-foreground">
              {jobProgress.processed_apps}/{jobProgress.total_apps} apps
            </span>
          </div>
          <Progress value={jobProgress.progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-right">
            {Math.round(jobProgress.progress)}% complete
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
        <Input
          placeholder={__('Search app name...')}
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ASEAN Language Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {aseanLanguages.map((lang) => (
            <TabsTrigger 
              key={lang.code} 
              value={lang.code}
              className="flex items-center gap-2"
            >
              <span>{lang.flag}</span>
              {lang.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {aseanLanguages.map((lang) => (
          <TabsContent key={lang.code} value={lang.code} className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-destructive p-4 text-center">
                {__('Error loading files:, {error}', {
                  error: error.message || 'Unknown error',
                })}
              </div>
            ) : sortedFiles.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center">
                {searchTerm
                  ? `No ${lang.name} files matching your search`
                  : `No ${lang.name} PO files found. Click "Generate ASEAN Translations" to create ${lang.name} translation files for all apps.`}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={allFilesSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all files"
                          className="data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
                          {...(someFilesSelected && { 'data-state': 'indeterminate' })}
                        />
                      </TableHead>
                      <TableHead>{__('App')}</TableHead>
                      <TableHead>Filename</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead className="w-[120px]">
                        <div className="flex items-center gap-1">
                          <GitBranch className="h-4 w-4" />
                          Auto Sync
                        </div>
                      </TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFiles.map((file, index) => {
                      // Check if this is the first file for this app (to show the toggle only once)
                      const isFirstFileForApp = index === 0 || sortedFiles[index - 1].app !== file.app;
                      
                      return (
                      <TableRow
                        key={file.file_path}
                        className={
                          selectedFilePath === file.file_path ? 'bg-muted/50' : ''
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedFiles.has(file.file_path)}
                            onCheckedChange={(checked) => 
                              handleFileSelect(file.file_path, checked as boolean)
                            }
                            aria-label={`Select ${file.filename}`}
                          />
                        </TableCell>
                        <TableCell>{file.app}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <FileText className="text-muted-foreground mr-2 h-4 w-4" />
                            {file.filename}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="bg-muted h-2 w-28 rounded-full">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{
                                  width: `${file.translated_percentage}%`,
                                }}
                              />
                            </div>
                            <span className="text-muted-foreground text-xs">
                              {formatPercentage(file.translated_percentage)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {file.translated_entries}/{file.total_entries}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(file.last_modified)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isFirstFileForApp ? (
                            <div className="flex items-center justify-center">
                              <Switch
                                checked={appSyncSettings[file.app] || false}
                                onCheckedChange={(checked) => {
                                  handleToggleAppSync(file.app, checked);
                                }}
                                className={
                                  appSyncSettings[file.app] 
                                    ? "data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500" 
                                    : ""
                                }
                              />
                            </div>
                          ) : (
                            <div className="h-5" />
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="relative inline-block">
                              <Button
                                variant={
                                  selectedFilePath === file.file_path
                                    ? 'secondary'
                                    : 'ghost'
                                }
                                size="sm"
                                onClick={() => onFileSelect(file)}
                                disabled={file.filename.includes('translated')}
                                className={cn(
                                  'cursor-pointer',
                                  selectedFilePath === file.file_path
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-800 dark:hover:bg-indigo-700'
                                    : 'bg-sky-200 hover:bg-sky-300 dark:bg-blue-600 dark:hover:bg-blue-700'
                                )}
                              >
                                {selectedFilePath === file.file_path
                                  ? 'Selected'
                                  : 'Select'}
                              </Button>
                              {file.filename.includes('translated') && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="absolute -top-1 -right-1 bg-orange-200 text-gray-900 dark:bg-orange-400 rounded-full p-1 hover:bg-orange-300 dark:hover:bg-orange-500 transition-colors"
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                      aria-label="Why disabled?"
                                    >
                                      <span className="text-xs font-bold">?</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>For AI only</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>


      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{__('Confirm Deletion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {__('Are you sure you want to delete {count} selected file(s)?', { count: selectedFiles.size })}
              <br />
              <span className="text-destructive font-semibold">
                {__('This action cannot be undone. The files will be backed up but removed from the application.')}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {__('Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {__('Deleting...')}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {__('Delete')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
