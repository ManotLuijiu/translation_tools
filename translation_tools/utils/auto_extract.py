"""
Automatic Translation Extraction for All Custom Apps

This module provides automatic extraction of translatable strings from SPA
React/TypeScript files during build and migration processes.

The extraction dynamically finds all SPA folders across all custom apps
by scanning for directories with src/ subdirectory pattern.
"""

import frappe


def auto_extract_all_custom_apps():
	"""
	Automatically extract SPA translations for ALL custom apps across ALL ASEAN languages.

	This function is triggered globally by bench build/migrate and:
	1. Detects all custom apps (from ManotLuijiu GitHub)
	2. Dynamically finds all SPA folders (any folder with src/ subdirectory)
	3. Extracts __("...") wrapped strings from .tsx/.jsx files
	4. Creates CSV files for ALL ASEAN languages (th, vi, lo, km, my, en)
	5. Leaves empty translation fields for manual translation

	Examples of folders that will be scanned:
	- m_capital/frontend/src/
	- m_capital/dashboard/src/
	- translation_tools/thai_translation_dashboard/src/
	- Any other custom app's SPA folders (dashboard/, admin/, etc.)
	"""
	try:
		from translation_tools.overrides.translate import write_translations_file, is_custom_app, ASEAN_LOCALES

		# Get all installed apps
		all_apps = frappe.get_all_apps()

		# Filter to custom apps only (from ManotLuijiu GitHub)
		custom_apps = [app for app in all_apps if is_custom_app(app)]

		if not custom_apps:
			print("ℹ️  No custom apps found for translation extraction")
			return

		# Supported locales only (exclude en-US, en-GB - Babel doesn't accept hyphens)
		SUPPORTED_LOCALES = ["th", "vi", "lo", "km", "my", "en"]

		print(f"\n🌏 Auto-extracting translations for {len(custom_apps)} custom app(s) × {len(SUPPORTED_LOCALES)} language(s)...")
		print(f"   Apps: {', '.join(custom_apps)}")
		print(f"   Languages: {', '.join(SUPPORTED_LOCALES)}")

		# Extract translations for each custom app across ALL languages
		total_extracted = 0
		for app in custom_apps:
			app_extracted = 0
			for locale in SUPPORTED_LOCALES:
				try:
					write_translations_file(app, locale)
					app_extracted += 1
					total_extracted += 1
				except Exception as e:
					# Log error but continue with other languages
					frappe.log_error(str(e), f"Translation Extraction Failed - {app} ({locale})")

			if app_extracted > 0:
				print(f"   ✅ {app}: Extracted {app_extracted} language(s) → apps/{app}/{app}/translations/")

		if total_extracted > 0:
			print(f"\n✅ Completed! Extracted {total_extracted} CSV file(s) for {len(custom_apps)} app(s)")
			print("   All SPA folders with src/ subdirectory were scanned automatically")
		else:
			print("\n⚠️  No translations were extracted. Check error logs above.")

	except ImportError as e:
		# translation_tools overrides not loaded yet
		print(f"⏳ Translation tools overrides not loaded: {e}")

	except Exception as e:
		# Log error but don't fail the process
		frappe.log_error(str(e), "Auto Translation Extraction Failed")
		print(f"❌ Auto-extraction error: {e}")
