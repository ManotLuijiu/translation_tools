import { useState, useEffect } from 'react';
import {
  useGetInstalledApps,
  useGeneratePOTFilesBatch,
  useGetPOTGenerationProgress,
  extractFrappeData,
  type FrappeApp,
  type POTGenerationProgress
} from '../api/potGeneration';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileText, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from '@/context/TranslationContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface POTGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (success: boolean, message?: string) => void;
}

export default function POTGenerationDialog({
  isOpen,
  onClose,
  onComplete,
}: POTGenerationDialogProps) {
  const { translate: __ } = useTranslation();
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<'select' | 'progress' | 'complete'>('select');

  // API hooks
  const { data: appsData, isLoading: appsLoading } = useGetInstalledApps();
  const generatePOTBatch = useGeneratePOTFilesBatch();
  const { data: progressData, isLoading: progressLoading } = useGetPOTGenerationProgress(currentJobId);

  const apps = extractFrappeData(appsData)?.apps || [];
  const progress = extractFrappeData(progressData)?.progress;

  // Auto-select common apps by default
  useEffect(() => {
    if (apps.length > 0 && selectedApps.length === 0) {
      const commonApps = apps.filter(app => 
        ['erpnext', 'hrms', 'translation_tools'].includes(app.name)
      ).map(app => app.name);
      setSelectedApps(commonApps);
    }
  }, [apps, selectedApps.length]);

  // Handle progress completion
  useEffect(() => {
    if (progress?.status === 'completed') {
      setGenerationStep('complete');
      setIsGenerating(false);
      
      const successful = progress.results?.filter(r => r.success).length || 0;
      const total = progress.total;
      
      if (onComplete) {
        onComplete(
          successful > 0,
          successful === total
            ? `Successfully generated POT files for all ${total} apps`
            : `Generated POT files for ${successful} out of ${total} apps`
        );
      }
    } else if (progress?.status === 'error') {
      setGenerationStep('complete');
      setIsGenerating(false);
      
      if (onComplete) {
        onComplete(false, progress.error || 'POT generation failed');
      }
    }
  }, [progress, onComplete]);

  const handleAppToggle = (appName: string, checked: boolean) => {
    if (checked) {
      setSelectedApps(prev => [...prev, appName]);
    } else {
      setSelectedApps(prev => prev.filter(name => name !== appName));
    }
  };

  const handleSelectAll = () => {
    setSelectedApps(apps.map(app => app.name));
  };

  const handleSelectNone = () => {
    setSelectedApps([]);
  };

  const handleStartGeneration = async () => {
    if (selectedApps.length === 0) return;

    setIsGenerating(true);
    setGenerationStep('progress');

    try {
      const rawResult = await generatePOTBatch.call({
        app_names: selectedApps,
        force_regenerate: forceRegenerate
      });

      const result = extractFrappeData(rawResult);
      if (result?.success && result.job_id) {
        setCurrentJobId(result.job_id);
      } else {
        throw new Error(result?.error || 'Failed to start POT generation');
      }
    } catch (error) {
      console.error('Error starting POT generation:', error);
      setIsGenerating(false);
      setGenerationStep('select');
      
      if (onComplete) {
        onComplete(false, `Failed to start POT generation: ${error}`);
      }
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setGenerationStep('select');
      setSelectedApps([]);
      setCurrentJobId(null);
      setForceRegenerate(false);
      onClose();
    }
  };

  const getAppStatusIcon = (app: FrappeApp) => {
    if (!progress?.results) {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }

    const result = progress.results.find(r => r.app_name === app.name);
    
    if (!result) {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }

    return result.success ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const renderAppSelection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={appsLoading}
          >
            {__('Select All')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectNone}
            disabled={appsLoading}
          >
            {__('Select None')}
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="force-regenerate"
            checked={forceRegenerate}
            onCheckedChange={setForceRegenerate}
          />
          <Label htmlFor="force-regenerate">
            {__('Force Regenerate')}
          </Label>
        </div>
      </div>

      <ScrollArea className="h-[300px] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>{__('App')}</TableHead>
              <TableHead>{__('Current POT')}</TableHead>
              <TableHead>{__('Entries')}</TableHead>
              <TableHead>{__('Last Modified')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appsLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-2">{__('Loading apps...')}</p>
                </TableCell>
              </TableRow>
            ) : (
              apps.map((app) => (
                <TableRow key={app.name}>
                  <TableCell>
                    <Checkbox
                      checked={selectedApps.includes(app.name)}
                      onCheckedChange={(checked) => 
                        handleAppToggle(app.name, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>{app.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={app.has_pot ? 'secondary' : 'outline'}>
                      {app.has_pot ? __('Exists') : __('None')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {app.has_pot ? app.pot_entries.toLocaleString() : '-'}
                  </TableCell>
                  <TableCell>
                    {app.pot_last_modified ? (
                      new Date(app.pot_last_modified).toLocaleDateString()
                    ) : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="text-sm text-gray-600">
        <p>{__('Selected apps: {count}', { count: selectedApps.length })}</p>
        <p className="mt-1">
          {__('Force regenerate will overwrite existing POT files')}
        </p>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold">
          {__('Generating POT Files...')}
        </h3>
        {progress?.current_app && (
          <p className="text-gray-600 mt-2">
            {__('Processing: {app}', { app: progress.current_app })}
          </p>
        )}
      </div>

      {progress && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>
              {__('Progress: {completed} of {total}', {
                completed: progress.completed,
                total: progress.total
              })}
            </span>
            <span>{Math.round(progress.percentage)}%</span>
          </div>
          
          <Progress value={progress.percentage} className="h-3" />
        </div>
      )}

      <ScrollArea className="h-[200px] border rounded-md p-4">
        <div className="space-y-2">
          {apps.filter(app => selectedApps.includes(app.name)).map((app) => (
            <div key={app.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getAppStatusIcon(app)}
                <span className="font-medium">{app.name}</span>
              </div>
              
              {progress?.current_app === app.name && (
                <Badge variant="secondary">
                  {__('Processing...')}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const renderComplete = () => {
    const successful = progress?.results?.filter(r => r.success).length || 0;
    const failed = (progress?.results?.length || 0) - successful;
    const isSuccess = successful > 0 && failed === 0;

    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center">
          {isSuccess ? (
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          ) : (
            <AlertCircle className="h-12 w-12 text-yellow-500" />
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">
            {isSuccess
              ? __('POT Generation Completed Successfully!')
              : __('POT Generation Completed with Issues')
            }
          </h3>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center space-x-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {__('Success: {count}', { count: successful })}
              </Badge>
              {failed > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {__('Failed: {count}', { count: failed })}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {progress?.results && progress.results.length > 0 && (
          <ScrollArea className="h-[150px] border rounded-md p-4 mt-4">
            <div className="space-y-2 text-left">
              {progress.results.map((result, index) => (
                <div key={index} className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <span className="font-medium">{result.app_name}</span>
                      {result.entries_count && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({result.entries_count} entries)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {result.error && (
                    <span className="text-xs text-red-600 max-w-xs truncate">
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {generationStep === 'select' && __('Generate POT Files')}
            {generationStep === 'progress' && __('Generating POT Files')}
            {generationStep === 'complete' && __('Generation Complete')}
          </DialogTitle>
          <DialogDescription>
            {generationStep === 'select' && 
              __('Select apps to generate POT (Portable Object Template) files for translation.')
            }
            {generationStep === 'progress' && 
              __('Please wait while POT files are being generated...')
            }
            {generationStep === 'complete' && 
              __('POT file generation has completed. Check the results below.')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto">
          {generationStep === 'select' && renderAppSelection()}
          {generationStep === 'progress' && renderProgress()}
          {generationStep === 'complete' && renderComplete()}
        </div>

        <DialogFooter>
          {generationStep === 'select' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {__('Cancel')}
              </Button>
              <Button
                onClick={handleStartGeneration}
                disabled={selectedApps.length === 0 || generatePOTBatch.loading}
              >
                {generatePOTBatch.loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {__('Starting...')}
                  </>
                ) : (
                  __('Generate POT Files')
                )}
              </Button>
            </>
          )}
          
          {generationStep === 'progress' && (
            <Button variant="outline" onClick={handleClose} disabled>
              {__('Please wait...')}
            </Button>
          )}
          
          {generationStep === 'complete' && (
            <Button onClick={handleClose}>
              {__('Close')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}