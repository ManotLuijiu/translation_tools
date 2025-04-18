import frappe


def create_sarabun_theme():
    """Create a custom theme with Sarabun font"""
    if not frappe.db.exists("Website Theme", "Sarabun Theme"):
        theme = frappe.get_doc(
            {
                "doctype": "Website Theme",
                "name": "Sarabun Theme",
                "theme": "Standard",
                "custom": 1,
            }
        )

        # Add custom CSS to override fonts
        theme.custom_scss = """
        @font-face {
            font-family: 'Sarabun';
            src: url('/assets/translation_tools/fonts/Sarabun/Sarabun-Regular.ttf') format('truetype');
            font-weight: normal;
            font-style: normal;
        }
        
        @font-face {
            font-family: 'Sarabun';
            src: url('/assets/translation_tools/fonts/Sarabun/Sarabun-Bold.ttf') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
        
        :root {
            --font-stack: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', sans-serif !important;
        }
        
        body {
            font-family: var(--font-stack);
        }
        """

        theme.insert()

        # Set as default theme
        website_settings = frappe.get_doc("Website Settings")
        website_settings.website_theme = "Sarabun Theme"
        website_settings.save()

        frappe.db.commit()
        print("✅ Created and set Sarabun Theme as default")
