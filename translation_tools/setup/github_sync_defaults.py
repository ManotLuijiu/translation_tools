import frappe
import json

def setup_github_sync_defaults():
    """Set up GitHub Sync Settings with default values for erpnext-thai-translation repository"""
    
    try:
        # Get or create GitHub Sync Settings
        if frappe.db.exists("GitHub Sync Settings", "GitHub Sync Settings"):
            settings = frappe.get_doc("GitHub Sync Settings", "GitHub Sync Settings")
        else:
            settings = frappe.new_doc("GitHub Sync Settings")
            settings.name = "GitHub Sync Settings"
        
        # Set default configuration for erpnext-thai-translation repository
        settings.enabled = 1
        settings.auto_sync_enabled = 1
        settings.repository_url = "https://github.com/ManotLuijiu/erpnext-thai-translation.git"
        settings.branch = "main"
        settings.sync_frequency = "daily"
        settings.target_language = "th"
        settings.conflict_resolution_strategy = "github_wins"
        settings.backup_before_sync = 1
        settings.sync_status = "Ready"
        
        # Configure app-specific settings for all installed apps
        installed_apps = frappe.get_installed_apps()
        app_settings = {}
        
        for app in installed_apps:
            app_settings[app] = {
                "enabled": True,
                "locale": "th",
                "source_path": f"{app}/th.po",  # Path in the repository (app/th.po)
                "target_path": f"apps/{app}/{app}/locale/th.po",  # Local path
                "last_updated": frappe.utils.now()
            }
        
        settings.app_sync_settings = json.dumps(app_settings, indent=2)
        
        # Save settings
        settings.save(ignore_permissions=True)
        frappe.db.commit()
        
        print(f"✅ GitHub Sync Settings configured successfully")
        print(f"📋 Repository: https://github.com/ManotLuijiu/erpnext-thai-translation.git")
        print(f"🔄 Auto-sync enabled: Daily frequency")
        print(f"📱 Configured for {len(installed_apps)} apps: {', '.join(installed_apps)}")
        
        return {
            "success": True,
            "message": f"GitHub Sync configured for {len(installed_apps)} apps",
            "repository": "https://github.com/ManotLuijiu/erpnext-thai-translation.git",
            "configured_apps": list(app_settings.keys())
        }
        
    except Exception as e:
        print(f"❌ Error setting up GitHub Sync: {str(e)}")
        frappe.log_error(f"Error in setup_github_sync_defaults: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

def check_and_setup_if_needed():
    """Check if GitHub Sync is properly configured, if not, set it up"""
    
    try:
        if not frappe.db.exists("DocType", "GitHub Sync Settings"):
            print("ℹ️ GitHub Sync Settings DocType not found, skipping setup")
            return
        
        settings = frappe.get_single("GitHub Sync Settings")
        
        # Check if basic configuration is missing
        needs_setup = (
            not getattr(settings, 'enabled', False) or
            not getattr(settings, 'auto_sync_enabled', False) or  
            not getattr(settings, 'repository_url', None) or
            getattr(settings, 'repository_url', '') == ''
        )
        
        if needs_setup:
            print("🔧 GitHub Sync Settings incomplete, applying defaults...")
            return setup_github_sync_defaults()
        else:
            print("✅ GitHub Sync Settings already configured")
            return {"success": True, "message": "Already configured"}
            
    except Exception as e:
        print(f"❌ Error checking GitHub Sync setup: {str(e)}")
        return {"success": False, "error": str(e)}