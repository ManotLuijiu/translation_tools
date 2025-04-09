import frappe
import json
from frappe import _
from frappe.utils import cint
from .common import logger

@frappe.whitelist()
def get_glossary_terms():
    """Get all glossary terms"""
    return frappe.get_all(
        "Translation Glossary Term",
        fields=["name", "source_term", "thai_translation", "context", "category", "module", "is_approved"],
        order_by="source_term"
    )

def get_glossary_terms_dict():
    """Get glossary terms as a dictionary for AI context"""
    terms = get_glossary_terms()
    return {term.source_term: term.thai_translation for term in terms if term.is_approved}

@frappe.whitelist()
def add_glossary_term(term):
    """Add a new glossary term"""
    term_data = frappe._dict(term) if isinstance(term, dict) else frappe._dict(json.loads(term))
    
    doc = frappe.new_doc("Translation Glossary Term")
    doc.source_term = term_data.source_term
    doc.thai_translation = term_data.thai_translation
    
    if term_data.context:
        doc.context = term_data.context
    
    if term_data.category:
        doc.category = term_data.category
    
    if term_data.module:
        doc.module = term_data.module
    
    doc.is_approved = cint(term_data.is_approved)
    
    doc.insert()
    frappe.db.commit()
    
    return {"success": True, "name": doc.name}

@frappe.whitelist()
def update_glossary_term(term_name, updates):
    """Update a glossary term"""
    updates_data = frappe._dict(updates) if isinstance(updates, dict) else frappe._dict(json.loads(updates))
    
    doc = frappe.get_doc("Translation Glossary Term", term_name)
    
    # Update fields
    if "source_term" in updates_data:
        doc.source_term = updates_data.source_term
    
    if "thai_translation" in updates_data:
        doc.thai_translation = updates_data.thai_translation
    
    if "context" in updates_data:
        doc.context = updates_data.context
    
    if "category" in updates_data:
        doc.category = updates_data.category
    
    if "module" in updates_data:
        doc.module = updates_data.module
    
    if "is_approved" in updates_data:
        doc.is_approved = cint(updates_data.is_approved)
    
    doc.save()
    frappe.db.commit()
    
    return {"success": True}

@frappe.whitelist()
def delete_glossary_term(term_name):
    """Delete a glossary term"""
    frappe.delete_doc("Translation Glossary Term", term_name)
    frappe.db.commit()
    
    return {"success": True}

@frappe.whitelist()
def get_erpnext_modules():
    """Get all ERPNext modules"""
    return frappe.get_all(
        "ERPNext Module",
        fields=["name", "module_name", "description"],
        order_by="module_name"
    )