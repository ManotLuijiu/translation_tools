import { useState, useMemo, useEffect } from 'react';
import { useGetCachedPOFiles, useScanPOFiles, useDeletePOFiles, useGetAppSyncSettings, useToggleAppAutosync, useForceRefreshPOStats } from '../api';
import { POFile } from '../types';
import { formatPercentage, formatDate } from '../utils/helpers';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import { Loader2, RefreshCw, Search, FileText, Trash2, CheckCircle, GitBranch } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
}

export default function FileExplorer({
  onFileSelect,
  selectedFilePath,
}: FileExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, mutate } = useGetCachedPOFiles();
  const scanFiles = useScanPOFiles();
  const deletePOFiles = useDeletePOFiles();
  const forceRefreshStats = useForceRefreshPOStats();
  const [isScanningFiles, setIsScanningFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });
  const { translate: __, isReady } = useTranslation();
  
  // App sync settings
  const { data: appSyncData, mutate: refetchAppSyncData } = useGetAppSyncSettings();
  const { call: toggleAppSync } = useToggleAppAutosync();
  const [appSyncSettings, setAppSyncSettings] = useState<Record<string, boolean>>({});
  
  console.log('🔍 Component render - appSyncData:', appSyncData);
  console.log('🔍 Component render - appSyncSettings state:', appSyncSettings);

  // console.log('selectedFilePath', selectedFilePath);

  // Update local state when app sync data changes
  useEffect(() => {
    console.log('📊 useEffect triggered - appSyncData changed:', appSyncData);
    // Handle both direct data and wrapped message response
    const actualData = appSyncData?.message || appSyncData;
    if (actualData?.success && actualData.app_settings) {
      const settings: Record<string, boolean> = {};
      Object.keys(actualData.app_settings).forEach(appName => {
        settings[appName] = actualData.app_settings[appName].enabled;
      });
      console.log('📝 Updating appSyncSettings state to:', settings);
      setAppSyncSettings(settings);
    }
  }, [appSyncData]);

  const handleToggleAppSync = async (appName: string, enabled: boolean) => {
    console.log(`🔄 Starting toggle for app: ${appName}, enabled: ${enabled}`);
    console.log('📍 Current appSyncSettings before toggle:', appSyncSettings);
    
    try {
      console.log('🚀 Calling toggleAppSync API...');
      const result = await toggleAppSync(appName, enabled);
      console.log('📨 API Response:', result);
      
      // Handle both direct result and wrapped message response
      const actualResult = result?.message || result;
      if (actualResult?.success) {
        // Update local state immediately for UI responsiveness
        console.log('✅ API success, updating local state');
        setAppSyncSettings(prev => {
          const newSettings = {
            ...prev,
            [appName]: enabled
          };
          console.log('🔄 Local state updated to:', newSettings);
          return newSettings;
        });
        
        // Small delay to ensure database commit completes
        console.log('⏳ Waiting 100ms for DB commit...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Refetch data to ensure consistency
        console.log('🔃 Refetching app sync data...');
        const refetchResult = await refetchAppSyncData();
        console.log('📥 Refetch result:', refetchResult);
        
        console.log(`✨ Auto-sync ${enabled ? 'enabled' : 'disabled'} for ${appName}`);
      } else {
        console.log('❌ API returned unsuccessful result:', result);
      }
    } catch (error) {
      console.error('❌ Error toggling app sync:', error);
      // Revert local state on error
      setAppSyncSettings(prev => {
        const revertedSettings = {
          ...prev,
          [appName]: !enabled
        };
        console.log('⚠️ Reverting state due to error:', revertedSettings);
        return revertedSettings;
      });
    }
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



  // console.log('data', data);

  const filteredFiles =
    data?.message?.filter((file) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        file.filename.toLowerCase().includes(searchLower) ||
        file.app.toLowerCase().includes(searchLower)
      );
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
      
      if (result?.success || result?.message?.success) {
        const deletedCount = result?.deleted_count || result?.message?.deleted_count || selectedFiles.size;
        
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{__('PO Files')}</h2>
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
        </div>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
        <Input
          placeholder={__('Search app name...')}
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

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
            ? 'No files matching your search'
            : 'No PO files found. Click "Scan Files" to discover translation files.'}
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
                          checked={(() => {
                            const isChecked = appSyncSettings[file.app] || false;
                            console.log(`🎨 Rendering switch for ${file.app}: checked=${isChecked}`);
                            return isChecked;
                          })()}
                          onCheckedChange={(checked) => {
                            console.log(`👆 Switch clicked for ${file.app}: new value=${checked}`);
                            handleToggleAppSync(file.app, checked);
                          }}
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
