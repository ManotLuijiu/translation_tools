import React, { useState, useMemo } from 'react';
import { useGetCachedPOFiles, useScanPOFiles } from '../api';
import { POFile } from '../types';
import { formatPercentage, formatDate } from '../utils/helpers';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Search, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FileExplorerProps {
  onFileSelect: (file: POFile) => void;
  selectedFilePath: string | null;
  className?: string; // Optional className prop
}

interface ApiError {
  message: string;
  // Add other error properties as needed
}

interface POFileListResponse {
  data: {
    message?: POFile[];
  };
  error: Error | null;
  isLoading: boolean;
  mutate: () => Promise<any>;
}

export default function FileExplorer({
  onFileSelect,
  selectedFilePath,
}: FileExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data, error, isLoading, refetch } = useGetCachedPOFiles();
  const files = data || [];
  const errorMessage = (error as ApiError)?.message || 'Unknown error';
  const scanFiles = useScanPOFiles();
  const [isScanning, setIsScanning] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const result = await scanFiles;
      console.log('Scan result', result);
      if (result?.isSuccess) {
        setIsMutating(true);
        await refetch();
      }
    } catch (error) {
      console.error('Error scanning files:', error);
    } finally {
      setIsScanning(false);
      setIsMutating(false);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    const searchLower = searchTerm.toLowerCase();
    return files.filter(
      (file) =>
        file.filename.toLowerCase().includes(searchLower) ||
        file.app.toLowerCase().includes(searchLower)
    );
  }, [files, searchTerm]);

  const sortedFiles = useMemo(
    () =>
      [...filteredFiles].sort((a, b) => {
        if (a.app !== b.app) return a.app.localeCompare(b.app);
        return a.filename.localeCompare(b.filename);
      }),
    [filteredFiles]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">PO Files</h2>
        <Button onClick={handleScan} disabled={isScanning} variant="outline">
          {isScanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Scan Files
            </>
          )}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="p-4 text-center text-destructive">
          Error loading files: {error.message || 'Unknown error'}
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          {searchTerm
            ? 'No files matching your search'
            : 'No PO files found. Click "Scan Files" to discover translation files.'}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
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
                      <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                      {file.filename}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(100, Math.max(0, file.translated_percentage || 0))}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
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
                    <Button
                      variant={
                        selectedFilePath === file.file_path
                          ? 'secondary'
                          : 'ghost'
                      }
                      size="sm"
                      onClick={() => onFileSelect(file)}
                    >
                      {selectedFilePath === file.file_path
                        ? 'Selected'
                        : 'Select'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
