/**
 * Translation Plugin for Translation Tools SPA
 *
 * Provides translation functionality for Vue 3 components with support for:
 * - Loading translations from Frappe boot context
 * - Fallback API loading if boot context unavailable
 * - String interpolation with {0}, {1} or {key} syntax
 * - Context-based translations
 */

function makeTranslationFunction() {
	let messages = {};

	return {
		translate,
		load: () => setup(),
	}

	async function setup() {
		// First try boot context (injected by server)
		if (window.frappe?.boot?.__messages) {
			messages = window.frappe?.boot?.__messages;
			console.log('✓ Translations loaded from boot context');
			return;
		}

		// Fallback: fetch from translation_tools API
		const lang = window.frappe?.boot?.lang || navigator.language?.split('-')[0] || 'en';
		const url = new URL("/api/method/translation_tools.api.get_translation.get_translations_by_lang", location.origin);
		url.searchParams.append('lang', lang);

		try {
			const response = await fetch(url);
			const data = await response.json();
			messages = data.message || {};
			console.log('✓ Translations loaded from API');
		} catch (error) {
			console.error('✗ Failed to fetch translations:', error);
			// Continue with empty messages - app will show English fallback
		}
	}

	function translate(txt, replace, context = null) {
		if (!txt || typeof txt != "string") return txt;

		let translated_text = "";
		let key = txt;

		// Try context-specific translation first
		if (context) {
			translated_text = messages[`${key}:${context}`];
		}

		// Fall back to general translation
		if (!translated_text) {
			translated_text = messages[key] || txt;
		}

		// Apply string interpolation if replacement values provided
		if (replace && typeof replace === "object") {
			translated_text = format(translated_text, replace);
		}

		return translated_text;
	}

	function format(str, args) {
		if (str == undefined) return str;

		let unkeyed_index = 0;
		return str.replace(/\{(\w*)\}/g, (match, key) => {
			if (key === "") {
				key = unkeyed_index;
				unkeyed_index++;
			}
			if (key == +key) {
				return args[key] !== undefined ? args[key] : match;
			}
			return args[key] !== undefined ? args[key] : match;
		});
	}
}

const { translate, load } = makeTranslationFunction();

/**
 * Vue 3 Plugin for translations
 *
 * Usage in components:
 * - Template: {{ __("Hello World") }}
 * - Script: const __ = inject('$translate')
 * - Interpolation: __("Hello {0}", ["World"])
 * - Context: __("Date", null, "toolbar")
 */
export const translationsPlugin = {
	async isReady() {
		await load();
	},
	install(app, options) {
		const __ = translate;

		// Make available as global property
		app.config.globalProperties.__ = __;

		// Make available via provide/inject
		app.provide("$translate", __);
	},
}
