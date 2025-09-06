import json

import frappe
from frappe import _
from frappe.utils import cint

from .common import logger

# from translation_tools.utils.json_logger import get_json_logger

# logger = get_json_logger(console=True)


@frappe.whitelist()
def update_glossary_term_categories():
    """Update categories for existing glossary terms"""
    logger.info("Start update glossary category")

    terms = frappe.get_all(
        "Translation Glossary Term", fields=["name", "source_term"], as_list=False
    )

    # Define categories mapping
    categories = {
        # Business terms
        "Invoice": "Business",
        "Sales Invoice": "Business",
        "Purchase Invoice": "Business",
        "Quotation": "Business",
        "Customer": "Business",
        "Supplier": "Business",
        "Item": "Business",
        "Account": "Business",
        "Journal Entry": "Business",
        "Payment": "Business",
        "Purchase Order": "Business",
        "Sales Order": "Business",
        "Delivery Note": "Business",
        "Receipt": "Business",
        "Sales": "Business",
        "Purchases": "Business",
        "Inventory": "Business",
        "Accounting": "Business",
        "Description": "Business",
        "Quantity": "Business",
        "Unit Price": "Business",
        # Technical terms
        "ERPNext Module": "Technical",
        "CRM": "Technical",
        "All": "Technical",
        "Business": "Technical",
        "Category": "Technical",
        "Context": "Technical",
        "Module": "Technical",
        "Module Name": "Technical",
        # UI terms
        "Loading translation dashboard...": "UI",
        "Print Message": "UI",
        "Priority": "UI",
        "Refresh": "UI",
        "Source Term": "UI",
        "Thai Translation": "UI",
        "Translation Dashboard": "UI",
        # Date/Time terms
        "Date/Time": "Date/Time",
        "Date and Time": "Date/Time",
        "Date": "Date/Time",
        "Time": "Date/Time",
        "Year": "Date/Time",
        "Month": "Date/Time",
        "Day": "Date/Time",
        # Status terms
        "Pending": "Status",
        "Completed": "Status",
        "Cancelled": "Status",
        "Draft": "Status",
        "Submitted": "Status",
        "Paid": "Status",
        "Is Approved": "Status",
        "Is Rejected": "Status",
        "Status": "Status",
    }

    # Statistics
    updated_count = 0

    # Update each term
    for term in terms:
        # Determine category
        category = categories.get(
            term.source_term, "Business"
        )  # Default to Business if not found

        # Update the document
        doc = frappe.get_doc("Translation Glossary Term", term.name)
        if doc.category != category:  # type: ignore
            doc.category = category  # type: ignore
            doc.save()
            updated_count += 1

    frappe.db.commit()
    return {"success": True, "message": f"Updated categories for {updated_count} terms"}


@frappe.whitelist()
def clean_duplicate_glossary_terms():
    """Remove duplicate glossary terms from the database"""
    logger.info("Start delete duplicate glossary")
    terms = frappe.get_all(
        "Translation Glossary Term", fields=["name", "source_term"], as_list=False
    )

    # Track processed terms
    processed_terms = {}
    deleted_count = 0

    for term in terms:
        if term.source_term in processed_terms:
            # This is a duplicate, delete it
            frappe.delete_doc("Translation Glossary Term", term.name)
            deleted_count += 1
        else:
            # First occurrence, mark as processed
            processed_terms[term.source_term] = term.name

    frappe.db.commit()
    return {"success": True, "message": f"Deleted {deleted_count} duplicate terms"}


