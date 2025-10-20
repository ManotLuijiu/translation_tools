"""
Custom CSV to PO Migration with SPA Support

This module provides enhanced CSV-to-PO migration that includes SPA strings
which are not in the POT template (since Babel only extracts from Python files).

The standard migrate-csv-to-po command skips messages not in POT.
This custom version adds ALL CSV messages to PO file.
"""

import csv
import frappe
from pathlib import Path
from babel.messages.catalog import Catalog, Message


def migrate_csv_to_po_with_spa(app: str, locale: str, silent: bool = False):
	"""
	Migrate CSV translations to PO format, INCLUDING SPA strings not in POT.

	Unlike Frappe's standard migrate-csv-to-po which skips messages not in POT,
	this function:
	1. Reads ALL messages from CSV (Python + SPA strings)
	2. Adds them to PO file even if not in POT template
	3. Preserves existing PO translations for Python messages
	4. Adds new entries for SPA messages

	Args:
		app: App name (e.g., 'm_capital')
		locale: Locale code (e.g., 'th')
		silent: If True, suppress output for automatic execution
	"""
	from babel.messages.pofile import read_po, write_po

	# File paths
	app_path = Path(frappe.get_app_path(app))
	csv_file = app_path / "translations" / f"{locale}.csv"
	po_dir = app_path / "locale"
	po_file = po_dir / f"{locale}.po"
	pot_file = po_dir / "main.pot"

	# Validation
	if not csv_file.exists():
		if not silent:
			print(f"❌ CSV file not found: {csv_file}")
		return

	# Create PO directory if needed
	po_dir.mkdir(parents=True, exist_ok=True)

	# Read existing PO file or create new catalog
	if po_file.exists():
		if not silent:
			print(f"📖 Reading existing PO file: {po_file}")
		with open(po_file, 'rb') as f:
			catalog = read_po(f, locale=locale)
	else:
		if not silent:
			print(f"📝 Creating new PO catalog for locale: {locale}")
		catalog = Catalog(
			locale=locale,
			project=app,
			version='VERSION',
			copyright_holder=frappe.get_hooks('app_publisher', app_name=app)[0] if frappe.get_hooks('app_publisher', app_name=app) else 'Unknown',
		)

	# Read CSV and add ALL messages to catalog
	if not silent:
		print(f"📥 Reading CSV file: {csv_file}")
	added_count = 0
	updated_count = 0
	skipped_count = 0

	with open(csv_file, 'r', encoding='utf-8') as f:
		reader = csv.reader(f)

		for row in reader:
			if len(row) < 2:
				continue

			msgid = row[0].strip()
			msgstr = row[1].strip()
			# CRITICAL FIX: Normalize empty strings to None to prevent duplicates
			# Empty string context != None context in Babel catalog
			msgctxt = row[2].strip() if len(row) >= 3 and row[2].strip() else None

			if not msgid:
				continue

			# Check if message exists in catalog
			existing = catalog.get(msgid, msgctxt)

			if existing:
				# Update existing message
				if msgstr and existing.string != msgstr:
					existing.string = msgstr
					updated_count += 1
				else:
					skipped_count += 1
			else:
				# Add new message (SPA strings not in POT)
				catalog.add(
					msgid,
					string=msgstr,
					context=msgctxt,
					locations=[('SPA', 0)],  # Mark as SPA-extracted
					auto_comments=['Extracted from SPA (React/TypeScript) files']
				)
				added_count += 1

	# Write updated PO file
	if not silent:
		print(f"💾 Writing PO file: {po_file}")
	with open(po_file, 'wb') as f:
		write_po(f, catalog, sort_output=True, ignore_obsolete=True, width=None)

	# Summary
	if not silent:
		print(f"\n✅ Migration complete!")
		print(f"   📊 Statistics:")
		print(f"      - Added: {added_count} new messages (SPA strings)")
		print(f"      - Updated: {updated_count} existing messages")
		print(f"      - Skipped: {skipped_count} unchanged messages")
		print(f"   📁 Output: {po_file}")
		print(f"\n💡 Next step: Run compile-po-to-mo to generate .mo files")

	return added_count, updated_count, skipped_count


