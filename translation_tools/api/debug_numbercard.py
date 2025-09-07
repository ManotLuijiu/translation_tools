# Debug script for number card data
import frappe


@frappe.whitelist()
def check_glossary_data():
    """Check Translation Glossary Term data for number cards"""
    try:
        # Count total glossary terms
        total_terms = frappe.db.count("Translation Glossary Term")
        
        # Count approved terms
        approved_terms = frappe.db.count("Translation Glossary Term", {"is_approved": 1})
        
        # Count pending terms  
        pending_terms = frappe.db.count("Translation Glossary Term", {"is_approved": 0})
        
        # Get some sample data (use correct field name)
        sample_terms = frappe.get_all(
            "Translation Glossary Term", 
            fields=["name", "source_term", "thai_translation", "is_approved"],
            limit=5
        )
        
        return {
            "success": True,
            "total_terms": total_terms,
            "approved_terms": approved_terms, 
            "pending_terms": pending_terms,
            "sample_terms": sample_terms,
            "site": frappe.local.site
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "site": frappe.local.site
        }


@frappe.whitelist() 
def check_translation_progress():
    """Check the custom translation progress method"""
    try:
        from translation_tools.utils.dashboard import get_translation_progress
        
        result = get_translation_progress()
        
        return {
            "success": True,
            "translation_progress_result": result,
            "site": frappe.local.site
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "site": frappe.local.site
        }