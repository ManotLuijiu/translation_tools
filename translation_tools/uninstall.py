import os
import shutil
import frappe

def before_uninstall():
    """Perform cleanup operations before uninstalling the app"""
    print("\n")
    print("=" * 80)
    print("Translation Tools Uninstall")
    print("=" * 80)
    print("Preparing to uninstall Translation Tools...")
    
    try:
        # Clean up scheduled jobs
        cleanup_scheduled_jobs()
        
        # Clean up GitHub Sync Settings
        cleanup_github_sync_settings()
        
        # Get the bench directory
        bench_dir = os.path.abspath(os.path.join(frappe.get_app_path("translation_tools"), '..', '..'))
        
        # Check for and remove the wrapper script
        bin_script = os.path.join(bench_dir, 'bin', 'translate-po')
        if os.path.exists(bin_script):
            os.remove(bin_script)
            print(f"✓ Removed command script: {bin_script}")
            
        # Check for configuration file
        config_file = os.path.join(bench_dir, '.erpnext_translate_config')
        if os.path.exists(config_file):
            print(f"\nFound configuration file: {config_file}")
            response = input("Would you like to remove your API keys and configuration? [y/N]: ")
            if response.lower() == 'y':
                os.remove(config_file)
                print(f"✓ Removed configuration file: {config_file}")
            else:
                print("Configuration file preserved for future reinstallation.")
                
        print("\nTranslation Tools cleanup completed.")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Error during uninstall cleanup: {str(e)}")
        print("Continuing with uninstallation...")


def cleanup_scheduled_jobs():
    """Clean up scheduled jobs related to auto-sync"""
    try:
        # Cancel any running background jobs related to auto-sync
        from frappe.utils.background_jobs import get_jobs
        from rq import Worker
        
        jobs = get_jobs()
        sync_jobs = [job for job in jobs if 'sync_app_from_github' in str(job.func_name)]
        
        for job in sync_jobs:
            job.cancel()
            print(f"✓ Cancelled background sync job: {job.id}")
            
    except Exception as e:
        print(f"Warning: Could not clean up background jobs: {str(e)}")


def cleanup_github_sync_settings():
    """Clean up GitHub Sync Settings and related data"""
    try:
        # Reset GitHub Sync Settings
        if frappe.db.exists("DocType", "GitHub Sync Settings"):
            settings = frappe.get_single("GitHub Sync Settings")
            if hasattr(settings, 'app_sync_settings') and settings.app_sync_settings:
                settings.app_sync_settings = "{}"
                settings.enabled = 0
                settings.auto_sync_enabled = 0
                settings.save(ignore_permissions=True)
                print("✓ Cleaned up GitHub Sync Settings")
                
    except Exception as e:
        print(f"Warning: Could not clean up GitHub Sync Settings: {str(e)}")


def after_uninstall():
    """Perform final cleanup after app is uninstalled"""
    try:
        print("\nTranslation Tools has been uninstalled.")
        print("Note: GitHub Sync Settings DocType will remain but has been reset.")
        print("Thank you for using Translation Tools!")
    except Exception as e:
        print(f"Error in after_uninstall: {str(e)}")