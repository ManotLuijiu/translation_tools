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
        console.log('handleScan initiated');
        setIsScanning(true);
        try {
            const result = await scanFiles.mutateAsync();
            console.log('Scan result', result);
            if (result && result.success === true) {
                setIsMutating(true);
                await refetch();
            } else {
                console.error('Scan failed:', result || 'Unknown error');
                // Handle the error case
                alert('Scan failed. Please try again.');
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
        <div className="tw-space-y-4">
            <div className="tw-flex tw-items-center tw-justify-between">
                <h2 className="tw-text-2xl tw-font-bold">PO Files</h2>
                <Button
                    onClick={handleScan}
                    disabled={isScanning}
                    variant="outline"
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />
                            Scanning...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="tw-mr-2 tw-h-4 tw-w-4" />
                            Scan Files
                        </>
                    )}
                </Button>
            </div>

            <div className="tw-relative">
                <Search className="tw-absolute tw-left-2 tw-top-2.5 tw-h-4 tw-w-4 tw-text-muted-foreground" />
                <Input
                    placeholder="Search app name..."
                    className="tw-pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="tw-flex tw-justify-center tw-py-8">
                    <Loader2 className="tw-h-8 tw-w-8 tw-animate-spin tw-text-primary" />
                </div>
            ) : error ? (
                <div className="tw-p-4 tw-text-center tw-text-destructive">
                    Error loading files: {error.message || 'Unknown error'}
                </div>
            ) : sortedFiles.length === 0 ? (
                <div className="tw-p-8 tw-text-center tw-text-muted-foreground">
                    {searchTerm
                        ? 'No files matching your search'
                        : 'No PO files found. Click "Scan Files" to discover translation files.'}
                </div>
            ) : (
                <div className="tw-rounded-md tw-border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>App</TableHead>
                                <TableHead>Filename</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Last Modified</TableHead>
                                <TableHead className="tw-w-[100px]">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedFiles.map((file) => (
                                <TableRow
                                    key={file.file_path}
                                    className={
                                        selectedFilePath === file.file_path
                                            ? 'tw-bg-muted/50'
                                            : ''
                                    }
                                >
                                    <TableCell>{file.app}</TableCell>
                                    <TableCell>
                                        <div className="tw-flex tw-items-center">
                                            <FileText className="tw-mr-2 tw-h-4 tw-w-4 tw-text-muted-foreground" />
                                            {file.filename}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="tw-flex tw-items-center tw-gap-2">
                                            <div className="tw-h-2 tw-w-28 tw-rounded-full tw-bg-muted">
                                                <div
                                                    className="tw-h-full tw-rounded-full tw-bg-primary"
                                                    style={{
                                                        width: `${Math.min(100, Math.max(0, file.translated_percentage || 0))}%`,
                                                    }}
                                                />
                                            </div>
                                            <span className="tw-text-xs tw-text-muted-foreground">
                                                {formatPercentage(
                                                    file.translated_percentage
                                                )}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="tw-text-xs"
                                            >
                                                {file.translated_entries}/
                                                {file.total_entries}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="tw-text-muted-foreground tw-text-sm">
                                        {formatDate(file.last_modified)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant={
                                                selectedFilePath ===
                                                file.file_path
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
