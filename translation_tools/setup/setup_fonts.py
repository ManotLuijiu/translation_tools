import os
import shutil
import frappe

def setup_sarabun_font():
    """Ensure Sarabun font files are accessible in the public directory"""
    # Path to font files in your app
    app_path = frappe.get_app_path("translation_tools")
    font_source_dir = os.path.join(app_path, "public", "fonts")
    
    # Make sure the directory exists
    os.makedirs(font_source_dir, exist_ok=True)
    
    # List of required font files
    required_fonts = [
        "Sarabun-Regular.ttf",
        "Sarabun-Bold.ttf",
        "Sarabun-Italic.ttf",
        "Sarabun-BoldItalic.ttf"
    ]
    
    # Check if any font files are missing
    missing_fonts = []
    for font in required_fonts:
        if not os.path.exists(os.path.join(font_source_dir, font)):
            missing_fonts.append(font)
    
    if missing_fonts:
        print(f"Warning: The following Sarabun font files are missing: {', '.join(missing_fonts)}")
        print(f"Please place the Sarabun font files in: {font_source_dir}")
    else:
        print("✅ Sarabun font files are present")
    
    # Create CSS directory if it doesn't exist
    css_dir = os.path.join(app_path, "public", "css")
    os.makedirs(css_dir, exist_ok=True)
    
    # Ensure custom_fonts.css exists
    css_file_path = os.path.join(css_dir, "custom_fonts.css")
    if not os.path.exists(css_file_path):
        # This is a fallback - you should create the file manually with proper content
        with open(css_file_path, 'w') as f:
            f.write("/* Custom font definitions */")
        print("Created placeholder custom_fonts.css file")
    
    # Force rebuild assets to ensure CSS is included
    try:
        frappe.utils.execute_in_shell("bench build")
        print("✅ Rebuilt assets to include custom fonts")
    except Exception as e:
        print(f"Warning: Could not rebuild assets: {str(e)}")
        print("Please run 'bench build' manually")