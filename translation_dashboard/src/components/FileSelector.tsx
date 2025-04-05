import {useFrappeGetCall} from 'frappe-react-sdk'

type PoFile = {
  path: string;
  app: string;
  filename: string;
};

type Props = {
  onFileSelect: (filePath: string) => void;
  selectedFile: string | null;
};

const FileSelector = ({onFileSelect, selectedFile}: Props) => {
  const { data, error, isLoading, mutate } = useFrappeGetCall<{message: PoFile[]}>(
    "translation_tools.translation_tools.api.get_po_files",
    {}
  );

  return (
    <div>
      <h2 className='text-xl font-semibold mb-4'>Select a PO file</h2>
      <button
          onClick={() => mutate()} // Refetch data
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
      </button>

      {isLoading ? (
        <p>Loading PO files...</p>
      ) : error ? (
        <p className='text-red-500'>{error.message || "Failed to load files"}</p>
      ):(
        <div className="max-h-60 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  App
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.message?.map((file) => (
                <tr key={file.path} className={selectedFile === file.path ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {file.app}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onFileSelect(file.path)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      {selectedFile === file.path ? 'Selected' : 'Select'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default FileSelector