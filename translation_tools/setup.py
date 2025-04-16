from setuptools.command.install import install
import subprocess
import sys
import os

class CustomInstallCommand(install):
    def run(self):
        # Run check_dependencies script before installation
        try:
            from translation_tools.setup.check_weasyprint_deps import check_dependencies
            if not check_dependencies():
                print("WARNING: WeasyPrint dependencies may not be properly installed.")
                print("The installation will continue, but PDF generation may not work correctly.")
        except ImportError:
            # If we can't import the module yet, run it after installation
            self.execute(self._post_install, [], 
                         msg="Running WeasyPrint dependency check")
        
        # Proceed with normal installation
        install.run(self)
    
    def _post_install(self):
        script_path = os.path.join(os.path.dirname(__file__), 
                                  "translation_tools/setup/check_weasyprint_deps.py")
        if os.path.exists(script_path):
            subprocess.call([sys.executable, script_path])

# If running directly
if __name__ == "__main__":
    try:
        from translation_tools.setup.check_weasyprint_deps import check_dependencies
        check_dependencies()
    except ImportError:
        print("Module not installed yet. Run 'pip install .' first.")