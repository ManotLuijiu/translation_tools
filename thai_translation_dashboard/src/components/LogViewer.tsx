import React, { useState, useEffect } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Download, AlertCircle, RefreshCw } from 'lucide-react';

interface LogViewerProps {
  logFilePath: string | null;
}

interface LogData {
  success: boolean;
  logs: string;
  analysis: {
    api_calls: number;
    api_responses: number;
    errors: string[];
  };
}

const LogViewer: React.FC<LogViewerProps> = ({ logFilePath }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'raw'>('analysis');

  const { data, error, isLoading, mutate } = useFrappeGetCall<{
    message: LogData;
  }>('translation_tools.api.get_translation_logs', {
    log_file: logFilePath,
  });

  // Extract API call issues from logs
  const apiCalls = React.useMemo(() => {
    if (!data?.message?.logs) return [];

    const apiCallRegex = /API call.*?(?=API call|$)/gs;
    const matches = data.message.logs.match(apiCallRegex) || [];

    return matches.map((match) => {
      const hasError = match.includes('Error') || match.includes('error');
      return {
        content: match.trim(),
        hasError,
      };
    });
  }, [data?.message?.logs]);

  console.info('apiCalls', apiCalls);

  // Extract model response patterns
  const responsePatterns = React.useMemo(() => {
    if (!data?.message?.logs) return [];

    const responseRegex = /Raw response: (.*?)(?=Raw response:|$)/gs;
    const matches = data.message.logs.match(responseRegex) || [];

    return matches.map((match) => {
      const content = match.trim();
      const hasJson = content.includes('{') && content.includes('}');
      const isArray = content.includes('[') && content.includes(']');
      const hasError = content.includes('error') || content.includes('Error');

      return {
        content,
        format: hasJson ? 'JSON' : isArray ? 'Array' : 'Unknown',
        hasError,
      };
    });
  }, [data?.message?.logs]);

  // Parse JSON parsing issues
  const jsonParsingIssues = React.useMemo(() => {
    if (!data?.message?.logs) return [];

    const regex = /JSON parsing error: (.*?)(?=\n|$)/g;
    const matches = [];
    let match: RegExpExecArray | null = regex.exec(data.message.logs);

    while (match !== null) {
      matches.push(match[1]);
      match = regex.exec(data.message.logs);
    }

    return matches;
  }, [data?.message?.logs]);

  // Analyze common pattern issues
  const commonIssues = React.useMemo(() => {
    if (!data?.message?.logs) return [];

    const issues = [];

    // Check for rate limiting
    if (data.message.logs.includes('Rate limit')) {
      issues.push({
        type: 'Rate Limiting',
        description: 'API rate limits were reached during translation',
        severity: 'warning',
      });
    }

    // Check for token limit issues
    if (data.message.logs.includes('maximum context length')) {
      issues.push({
        type: 'Token Limit',
        description: "The request exceeded the model's maximum token limit",
        severity: 'error',
      });
    }

    // Check for JSON format issues
    if (jsonParsingIssues.length > 0) {
      issues.push({
        type: 'JSON Parsing',
        description:
          "The model returned responses that couldn't be parsed as JSON",
        severity: 'error',
      });
    }

    // Check for API timeouts
    if (data.message.logs.includes('timeout')) {
      issues.push({
        type: 'API Timeout',
        description: 'API requests timed out during translation',
        severity: 'error',
      });
    }

    // Check for connection issues
    if (
      data.message.logs.includes('connection') &&
      data.message.logs.includes('fail')
    ) {
      issues.push({
        type: 'Connection',
        description: 'Network connection issues occurred during translation',
        severity: 'error',
      });
    }

    return issues;
  }, [data?.message?.logs, jsonParsingIssues]);

  // Download logs as a file
  const handleDownloadLogs = () => {
    if (!data?.message?.logs) return;

    const blob = new Blob([data.message.logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation_logs.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (logFilePath) {
      mutate();
    }
  }, [logFilePath, mutate]);

  if (!logFilePath) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium">No Logs Available</h3>
        <p className="text-gray-500 max-w-md mt-2">
          Translation logs will appear here after you run the AI translation
          process.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading logs</AlertTitle>
        <AlertDescription>
          {error.message ||
            'An unknown error occurred while loading the log file.'}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data?.message?.logs) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No log content</AlertTitle>
        <AlertDescription>
          The log file exists but contains no content. This might indicate an
          issue with the translation process.
        </AlertDescription>
      </Alert>
    );
  }

  const logContentTruncated =
    data.message.logs.length > 10000
      ? `${data.message.logs.substring(0, 10000)}... [log truncated, download for full content]`
      : data.message.logs;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Translation Logs</h2>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadLogs}>
            <Download className="h-4 w-4 mr-2" />
            Download Full Logs
          </Button>

          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        onValueChange={(value) => setActiveTab(value as any)}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="raw">Raw Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  Overview of translation log analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">API Calls:</dt>
                    <dd>{data.message.analysis.api_calls || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">
                      API Responses:
                    </dt>
                    <dd>{data.message.analysis.api_responses || 0}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Errors:</dt>
                    <dd className="text-red-600">
                      {data.message.analysis.errors?.length || 0}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-gray-500">Log Size:</dt>
                    <dd>{Math.round(data.message.logs.length / 1024)} KB</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detected Issues</CardTitle>
                <CardDescription>
                  Common problems identified in logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {commonIssues.length > 0 ? (
                  <ul className="space-y-2">
                    {commonIssues.map((issue) => (
                      <li key={issue.type} className="flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className={
                            issue.severity === 'error'
                              ? 'bg-red-100 text-red-800 hover:bg-red-100'
                              : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                          }
                        >
                          {issue.type}
                        </Badge>
                        <span className="text-sm">{issue.description}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No common issues detected in the logs.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {jsonParsingIssues.length > 0 && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>JSON Parsing Issues</CardTitle>
                <CardDescription>
                  Problems encountered parsing AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {jsonParsingIssues.map((issue) => (
                    <li
                      key={issue}
                      className="text-sm bg-gray-50 p-2 rounded font-mono"
                    >
                      {issue}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>API Response Analysis</CardTitle>
              <CardDescription>
                Patterns detected in AI model responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responsePatterns.length > 0 ? (
                <div className="space-y-2">
                  {responsePatterns.slice(0, 5).map((pattern) => (
                    <div
                      key={pattern.content}
                      className="p-2 bg-gray-50 rounded"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            Format: {pattern.format}
                          </Badge>
                          {pattern.hasError && (
                            <Badge
                              variant="outline"
                              className="bg-red-100 text-red-800 hover:bg-red-100"
                            >
                              Has Error
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-mono whitespace-pre-wrap overflow-auto max-h-24">
                        {pattern.content.length > 300
                          ? `${pattern.content.substring(0, 300)}...`
                          : pattern.content}
                      </div>
                    </div>
                  ))}

                  {responsePatterns.length > 5 && (
                    <p className="text-sm text-center text-gray-500 mt-2">
                      {responsePatterns.length - 5} more responses not shown
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No API responses detected in the logs.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw">
          <Card>
            <CardHeader>
              <CardTitle>Raw Log Content</CardTitle>
              <CardDescription>
                Complete output from the translation process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[60vh]">
                {logContentTruncated}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LogViewer;
