# Sync glossary from public GitHub raw URL
import json
import requests
import frappe
from frappe.utils import now_datetime

from .common import logger


@frappe.whitelist()
def sync_glossary_from_public_github():
    """
    Sync glossary terms from public GitHub raw URL without authentication
    Uses: https://raw.githubusercontent.com/ManotLuijiu/erpnext-thai-translation/refs/heads/main/glossary/thai_glossary.json
    """
    logger.info("Starting GitHub glossary sync from public raw URL")
    
    try:
        # Use the public raw GitHub URL you provided
        public_url = "https://raw.githubusercontent.com/ManotLuijiu/erpnext-thai-translation/main/glossary/thai_glossary.json"
        
        logger.info(f"Syncing glossary from: {public_url}")
        
        # Download the file from GitHub (no authentication needed for raw public files)
        response = requests.get(public_url, timeout=30)
        
        if response.status_code == 404:
            return {
                "success": False,
                "message": f"Glossary file not found at {public_url}",
                "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
            }
        
        response.raise_for_status()
        
        # Parse JSON content directly
        glossary_data = json.loads(response.text)
        
        logger.info(f"Found {len(glossary_data.get('terms', {}))} terms in JSON")
        logger.info(f"JSON version: {glossary_data.get('version', 'unknown')}")
        
        # Get existing terms from database
        existing_terms = frappe.get_all(
            "Translation Glossary Term", 
            fields=["name", "source_term", "thai_translation", "context", "category", "module", "is_approved"], 
            as_list=False
        )
        
        logger.info(f"Found {len(existing_terms)} existing terms in database")
        
        # Convert to dictionary for easier lookup
        existing_terms_dict = {
            term.source_term: term 
            for term in existing_terms
        }
        
        # Statistics for report
        stats = {"added": 0, "updated": 0, "skipped": 0, "errors": 0}
        
        # Process each term from GitHub JSON
        github_terms = glossary_data.get("terms", {})
        
        for source_term, term_data in github_terms.items():
            try:
                if source_term in existing_terms_dict:
                    # Term exists - check if anything changed
                    existing_term = existing_terms_dict[source_term]
                    needs_update = False
                    
                    # Check each field for changes
                    if existing_term.thai_translation != term_data.get("translation"):
                        needs_update = True
                    if existing_term.context != term_data.get("context", ""):
                        needs_update = True
                    if existing_term.category != term_data.get("category", "General"):
                        needs_update = True
                    if existing_term.module != term_data.get("module", ""):
                        needs_update = True
                    if existing_term.is_approved != term_data.get("is_approved", 1):
                        needs_update = True
                    
                    if needs_update:
                        # Update existing term
                        doc = frappe.get_doc("Translation Glossary Term", existing_term.name)
                        doc.thai_translation = term_data.get("translation")
                        doc.context = term_data.get("context", "")
                        doc.category = term_data.get("category", "General")
                        doc.module = term_data.get("module", "")
                        doc.is_approved = term_data.get("is_approved", 1)
                        doc.save()
                        stats["updated"] += 1
                        logger.info(f"Updated term '{source_term}'")
                    else:
                        stats["skipped"] += 1
                else:
                    # Add new term
                    doc = frappe.new_doc("Translation Glossary Term")
                    doc.source_term = source_term
                    doc.thai_translation = term_data.get("translation")
                    doc.context = term_data.get("context", "")
                    doc.category = term_data.get("category", "General")
                    doc.module = term_data.get("module", "")
                    doc.is_approved = term_data.get("is_approved", 1)
                    doc.insert()
                    stats["added"] += 1
                    logger.info(f"Added new term '{source_term}': '{term_data.get('translation')}'")
                    
            except Exception as e:
                logger.error(f"Error processing term '{source_term}': {str(e)}")
                stats["errors"] += 1
        
        frappe.db.commit()
        
        message = f"GitHub sync completed: {stats['added']} added, {stats['updated']} updated, {stats['skipped']} skipped, {stats['errors']} errors"
        logger.info(message)
        
        return {
            "success": True,
            "message": message,
            "stats": stats,
            "site": frappe.local.site
        }
        
    except requests.RequestException as e:
        error_msg = f"Failed to fetch glossary from GitHub: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "message": error_msg,
            "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
        }
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse JSON from GitHub: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "message": error_msg,
            "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
        }
    except Exception as e:
        error_msg = f"Error syncing glossary from GitHub: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "message": error_msg,
            "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
        }