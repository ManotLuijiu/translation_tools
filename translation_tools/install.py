import os
import subprocess
from frappe import _


def after_install():
    """Run setup operations after app installation"""
    try:
        # Get the bench directory (parent of the sites directory)
        bench_dir = os.path.abspath(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
        )

        print(f"bench_dir: {bench_dir}")

        # Path to the setup script
        setup_script = os.path.join(
            bench_dir, "apps", "translation_tools", "translation_tools", "setup.sh"
        )

        print(f"setup_script_dir: {setup_script}")

        # Make the script executable
        subprocess.check_call(["chmod", "+x", setup_script])

        # Execute the setup script
        subprocess.check_call([setup_script], cwd=bench_dir)

        print("✅ Translation Tools setup completed successfully")

    except Exception as e:
        print(f"❌ Error during Translation Tools setup: {str(e)}")
        print(
            "Please run the setup script manually: ./apps/translation_tools/translation_tools/setup.sh"
        )

        # Print instruction for manual setup
        print("\n")
        print("=" * 80)
        print("Translation Tools has been installed successfully!")
        print("=" * 80)
        print("\nTo complete setup, please run:")
        print(f"\n    cd {bench_dir}")
        print("    ./apps/translation_tools/translation_tools/setup.sh")
        print("\nThis will install required dependencies and configure your API keys.")
        print("=" * 80)
