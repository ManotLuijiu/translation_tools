import frappe
import os
from frappe import _

def import_default_glossary_terms():
    """Import default glossary terms from the Thai glossary file"""
    try:
        # Import the glossary module
        from translation_tools.translation_tools.utils.thai_glossary import GLOSSARY
        
        # Counter for imported terms
        imported_count = 0
        
        # Get the existing ERPNext modules or create a default one
        default_module = None
        modules = frappe.get_all("ERPNext Module", limit=1)
        if modules:
            default_module = modules[0].name
        else:
            # Create a default ERPNext module
            module_doc = frappe.new_doc("ERPNext Module")
            module_doc.module_name = "General"
            module_doc.description = "General ERPNext terms"
            module_doc.priority = 0
            module_doc.insert()
            default_module = module_doc.name
        
        # Process each term in the glossary
        for source_term, thai_translation in GLOSSARY.items():
            # Skip if the term already exists
            if frappe.db.exists("Translation Glossary Term", {"source_term": source_term}):
                continue
            
            # Create new glossary term
            term_doc = frappe.new_doc("Translation Glossary Term")
            term_doc.source_term = source_term
            term_doc.thai_translation = thai_translation
            
            # Assign category based on term content
            if "Invoice" in source_term or "Order" in source_term or "Customer" in source_term or "Supplier" in source_term:
                term_doc.category = "Business"
            elif "Date" in source_term or "Time" in source_term or "Year" in source_term or "Month" in source_term:
                term_doc.category = "Date/Time"
            elif "Pending" in source_term or "Completed" in source_term or "Cancelled" in source_term:
                term_doc.category = "Status"
            else:
                term_doc.category = "Technical"
            
            # Set module and approval
            term_doc.module = default_module
            term_doc.is_approved = 1  # All imported terms are approved by default
            
            # Save the term
            term_doc.insert()
            imported_count += 1
        
        frappe.db.commit()
        return imported_count
        
    except Exception as e:
        frappe.log_error(f"Error importing default glossary terms: {e}")
        return 0