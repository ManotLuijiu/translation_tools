import React, { useEffect } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { Progress } from "./ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";

interface TranslationStatusProps {
  filePath: string;
}

interface PoFileContents {
  metadata: {
    Project: string;
    Language: string;
    "Last-Translator": string;
    "POT-Creation-Date": string;
    "PO-Revision-Date": string;
  };
  statistics: {
    total: number;
    translated: number;
    untranslated: number;
    fuzzy: number;
    percent_translated: number;
  };
  entries: Array<{
    msgid: string;
    msgstr: string;
    is_translated: boolean;
    is_fuzzy: boolean;
    entry_type: string;
  }>;
  has_more: boolean;
}

const TranslationStatus: React.FC<TranslationStatusProps> = ({ filePath }) => {
  const { data, error, isLoading, mutate } = useFrappeGetCall<{
    message: PoFileContents;
  }>("translation_tools.api.get_po_file_contents", {
    file_path: filePath,
  });

  useEffect(() => {
    if (filePath) {
      mutate();
    }
  }, [filePath, mutate]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded">
        <p className="font-medium">Error loading translation status</p>
        <p>{error.message || "Unknown error occurred"}</p>
      </div>
    );
  }

  if (!data?.message) {
    return null;
  }

  const { metadata, statistics } = data.message;
  console.log('metadata',metadata)
  console.log('statistics',statistics)

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">File Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Project:</dt>
                <dd>{metadata.Project || "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Language:</dt>
                <dd>{metadata.Language || "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Last Translator:</dt>
                <dd>{metadata["Last-Translator"] || "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Created:</dt>
                <dd>{metadata["POT-Creation-Date"] || "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-gray-500">Last Updated:</dt>
                <dd>{metadata["PO-Revision-Date"] || "N/A"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Translation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-medium">
                  {statistics.percent_translated}%
                </span>
              </div>
              <Progress value={statistics.percent_translated} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-green-50 rounded">
                <div className="text-xl font-bold text-green-600">
                  {statistics.translated}
                </div>
                <div className="text-xs text-gray-600">Translated</div>
              </div>
              <div className="p-2 bg-yellow-50 rounded">
                <div className="text-xl font-bold text-yellow-600">
                  {statistics.fuzzy}
                </div>
                <div className="text-xs text-gray-600">Fuzzy</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xl font-bold text-gray-600">
                  {statistics.untranslated}
                </div>
                <div className="text-xs text-gray-600">Untranslated</div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="text-center">
              <div className="text-sm text-gray-600">Total Entries</div>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TranslationStatus;