def migrate_all_custom_apps(languages=None):
	"""
	Migrate CSV to PO for all custom apps with SPA support.

	This is a convenience function that runs migration for all custom apps
	across all ASEAN languages.

	Args:
		languages: List of language codes to migrate. If None, migrates all ASEAN languages.
	"""
	from translation_tools.overrides.translate import is_custom_app, ASEAN_LOCALES

	# Get all installed apps
	all_apps = frappe.get_all_apps()

	# Filter to custom apps
	custom_apps = [app for app in all_apps if is_custom_app(app)]

	if not custom_apps:
		print("ℹ️  No custom apps found")
		return

	# Use provided languages or default to all ASEAN languages
	locales = languages if languages else ASEAN_LOCALES

	print(f"\n🌏 Migrating CSV to PO for {len(custom_apps)} custom app(s) × {len(locales)} language(s)")
	print(f"   Apps: {', '.join(custom_apps)}")
	print(f"   Languages: {', '.join(locales)}\n")

	total_migrated = 0
	total_failed = 0

	# Migrate each app for all languages
	for app in custom_apps:
		print(f"\n{'='*70}")
		print(f"App: {app}")
		print(f"{'='*70}")

		for locale in locales:
			try:
				print(f"\n🔄 Language: {locale}")
				print(f"{'─'*70}")
				migrate_csv_to_po_with_spa(app, locale)
				total_migrated += 1
			except FileNotFoundError:
				print(f"   ⏭️  Skipping {locale} - CSV file not found")
			except Exception as e:
				print(f"   ⚠️  Migration failed for {app} ({locale}): {e}")
				frappe.log_error(str(e), f"CSV to PO Migration Failed - {app} ({locale})")
				total_failed += 1

	print(f"\n{'='*70}")
	print(f"✅ Migration Summary")
	print(f"{'='*70}")
	print(f"   Apps processed: {len(custom_apps)}")
	print(f"   Languages: {len(locales)}")
	print(f"   Successful migrations: {total_migrated}")
	if total_failed > 0:
		print(f"   Failed migrations: {total_failed}")
	print(f"{'='*70}")


def auto_migrate_csv_to_po():
	"""
	Automatic CSV-to-PO migration for install/migrate hooks (silent execution).

	This function runs automatically during bench install/migrate.
	Only migrates supported locales (excludes en-US, en-GB which Babel doesn't support).
	"""
	from translation_tools.overrides.translate import is_custom_app

	# Supported locales only (exclude en-US, en-GB - Babel doesn't accept hyphens)
	SUPPORTED_LOCALES = ["th", "vi", "lo", "km", "my", "en"]

	# Get all installed apps
	all_apps = frappe.get_all_apps()

	# Filter to custom apps
	custom_apps = [app for app in all_apps if is_custom_app(app)]

	if not custom_apps:
		return

	total_added = 0
	total_updated = 0
	successful_migrations = 0

	# Migrate each app for all supported languages (silent mode for clean UX)
	for app in custom_apps:
		for locale in SUPPORTED_LOCALES:
			try:
				added, updated, skipped = migrate_csv_to_po_with_spa(app, locale, silent=True)
				if added > 0 or updated > 0:
					total_added += added
					total_updated += updated
					successful_migrations += 1
			except FileNotFoundError:
				# CSV file doesn't exist for this locale - skip silently
				pass
			except Exception as e:
				# Log error but don't fail the process
				frappe.log_error(str(e), f"Auto CSV-to-PO Migration - {app} ({locale})")

	# Only print summary if there were changes
	if total_added > 0 or total_updated > 0:
		print(f"✅ CSV→PO Migration: +{total_added} new, ~{total_updated} updated across {successful_migrations} locale(s)")