@frappe.whitelist()
def sync_glossary_from_file():
    """Load glossary from thai_glossary.py and update the database"""
    logger.info("Start sync glossary process")
    try:
        # Import the glossary from file
        from translation_tools.utils.thai_glossary import GLOSSARY

        # Get existing terms from database
        # existing_terms = {term.source_term: term for term in get_glossary_terms()}

        # Get existing terms from database
        existing_terms = frappe.get_all(
            "Translation Glossary Term", fields=["name", "source_term"], as_list=False
        )

        logger.debug(f"existing terms: {existing_terms}")

        # Convert to a dictionary for easier lookup
        existing_terms_dict = {term.source_term: term.name for term in existing_terms}

        # Statistics for report
        stats = {"added": 0, "exists": 0, "errors": 0}

        # Define categories mapping
        categories = {
            # Business terms
            "Invoice": "Business",
            "Sales Invoice": "Business",
            "Purchase Invoice": "Business",
            "Quotation": "Business",
            "Customer": "Business",
            "Supplier": "Business",
            "Item": "Business",
            "Account": "Business",
            "Journal Entry": "Business",
            "Payment": "Business",
            "Purchase Order": "Business",
            "Sales Order": "Business",
            "Delivery Note": "Business",
            "Receipt": "Business",
            "Sales": "Business",
            "Purchases": "Business",
            "Inventory": "Business",
            "Accounting": "Business",
            "Description": "Business",
            "Quantity": "Business",
            "Unit Price": "Business",
            # Technical terms
            "ERPNext Module": "Technical",
            "CRM": "Technical",
            "All": "Technical",
            "Business": "Technical",
            "Category": "Technical",
            "Context": "Technical",
            "Module": "Technical",
            "Module Name": "Technical",
            # UI terms
            "Loading translation dashboard...": "UI",
            "Print Message": "UI",
            "Priority": "UI",
            "Refresh": "UI",
            "Source Term": "UI",
            "Thai Translation": "UI",
            "Translation Dashboard": "UI",
            # Date/Time terms
            "Date/Time": "Date/Time",
            "Date and Time": "Date/Time",
            "Date": "Date/Time",
            "Time": "Date/Time",
            "Year": "Date/Time",
            "Month": "Date/Time",
            "Day": "Date/Time",
            # Status terms
            "Pending": "Status",
            "Completed": "Status",
            "Cancelled": "Status",
            "Draft": "Status",
            "Submitted": "Status",
            "Paid": "Status",
            "Is Approved": "Status",
            "Is Rejected": "Status",
            "Status": "Status",
        }

        # Process each term in the glossary file
        for source_term, thai_translation in GLOSSARY.items():
            try:
                # Skip if term already exists
                if source_term in existing_terms_dict:
                    stats["exists"] += 1
                    continue

                # Determine category
                category = categories.get(
                    source_term, "Business"
                )  # Default to Business if not found

                # Add new term
                doc = frappe.new_doc("Translation Glossary Term")
                doc.source_term = source_term  # type: ignore
                doc.thai_translation = thai_translation  # type: ignore
                doc.is_approved = 1  # type: ignore
                doc.category = category  # type: ignore
                doc.insert()
                stats["added"] += 1

            except Exception as e:
                logger.error(f"Error adding glossary term {source_term}: {str(e)}")
                stats["errors"] += 1

        frappe.db.commit()

        # Log the stats but return the actual terms
        logger.info(
            f"Sync complete: {stats['added']} terms added, {stats['exists']} already exist, {stats['errors']} errors"
        )

        # Return the actual glossary terms directly
        return get_glossary_terms()

    except ImportError:
        logger.error("Could not import GLOSSARY from thai_glossary.py file")
        # Return empty array to avoid frontend errors
        return []
    except Exception as e:
        logger.error(f"Error syncing glossary: {str(e)}")
        return []


@frappe.whitelist()
def get_glossary_terms():
    """Get all glossary terms"""
    logger.info("Start get_glossary_terms")
    return frappe.get_all(
        "Translation Glossary Term",
        fields=[
            "name",
            "source_term",
            "thai_translation",
            "context",
            "category",
            "module",
            "is_approved",
        ],
        order_by="source_term",
    )


def get_glossary_terms_dict():
    """Get glossary terms as a dictionary for AI context"""
    try:
        terms = get_glossary_terms()
        return {
            term.source_term: term.thai_translation for term in terms if term.is_approved
        }
    except Exception as e:
        logger.warning(f"Failed to fetch glossary terms: {e}")
        # Return empty dict as fallback
        return {}


@frappe.whitelist()
def add_glossary_term(term, push_to_github=False):
    """Add a new glossary term"""
    term_data = (
        frappe._dict(term) if isinstance(term, dict) else frappe._dict(json.loads(term))
    )
    
    # Convert push_to_github to boolean if it's a string
    if isinstance(push_to_github, str):
        push_to_github = push_to_github.lower() == "true"

    # Check if a term with the same source and target already exists
    existing_term = frappe.db.exists(
        "Translation Glossary Term",
        {
            "source_term": term_data.source_term,
            "thai_translation": term_data.thai_translation,
        },
    )

    if existing_term:
        return {
            "success": False,
            "message": f"Term already exists with ID: {existing_term}",
            "name": existing_term,
        }

    # If no duplicate found, create a new term
    doc = frappe.new_doc("Translation Glossary Term")
    doc.source_term = term_data.source_term  # type: ignore
    doc.thai_translation = term_data.thai_translation  # type: ignore

    if term_data.context:
        doc.context = term_data.context  # type: ignore

    if term_data.category:
        doc.category = term_data.category  # type: ignore

    if term_data.module:
        doc.module = term_data.module  # type: ignore

    doc.is_approved = cint(term_data.is_approved)  # type: ignore

    doc.insert()
    frappe.db.commit()

    # Push to GitHub if requested
    github_result = {"github_pushed": False}
    if push_to_github:
        github_result = push_glossary_to_github()

    return {
        "success": True, 
        "name": doc.name,
        "github": github_result
    }


