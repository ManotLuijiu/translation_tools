import frappe

def setup_all_doctypes():
    """Set up all DocTypes and initial data for Translation Tools"""
    from translation_tools.setup.create_doctypes import (
        create_glossary_doctypes,
        create_po_file_doctypes,
        create_translation_settings_doctype
    )
    from translation_tools.setup.import_default_glossary import import_default_glossary_terms
    from translation_tools.translation_tools.api import scan_po_files
    
    print("Creating DocTypes...")
    create_glossary_doctypes()
    create_po_file_doctypes()
    create_translation_settings_doctype()
    
    print("Importing default glossary terms...")
    imported_count = import_default_glossary_terms()
    print(f"Imported {imported_count} glossary terms")
    
    print("Scanning PO files...")
    scan_result = scan_po_files()
    if scan_result.get("success"):
        print(f"Found {scan_result['total_files']} PO files")
    else:
        print(f"Error scanning PO files: {scan_result.get('error', 'Unknown error')}")
    
    print("Setup completed successfully!")

if __name__ == "__main__":
    setup_all_doctypes()