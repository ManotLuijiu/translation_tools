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
        
        # Update the specific app setting (preserve existing fields)
        if app_name not in app_settings:
            app_settings[app_name] = {}
        
        # Preserve existing fields and update only enabled status and timestamp
        app_settings[app_name]["enabled"] = enabled
        app_settings[app_name]["last_updated"] = frappe.utils.now_datetime().isoformat()
        
        print(f"Updated app_settings: {app_settings}")
        
        # Save back to settings (we'll need to add this field to the DocType)
        settings.app_sync_settings = json.dumps(app_settings)
        print(f"Saving settings...")
        settings.save(ignore_permissions=True)
        frappe.db.commit()  # Ensure the changes are committed immediately
        print(f"Settings saved and committed")
        
        # Prepare the result object first
        result = {
            "success": True,
            "message": f"Auto-sync {'enabled' if enabled else 'disabled'} for {app_name}"
        }

        # If enabling, trigger sync as background job for instant UI response
        print(f"🔍 Checking if auto-sync should trigger: enabled={enabled}, type={type(enabled)}")
        if enabled:
            print(f"🚀 Auto-sync enabled, enqueueing background sync for {app_name}")

            # Enqueue as background job for instant toggle response
            frappe.enqueue(
                'translation_tools.api.app_sync_settings.perform_app_sync',
                app_name=app_name,
                queue='short',
                timeout=300,
                now=False  # Run in background, don't block
            )

            print(f"✅ Background sync job enqueued for {app_name}")

        print(f"Returning result: {result}")
        print(f"=== End Auto Sync Toggle Debug (Python) ===\n")
        return result
    except Exception as e:
        frappe.log_error(f"Error toggling app autosync: {str(e)}")
        print(f"Error occurred: {str(e)}")
        print(f"=== End Auto Sync Toggle Debug (Python) with Error ===\n")
        return {"success": False, "error": str(e)}


def perform_app_sync(app_name):
    """
    Background worker function to perform immediate sync after enabling auto-sync
    This keeps the toggle UI responsive while sync happens in background

    Args:
        app_name (str): Name of the app to sync
    """
    print(f"\n=== Background App Sync for {app_name} ===")
    try:
        # Just call the existing sync_app_from_github function
        # This reuses all the existing tested logic
        sync_app_from_github(app_name)
        print(f"✅ Background sync completed for {app_name}")
    except Exception as e:
        frappe.log_error(f"Error in background sync for {app_name}: {str(e)}")
        print(f"💥 Background sync error for {app_name}: {str(e)}")


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
    frappe.logger("auto_sync").info(f"📥 [SYNC] Starting sync_app_from_github for: {app_name}")

    try:
        from translation_tools.api.github_sync import apply_sync, find_translation_files, preview_sync
        from translation_tools.api.po_files import get_cached_po_files

        # Get settings
        settings = frappe.get_single("GitHub Sync Settings")
        frappe.logger("auto_sync").info(f"📥 [SYNC] Settings: enabled={settings.enabled}, repo={settings.repository_url}")
        if not settings.enabled:
            frappe.logger("auto_sync").info(f"📥 [SYNC] Sync disabled, skipping {app_name}")
            return
        
        # Get app-specific repository URL if available
        repo_result = get_app_github_repo_url(app_name)
        repo_url = repo_result.get('repo_url') if repo_result.get('success') else settings.repository_url
        
        if not repo_url:
            frappe.log_error(f"No repository URL found for app {app_name}")
            return
        
        # Get PO files for this app
        frappe.logger("auto_sync").info(f"📥 [SYNC] Getting PO files for {app_name}")
        po_files_result = get_cached_po_files()
        if not po_files_result or 'message' not in po_files_result:
            frappe.logger("auto_sync").warning(f"📥 [SYNC] No PO files result for {app_name}")
            return

        app_po_files = [f for f in po_files_result['message'] if f['app'] == app_name]
        frappe.logger("auto_sync").info(f"📥 [SYNC] Found {len(app_po_files)} PO files for {app_name}: {[f['file_path'] for f in app_po_files]}")

        if not app_po_files:
            frappe.logger("auto_sync").warning(f"📥 [SYNC] No PO files found for app {app_name}")
            return
        
        # Find translation files in GitHub
        frappe.logger("auto_sync").info(f"📥 [SYNC] Finding GitHub files: repo={repo_url}, branch={settings.branch or 'main'}, lang={settings.target_language or 'th'}")
        github_files_result = find_translation_files(
            repo_url=repo_url,
            branch=settings.branch or 'main',
            target_language=settings.target_language or 'th'
        )

        frappe.logger("auto_sync").info(f"📥 [SYNC] GitHub files result: success={github_files_result.get('success')}, files_count={len(github_files_result.get('files', []))}")

        if not github_files_result.get('success') or not github_files_result.get('files'):
            frappe.logger("auto_sync").warning(f"📥 [SYNC] No translation files found in GitHub for {app_name}")
            return

        # Filter GitHub files to find the one matching this app
        # Look for patterns like: app_name/th.po, app_name/locale/th.po, etc.
        target_language = settings.target_language or 'th'
        app_specific_files = []

        for github_file in github_files_result['files']:
            file_path = github_file['path']
            # Match patterns like: m_capital/th.po, m_capital/locale/th.po
            if file_path.startswith(f"{app_name}/") and file_path.endswith(f"{target_language}.po"):
                app_specific_files.append(github_file)
                frappe.logger().info(f"Found matching GitHub file for {app_name}: {file_path}")

        if not app_specific_files:
            frappe.logger().info(f"No app-specific translation files found in GitHub for {app_name}")
            return

        # Use the first app-specific match (should be the most relevant)
        best_match = app_specific_files[0]
        frappe.logger().info(f"Using GitHub file for {app_name}: {best_match['path']}")
        
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
                    added = preview_data.get('added', 0)
                    updated = preview_data.get('updated', 0)
                    frappe.logger("auto_sync").info(f"📥 [SYNC] Preview for {po_file['filename']}: added={added}, updated={updated}")

                    # Only apply if there are changes
                    if added > 0 or updated > 0:
                        frappe.logger("auto_sync").info(f"📥 [SYNC] Applying changes to {po_file['file_path']}")
                        apply_result = apply_sync(
                            repo_url=repo_url,
                            branch=settings.branch or 'main',
                            repo_files=[best_match['path']],
                            local_file_path=po_file['file_path']
                        )

                        if apply_result.get('success'):
                            frappe.logger("auto_sync").info(f"✅ [SYNC] Successfully synced {po_file['filename']} for app {app_name}: +{added} updated={updated}")
                        else:
                            frappe.logger("auto_sync").error(f"❌ [SYNC] Failed to apply sync for {po_file['filename']}: {apply_result.get('error')}")
                    else:
                        frappe.logger("auto_sync").info(f"⏭️ [SYNC] No changes to sync for {po_file['filename']} in app {app_name}")
                        
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


