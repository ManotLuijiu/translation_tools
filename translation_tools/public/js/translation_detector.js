/**
 * Translation Detection Utility
 *
 * Auto-detects hardcoded strings and missing translations in SPAs
 * Part of Translation Tools app by ManotLuijiu
 *
 * Usage:
 *   import { enableAutoDetection } from '/assets/translation_tools/js/translation_detector.js';
 *   enableAutoDetection(); // In development mode only
 */

(function() {
	'use strict';

	/**
	 * Detects hardcoded English text in the DOM
	 */
	function detectHardcodedStrings() {
		const hardcoded = [];
		const skipElements = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE']);

		// English text pattern (3+ consecutive English words)
		const englishPattern = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){2,}\b/g;

		function walk(node, path) {
			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent?.trim();
				if (!text) return;

				const matches = text.match(englishPattern);
				if (matches) {
					matches.forEach(match => {
						hardcoded.push({
							text: match,
							element: node.parentElement,
							location: path
						});
					});
				}
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				if (skipElements.has(node.tagName)) return;

				const childPath = `${path} > ${node.tagName.toLowerCase()}${
					node.id ? `#${node.id}` : ''
				}${node.className ? `.${node.className.split(' ')[0]}` : ''}`;

				node.childNodes.forEach(child => walk(child, childPath));
			}
		}

		walk(document.body, 'body');
		return hardcoded;
	}

	/**
	 * Checks if translation exists in Frappe boot messages
	 */
	function checkTranslationExists(key) {
		const messages = window?.frappe?.boot?.__messages || {};
		return key in messages;
	}

	/**
	 * Scans for common untranslated strings
	 */
	function scanForMissingTranslations() {
		const missing = [];
		const messages = window?.frappe?.boot?.__messages || {};

		// Common strings that should be translated
		const commonKeys = [
			'Loading...', 'Please wait...', 'Error occurred',
			'Submit', 'Cancel', 'Save', 'Delete', 'Edit',
			'Success', 'Failed', 'Warning', 'Information',
			'Yes', 'No', 'OK', 'Close', 'Next', 'Previous',
			'Search', 'Filter', 'Clear', 'Reset', 'Apply',
			'Upload', 'Download', 'Export', 'Import', 'Print'
		];

		commonKeys.forEach(key => {
			if (!messages[key]) {
				missing.push(key);
			}
		});

		return missing;
	}

	/**
	 * Main detection function - runs all checks
	 */
	function detectUntranslatedStrings() {
		const hardcodedStrings = detectHardcodedStrings();
		const missingTranslations = scanForMissingTranslations();

		const totalStrings = hardcodedStrings.length +
			Object.keys(window?.frappe?.boot?.__messages || {}).length;

		const translatedCount = Object.keys(window?.frappe?.boot?.__messages || {}).length;

		return {
			hardcodedStrings,
			missingTranslations,
			summary: {
				totalHardcoded: hardcodedStrings.length,
				totalMissing: missingTranslations.length,
				coverage: totalStrings > 0
					? Math.round((translatedCount / totalStrings) * 100)
					: 0
			}
		};
	}

	/**
	 * Logs detection results to console with formatting
	 */
	function reportDetectionResults(results) {
		const data = results || detectUntranslatedStrings();

		console.group('🔍 Translation Detection Report');

		console.log(`📊 Summary:`);
		console.log(`  - Hardcoded strings found: ${data.summary.totalHardcoded}`);
		console.log(`  - Missing translations: ${data.summary.totalMissing}`);
		console.log(`  - Coverage: ${data.summary.coverage}%`);

		if (data.hardcodedStrings.length > 0) {
			console.group(`⚠️ Hardcoded Strings (${data.hardcodedStrings.length})`);
			data.hardcodedStrings.forEach(({ text, location }) => {
				console.log(`  "${text}" at ${location}`);
			});
			console.groupEnd();
		}

		if (data.missingTranslations.length > 0) {
			console.group(`❌ Missing Translations (${data.missingTranslations.length})`);
			data.missingTranslations.forEach(key => {
				console.log(`  - ${key}`);
			});
			console.groupEnd();
		}

		console.groupEnd();

		return data;
	}

	/**
	 * Enable auto-detection in development mode
	 */
	function enableAutoDetection() {
		// Only run in development (check for common dev indicators)
		const isDev = window.location.hostname === 'localhost' ||
					  window.location.hostname.includes('127.0.0.1') ||
					  window.location.port === '8080';

		if (!isDev) {
			console.log('🔍 Translation auto-detection disabled (production mode)');
			return;
		}

		// Run detection after DOM is ready
		window.addEventListener('load', () => {
			setTimeout(() => {
				const results = reportDetectionResults();

				// Expose to window for easy console access
				window.__translationReport = results;

				console.log('💡 Access full report via: window.__translationReport');
			}, 1000);
		});
	}

	// Export functions
	window.TranslationDetector = {
		detectHardcodedStrings,
		checkTranslationExists,
		scanForMissingTranslations,
		detectUntranslatedStrings,
		reportDetectionResults,
		enableAutoDetection
	};

	// Auto-enable if development mode and auto-detect is enabled
	if (window.frappe?.boot?.translation_auto_detect) {
		enableAutoDetection();
	}

})();
