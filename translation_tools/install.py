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

        # Path to the setup script
        setup_script = os.path.join(
            bench_dir, "apps", "translation_tools", "translation_tools", "setup.sh"
        )

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
