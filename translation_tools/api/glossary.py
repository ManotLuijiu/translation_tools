import json

import frappe
from frappe import _
from frappe.utils import cint, now_datetime

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
def delete_glossary_term(term_name, push_to_github=False):
    """Delete a glossary term"""
    # Convert push_to_github to boolean if it's a string
    if isinstance(push_to_github, str):
        push_to_github = push_to_github.lower() == "true"
    
    frappe.delete_doc("Translation Glossary Term", term_name)
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
def sync_glossary_from_github():
    """Sync glossary terms from GitHub repository JSON file"""
    import requests
    import json
    import tempfile
    import os
    
    logger.info("Starting GitHub glossary sync from JSON")
    print("DEBUG: Starting sync_glossary_from_github()")
    
    try:
        # Get GitHub settings from Translation Tools Settings
        settings = frappe.get_single("Translation Tools Settings")
        github_repo = settings.github_repo or ""
        
        # Get GitHub token
        from .settings import get_github_token
        github_token = get_github_token()
        
        print(f"DEBUG: GitHub repo: {github_repo}")
        print(f"DEBUG: GitHub token exists: {bool(github_token)}")
        
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
        
        # Parse repository owner and name
        if github_repo.startswith("https://github.com/"):
            repo_path = github_repo.replace("https://github.com/", "")
        else:
            repo_path = github_repo
        
        if repo_path.endswith('.git'):
            repo_path = repo_path[:-4]
        
        repo_parts = repo_path.strip("/").split("/")
        if len(repo_parts) != 2:
            return {
                "success": False,
                "message": f"Invalid GitHub repository URL format: {github_repo}. Expected format: https://github.com/owner/repo",
                "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
            }
        
        owner, repo = repo_parts
        file_path = "glossary/thai_glossary.json"  # JSON file in glossary folder
        
        # Build GitHub API URL to get the file
        api_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
        
        print(f"DEBUG: Fetching from API URL: {api_url}")
        logger.info(f"Syncing glossary from: {api_url}")
        
        # Download the file from GitHub with authentication
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        response = requests.get(api_url, headers=headers, timeout=30)
        print(f"DEBUG: GitHub API response status: {response.status_code}")
        
        if response.status_code == 404:
            return {
                "success": False,
                "message": f"Glossary file not found in GitHub repository at {file_path}",
                "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
            }
        
        response.raise_for_status()
        
        # Get the file content (it's base64 encoded)
        file_data = response.json()
        import base64
        file_content = base64.b64decode(file_data['content']).decode('utf-8')
        
        print(f"DEBUG: Downloaded file size: {len(file_content)} bytes")
        
        # Parse JSON content
        glossary_data = json.loads(file_content)
        
        print(f"DEBUG: JSON parsed successfully")
        print(f"DEBUG: Found {glossary_data.get('terms_count', 0)} terms in JSON")
        print(f"DEBUG: JSON version: {glossary_data.get('version', 'unknown')}")
        
        # Get existing terms from database
        existing_terms = frappe.get_all(
            "Translation Glossary Term", 
            fields=["name", "source_term", "thai_translation", "context", "category", "module", "is_approved"], 
            as_list=False
        )
        
        print(f"DEBUG: Found {len(existing_terms)} existing terms in database")
        
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
                print(f"DEBUG: Processing term: {source_term}")
                
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
                        print(f"DEBUG: Updated term '{source_term}'")
                        logger.info(f"Updated term '{source_term}'")
                    else:
                        stats["skipped"] += 1
                        print(f"DEBUG: Skipped unchanged term '{source_term}'")
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
                    print(f"DEBUG: Added new term '{source_term}'")
                    logger.info(f"Added new term '{source_term}': '{term_data.get('translation')}'")
                    
            except Exception as e:
                print(f"DEBUG: Error processing term '{source_term}': {str(e)}")
                logger.error(f"Error processing term '{source_term}': {str(e)}")
                stats["errors"] += 1
        
        frappe.db.commit()
        
        message = f"GitHub sync completed: {stats['added']} added, {stats['updated']} updated, {stats['skipped']} skipped, {stats['errors']} errors"
        print(f"DEBUG: {message}")
        logger.info(message)
        
        return {
            "success": True,
            "message": message,
            "stats": stats
        }
        
    except requests.RequestException as e:
        error_msg = f"Failed to fetch glossary from GitHub: {str(e)}"
        print(f"DEBUG ERROR: {error_msg}")
        logger.error(error_msg)
        return {
            "success": False,
            "message": error_msg,
            "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
        }
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse JSON from GitHub: {str(e)}"
        print(f"DEBUG ERROR: {error_msg}")
        logger.error(error_msg)
        return {
            "success": False,
            "message": error_msg,
            "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
        }
    except Exception as e:
        error_msg = f"Error syncing glossary from GitHub: {str(e)}"
        print(f"DEBUG ERROR: {error_msg}")
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
    Push ALL glossary terms from database to GitHub repository as JSON file
    
    Returns:
        dict: Result with success status and GitHub push information
    """
    import requests
    import base64
    import json
    import tempfile
    import os
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
        
        if repo_path.endswith('.git'):
            repo_path = repo_path[:-4]
            
        repo_parts = repo_path.strip("/").split("/")
        if len(repo_parts) != 2:
            return {
                "github_pushed": False,
                "message": f"Invalid repository format: {github_repo}"
            }
        
        owner, repo = repo_parts
        file_path = "glossary/thai_glossary.json"  # JSON file in glossary folder
        
        print(f"DEBUG: Repository owner: {owner}")
        print(f"DEBUG: Repository name: {repo}")
        print(f"DEBUG: File path: {file_path}")
        
        # Get ALL glossary terms from database (approved or not)
        terms = frappe.get_all(
            "Translation Glossary Term",
            fields=["source_term", "thai_translation", "context", "category", "module", "is_approved"],
            order_by="source_term"
        )
        
        logger.info(f"Found {len(terms)} terms in database")
        print(f"DEBUG: Found {len(terms)} terms in database")
        
        # Create JSON structure
        glossary_data = {
            "version": "1.0",
            "language": "th",
            "terms_count": len(terms),
            "last_updated": now_datetime().isoformat(),
            "terms": {}
        }
        
        # Add all terms to JSON
        for term in terms:
            glossary_data["terms"][term.source_term] = {
                "translation": term.thai_translation,
                "context": term.context or "",
                "category": term.category or "General",
                "module": term.module or "",
                "is_approved": term.is_approved
            }
        
        # Create temporary file with JSON content
        temp_file_path = None
        try:
            # Create temp directory
            temp_dir = tempfile.mkdtemp()
            temp_file_path = os.path.join(temp_dir, "thai_glossary.json")
            
            # Write JSON to temp file
            with open(temp_file_path, 'w', encoding='utf-8') as f:
                json.dump(glossary_data, f, ensure_ascii=False, indent=2)
            
            # Read the file content for GitHub upload
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                file_content = f.read()
            
            logger.info(f"Created temp JSON file with {len(terms)} terms")
            
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
                
        finally:
            # Clean up temp files
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                logger.info("Cleaned up temp file")
            if temp_dir and os.path.exists(temp_dir):
                os.rmdir(temp_dir)
                logger.info("Cleaned up temp directory")
                
    except Exception as e:
        error_msg = f"Error pushing glossary to GitHub: {str(e)}"
        logger.error(error_msg)
        return {
            "github_pushed": False,
            "message": error_msg
        }


# Removed generate_glossary_file_content function - no longer needed with JSON format
