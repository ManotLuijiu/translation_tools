import frappe
from frappe import _
import json


@frappe.whitelist()
def get_app_sync_settings():
    """Get auto-sync settings for all apps"""
    try:
        # Get or create the settings document
        settings = frappe.get_single("GitHub Sync Settings")
        
        # Get per-app settings from custom field or create empty dict
        app_settings = {}
        if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
            app_settings = json.loads(settings.app_sync_settings)
        
        return {
            "success": True,
            "app_settings": app_settings,
            "global_enabled": settings.enabled,
            "repository_url": settings.repository_url,
            "branch": settings.branch
        }
    except Exception as e:
        frappe.log_error(f"Error getting app sync settings: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def toggle_app_autosync(app_name, enabled=False):
    """Toggle auto-sync for a specific app"""
    try:
        # Get the settings document
        settings = frappe.get_single("GitHub Sync Settings")
        
        # Get existing app settings or create new
        app_settings = {}
        if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
            app_settings = json.loads(settings.app_sync_settings)
        
        # Update the specific app setting
        app_settings[app_name] = {
            "enabled": enabled,
            "last_updated": frappe.utils.now_datetime().isoformat()
        }
        
        # Save back to settings (we'll need to add this field to the DocType)
        settings.app_sync_settings = json.dumps(app_settings)
        settings.save(ignore_permissions=True)
        
        # If enabling, trigger an immediate sync for this app
        if enabled and settings.enabled:
            frappe.enqueue(
                'translation_tools.api.app_sync_settings.sync_app_from_github',
                app_name=app_name,
                queue='short',
                timeout=300
            )
        
        return {
            "success": True,
            "message": f"Auto-sync {'enabled' if enabled else 'disabled'} for {app_name}"
        }
    except Exception as e:
        frappe.log_error(f"Error toggling app autosync: {str(e)}")
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