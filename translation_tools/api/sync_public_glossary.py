# Sync glossary from GitHub raw URL (supports private repos via PAT)
import json
import requests
import frappe
from frappe.utils import now_datetime

from .common import logger


def _get_github_headers():
    """Build HTTP headers for GitHub API requests.
    Reads github_pat_token from site_config.json or common_site_config.json."""
    headers = {"Accept": "application/vnd.github+json"}
    token = frappe.conf.get("github_pat_token")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _get_glossary_url():
    """
    Determine which GitHub URL to use for glossary sync.
    Checks Translation Tools Settings for github_enable and use_own_repo.
    Returns tuple: (url, source_name)

    Logic (matches frontend GithubIntegrationSettings.tsx):
    - github_enable = false → no GitHub sync (return public repo)
    - github_enable = true AND use_own_repo = true → use custom github_repo
    - github_enable = true AND use_own_repo = false → use default public repo
    """
    # Default public repo (no auth needed)
    default_public_url = "https://raw.githubusercontent.com/ManotLuijiu/erpnext-thai-translation/main/glossary/thai_glossary.json"

    try:
        # Check Translation Tools Settings
        settings = frappe.get_single("Translation Tools Settings")
        github_enable = getattr(settings, "github_enable", 0)
        github_repo = getattr(settings, "github_repo", None)

        # Compute use_own_repo (same logic as backend settings.py)
        default_repo_normalized = "https://github.com/ManotLuijiu/erpnext-thai-translation".strip().rstrip("/").rstrip(".git")
        repo_normalized = (github_repo or "").strip().rstrip("/").rstrip(".git")
        use_own_repo = bool(github_repo and repo_normalized != default_repo_normalized)

        logger.info(f"Glossary sync settings: github_enable={github_enable}, use_own_repo={use_own_repo}, github_repo={github_repo}")

        if github_enable and use_own_repo and github_repo and github_repo.strip():
            # Use custom repo - derive raw URL from git URL
            # Convert https://github.com/org/repo.git -> https://raw.githubusercontent.com/org/repo/BRANCH/glossary/...
            repo_url = github_repo.strip().rstrip("/").rstrip(".git")
            logger.info(f"Using custom GitHub repo: {repo_url}")

            # Extract org and repo name
            parts = repo_url.replace("https://github.com/", "").split("/")
            if len(parts) >= 2:
                org = parts[0]
                repo = parts[1]

                # Determine branch - use version-16 for private repo (ManotLuijiu convention)
                if "private" in repo.lower():
                    branch = "version-16"
                else:
                    branch = "main"

                raw_url = f"https://raw.githubusercontent.com/{org}/{repo}/{branch}/glossary/thai_glossary.json"
                logger.info(f"Custom glossary URL: {raw_url}")
                return raw_url, f"custom repo ({org}/{repo})"

        # Fallback to default public repo
        return default_public_url, "public repo"

    except Exception as e:
        logger.warning(f"Could not read Translation Tools Settings: {e}")
        return default_public_url, "public repo (fallback)"


@frappe.whitelist()
def sync_glossary_from_public_github():
    """
    Sync glossary terms from GitHub.
    - If github_enable is set in Translation Tools Settings, uses custom github_repo URL
    - Otherwise falls back to public repo
    - Supports private repos via github_pat_token in site_config
    """
    logger.info("Starting GitHub glossary sync")

    try:
        glossary_url, source_name = _get_glossary_url()
        logger.info(f"Syncing glossary from: {glossary_url} (source: {source_name})")

        # Use PAT token for private repo access
        response = requests.get(glossary_url, headers=_get_github_headers(), timeout=30)

        if response.status_code == 404:
            return {
                "success": False,
                "message": f"Glossary file not found at {glossary_url} ({source_name})",
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
        error_msg = f"Failed to fetch glossary from {glossary_url}: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "message": error_msg,
            "stats": {"added": 0, "updated": 0, "skipped": 0, "errors": 1}
        }
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse JSON from {glossary_url}: {str(e)}"
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