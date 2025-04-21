import { useState, useCallback } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import type { TranslationRequest, TranslationResult } from '../types'

/**
 * Custom hook for handling translations
 */
export const useTranslation = () => {
	const [isTranslating, setIsTranslating] = useState(false)
	const [lastResult, setLastResult] = useState<TranslationResult | null>(null)

	const { loading, error, call } = useFrappePostCall<TranslationResult>(
		'translation_tools.api.translation.translate_single_entry',
	)

	const translate = useCallback(
		async (request: TranslationRequest) => {
			setIsTranslating(true)

			try {
				const result = await call({
					file_path: request.filePath,
					entry_id: request.entryId,
					model_provider: request.modelProvider || 'openai',
					model: request.model,
				})

				setLastResult(result)
				return result
			} catch (err) {
				console.error('Translation error:', err)
				throw err
			} finally {
				setIsTranslating(false)
			}
		},
		[call],
	)

	return {
		translate,
		isTranslating: isTranslating || loading,
		lastResult,
		error,
	}
}

export const useFrappeTranslation = () => {
	// Check if we're in a Frappe environment with __ function available
	const isFrappe = (text: string): string => {
		if (window.__ && typeof window.__ === 'function') {
			return window.__(text)
		}
		return text // Fallback to the original text if __ is not available
	}
	console.log('isFrappe', isFrappe)

	return { __: isFrappe }
}
