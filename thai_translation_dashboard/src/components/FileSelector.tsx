// biome-ignore lint/style/useImportType: <explanation>
import React, { useState } from 'react'
import { useFrappeGetCall } from 'frappe-react-sdk'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Search } from 'lucide-react'

type PoFile = {
  path: string
  app: string
  filename: string
}

type Props = {
  onFileSelect: (filePath: string) => void
  selectedFile: string | null
}

const FileSelector: React.FC<Props> = ({ onFileSelect, selectedFile }) => {
  const [searchTerm, setSearchTerm] = useState('')

  const { data, error, isLoading, mutate } = useFrappeGetCall<{
    message: PoFile[]
  }>('translation_tools.api.get_po_files', {})

  const filteredFiles =
    data?.message?.filter(
      (file) =>
        file.app.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.filename.toLowerCase().includes(searchTerm.toLowerCase()),
    ) || []

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Select a PO file</h2>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => mutate()}
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          Refresh Files
        </Button>

        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-60 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moo-blue" />
        </div>
      ) : error ? (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          <p>{error.message || 'Failed to load files'}</p>
          <Button
            onClick={() => mutate()}
            variant="destructive"
            size="sm"
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {filteredFiles.length} file{filteredFiles.length !== 1 ? 's' : ''}{' '}
            found
          </div>

          <div className="border rounded max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.length > 0 ? (
                  filteredFiles.map((file) => (
                    <tr
                      key={file.path}
                      className={`${
                        selectedFile === file.path
                          ? 'bg-blue-50'
                          : 'hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {file.app}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {file.filename}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          onClick={() => onFileSelect(file.path)}
                          variant={
                            selectedFile === file.path ? 'secondary' : 'outline'
                          }
                          size="sm"
                          className="cursor-pointer"
                        >
                          {selectedFile === file.path ? 'Selected' : 'Select'}
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No PO files found
                      {searchTerm ? ' matching your search' : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default FileSelector
