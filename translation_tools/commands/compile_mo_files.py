# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
Bench command for compiling MO files
Usage: bench compile-translation-mo-files [--force] [--app app_name]
"""

import click
import frappe
from translation_tools.tasks.mo_compiler import compile_mo_files_for_all_apps_force, compile_mo_files_for_app


@click.command('compile-translation-mo-files')
@click.option('--force', is_flag=True, help='Force compilation even if MO files are up to date')
@click.option('--app', help='Compile MO files for a specific app only')
@click.pass_context
def compile_translation_mo_files(ctx, force=False, app=None):
    """
    Compile PO files to MO files for translation_tools and all installed apps
    
    Examples:
        bench compile-translation-mo-files
        bench compile-translation-mo-files --force
        bench compile-translation-mo-files --app erpnext
        bench compile-translation-mo-files --app erpnext --force
    """
    site = ctx.obj["sites"][0] if ctx.obj.get("sites") else None
    
    if not site:
        click.echo("❌ No site specified. Use: bench --site site-name compile-translation-mo-files")
        return
    
    try:
        frappe.init(site=site)
        frappe.connect()
        
        if app:
            # Compile MO files for specific app
            click.echo(f"🔄 Compiling MO files for app: {app}")
            
            # Validate that the app is installed
            installed_apps = frappe.get_installed_apps()
            if app not in installed_apps:
                click.echo(f"❌ App '{app}' is not installed on site '{site}'")
                click.echo(f"📦 Installed apps: {', '.join(installed_apps)}")
                return
            
            result = compile_mo_files_for_app(app, force=force)
            
            if result["success"]:
                if result["compiled"]:
                    click.echo(f"✅ Successfully compiled MO files for {app}")
                    click.echo(f"   Reason: {result.get('reason', '')}")
                elif result["skipped"]:
                    click.echo(f"ℹ️ Skipped {app} - {result.get('reason', 'MO files are up to date')}")
                    if not force:
                        click.echo("   Use --force to compile anyway")
                else:
                    click.echo(f"⚠️ No action taken for {app}: {result.get('reason', '')}")
            else:
                click.echo(f"❌ Failed to compile MO files for {app}: {result.get('error', 'Unknown error')}")
        else:
            # Compile MO files for all apps
            installed_apps = frappe.get_installed_apps()
            click.echo(f"🔄 Compiling MO files for {len(installed_apps)} installed apps...")
            
            result = compile_mo_files_for_all_apps_force()
            
            if result["success"]:
                compiled = result["compiled_count"]
                failed = result["failed_count"]
                total = result["total_apps"]
                
                if compiled > 0:
                    click.echo(f"✅ Successfully compiled MO files for {compiled}/{total} apps")
                
                if failed > 0:
                    click.echo(f"⚠️ Failed to compile MO files for {failed} apps")
                    
                if compiled == 0 and failed == 0:
                    click.echo(f"ℹ️ All MO files are already up to date for {total} apps")
                    if not force:
                        click.echo("   Use --force to recompile anyway")
                        
            else:
                click.echo(f"❌ Failed to compile MO files: {result.get('error', 'Unknown error')}")
    
    except Exception as e:
        click.echo(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        frappe.destroy()


commands = [compile_translation_mo_files]