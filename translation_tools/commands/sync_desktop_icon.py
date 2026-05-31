# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
Bench command for syncing Desktop Icon records with hooks.py configuration
Usage: bench sync-desktop-icon --app <app_name> [--force] [--check]

This fixes the "Frappe Habit" where add_to_apps_screen is only read once on install
and changes to hooks.py have no effect on existing DB records.
"""

import click
import frappe


def get_app_hooks_config(app_name: str) -> dict | None:
    """
    Read app's hooks.py and extract add_to_apps_screen configuration
    
    Returns:
        dict with keys: logo, title, route, icon (app_icon from hooks)
        or None if app doesn't have add_to_apps_screen
    """
    try:
        app_hooks = frappe.get_hooks(app_name=app_name)
        
        # Get app_icon from hooks
        app_icon = app_hooks.get("app_icon", [None])[0]
        
        # Get add_to_apps_screen configuration
        add_to_apps = app_hooks.get("add_to_apps_screen", [])
        
        # Find the config for this app
        for config in add_to_apps:
            if config.get("name") == app_name or config.get("name") == app_name.replace("_", "-"):
                return {
                    "logo": config.get("logo"),
                    "title": config.get("title"),
                    "route": config.get("route"),
                    "icon": app_icon,
                }
        
        # If app has add_to_apps_screen but this app's config wasn't found
        if add_to_apps:
            return {
                "logo": add_to_apps[0].get("logo"),
                "title": add_to_apps[0].get("title"),
                "route": add_to_apps[0].get("route"),
                "icon": app_icon,
            }
        
        return None
    except Exception as e:
        click.echo(f"⚠️  Could not read hooks for {app_name}: {e}")
        return None


def get_desktop_icon_from_db(app_name: str) -> dict | None:
    """
    Query tabDesktop Icon for this app
    
    Returns:
        dict with DB record or None if not found
    """
    result = frappe.db.sql("""
        SELECT name, label, icon, icon_type, link_type, link_to, link, 
               app, logo_url, hidden
        FROM `tabDesktop Icon`
        WHERE app = %(app_name)s
           OR name = %(app_name)s
           OR name = %(app_name_title)s
           OR label = %(app_name)s
           OR label = %(app_name_title)s
        LIMIT 1
    """, {
        "app_name": app_name,
        "app_name_title": app_name.replace("_", " ").title()
    }, as_dict=True)
    
    return result[0] if result else None


def update_desktop_icon(icon_name: str, updates: dict) -> bool:
    """
    Update Desktop Icon record in DB
    
    Args:
        icon_name: The name of the Desktop Icon record
        updates: dict with fields to update
    
    Returns:
        True if successful
    """
    for field, value in updates.items():
        if value is not None:
            frappe.db.set_value("Desktop Icon", icon_name, field, value)
    
    frappe.db.commit()
    return True


def delete_desktop_icon(icon_name: str) -> bool:
    """
    Delete a Desktop Icon record
    
    Args:
        icon_name: The name of the Desktop Icon record
    
    Returns:
        True if successful
    """
    if frappe.db.exists("Desktop Icon", icon_name):
        frappe.delete_doc("Desktop Icon", icon_name, force=True, ignore_permissions=True)
        frappe.db.commit()
        return True
    return False


def create_desktop_icons_from_hooks(app_name: str) -> bool:
    """
    Trigger Frappe's built-in function to create Desktop Icon from hooks.py
    
    Args:
        app_name: The app name
    
    Returns:
        True if successful
    """
    from frappe.desk.doctype.desktop_icon.desktop_icon import create_desktop_icons_from_installed_apps
    
    create_desktop_icons_from_installed_apps()
    frappe.db.commit()
    return True


@click.command('sync-app-desktop-icon')
@click.option('--app', required=True, help='App name to sync (e.g., translation_tools)')
@click.option('--force', is_flag=True, help='Force delete and recreate from hooks.py')
@click.option('--check', is_flag=True, help='Show current vs hooks.py config (dry-run)')
@click.pass_context
def sync_desktop_icon(ctx, app: str, force: bool = False, check: bool = False):
    """
    Sync Desktop Icon DB record with add_to_apps_screen from hooks.py
    
    This fixes the "Frappe Habit" where hooks.py changes don't auto-update
    existing Desktop Icon records.
    
    Examples:
        bench sync-desktop-icon --app translation_tools
        bench sync-desktop-icon --app translation_tools --check
        bench sync-desktop-icon --app translation_tools --force
        bench --site site-name sync-desktop-icon --app translation_tools
    """
    # Handle both dict-like and object-like ctx.obj
    sites = getattr(ctx.obj, 'sites', None) or []
    site = sites[0] if sites else None
    
    if not site:
        click.echo("❌ No site specified. Use: bench --site site-name sync-desktop-icon --app <app>")
        return
    
    try:
        frappe.init(site=site)
        frappe.connect()
        
        click.echo(f"\n📱 Syncing Desktop Icon for app: {app}")
        click.echo("=" * 50)
        
        # Get hooks.py config
        hooks_config = get_app_hooks_config(app)
        
        if not hooks_config:
            click.echo(f"❌ App '{app}' has no add_to_apps_screen in hooks.py")
            return
        
        click.echo(f"\n📋 hooks.py config:")
        click.echo(f"   logo:  {hooks_config['logo'] or '(none)'}")
        click.echo(f"   title: {hooks_config['title'] or '(none)'}")
        click.echo(f"   route: {hooks_config['route'] or '(none)'}")
        click.echo(f"   icon:  {hooks_config['icon'] or '(none)'}")
        
        # Get current DB record
        db_record = get_desktop_icon_from_db(app)
        
        if not db_record:
            click.echo(f"\n⚠️  No Desktop Icon found for '{app}' in database")
            click.echo(f"   Run with --force to create from hooks.py")
            
            if force:
                click.echo(f"\n🔄 Creating Desktop Icon from hooks.py...")
                create_desktop_icons_from_hooks(app)
                click.echo(f"✅ Created Desktop Icon from hooks.py")
            return
        
        # Show current DB state
        click.echo(f"\n📊 Current DB state:")
        click.echo(f"   name:     {db_record['name']}")
        click.echo(f"   label:    {db_record['label']}")
        click.echo(f"   icon:     {db_record['icon'] or '(none)'}")
        click.echo(f"   logo_url: {db_record['logo_url'] or '(none)'}")
        click.echo(f"   link:     {db_record['link'] or '(none)'}")
        click.echo(f"   link_type:{db_record['link_type'] or '(none)'}")
        click.echo(f"   hidden:   {db_record['hidden']}")
        
        # Compare and show differences
        click.echo(f"\n🔍 Differences:")
        changes = []
        
        if db_record['logo_url'] != hooks_config['logo']:
            changes.append(f"   logo_url: '{db_record['logo_url']}' → '{hooks_config['logo']}'")
        
        if db_record['label'] != hooks_config['title']:
            changes.append(f"   label: '{db_record['label']}' → '{hooks_config['title']}'")
        
        if db_record['link'] != hooks_config['route']:
            changes.append(f"   link: '{db_record['link']}' → '{hooks_config['route']}'")
        
        if not hooks_config['logo'] and db_record['icon'] != hooks_config['icon']:
            changes.append(f"   icon: '{db_record['icon']}' → '{hooks_config['icon']}'")
        
        if not changes:
            click.echo("   ✅ No differences - already in sync!")
            return
        
        for change in changes:
            click.echo(change)
        
        # Check mode - just show what would change
        if check:
            click.echo(f"\n💡 Run without --check to apply changes")
            return
        
        # Apply changes
        click.echo(f"\n🔄 Applying changes...")
        
        if force:
            # Force: delete and recreate
            click.echo(f"   🗑️  Deleting existing record...")
            delete_desktop_icon(db_record['name'])
            
            click.echo(f"   ✨ Creating new record from hooks.py...")
            create_desktop_icons_from_hooks(app)
        else:
            # Update existing record
            updates = {}
            if hooks_config['logo']:
                updates['logo_url'] = hooks_config['logo']
            if hooks_config['title']:
                updates['label'] = hooks_config['title']
            if hooks_config['route']:
                updates['link'] = hooks_config['route']
            
            if updates:
                update_desktop_icon(db_record['name'], updates)
        
        click.echo(f"✅ Desktop Icon synced successfully!")
        click.echo(f"\n💡 Tip: Clear cache with 'bench --site {site} clear-cache' to see changes")
        
    except Exception as e:
        click.echo(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        frappe.destroy()


commands = [sync_desktop_icon]