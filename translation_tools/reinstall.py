import os
import subprocess
import shutil
import frappe
import platform

def reset_installation():
    """Reset and repair the Translation Tools installation"""
    try:
        print("\n")
        print("=" * 80)
        print("Translation Tools Repair Utility")
        print("=" * 80)

        # Get paths
        bench_dir = os.path.abspath(
            os.path.join(frappe.get_app_path("translation_tools"), "..", "..")
        )
        app_dir = os.path.join(bench_dir, "apps", "translation_tools")
        config_file = os.path.join(bench_dir, ".erpnext_translate_config")
        bin_script = os.path.join(bench_dir, "bin", "translate-po")

        # Check if configuration file exists and offer to remove it
        if os.path.exists(config_file):
            print(f"Found existing configuration file: {config_file}")
            response = input(
                "Would you like to remove the existing configuration? [y/N]: "
            )
            if response.lower() == "y":
                os.remove(config_file)
                print("✓ Configuration file removed.")
            else:
                print("Configuration file preserved.")

        # Check if bin script exists and offer to remove it
        if os.path.exists(bin_script):
            print(f"Found existing command script: {bin_script}")
            response = input(
                "Would you like to remove the existing command script? [y/N]: "
            )
            if response.lower() == "y":
                os.remove(bin_script)
                print("✓ Command script removed.")
            else:
                print("Command script preserved.")

        # Reinstall dependencies
        print("\nReinstalling dependencies...")
        setup_script = os.path.join(app_dir, "translation_tools", "setup.sh")

        # Make the script executable
        if platform.system() != "Windows":
            subprocess.check_call(["chmod", "+x", setup_script])
        else:
            print("Skipping chmod on Windows (not required).")

        # Print instructions
        print("\nTo complete the repair, please run the setup script:")
        print(f"\n    cd {bench_dir}")
        print("    ./apps/translation_tools/translation_tools/setup.sh")
        print("\nThis will reinstall required dependencies and reconfigure your setup.")
        print("=" * 80)

    except Exception as e:
        print(f"❌ Error during repair: {str(e)}")
        print(
            "Please try running the setup script manually: ./apps/translation_tools/translation_tools/setup.sh"
        )


if __name__ == "__main__":
    reset_installation()
