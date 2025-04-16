import os
import sys
import subprocess
import platform

def check_dependencies():
    """Check if WeasyPrint dependencies are installed and install if needed"""
    print("Checking WeasyPrint dependencies...")
    
    system = platform.system()
    missing_deps = []
    
    if system == "Linux":
        # Check for common Linux dependencies
        deps = {
            "cairo": "libcairo2",
            "pango": "libpango-1.0-0",
            "pangocairo": "libpangocairo-1.0-0",
            "gdk-pixbuf": "libgdk-pixbuf2.0-0",
        }
        
        # Detect distribution
        distro = ""
        if os.path.exists("/etc/debian_version"):
            distro = "debian"
            # Check using dpkg
            for dep_name, package in deps.items():
                try:
                    result = subprocess.run(
                        ["dpkg", "-s", package], 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE,
                        text=True
                    )
                    if result.returncode != 0:
                        missing_deps.append(package)
                except:
                    missing_deps.append(package)
            
            if missing_deps:
                print(f"Missing dependencies: {', '.join(missing_deps)}")
                print("Installing missing dependencies...")
                try:
                    subprocess.run(
                        ["apt-get", "update"], 
                        check=True
                    )
                    subprocess.run(
                        ["apt-get", "install", "-y"] + missing_deps + 
                        ["libffi-dev", "shared-mime-info"],
                        check=True
                    )
                    print("Dependencies installed successfully!")
                except subprocess.CalledProcessError as e:
                    print(f"Failed to install dependencies: {e}")
                    print("Please install them manually.")
                    return False
        
        elif os.path.exists("/etc/redhat-release"):
            distro = "redhat"
            # Redhat/CentOS/Fedora
            # Check using rpm
            redhat_deps = {
                "cairo": "cairo",
                "pango": "pango",
                "gdk-pixbuf": "gdk-pixbuf2",
            }
            
            for dep_name, package in redhat_deps.items():
                try:
                    result = subprocess.run(
                        ["rpm", "-q", package], 
                        stdout=subprocess.PIPE, 
                        stderr=subprocess.PIPE,
                        text=True
                    )
                    if result.returncode != 0:
                        missing_deps.append(package)
                except:
                    missing_deps.append(package)
            
            if missing_deps:
                print(f"Missing dependencies: {', '.join(missing_deps)}")
                print("Installing missing dependencies...")
                try:
                    subprocess.run(
                        ["yum", "install", "-y"] + missing_deps + 
                        ["libffi-devel", "shared-mime-info"],
                        check=True
                    )
                    print("Dependencies installed successfully!")
                except subprocess.CalledProcessError as e:
                    print(f"Failed to install dependencies: {e}")
                    print("Please install them manually.")
                    return False
        
        else:
            print(f"Unsupported Linux distribution. Please install Cairo, Pango, and GDK-PixBuf manually.")
            return False
    
    elif system == "Darwin":  # macOS
        # Check using brew
        deps = ["cairo", "pango", "gdk-pixbuf", "libffi"]
        
        # Check if brew is installed
        try:
            subprocess.run(
                ["which", "brew"], 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                check=True
            )
        except:
            print("Homebrew is not installed. Please install it first: https://brew.sh/")
            return False
        
        # Check each dependency
        for dep in deps:
            try:
                result = subprocess.run(
                    ["brew", "list", dep], 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE,
                    text=True
                )
                if result.returncode != 0:
                    missing_deps.append(dep)
            except:
                missing_deps.append(dep)
        
        if missing_deps:
            print(f"Missing dependencies: {', '.join(missing_deps)}")
            print("Installing missing dependencies...")
            try:
                subprocess.run(
                    ["brew", "install"] + missing_deps,
                    check=True
                )
                print("Dependencies installed successfully!")
            except subprocess.CalledProcessError as e:
                print(f"Failed to install dependencies: {e}")
                print("Please install them manually.")
                return False
    
    elif system == "Windows":
        print("On Windows, WeasyPrint dependencies are handled by the GTK installer.")
        print("Please follow the official WeasyPrint documentation for Windows installation:")
        print("https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows")
        return False
    
    # Now try to import/use weasyprint
    try:
        from weasyprint import HTML
        test_html = "<html><body>Test</body></html>"
        # Try to generate a simple PDF - this will fail if dependencies are missing
        HTML(string=test_html).write_pdf(target=None)
        print("WeasyPrint is working correctly!")
        return True
    except ImportError:
        # WeasyPrint is not installed
        print("WeasyPrint is not installed. Installing...")
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "weasyprint"],
                check=True
            )
            print("WeasyPrint installed successfully!")
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to install WeasyPrint: {e}")
            return False
    except Exception as e:
        print(f"WeasyPrint is installed but encountered an error: {e}")
        print("This may indicate missing or misconfigured dependencies.")
        return False

if __name__ == "__main__":
    success = check_dependencies()
    if success:
        print("All WeasyPrint dependencies are installed and working correctly.")
    else:
        print("There were issues with WeasyPrint dependencies.")
        print("Please install the missing dependencies manually.")