@frappe.whitelist()
def update_glossary_term(term_name, updates, push_to_github=False):
    """Update a glossary term"""
    updates_data = (
        frappe._dict(updates)
        if isinstance(updates, dict)
        else frappe._dict(json.loads(updates))
    )
    
    # Convert push_to_github to boolean if it's a string
    if isinstance(push_to_github, str):
        push_to_github = push_to_github.lower() == "true"

    doc = frappe.get_doc("Translation Glossary Term", term_name)

    # Update fields
    if "source_term" in updates_data:
        doc.source_term = updates_data.source_term  # type: ignore

    if "thai_translation" in updates_data:
        doc.thai_translation = updates_data.thai_translation  # type: ignore

    if "context" in updates_data:
        doc.context = updates_data.context  # type: ignore

    if "category" in updates_data:
        doc.category = updates_data.category  # type: ignore

    if "module" in updates_data:
        doc.module = updates_data.module  # type: ignore

    if "is_approved" in updates_data:
        doc.is_approved = cint(updates_data.is_approved)  # type: ignore

    doc.save()
    frappe.db.commit()

    # Push to GitHub if requested
    github_result = {"github_pushed": False}
    if push_to_github:
        github_result = push_glossary_to_github()

    return {
        "success": True,
        "github": github_result
    }


@frappe.whitelist()
def delete_glossary_term(term_name):
    """Delete a glossary term"""
    frappe.delete_doc("Translation Glossary Term", term_name)
    frappe.db.commit()

    return {"success": True}


