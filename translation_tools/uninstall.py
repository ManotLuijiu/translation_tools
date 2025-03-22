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


def after_uninstall():
    """Perform final cleanup after app is uninstalled"""
    try:
        print("\nTranslation Tools has been uninstalled.")
        print("Thank you for using Translation Tools!")
    except Exception as e:
        print(f"Error in after_uninstall: {str(e)}")