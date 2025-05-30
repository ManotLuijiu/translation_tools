// biome-ignore lint/style/useImportType: <explanation>
import React, { useState, useEffect } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { RefreshCw, Search, FileText, ScanLine } from 'lucide-react'
import { Skeleton } from '../components/ui/skeleton'
import { toast } from 'sonner'

type PoFile = {
  file_path: string
  app: string
  filename: string
  language?: string
  last_modified?: string
  translated_percentage?: number
  total_entries?: number
  translated_entries?: number
}

type ScanResult = {
  success: boolean
  total_files: number
  new_files: number
  updated_files: number
  error?: string
}

type Props = {
  onFileSelect: (filePath: string) => void
  selectedFile: string | null
}

const FileManager: React.FC<Props> = ({ onFileSelect, selectedFile }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [appFilter, setAppFilter] = useState<string | null>(null)
  const [uniqueApps, setUniqueApps] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)

  const { data, error, isValidating, mutate } = useFrappeGetCall<{
    message: PoFile[]
  }>('translation_tools.api.get_cached_po_files', {})

  const { call: scanPoFiles } = useFrappePostCall<ScanResult>(
    'translation_tools.translation_tools.api.scan_po_files',
  )

  useEffect(() => {
    if (data?.message) {
      const apps = [...new Set(data.message.map((file) => file.app))]
      setUniqueApps(apps)
    }
  }, [data])

  const handleScanFiles = async () => {
    setIsScanning(true)
    try {
      const result = await scanPoFiles({})

      if (result.success) {
        toast(
          `Found ${result.total_files} PO files (${result.new_files} new, ${result.updated_files} updated)`,
        )
        mutate()
      } else {
        toast(result.error || 'An error occurred during scanning')
      }
    } catch (error) {
      toast((error as Error).message || 'An error occurred during scanning')
    } finally {
      setIsScanning(false)
    }
  }

  const filteredFiles = data?.message?.filter((file) => {
    const matchesSearch =
      !searchTerm ||
      file.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.app.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesApp = !appFilter || file.app === appFilter

    return matchesSearch && matchesApp
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Translation Files</CardTitle>
        <CardDescription>Select a PO file to translate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleScanFiles}
            disabled={isScanning}
          >
            <ScanLine
              className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`}
            />
            Scan Files
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={appFilter === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAppFilter(null)}
          >
            All
          </Button>
          {uniqueApps.map((app) => (
            <Button
              key={app}
              variant={appFilter === app ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAppFilter(app)}
            >
              {app}
            </Button>
          ))}
        </div>

        {isValidating && !data ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
            {error.message || 'Failed to load files'}
          </div>
        ) : (
          <div className="border rounded-md">
            <div className="grid grid-cols-12 p-3 border-b font-medium text-sm">
              <div className="col-span-3">App</div>
              <div className="col-span-5">Filename</div>
              <div className="col-span-2">Progress</div>
              <div className="col-span-2">Actions</div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {filteredFiles?.length ? (
                filteredFiles.map((file) => (
                  <div
                    key={file.file_path}
                    className={`grid grid-cols-12 p-3 border-b text-sm items-center ${
                      selectedFile === file.file_path
                        ? 'bg-secondary'
                        : 'hover:bg-secondary/40'
                    }`}
                  >
                    <div className="col-span-3 font-medium">{file.app}</div>
                    <div className="col-span-5 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      {file.filename}
                    </div>
                    <div className="col-span-2">
                      {file.translated_percentage !== undefined ? (
                        <div className="w-full bg-secondary h-2 rounded-full">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${file.translated_percentage}%` }}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Button
                        variant={
                          selectedFile === file.file_path
                            ? 'default'
                            : 'outline'
                        }
                        size="sm"
                        onClick={() => onFileSelect(file.file_path)}
                      >
                        {selectedFile === file.file_path
                          ? 'Selected'
                          : 'Select'}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No matching files found
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default FileManager