@frappe.whitelist()
def debug_auto_sync_status():
    """
    Debug endpoint to check auto-sync configuration and status.
    Call via: /api/method/translation_tools.api.app_sync_settings.debug_auto_sync_status
    """
    try:
        from frappe.utils import now_datetime

        result = {
            "timestamp": str(now_datetime()),
            "scheduler_enabled": frappe.conf.get("pause_scheduler", 0) == 0,
            "developer_mode": frappe.conf.get("developer_mode", False),
        }

        # Check if DocType exists
        if not frappe.db.exists("DocType", "GitHub Sync Settings"):
            result["error"] = "GitHub Sync Settings DocType not found"
            return result

        settings = frappe.get_single("GitHub Sync Settings")

        result["settings"] = {
            "enabled": settings.enabled,
            "auto_sync_enabled": getattr(settings, "auto_sync_enabled", None),
            "repository_url": settings.repository_url,
            "branch": settings.branch,
            "target_language": getattr(settings, "target_language", "th"),
            "sync_frequency": getattr(settings, "sync_frequency", None),
            "next_sync_datetime": str(getattr(settings, "next_sync_datetime", None)),
            "last_sync_datetime": str(getattr(settings, "last_sync_datetime", None)),
            "last_sync_status": getattr(settings, "last_sync_status", None),
        }

        # Check is_sync_due
        result["is_sync_due"] = settings.is_sync_due() if hasattr(settings, "is_sync_due") else "N/A"

        # Get app settings
        app_settings = {}
        if hasattr(settings, "app_sync_settings") and settings.app_sync_settings:
            app_settings = json.loads(settings.app_sync_settings)

        enabled_apps = [app for app, config in app_settings.items() if config.get("enabled")]
        result["enabled_apps"] = enabled_apps
        result["total_apps_configured"] = len(app_settings)

        # Check scheduler jobs
        result["scheduler_jobs"] = {
            "cron_job": "translation_tools.tasks.github_auto_sync.check_and_run_auto_sync",
            "cron_schedule": "0 17 * * * (midnight Bangkok time)",
        }

        return {"success": True, "debug_info": result}

    except Exception as e:
        frappe.log_error(f"Error in debug_auto_sync_status: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def test_sync_single_app(app_name):
    """
    Test sync for a single app synchronously (not background) for debugging.
    Call via: /api/method/translation_tools.api.app_sync_settings.test_sync_single_app?app_name=m_capital
    """
    frappe.logger("auto_sync").info(f"🧪 [TEST] Manual test sync triggered for: {app_name}")

    try:
        # Run sync directly (not enqueued) so we can see results immediately
        sync_app_from_github(app_name)

        return {
            "success": True,
            "message": f"Sync completed for {app_name}. Check logs at: bench --site <site> show-logs | grep auto_sync",
        }

    except Exception as e:
        frappe.log_error(f"Test sync error for {app_name}: {str(e)}")
        return {"success": False, "error": str(e)}