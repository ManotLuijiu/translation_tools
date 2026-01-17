import frappe
from frappe import _
import os
import tempfile
import requests
import polib
import re
from urllib.parse import urlparse
import difflib
from .po_files import validate_file_path
from .common import get_bench_path

# Constants for performance tuning
HTTP_TIMEOUT = 30  # seconds
BATCH_SIZE = 500  # entries per batch before commit
MAX_FUZZY_CANDIDATES = 100  # limit fuzzy matching candidates
FUZZY_MATCH_THRESHOLD = 0.9


@frappe.whitelist()
def find_translation_files(repo_url, branch="main", target_language="th"):
    """Find PO translation files in a GitHub repository"""
    try:
        # Parse the GitHub URL
        parsed_url = urlparse(repo_url)

        if "github.com" not in parsed_url.netloc:
            frappe.throw(_("Only GitHub repositories are supported"))

        # Extract owner and repo name from path
        path_parts = parsed_url.path.strip("/").split("/")

        if len(path_parts) < 2:
            frappe.throw(_("Invalid GitHub repository URL"))

        owner = path_parts[0]

        # Handle repo names that might end with .git
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]  # Remove .git suffix

        # Use GitHub API to fetch repository contents
        api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"

        response = requests.get(api_url, timeout=HTTP_TIMEOUT)

        if response.status_code != 200:
            frappe.throw(
                _("Error accessing GitHub repository: {0}").format(
                    response.json().get("message")
                )
            )

        # Look for .po files matching the target language
        po_files = []
        for item in response.json().get("tree", []):
            if item["type"] == "blob" and item["path"].endswith(".po"):
                # Calculate a match score based on the file path
                # Prioritize files with target language in the name
                match_score = 0
                if f"/{target_language}.po" in item["path"] or item["path"].endswith(
                    f"{target_language}.po"
                ):
                    match_score = 1.0
                elif target_language in item["path"]:
                    match_score = 0.8
                else:
                    match_score = 0.3

                po_files.append({"path": item["path"], "matchScore": match_score})

        # Sort by match score (highest first)
        po_files.sort(key=lambda x: x["matchScore"], reverse=True)

        return {"success": True, "files": po_files}

    except Exception as e:
        frappe.log_error(f"GitHub sync error: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def preview_sync(repo_url, branch, repo_files, local_file_path):
    """Preview changes that would be made by syncing with GitHub files"""
    try:
        # Parse the GitHub URL
        parsed_url = urlparse(repo_url)
        if "github.com" not in parsed_url.netloc:
            frappe.throw(_("Only GitHub repositories are supported"))

        # Extract owner and repo name from path
        path_parts = parsed_url.path.strip("/").split("/")
        if len(path_parts) < 2:
            frappe.throw(_("Invalid GitHub repository URL"))

        owner = path_parts[0]
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]

        # Extract app name from the path
        path_parts = local_file_path.split("/")
        if len(path_parts) >= 2 and path_parts[0] == "apps":
            app_name = path_parts[1]
        else:
            app_name = path_parts[0]

        corrected_path = f"apps/{app_name}/{app_name}/locale/th.po"
        resolved_path = validate_file_path(corrected_path)

        if not os.path.exists(resolved_path):
            frappe.throw(_("Local PO file not found"))

        local_po = polib.pofile(resolved_path)

        # Count totals for preview
        added = 0
        updated = 0
        unchanged = 0
        github_entries_total = 0
        github_translated = 0
        github_untranslated = 0
        local_translated = len([e for e in local_po if e.msgstr])
        local_untranslated = len([e for e in local_po if not e.msgstr])

        # Create a dictionary of existing translations for O(1) lookup
        existing_translations = {entry.msgid: entry.msgstr for entry in local_po if entry.msgid}

        # Process each selected GitHub file
        for repo_file_path in repo_files:
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{repo_file_path}"

            try:
                response = requests.get(raw_url, timeout=HTTP_TIMEOUT)
            except requests.exceptions.RequestException:
                continue

            if response.status_code != 200:
                continue

            with tempfile.NamedTemporaryFile(suffix=".po", delete=False) as temp_file:
                temp_file.write(response.content)
                temp_file_path = temp_file.name

            try:
                github_po = polib.pofile(temp_file_path)

                github_entries_total += len(github_po)
                github_translated += len([e for e in github_po if e.msgstr])
                github_untranslated += len([e for e in github_po if not e.msgstr])

                # Check each entry for potential changes
                for entry in github_po:
                    if not entry.msgid or not entry.msgstr:
                        continue

                    if entry.msgid in existing_translations:
                        if existing_translations[entry.msgid]:
                            if existing_translations[entry.msgid] != entry.msgstr:
                                updated += 1
                            else:
                                unchanged += 1
                        else:
                            added += 1
                    else:
                        added += 1
            finally:
                os.unlink(temp_file_path)

        return {
            "success": True,
            "preview": {
                "added": added,
                "updated": updated,
                "unchanged": unchanged,
                "github_entries": github_entries_total,
                "local_entries": len(local_po),
                "github_translated": github_translated,
                "github_untranslated": github_untranslated,
                "local_translated": local_translated,
                "local_untranslated": local_untranslated,
            },
        }

    except Exception as e:
        frappe.log_error(f"GitHub sync preview error: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def apply_sync(repo_url, branch, repo_files, local_file_path, run_async=False):
    """Apply translations from GitHub files to local PO file

    Args:
        repo_url: GitHub repository URL
        branch: Branch name
        repo_files: List of PO file paths in the repository
        local_file_path: Local PO file path
        run_async: If True, run in background job (recommended for large files)

    Returns:
        dict with success status and changes count
    """
    # For large syncs, run in background
    if run_async:
        frappe.enqueue(
            'translation_tools.api.github_sync._apply_sync_worker',
            repo_url=repo_url,
            branch=branch,
            repo_files=repo_files,
            local_file_path=local_file_path,
            queue='long',
            timeout=1800,  # 30 minutes for large files
            job_name=f"github_sync_{local_file_path}"
        )
        return {
            "success": True,
            "message": _("Sync started in background. Check Translation History for results."),
            "async": True
        }

    return _apply_sync_internal(repo_url, branch, repo_files, local_file_path)


def _apply_sync_worker(repo_url, branch, repo_files, local_file_path):
    """Background worker for apply_sync"""
    try:
        result = _apply_sync_internal(repo_url, branch, repo_files, local_file_path)
        frappe.publish_realtime(
            'github_sync_complete',
            {
                'local_file_path': local_file_path,
                'result': result
            },
            after_commit=True
        )
    except Exception as e:
        frappe.log_error(f"Background GitHub sync failed: {str(e)}")
        frappe.publish_realtime(
            'github_sync_complete',
            {
                'local_file_path': local_file_path,
                'result': {'success': False, 'error': str(e)}
            },
            after_commit=True
        )


def _apply_sync_internal(repo_url, branch, repo_files, local_file_path):
    """Internal implementation of apply_sync with optimizations"""
    try:
        # Parse the GitHub URL
        parsed_url = urlparse(repo_url)
        if "github.com" not in parsed_url.netloc:
            frappe.throw(_("Only GitHub repositories are supported"))

        # Extract owner and repo name from path
        path_parts = parsed_url.path.strip("/").split("/")
        if len(path_parts) < 2:
            frappe.throw(_("Invalid GitHub repository URL"))

        owner = path_parts[0]
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]

        # Extract app name from the path
        path_parts = local_file_path.split("/")
        if len(path_parts) >= 2 and path_parts[0] == "apps":
            app_name = path_parts[1]
        else:
            app_name = path_parts[0]

        corrected_path = f"apps/{app_name}/{app_name}/locale/th.po"
        resolved_path = validate_file_path(corrected_path)

        if not os.path.exists(resolved_path):
            frappe.throw(_("Local PO file not found"))

        local_po = polib.pofile(resolved_path)

        # Create dictionary for O(1) lookup
        local_entries = {entry.msgid: entry for entry in local_po if entry.msgid}

        # Changes counters
        added = 0
        updated = 0
        unchanged = 0
        processed = 0

        # Process each selected GitHub file
        for repo_file_path in repo_files:
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{repo_file_path}"

            try:
                response = requests.get(raw_url, timeout=HTTP_TIMEOUT)
            except requests.exceptions.Timeout:
                frappe.log_error(f"Timeout fetching {raw_url}")
                continue
            except requests.exceptions.RequestException as e:
                frappe.log_error(f"Error fetching {raw_url}: {str(e)}")
                continue

            if response.status_code != 200:
                continue

            with tempfile.NamedTemporaryFile(suffix=".po", delete=False) as temp_file:
                temp_file.write(response.content)
                temp_file_path = temp_file.name

            try:
                github_po = polib.pofile(temp_file_path)
                total_entries = len(github_po)

                # Build index of unmatched local entries for fuzzy matching (OPTIMIZATION)
                # Only include entries without translations as candidates
                unmatched_local = {
                    entry.msgid: entry
                    for entry in local_po
                    if entry.msgid and not entry.msgstr
                }

                for github_entry in github_po:
                    if not github_entry.msgid or not github_entry.msgstr:
                        continue

                    processed += 1

                    if github_entry.msgid in local_entries:
                        local_entry = local_entries[github_entry.msgid]

                        if local_entry.msgstr:
                            if local_entry.msgstr != github_entry.msgstr:
                                local_entry.msgstr = github_entry.msgstr
                                updated += 1
                            else:
                                unchanged += 1
                        else:
                            local_entry.msgstr = github_entry.msgstr
                            added += 1
                            # Remove from unmatched since it now has translation
                            unmatched_local.pop(github_entry.msgid, None)
                    else:
                        # OPTIMIZED FUZZY MATCHING:
                        # Only search through limited candidates, not all entries
                        # This reduces O(n²) to O(n * k) where k is MAX_FUZZY_CANDIDATES
                        best_match = None
                        best_ratio = FUZZY_MATCH_THRESHOLD

                        # Limit candidates for fuzzy matching
                        candidates = list(unmatched_local.items())[:MAX_FUZZY_CANDIDATES]

                        for local_msgid, local_entry in candidates:
                            ratio = difflib.SequenceMatcher(
                                None, local_msgid, github_entry.msgid
                            ).ratio()
                            if ratio > best_ratio:
                                best_ratio = ratio
                                best_match = local_entry

                        if best_match:
                            best_match.msgstr = github_entry.msgstr
                            added += 1
                            # Remove matched entry from candidates
                            unmatched_local.pop(best_match.msgid, None)

                    # Log progress for large files (every 1000 entries)
                    if processed % 1000 == 0:
                        frappe.logger().info(
                            f"GitHub sync progress: {processed}/{total_entries} entries processed"
                        )
            finally:
                os.unlink(temp_file_path)

        # Save the updated local PO file
        local_po.save(resolved_path)
        frappe.logger().info(
            f"GitHub sync complete: {added} added, {updated} updated, {unchanged} unchanged"
        )

        # Update database cache
        _update_po_file_cache(resolved_path)

        return {
            "success": True,
            "changes": {"added": added, "updated": updated, "unchanged": unchanged},
        }

    except Exception as e:
        frappe.log_error(f"GitHub sync error: {str(e)}")
        return {"success": False, "error": str(e)}


def _update_po_file_cache(resolved_path):
    """Update the PO File DocType cache after sync"""
    try:
        from translation_tools.api.po_files import process_po_file
        bench_path = get_bench_path()

        file_data = process_po_file(resolved_path, bench_path)
        if file_data:
            relative_path = os.path.relpath(resolved_path, bench_path)
            po_doc_name = relative_path

            if frappe.db.exists("PO File", po_doc_name):
                existing_doc = frappe.get_doc("PO File", po_doc_name)
                existing_doc.translated_entries = file_data.get('translated_entries', existing_doc.translated_entries)
                existing_doc.total_entries = file_data.get('total_entries', existing_doc.total_entries)
                existing_doc.translation_status = file_data.get('translated_percentage', existing_doc.translation_status)
                existing_doc.last_modified = file_data.get('last_modified', existing_doc.last_modified)
                existing_doc.save(ignore_permissions=True)
                frappe.db.commit()
    except Exception as cache_error:
        frappe.logger().warning(f"Could not update database cache: {str(cache_error)}")
