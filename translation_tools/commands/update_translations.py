import click
import frappe
from frappe.commands import get_site, pass_context


@click.command("update-app-translations")
@click.option("--site", help="Site name")
@click.option("--app", help="Specific app to update translations for")
@click.option("--locale", default="th", help="Locale to update (default: th)")
@pass_context
def update_app_translations(context, site=None, app=None, locale="th"):
    """
    Update translations for apps after migration.
    
    This command runs the same translation update process that happens
    automatically after migrations.
    
    Examples:
        bench update-app-translations --site mysite
        bench update-app-translations --site mysite --app m_capital
        bench update-app-translations --site mysite --locale th
    """
    
    site = get_site(context, site)
    
    with frappe.init_site(site):
        frappe.connect()
        
        if app:
            # Update translations for a specific app
            from translation_tools.utils.migration_translations import run_translation_commands_for_single_app
            
            click.echo(f"Updating translations for app: {app} (locale: {locale})")
            
            try:
                results = run_translation_commands_for_single_app(app, locale)
                
                for result in results:
                    if result["success"]:
                        click.echo(f"✓ {result['command']}")
                    else:
                        click.echo(f"✗ {result['command']}")
                        if result["error"]:
                            click.echo(f"  Error: {result['error']}")
                
                click.echo("Translation update completed!")
                
            except Exception as e:
                click.echo(f"Error: {str(e)}")
                
        else:
            # Update translations for all configured apps
            from translation_tools.utils.migration_translations import run_translation_commands_after_migrate
            
            click.echo("Updating translations for all configured apps...")
            run_translation_commands_after_migrate()
            click.echo("Translation update completed!")


@click.command("list-translatable-apps")
@click.option("--site", help="Site name")
@pass_context  
def list_translatable_apps(context, site=None):
    """
    List apps that have translation capabilities in the current bench.
    """
    
    site = get_site(context, site)
    
    with frappe.init_site(site):
        frappe.connect()
        
        from translation_tools.utils.migration_translations import get_apps_needing_translation
        
        apps = get_apps_needing_translation()
        
        if apps:
            click.echo("Apps with translation capabilities:")
            for app in apps:
                click.echo(f"  - {app}")
        else:
            click.echo("No apps with translation capabilities found.")


commands = [update_app_translations, list_translatable_apps]