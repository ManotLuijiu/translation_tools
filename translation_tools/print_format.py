import frappe


def before_save(doc, method):
    # Set default font to Sarabun for new print formats
    if not doc.css:
        doc.css = """
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap');
        
        body {
            font-family: 'Sarabun', sans-serif;
        }
        """
