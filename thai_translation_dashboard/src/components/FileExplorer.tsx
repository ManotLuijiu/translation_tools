import { useState } from 'react';
import { useGetCachedPOFiles, useScanPOFiles, useEnhancedScanWithPOT } from '../api';
import { POFile } from '../types';
import { formatPercentage, formatDate } from '../utils/helpers';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Loader2, RefreshCw, Search, FileText, ChevronDown, Zap, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/context/TranslationContext';
import POTGenerationDialog from './POTGenerationDialog';

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
  const enhancedScan = useEnhancedScanWithPOT();
  const [isScanning, setIsScanning] = useState(false);
  const [showPOTDialog, setShowPOTDialog] = useState(false);
  const { translate: __, isReady } = useTranslation();

  // console.log('selectedFilePath', selectedFilePath);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await scanFiles.call();
      await mutate(); // Refresh the data
    } catch (error) {
      console.error('Error scanning files:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePOTGenerationScan = async () => {
    setIsScanning(true);
    try {
      const result = await enhancedScan.call({
        generate_pot: true,
        force_regenerate: false
      });
      
      if (result?.success) {
        await mutate(); // Refresh the data
      } else {
        console.error('Enhanced scan failed:', result?.error);
      }
    } catch (error) {
      console.error('Error in POT generation scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAdvancedPOTGeneration = () => {
    setShowPOTDialog(true);
  };

  const handlePOTGenerationComplete = async (success: boolean, message?: string) => {
    if (success) {
      // Refresh the PO files data after POT generation
      await mutate();
    }
    console.log('POT Generation complete:', { success, message });
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
        <div className="flex items-center space-x-2">
          <Button onClick={handleScan} disabled={isScanning} variant="outline">
            {isScanning ? (
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isScanning}>
                <Zap className="mr-2 h-4 w-4" />
                {__('POT Generation')}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handlePOTGenerationScan} disabled={isScanning}>
                <Zap className="mr-2 h-4 w-4" />
                {__('Generate POT & Scan')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAdvancedPOTGeneration} disabled={isScanning}>
                <Settings className="mr-2 h-4 w-4" />
                {__('Advanced POT Options...')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                <TableHead>{__('App')}</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiles.map((file) => (
                <TableRow
                  key={file.file_path}
                  className={
                    selectedFilePath === file.file_path ? 'bg-muted/50' : ''
                  }
                >
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <POTGenerationDialog
        isOpen={showPOTDialog}
        onClose={() => setShowPOTDialog(false)}
        onComplete={handlePOTGenerationComplete}
      />
    </div>
  );
}