@frappe.whitelist()
def sync_glossary_from_github():
    """Sync glossary terms from GitHub repository"""
    import requests
    import tempfile
    import os
    
    logger.info("Starting GitHub glossary sync")
    
    try:
        # Get GitHub settings from Translation Tools Settings
        settings = frappe.get_single("Translation Tools Settings")
        github_repo = settings.github_repo or ""
        
        # Get GitHub token
        from .settings import get_github_token
        github_token = get_github_token()
        
        if not github_repo:
            return {
                "success": False,
                "message": "GitHub repository URL not configured. Please set it in Settings > GitHub Integration.",
                "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
            }
        
        if not github_token:
            return {
                "success": False,
                "message": "GitHub token not configured. Please set it in Settings > GitHub Integration.",
                "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
            }
        
        # Build the raw GitHub URL for the thai_glossary.py file
        # Extract owner/repo from the GitHub repo URL
        if github_repo.endswith('.git'):
            github_repo = github_repo[:-4]
        
        repo_parts = github_repo.replace('https://github.com/', '').split('/')
        if len(repo_parts) != 2:
            return {
                "success": False,
                "message": f"Invalid GitHub repository URL format: {github_repo}. Expected format: https://github.com/owner/repo",
                "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
            }
        
        owner, repo = repo_parts
        github_url = f"https://raw.githubusercontent.com/{owner}/{repo}/main/apps/translation_tools/translation_tools/utils/thai_glossary.py"
        
        logger.info(f"Syncing glossary from: {github_url}")
        
        # Download the file from GitHub with authentication
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3.raw"
        }
        response = requests.get(github_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Create a temporary file to store the downloaded content
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
            temp_file.write(response.text)
            temp_file_path = temp_file.name
        
        try:
            # Import the GLOSSARY from the temporary file
            import importlib.util
            spec = importlib.util.spec_from_file_location("github_glossary", temp_file_path)
            github_glossary_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(github_glossary_module)
            
            # Get the GLOSSARY dictionary
            GITHUB_GLOSSARY = github_glossary_module.GLOSSARY
            
            # Get existing terms from database
            existing_terms = frappe.get_all(
                "Translation Glossary Term", 
                fields=["name", "source_term", "thai_translation"], 
                as_list=False
            )
            
            # Convert to dictionary for easier lookup
            existing_terms_dict = {
                term.source_term: {"name": term.name, "translation": term.thai_translation} 
                for term in existing_terms
            }
            
            # Statistics for report
            stats = {"added": 0, "updated": 0, "skipped": 0, "errors": 0}
            
            # Define categories mapping (same as in sync_glossary_from_file)
            categories = {
                # Business terms
                "Invoice": "Business", "Sales Invoice": "Business", "Purchase Invoice": "Business",
                "Quotation": "Business", "Customer": "Business", "Supplier": "Business",
                "Item": "Business", "Account": "Business", "Journal Entry": "Business",
                "Payment": "Business", "Purchase Order": "Business", "Sales Order": "Business",
                "Delivery Note": "Business", "Receipt": "Business", "Sales": "Business",
                "Purchases": "Business", "Inventory": "Business", "Accounting": "Business",
                "Description": "Business", "Quantity": "Business", "Unit Price": "Business",
                # Technical terms
                "ERPNext Module": "Technical", "CRM": "Technical", "All": "Technical",
                "Business": "Technical", "Category": "Technical", "Context": "Technical",
                "Module": "Technical", "Module Name": "Technical",
                # UI terms
                "Loading translation dashboard...": "UI", "Print Message": "UI",
                "Priority": "UI", "Refresh": "UI", "Source Term": "UI",
                "Thai Translation": "UI", "Translation Dashboard": "UI",
                # Date/Time terms
                "Date/Time": "Date/Time", "Date and Time": "Date/Time", "Date": "Date/Time",
                "Time": "Date/Time", "Year": "Date/Time", "Month": "Date/Time", "Day": "Date/Time",
                # Status terms
                "Pending": "Status", "Completed": "Status", "Cancelled": "Status",
                "Draft": "Status", "Submitted": "Status", "Paid": "Status",
                "Is Approved": "Status", "Is Rejected": "Status", "Status": "Status",
            }
            
            # Process each term from GitHub
            for source_term, thai_translation in GITHUB_GLOSSARY.items():
                try:
                    if source_term in existing_terms_dict:
                        # Term exists - check if translation is different
                        existing_translation = existing_terms_dict[source_term]["translation"]
                        if existing_translation != thai_translation:
                            # Update existing term
                            doc = frappe.get_doc("Translation Glossary Term", existing_terms_dict[source_term]["name"])
                            doc.thai_translation = thai_translation
                            doc.save()
                            stats["updated"] += 1
                            logger.info(f"Updated term '{source_term}': '{existing_translation}' -> '{thai_translation}'")
                        else:
                            stats["skipped"] += 1
                    else:
                        # Add new term
                        category = categories.get(source_term, "Business")
                        doc = frappe.new_doc("Translation Glossary Term")
                        doc.source_term = source_term
                        doc.thai_translation = thai_translation
                        doc.is_approved = 1
                        doc.category = category
                        doc.insert()
                        stats["added"] += 1
                        logger.info(f"Added new term '{source_term}': '{thai_translation}'")
                        
                except Exception as e:
                    logger.error(f"Error processing term '{source_term}': {str(e)}")
                    stats["errors"] += 1
            
            frappe.db.commit()
            
            message = f"GitHub sync completed: {stats['added']} added, {stats['updated']} updated, {stats['skipped']} skipped, {stats['errors']} errors"
            logger.info(message)
            
            return {
                "success": True,
                "message": message,
                "stats": stats
            }
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
            
    except requests.RequestException as e:
        error_msg = f"Failed to fetch glossary from GitHub: {str(e)}"
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


@frappe.whitelist()
def get_erpnext_modules():
    """Get all ERPNext modules"""
    return frappe.get_all(
        "ERPNext Module",
        fields=["name", "module_name", "description"],
        order_by="module_name",
    )


@frappe.whitelist()
def test_github_push_integration():
    """Test function to verify GitHub push integration"""
    try:
        # Test that we can import all required functions
        from .settings import get_github_token
        
        # Check GitHub settings
        settings = frappe.get_single("Translation Tools Settings")
        
        # Count approved terms
        terms_count = frappe.db.count("Translation Glossary Term", {"is_approved": 1})
        
        return {
            "success": True,
            "message": f"GitHub push integration test passed. Found {terms_count} approved terms.",
            "github_enabled": settings.github_enable or False,
            "github_repo": settings.github_repo or "Not configured",
            "terms_count": terms_count
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"GitHub push integration test failed: {str(e)}"
        }


def push_glossary_to_github():
    """
    Push glossary terms to GitHub repository by generating a new thai_glossary.py file
    
    Returns:
        dict: Result with success status and GitHub push information
    """
    import requests
    import base64
    import json
    from .settings import get_github_token
    
    try:
        logger.info("Starting push glossary to GitHub")
        
        # Get GitHub settings
        settings = frappe.get_single("Translation Tools Settings")
        if not settings.github_enable:
            return {
                "github_pushed": False,
                "message": "GitHub integration is disabled"
            }
        
        github_repo = settings.github_repo or ""
        github_token = get_github_token()
        
        if not github_repo or not github_token:
            return {
                "github_pushed": False,
                "message": "GitHub repository or token not configured"
            }
        
        # Parse repository owner and name
        if github_repo.startswith("https://github.com/"):
            repo_path = github_repo.replace("https://github.com/", "")
        else:
            repo_path = github_repo
        
        repo_parts = repo_path.strip("/").split("/")
        if len(repo_parts) != 2:
            return {
                "github_pushed": False,
                "message": f"Invalid repository format: {github_repo}"
            }
        
        owner, repo = repo_parts
        file_path = "translation_tools/thai_glossary.py"
        
        # Get all approved glossary terms from database
        terms = frappe.get_all(
            "Translation Glossary Term",
            fields=["source_term", "thai_translation", "context", "category", "module"],
            filters={"is_approved": 1},
            order_by="source_term"
        )
        
        # Generate the glossary file content
        file_content = generate_glossary_file_content(terms)
        
        # GitHub API headers
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        }
        
        # Get current file SHA if it exists
        get_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
        get_response = requests.get(get_url, headers=headers)
        
        commit_data = {
            "message": f"Update glossary terms - {len(terms)} terms",
            "content": base64.b64encode(file_content.encode('utf-8')).decode('utf-8'),
            "branch": "main"
        }
        
        if get_response.status_code == 200:
            # File exists, need to update it
            current_file = get_response.json()
            commit_data["sha"] = current_file["sha"]
            logger.info(f"Updating existing file {file_path}")
        else:
            # File doesn't exist, create new one
            logger.info(f"Creating new file {file_path}")
        
        # Push to GitHub
        put_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
        response = requests.put(put_url, headers=headers, json=commit_data)
        
        if response.status_code in [200, 201]:
            logger.info(f"Successfully pushed glossary to GitHub: {len(terms)} terms")
            return {
                "github_pushed": True,
                "message": f"Successfully pushed {len(terms)} glossary terms to GitHub",
                "terms_count": len(terms),
                "commit_url": response.json().get("commit", {}).get("html_url", "")
            }
        else:
            error_msg = f"Failed to push to GitHub: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return {
                "github_pushed": False,
                "message": error_msg
            }
            
    except Exception as e:
        error_msg = f"Error pushing glossary to GitHub: {str(e)}"
        logger.error(error_msg)
        return {
            "github_pushed": False,
            "message": error_msg
        }


def generate_glossary_file_content(terms):
    """
    Generate the content for thai_glossary.py file
    
    Args:
        terms (list): List of glossary terms from database
        
    Returns:
        str: Generated Python file content
    """
    
    # File header
    content = '''# Thai Glossary Terms
# Auto-generated from Translation Tools
# This file contains Thai translations for common business terms

thai_glossary = {
'''
    
    # Add each term
    for term in terms:
        source = term.source_term.replace("'", "\\'").replace('"', '\\"')
        translation = term.thai_translation.replace("'", "\\'").replace('"', '\\"')
        
        # Add comment with context and category if available
        comment_parts = []
        if term.context:
            comment_parts.append(f"Context: {term.context}")
        if term.category:
            comment_parts.append(f"Category: {term.category}")
        if term.module:
            comment_parts.append(f"Module: {term.module}")
        
        if comment_parts:
            content += f"    # {' | '.join(comment_parts)}\n"
        
        content += f"    '{source}': '{translation}',\n"
    
    # File footer
    content += '''
}

def get_thai_translation(english_term):
    """Get Thai translation for an English term"""
    return thai_glossary.get(english_term, english_term)

def get_all_terms():
    """Get all glossary terms"""
    return thai_glossary
'''
    
    return content
