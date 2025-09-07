import frappe
import json

@frappe.whitelist(allow_guest=True)
def check_github_sync_status():
    """Debug GitHub Sync Settings configuration"""
    try:
        result = {
            "success": True,
            "doctype_exists": False,
            "settings_configured": False,
            "auto_sync_enabled": False,
            "apps_configured": False,
            "repository_url": None,
            "last_sync": None,
            "sync_status": None,
            "app_settings": {},
            "error": None
        }
        
        # Check if DocType exists
        if frappe.db.exists('DocType', 'GitHub Sync Settings'):
            result["doctype_exists"] = True
            
            # Get settings
            settings = frappe.get_single('GitHub Sync Settings')
            result["settings_configured"] = bool(settings)
            result["auto_sync_enabled"] = getattr(settings, 'auto_sync_enabled', False)
            result["repository_url"] = getattr(settings, 'repository_url', None)
            result["last_sync"] = getattr(settings, 'last_sync_date', None)
            result["sync_status"] = getattr(settings, 'sync_status', None)
            
            # Check app sync settings
            if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
                try:
                    app_settings = json.loads(settings.app_sync_settings)
                    result["app_settings"] = app_settings
                    result["apps_configured"] = len(app_settings) > 0
                except (json.JSONDecodeError, TypeError) as e:
                    result["error"] = f"Invalid app settings JSON: {str(e)}"
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist(allow_guest=True)
def setup_github_sync_for_erpnext_thai():
    """Set up GitHub Sync Settings to sync th.po from erpnext-thai-translation repository"""
    try:
        from translation_tools.setup.github_sync_defaults import setup_github_sync_defaults
        return setup_github_sync_defaults()
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist(allow_guest=True)
def trigger_manual_sync():
    """Manually trigger GitHub sync"""
    try:
        from translation_tools.tasks.github_auto_sync import manual_trigger_sync
        result = manual_trigger_sync()
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }