import frappe
from frappe.utils import now_datetime
import json
import subprocess

def check_and_run_auto_sync():
    """Check if auto-sync is due and trigger sync for enabled apps"""

    # Debug: Log that scheduler called this function
    frappe.logger("auto_sync").info(f"🔄 [AUTO-SYNC] Scheduler triggered check_and_run_auto_sync at {now_datetime()}")

    try:
        # Get GitHub Sync Settings
        if not frappe.db.exists("DocType", "GitHub Sync Settings"):
            frappe.logger("auto_sync").info("🔄 [AUTO-SYNC] GitHub Sync Settings DocType not found, skipping")
            return

        settings = frappe.get_single("GitHub Sync Settings")
        frappe.logger("auto_sync").info(f"🔄 [AUTO-SYNC] Settings loaded: enabled={settings.enabled}, auto_sync_enabled={getattr(settings, 'auto_sync_enabled', 'N/A')}")

        # Check if global auto-sync is enabled
        if not settings.enabled or not settings.auto_sync_enabled:
            frappe.logger("auto_sync").info(f"🔄 [AUTO-SYNC] Global sync disabled (enabled={settings.enabled}, auto_sync_enabled={getattr(settings, 'auto_sync_enabled', 'N/A')})")
            return

        # Cron schedule in hooks.py (0 17 * * *) controls timing —
        # no is_sync_due() gate needed here.

        # Get app-specific settings
        app_settings = {}
        if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
            try:
                app_settings = json.loads(settings.app_sync_settings)
            except (json.JSONDecodeError, TypeError):
                app_settings = {}
        
        # If no apps are enabled, skip
        enabled_apps = [app for app, config in app_settings.items() if config.get('enabled')]
        if not enabled_apps:
            return
        
        frappe.logger("auto_sync").info(f"🚀 [AUTO-SYNC] Running scheduled auto-sync for apps: {', '.join(enabled_apps)}")
        
        # Update status to "In Progress"
        settings.update_sync_status("In Progress")
        
        # Trigger sync for all enabled apps
        from translation_tools.api.app_sync_settings import trigger_all_apps_sync
        result = trigger_all_apps_sync()
        
        if result and result.get('success'):
            # Update status to "Success"
            changes_message = f"Synced {len(enabled_apps)} apps: {', '.join(enabled_apps)}"
            settings.update_sync_status("Success", changes_message)
            frappe.logger("auto_sync").info(f"✅ [AUTO-SYNC] Completed successfully: {changes_message}")
        else:
            # Update status to "Failed"
            error_message = result.get('error', 'Unknown error') if result else 'Unknown error'
            settings.update_sync_status("Failed", f"Error: {error_message}")
            frappe.logger("auto_sync").error(f"❌ [AUTO-SYNC] Failed: {error_message}")
            
    except Exception as e:
        frappe.log_error(f"Error in check_and_run_auto_sync: {str(e)}")
        
        # Try to update status if possible
        try:
            settings = frappe.get_single("GitHub Sync Settings")
            settings.update_sync_status("Failed", f"System error: {str(e)}")
        except:
            pass


def manual_trigger_sync():
    """Manually trigger sync for all enabled apps (called from UI)"""
    
    try:
        # Get GitHub Sync Settings
        settings = frappe.get_single("GitHub Sync Settings")
        
        if not settings.enabled:
            return {"success": False, "error": "Auto-sync is not enabled"}
        
        # Get app-specific settings
        app_settings = {}
        if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
            try:
                app_settings = json.loads(settings.app_sync_settings)
            except (json.JSONDecodeError, TypeError):
                app_settings = {}
        
        enabled_apps = [app for app, config in app_settings.items() if config.get('enabled')]
        
        if not enabled_apps:
            return {"success": False, "error": "No apps are enabled for auto-sync"}
        
        # Update status
        settings.update_sync_status("In Progress")
        
        # Trigger background sync
        frappe.enqueue(
            'translation_tools.tasks.github_auto_sync.run_background_sync',
            enabled_apps=enabled_apps,
            queue='long',
            timeout=1800  # 30 minutes timeout
        )
        
        return {
            "success": True, 
            "message": f"Manual sync triggered for {len(enabled_apps)} apps"
        }
        
    except Exception as e:
        frappe.log_error(f"Error in manual_trigger_sync: {str(e)}")
        return {"success": False, "error": str(e)}


