"""
Custom bench command for CSV to PO migration with SPA support.

Usage:
    bench migrate-csv-to-po-spa --app m_capital --locale th
    bench migrate-csv-to-po-spa --all-apps
    bench migrate-csv-to-po-spa --all-apps --site m-capital-v16.bunchee.online
"""

import click
import frappe
from frappe.commands import pass_context, get_site


@click.command('migrate-csv-to-po-spa')
@click.option('--app', help='Migrate for specific app')
@click.option('--locale', default='th', help='Locale to migrate (default: th)')
@click.option('--all-apps', is_flag=True, help='Migrate all custom apps')
@click.option('--site', 'target_site', help='Site name for app discovery')
@pass_context
def migrate_csv_to_po_spa(context, app=None, locale='th', all_apps=False, target_site=None):
	"""
	Migrate CSV translations to PO format with SPA support.

	This command includes SPA strings that are not in POT template.
	Unlike standard migrate-csv-to-po, it adds ALL CSV messages to PO.
	"""
	from translation_tools.utils.csv_to_po_with_spa import (
		migrate_csv_to_po_with_spa,
		migrate_all_custom_apps
	)

	# Initialize Frappe with site context
	site = target_site or get_site(context) or (context.sites[0] if context.sites else None)
	if site:
		frappe.init(site=site)
		frappe.connect()

	if all_apps:
		migrate_all_custom_apps(site=site)
	elif app:
		migrate_csv_to_po_with_spa(app, locale)
	else:
		click.echo("❌ Please specify --app or --all-apps")
		click.echo("\nExamples:")
		click.echo("  bench migrate-csv-to-po-spa --app m_capital --locale th")
		click.echo("  bench migrate-csv-to-po-spa --all-apps")


commands = [migrate_csv_to_po_spa]