import click
import frappe
from frappe.commands import pass_context, get_site


@click.command("gen-po")
@click.option("--site", help="Site name (default: current site)")
@click.option("--app", help="Specific app name (optional, runs for all custom apps if not specified)")
@click.option("--skip-csv", is_flag=True, help="Skip CSV file generation (only generate PO files)")
@pass_context
def gen_po(context, site=None, app=None, skip_csv=False):
    """
    Complete translation workflow: CSV + POT + PO + MO files.

    This command performs the full translation setup:
    1. Rebuild CSV files (SPA support, ASEAN filtering)
    2. Generate POT template files
    3. Migrate CSV to PO format
    4. Update PO files with new strings
    5. Compile PO to MO for runtime

    Examples:
        bench gen-po --site moo.localhost
        bench gen-po --site moo.localhost --app m_capital
        bench --site moo.localhost gen-po
        bench gen-po --site moo.localhost --skip-csv  # Only PO/MO generation
    """
    # Get site from context or parameter
    if not site:
        site = get_site(context)

    # Initialize Frappe
    frappe.init(site=site)
    frappe.connect()

    try:
        # Step 1: Rebuild CSV files (unless --skip-csv flag is used)
        if not skip_csv:
            print("\n📄 Step 1/2: Rebuilding CSV translation files...\n")

            # Ensure translation override is installed (SPA support + ASEAN filtering)
            from translation_tools.overrides import setup_translation_override
            setup_translation_override()

            # Rebuild CSV files
            from frappe.translate import rebuild_all_translation_files
            rebuild_all_translation_files()

            print("✅ CSV files updated successfully (ASEAN languages)")
            print("   📁 Location: apps/*/translations/*.csv\n")
        else:
            print("\n⏭️  Skipping CSV generation (--skip-csv flag)\n")

        # Step 2: Generate PO/MO files
        print(f"📦 Step 2/2: Generating PO/MO files...\n")

        if app:
            # Single app mode
            from translation_tools.utils.migration_translations import (
                run_translation_commands_for_single_app,
                _app_exists
            )

            if not _app_exists(app):
                frappe.throw(f"App '{app}' not found in this bench")

            print(f"\n🌍 Running translation setup for app: {app}...\n")

            # Run for all ASEAN locales
            asean_locales = ["th", "vi", "lo", "km", "my"]
            for locale in asean_locales:
                print(f"  Processing locale: {locale}")
                run_translation_commands_for_single_app(app, locale)

            print(f"\n✅ Translation workflow complete for app: {app}")
            print(f"   📁 CSV: apps/{app}/translations/*.csv")
            print(f"   📁 PO:  apps/{app}/{app}/locale/*.po")
            print(f"   📁 MO:  sites/assets/locale/*/LC_MESSAGES/{app}.mo\n")
        else:
            # All custom apps mode
            from translation_tools.utils.migration_translations import (
                run_full_translation_setup,
                get_custom_apps_for_translation
            )

            custom_apps = get_custom_apps_for_translation()
            print(f"   Running for {len(custom_apps)} custom apps: {', '.join(custom_apps)}\n")

            run_full_translation_setup()

            print("\n✅ Complete translation workflow finished!")
            print("   📁 CSV: apps/*/translations/*.csv")
            print("   📁 PO:  apps/*/locale/*.po")
            print("   📁 MO:  sites/assets/locale/*/LC_MESSAGES/*.mo")
            print("   🌏 Languages: th, vi, lo, km, my, en\n")

    except Exception as e:
        print(f"\n❌ Error: {str(e)}\n")
        raise
    finally:
        frappe.destroy()


commands = [gen_po]
