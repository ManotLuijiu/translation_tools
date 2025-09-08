import frappe
from frappe import _
import json


@frappe.whitelist()
def get_app_sync_settings():
    """Get auto-sync settings for all apps"""
    print(f"\n=== Get App Sync Settings Debug ===")
    try:
        # Get or create the settings document
        print(f"Getting GitHub Sync Settings...")
        settings = frappe.get_single("GitHub Sync Settings")
        print(f"Settings document: {settings.name}")
        
        # Get per-app settings from custom field or create empty dict
        app_settings = {}
        if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
            print(f"Raw app_sync_settings: {settings.app_sync_settings}")
            app_settings = json.loads(settings.app_sync_settings)
            print(f"Parsed app_settings: {app_settings}")
        else:
            print(f"No app_sync_settings found, using empty dict")
        
        result = {
            "success": True,
            "app_settings": app_settings,
            "global_enabled": settings.enabled,
            "repository_url": settings.repository_url,
            "branch": settings.branch
        }
        print(f"Returning result: {result}")
        print(f"=== End Get App Sync Settings Debug ===\n")
        return result
    except Exception as e:
        frappe.log_error(f"Error getting app sync settings: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def toggle_app_autosync(app_name, enabled=False):
    """Toggle auto-sync for a specific app"""
    print(f"\n=== Auto Sync Toggle Debug (Python) ===")
    print(f"App Name: {app_name}")
    print(f"Enabled: {enabled}")
    print(f"Enabled Type: {type(enabled)}")
    
    # Convert string to boolean if needed
    if isinstance(enabled, str):
        enabled = enabled.lower() in ['true', '1', 'yes']
        print(f"Converted enabled to boolean: {enabled}")
    
    try:
        # Get the settings document
        print(f"Getting GitHub Sync Settings...")
        settings = frappe.get_single("GitHub Sync Settings")
        print(f"Settings retrieved: {settings.name}")
        
        # Get existing app settings or create new
        app_settings = {}
        if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
            print(f"Existing app_sync_settings: {settings.app_sync_settings}")
            app_settings = json.loads(settings.app_sync_settings)
        else:
            print(f"No existing app_sync_settings, creating new")
        
        print(f"Current app_settings: {app_settings}")
        
        # Update the specific app setting
        app_settings[app_name] = {
            "enabled": enabled,
            "last_updated": frappe.utils.now_datetime().isoformat()
        }
        
        print(f"Updated app_settings: {app_settings}")
        
        # Save back to settings (we'll need to add this field to the DocType)
        settings.app_sync_settings = json.dumps(app_settings)
        print(f"Saving settings...")
        settings.save(ignore_permissions=True)
        frappe.db.commit()  # Ensure the changes are committed immediately
        print(f"Settings saved and committed")
        
        # If enabling, trigger an immediate sync for this app
        if enabled:
            print(f"Auto-sync enabled, triggering immediate sync for {app_name}")
            # Call apply_sync directly for immediate execution (like manual sync button)
            from translation_tools.api.github_sync import apply_sync
            from translation_tools.api.po_files import get_cached_po_files
            
            try:
                # Get app-specific repository URL if available
                print(f"Getting app-specific repository URL...")
                repo_result = get_app_github_repo_url(app_name)
                print(f"Repository result: {repo_result}")
                repo_url = repo_result.get('repo_url') if repo_result.get('success') else settings.repository_url
                print(f"Using repository URL: {repo_url}")
                
                if repo_url:
                    # Get PO files for this app
                    po_files_result = get_cached_po_files()
                    if po_files_result and 'message' in po_files_result:
                        app_po_files = [f for f in po_files_result['message'] if f['app'] == app_name]
                        
                        if app_po_files:
                            # Find translation files in GitHub
                            from translation_tools.api.github_sync import find_translation_files
                            github_files_result = find_translation_files(
                                repo_url=repo_url,
                                branch=settings.branch or 'main',
                                target_language=settings.target_language or 'th'
                            )
                            
                            if github_files_result.get('success') and github_files_result.get('files'):
                                best_match = github_files_result['files'][0]
                                
                                # Apply sync for first PO file (like manual sync)
                                first_po_file = app_po_files[0]
                                apply_sync(
                                    repo_url=repo_url,
                                    branch=settings.branch or 'main',
                                    repo_files=[best_match['path']],
                                    local_file_path=first_po_file['file_path']
                                )
                                
                                frappe.logger().info(f"Auto-sync applied immediately for {app_name}")
            except Exception as e:
                frappe.log_error(f"Error in immediate auto-sync for {app_name}: {str(e)}")
                # Fallback to background job if direct sync fails
                frappe.enqueue(
                    'translation_tools.api.app_sync_settings.sync_app_from_github',
                    app_name=app_name,
                    queue='short',
                    timeout=300
                )
        
        result = {
            "success": True,
            "message": f"Auto-sync {'enabled' if enabled else 'disabled'} for {app_name}"
        }
        print(f"Returning result: {result}")
        print(f"=== End Auto Sync Toggle Debug (Python) ===\n")
        return result
    except Exception as e:
        frappe.log_error(f"Error toggling app autosync: {str(e)}")
        print(f"Error occurred: {str(e)}")
        print(f"=== End Auto Sync Toggle Debug (Python) with Error ===\n")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_app_github_repo_url(app_name):
    """Get GitHub repository URL for a specific app"""
    try:
        # Try to get from app's hooks.py or pyproject.toml
        import os
        import toml
        
        app_path = frappe.get_app_path(app_name)
        
        # Check pyproject.toml first
        pyproject_path = os.path.join(app_path, "..", "pyproject.toml")
        if os.path.exists(pyproject_path):
            with open(pyproject_path, 'r') as f:
                pyproject = toml.load(f)
                if 'project' in pyproject and 'urls' in pyproject['project']:
                    urls = pyproject['project']['urls']
                    if 'Repository' in urls:
                        return {"success": True, "repo_url": urls['Repository']}
                    elif 'Source' in urls:
                        return {"success": True, "repo_url": urls['Source']}
        
        # Fallback to a mapping of known apps
        known_repos = {
            "frappe": "https://github.com/frappe/frappe",
            "erpnext": "https://github.com/frappe/erpnext",
            "hrms": "https://github.com/frappe/hrms",
            "payments": "https://github.com/frappe/payments",
            # Add more as needed
        }
        
        if app_name in known_repos:
            return {"success": True, "repo_url": known_repos[app_name]}
        
        return {"success": False, "error": "Repository URL not found"}
        
    except Exception as e:
        frappe.log_error(f"Error getting app repo URL: {str(e)}")
        return {"success": False, "error": str(e)}


def sync_app_from_github(app_name):
    """Background job to sync translations for a specific app from GitHub"""
    try:
        from translation_tools.api.github_sync import apply_sync, find_translation_files, preview_sync
        from translation_tools.api.po_files import get_cached_po_files
        
        # Get settings
        settings = frappe.get_single("GitHub Sync Settings")
        if not settings.enabled:
            return
        
        # Get app-specific repository URL if available
        repo_result = get_app_github_repo_url(app_name)
        repo_url = repo_result.get('repo_url') if repo_result.get('success') else settings.repository_url
        
        if not repo_url:
            frappe.log_error(f"No repository URL found for app {app_name}")
            return
        
        # Get PO files for this app
        po_files_result = get_cached_po_files()
        if not po_files_result or 'message' not in po_files_result:
            return
        
        app_po_files = [f for f in po_files_result['message'] if f['app'] == app_name]
        
        if not app_po_files:
            frappe.log_error(f"No PO files found for app {app_name}")
            return
        
        # Find translation files in GitHub
        github_files_result = find_translation_files(
            repo_url=repo_url,
            branch=settings.branch or 'main',
            target_language=settings.target_language or 'th'
        )
        
        if not github_files_result.get('success') or not github_files_result.get('files'):
            frappe.log_error(f"No translation files found in GitHub for {app_name}")
            return
        
        # Get the best matching file
        best_match = github_files_result['files'][0] if github_files_result['files'] else None
        if not best_match:
            return
        
        # For each PO file in the app, sync with GitHub
        for po_file in app_po_files:
            try:
                # Preview the sync first
                preview_result = preview_sync(
                    repo_url=repo_url,
                    branch=settings.branch or 'main',
                    repo_files=[best_match['path']],
                    local_file_path=po_file['file_path']
                )
                
                if preview_result.get('success'):
                    preview_data = preview_result.get('preview', {})
                    
                    # Only apply if there are changes
                    if preview_data.get('added', 0) > 0 or preview_data.get('updated', 0) > 0:
                        apply_result = apply_sync(
                            repo_url=repo_url,
                            branch=settings.branch or 'main',
                            repo_files=[best_match['path']],
                            local_file_path=po_file['file_path']
                        )
                        
                        if apply_result.get('success'):
                            frappe.logger().info(f"Successfully synced {po_file['filename']} for app {app_name}")
                        else:
                            frappe.log_error(f"Failed to apply sync for {po_file['filename']}: {apply_result.get('error')}")
                    else:
                        frappe.logger().info(f"No changes to sync for {po_file['filename']} in app {app_name}")
                        
            except Exception as e:
                frappe.log_error(f"Error syncing file {po_file['filename']}: {str(e)}")
                continue
        
        frappe.logger().info(f"Completed auto-sync for app {app_name}")
        
    except Exception as e:
        frappe.log_error(f"Error in sync_app_from_github for {app_name}: {str(e)}")


@frappe.whitelist()
def trigger_all_apps_sync():
    """Trigger sync for all apps with auto-sync enabled"""
    try:
        settings = frappe.get_single("GitHub Sync Settings")
        
        if not settings.enabled:
            return {"success": False, "error": "Global auto-sync is disabled"}
        
        # Get app settings
        app_settings = {}
        if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
            app_settings = json.loads(settings.app_sync_settings)
        
        # Trigger sync for each enabled app
        synced_apps = []
        for app_name, config in app_settings.items():
            if config.get('enabled'):
                frappe.enqueue(
                    'translation_tools.api.app_sync_settings.sync_app_from_github',
                    app_name=app_name,
                    queue='long',
                    timeout=600
                )
                synced_apps.append(app_name)
        
        return {
            "success": True,
            "message": f"Triggered sync for apps: {', '.join(synced_apps)}"
        }
        
    except Exception as e:
        frappe.log_error(f"Error triggering all apps sync: {str(e)}")
        return {"success": False, "error": str(e)}