def run_background_sync(enabled_apps):
    """Run sync in background for specified apps"""
    
    try:
        from translation_tools.api.app_sync_settings import sync_app_from_github
        
        successful_apps = []
        failed_apps = []
        
        for app_name in enabled_apps:
            try:
                sync_app_from_github(app_name)
                successful_apps.append(app_name)
                frappe.logger().info(f"Successfully synced app: {app_name}")
            except Exception as e:
                failed_apps.append(app_name)
                frappe.log_error(f"Failed to sync app {app_name}: {str(e)}")
        
        # Recompile MO files for successfully synced apps
        if successful_apps:
            bench_path = frappe.utils.get_bench_path()
            for app_name in successful_apps:
                try:
                    cmd = f"bench compile-po-to-mo --app {app_name} --locale th --force"
                    subprocess.run(cmd, shell=True, cwd=bench_path, capture_output=True, timeout=120)
                    frappe.logger("auto_sync").info(f"🔄 [SYNC] Recompiled MO for {app_name}")
                except Exception as mo_err:
                    frappe.logger("auto_sync").warning(f"Could not recompile MO for {app_name}: {mo_err}")

        # Update final status
        settings = frappe.get_single("GitHub Sync Settings")

        if failed_apps:
            status_message = f"Partial success: {len(successful_apps)} successful, {len(failed_apps)} failed"
            settings.update_sync_status("Failed", status_message)
        else:
            status_message = f"Successfully synced {len(successful_apps)} apps: {', '.join(successful_apps)}"
            settings.update_sync_status("Success", status_message)
        
        frappe.logger().info(f"Background sync completed: {status_message}")
        
    except Exception as e:
        frappe.log_error(f"Error in run_background_sync: {str(e)}")
        
        # Update status to failed
        try:
            settings = frappe.get_single("GitHub Sync Settings")
            settings.update_sync_status("Failed", f"Background sync error: {str(e)}")
        except:
            pass


def sync_translations_after_migrate():
    """After-migrate hook: enqueue GitHub translation sync as a background job.

    Runs AFTER existing hooks have regenerated POT/PO/MO (which rolls back translations).
    This restores complete translations from the private GitHub repo.
    """
    try:
        if not frappe.db.exists("DocType", "GitHub Sync Settings"):
            return

        settings = frappe.get_single("GitHub Sync Settings")

        if not settings.enabled:
            return

        if not settings.repository_url:
            return

        if not frappe.conf.get("github_pat_token"):
            frappe.logger("auto_sync").warning(
                "🔄 [POST-MIGRATE] No github_pat_token found, skipping sync. "
                "Add github_pat_token to site_config.json or common_site_config.json"
            )
            return

        # Get enabled apps
        app_settings = {}
        if hasattr(settings, "app_sync_settings") and settings.app_sync_settings:
            try:
                app_settings = json.loads(settings.app_sync_settings)
            except (json.JSONDecodeError, TypeError):
                app_settings = {}

        enabled_apps = [app for app, config in app_settings.items() if config.get("enabled")]

        if not enabled_apps:
            return

        frappe.logger("auto_sync").info(
            f"🔄 [POST-MIGRATE] Enqueueing GitHub sync for {len(enabled_apps)} apps: {', '.join(enabled_apps)}"
        )
        print(f"\n🔄 Enqueueing GitHub translation sync for: {', '.join(enabled_apps)}")

        frappe.enqueue(
            "translation_tools.tasks.github_auto_sync.run_background_sync",
            enabled_apps=enabled_apps,
            queue="long",
            timeout=1800,
            job_name="post_migrate_github_sync",
            deduplicate=True,
        )

        print("✅ GitHub translation sync enqueued (runs in background)")

    except Exception as e:
        # Never break migrate
        frappe.log_error(
            f"Post-migrate GitHub sync scheduling failed: {str(e)}",
            "Post-Migrate GitHub Sync Error",
        )
        print(f"⚠️ Could not schedule GitHub translation sync: {str(e)}")