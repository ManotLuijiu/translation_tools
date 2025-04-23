/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import {
    useGetPOFileEntries,
    useTranslateSingleEntry,
    useSaveTranslation,
} from '../api'
import type { POFile, TranslationSettings } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import TranslationStats from './TranslationStats'

interface TranslationEditorProps {
    selectedFile: POFile | null
    settings: TranslationSettings | null
}

export default function TranslationEditor({
    selectedFile,
    settings,
}: TranslationEditorProps) {
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
    const [entryFilter, setEntryFilter] = useState<
        'all' | 'untranslated' | 'translated'
    >('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [editedTranslation, setEditedTranslation] = useState('')
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'error' | 'info'
        message: string
    } | null>(null)

    const { data, error, isLoading, mutate } = useGetPOFileEntries(
        selectedFile?.file_path || null
    )

    console.log('selectedFile_translationEditor', selectedFile)

    const translateEntry = useTranslateSingleEntry()
    const saveTranslation = useSaveTranslation()

    // Reset selected entry when file changes
    useEffect(() => {
        setSelectedEntryId(null)
        setEditedTranslation('')
        setStatusMessage(null)
    }, [])

    // Update edited translation when selected entry changes
    useEffect(() => {
        if (!data?.message?.entries || !selectedEntryId) return

        const entry = data.message.entries.find((e) => e.id === selectedEntryId)
        if (entry) {
            setEditedTranslation(entry.msgstr || '')
        }
    }, [selectedEntryId, data])

    if (!selectedFile) {
        return (
            <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                <div className="space-y-4 text-center">
                    <p className="text-muted-foreground">
                        Please select a PO file to start translation
                    </p>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <span className="ml-2">Loading file contents...</span>
            </div>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to load file: {error.message || 'Unknown error'}
                </AlertDescription>
            </Alert>
        )
    }

    const fileData = data?.message
    if (!fileData) {
        return (
            <div className="p-8 text-center">
                <p>No data available for this file</p>
            </div>
        )
    }

    const { entries, stats, metadata } = fileData
    console.log('metadata', metadata)

    // Filter entries based on user selection
    const filteredEntries = entries.filter((entry) => {
        // First filter by translation status
        if (entryFilter === 'untranslated' && entry.is_translated) return false
        if (entryFilter === 'translated' && !entry.is_translated) return false

        // Then filter by search term
        if (!searchTerm) return true

        const term = searchTerm.toLowerCase()
        return (
            entry.msgid.toLowerCase().includes(term) ||
            entry.msgstr.toLowerCase().includes(term)
        )
    })

    const selectedEntry = selectedEntryId
        ? entries.find((e) => e.id === selectedEntryId)
        : null

    const handleTranslate = async () => {
        if (!selectedEntry || !selectedFile.file_path) return

        setStatusMessage({ type: 'info', message: 'Translating...' })

        try {
            const result = await translateEntry.call({
                file_path: selectedFile.file_path,
                entry_id: selectedEntry.id,
                model_provider: settings?.default_model_provider || 'openai',
                model: settings?.default_model || undefined,
            })

            if (result.success && result.translation) {
                setEditedTranslation(result.translation)
                setStatusMessage({
                    type: 'success',
                    message: 'Translation completed',
                })

                // If auto-save is enabled, also save the translation
                if (settings?.auto_save) {
                    await handleSave()
                }
            } else {
                setStatusMessage({
                    type: 'error',
                    message: result.error || 'Translation failed',
                })
            }
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'An error occurred during translation'
            setStatusMessage({
                type: 'error',
                message: errorMessage,
            })
        }
    }

    const handleSave = async () => {
        if (!selectedEntry || !selectedFile.file_path) return

        setStatusMessage({ type: 'info', message: 'Saving...' })

        try {
            const result = await saveTranslation.call({
                file_path: selectedFile.file_path,
                entry_id: selectedEntry.id,
                translation: editedTranslation,
            })

            if (result.success) {
                setStatusMessage({
                    type: 'success',
                    message: 'Translation saved',
                })

                // Refresh file data to update translation stats
                mutate()
            } else {
                setStatusMessage({
                    type: 'error',
                    message: 'Failed to save translation',
                })
            }
        } catch (err: unknown) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : 'An error occurred while saving'
            setStatusMessage({
                type: 'error',
                message: errorMessage,
            })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">
                        {selectedFile.filename}
                    </h2>
                    <p className="text-muted-foreground">
                        app: {selectedFile.app}
                    </p>
                </div>

                <TranslationStats stats={stats} />
            </div>

            <div className="flex space-x-4">
                <div className="w-1/3 rounded-lg border">
                    <div className="border-b p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-medium">Entries</h3>
                            <Select
                                value={entryFilter}
                                onValueChange={(
                                    value: 'all' | 'untranslated' | 'translated'
                                ) => setEntryFilter(value)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter entries" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All entries
                                    </SelectItem>
                                    <SelectItem value="untranslated">
                                        Untranslated only
                                    </SelectItem>
                                    <SelectItem value="translated">
                                        Translated only
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Input
                            placeholder="Search in entries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-2"
                        />
                    </div>

                    <div className="h-[calc(100vh-400px)] overflow-y-auto">
                        {filteredEntries.length === 0 ? (
                            <div className="text-muted-foreground p-4 text-center">
                                No entries match your filter
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {filteredEntries.map((entry) => (
                                    <li key={entry.id}>
                                        <button
                                            type="button"
                                            className={`hover:bg-muted/50 w-full p-3 text-left transition-colors ${
                                                selectedEntryId === entry.id
                                                    ? 'bg-muted'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                setSelectedEntryId(entry.id)
                                            }
                                        >
                                            <div className="mb-1 flex items-center justify-between">
                                                <Badge
                                                    variant={
                                                        entry.is_translated
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                >
                                                    {entry.is_translated
                                                        ? 'Translated'
                                                        : 'Untranslated'}
                                                </Badge>
                                            </div>
                                            <p className="truncate text-sm">
                                                {entry.msgid}
                                            </p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="w-2/3">
                    {selectedEntry ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Translation</CardTitle>
                                <CardDescription>
                                    {selectedEntry.context && (
                                        <Badge
                                            variant="outline"
                                            className="mb-1"
                                        >
                                            Context: {selectedEntry.context}
                                        </Badge>
                                    )}
                                    {selectedEntry.comments &&
                                        selectedEntry.comments.length > 0 && (
                                            <div className="text-muted-foreground mt-2 text-xs">
                                                {selectedEntry.comments.map(
                                                    (comment) => (
                                                        <p key={comment}>
                                                            {comment}
                                                        </p>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <label
                                            htmlFor="source-english"
                                            className="mb-1 block text-sm font-medium"
                                        >
                                            Source (English)
                                        </label>
                                        <div
                                            id="source-english"
                                            className="bg-muted whitespace-pre-wrap rounded-md p-3"
                                        >
                                            {selectedEntry.msgid}
                                        </div>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="translation-thai"
                                            className="mb-1 block text-sm font-medium"
                                        >
                                            Translation (Thai)
                                        </label>
                                        <Textarea
                                            id="translation-thai"
                                            rows={5}
                                            value={editedTranslation}
                                            onChange={(e) =>
                                                setEditedTranslation(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter translation here..."
                                            className="min-h-32 resize-y"
                                        />
                                    </div>

                                    {statusMessage && (
                                        <Alert
                                            variant={
                                                statusMessage.type === 'error'
                                                    ? 'destructive'
                                                    : 'default'
                                            }
                                        >
                                            {statusMessage.type ===
                                                'success' && (
                                                <Check className="h-4 w-4" />
                                            )}
                                            {statusMessage.type === 'error' && (
                                                <AlertCircle className="h-4 w-4" />
                                            )}
                                            {statusMessage.type === 'info' && (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                            <AlertTitle>
                                                {statusMessage.type ===
                                                'success'
                                                    ? 'Success'
                                                    : statusMessage.type ===
                                                        'error'
                                                      ? 'Error'
                                                      : 'Info'}
                                            </AlertTitle>
                                            <AlertDescription>
                                                {statusMessage.message}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between">
                                <div className="flex space-x-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => {
                                            const entry = entries.find(
                                                (e) => e.id === selectedEntryId
                                            )
                                            if (entry)
                                                setEditedTranslation(
                                                    entry.msgstr
                                                )
                                            setStatusMessage(null)
                                        }}
                                    >
                                        Reset
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            // Find next untranslated entry
                                            const untranslatedEntries =
                                                entries.filter(
                                                    (e) => !e.is_translated
                                                )
                                            if (
                                                untranslatedEntries.length > 0
                                            ) {
                                                setSelectedEntryId(
                                                    untranslatedEntries[0].id
                                                )
                                            }
                                        }}
                                    >
                                        Next Untranslated
                                    </Button>
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleTranslate}
                                        disabled={translateEntry.loading}
                                    >
                                        {translateEntry.loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Translating...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Translate
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={saveTranslation.loading}
                                    >
                                        {saveTranslation.loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded-lg border p-8">
                            <p className="text-muted-foreground">
                                Select an entry to start translating
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
