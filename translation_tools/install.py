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

        # Create necessary doctypes
        from translation_tools.translation_tools.setup.create_doctypes import create_glossary_doctypes, create_po_file_doctypes
        create_glossary_doctypes()
        create_po_file_doctypes()

        # Import default glossary
        print("Importing default Thai glossary...")
        from translation_tools.translation_tools.setup.import_default_glossary import import_default_glossary_terms
        glossary_result = import_default_glossary_terms()
        print(f"Imported {glossary_result} default glossary terms")

        # Initial scan of PO files
        print("Starting initial scan of PO files...")
        from translation_tools.translation_tools.api import scan_po_files
        scan_result = scan_po_files()
        if scan_result.get("success"):
            print(f"Found {scan_result['total_files']} PO files")
        else:
            print(f"Error scanning PO files: {scan_result.get('error')}")

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
