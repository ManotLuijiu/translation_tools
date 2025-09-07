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


@frappe.whitelist()
def find_translation_files(repo_url, branch="main", target_language="th"):
    """Find PO translation files in a GitHub repository"""
    try:
        # Parse the GitHub URL
        parsed_url = urlparse(repo_url)

        print(f"parsed_url {parsed_url}")

        if "github.com" not in parsed_url.netloc:
            frappe.throw(_("Only GitHub repositories are supported"))

        # Extract owner and repo name from path
        path_parts = parsed_url.path.strip("/").split("/")

        print(f"path_parts {path_parts}")

        if len(path_parts) < 2:
            frappe.throw(_("Invalid GitHub repository URL"))

        # owner, repo = path_parts[0], path_parts[1]
        owner = path_parts[0]

        # Handle repo names that might end with .git
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]  # Remove .git suffix

        # Use GitHub API to fetch repository contents
        api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"

        print(f"api_url {api_url}")

        response = requests.get(api_url)

        print(f"response {response}")

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

        print(f"po_files {po_files}")

        return {"success": True, "files": po_files}

    except Exception as e:
        frappe.log_error(f"GitHub sync error: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def preview_sync(repo_url, branch, repo_files, local_file_path):
    """Preview changes that would be made by syncing with GitHub files"""

    print(f"repo_url {repo_url}")
    print(f"branch {branch}")
    print(f"repo_files {repo_files}")
    print(f"local_file_path {local_file_path}")

    try:
        # Parse the GitHub URL
        parsed_url = urlparse(repo_url)
        if "github.com" not in parsed_url.netloc:
            frappe.throw(_("Only GitHub repositories are supported"))

        # Extract owner and repo name from path
        path_parts = parsed_url.path.strip("/").split("/")
        if len(path_parts) < 2:
            frappe.throw(_("Invalid GitHub repository URL"))

        # owner, repo = path_parts[0], path_parts[1]
        owner = path_parts[0]
        # Handle repo names that might end with .git
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]  # Remove .git suffix

        # Extract app name from the path
        app_name = local_file_path.split("/")[0]

        # Correct the path format to match [app_name]/locale/th.po
        corrected_path = f"apps/{app_name}/{app_name}/locale/th.po"

        # Load the local PO file - use the validate_file_path function
        resolved_path = validate_file_path(corrected_path)

        print(f"repo_url after {repo_url}")
        print(f"repo after {repo}")
        print(f"app_name after {app_name}")
        print(f"branch after {branch}")
        print(f"repo_files after {repo_files}")
        print(f"local_file_path after {local_file_path}")
        print(f"resolved_path after {resolved_path}")

        # Load the local PO file
        if not os.path.exists(resolved_path):
            frappe.throw(_("Local PO file not found"))

        local_po = polib.pofile(resolved_path)

        # Count totals for preview
        added = 0
        updated = 0
        unchanged = 0
        github_entries_total = 0
        # local_entries_total = 0
        github_translated = 0
        github_untranslated = 0
        local_translated = len([e for e in local_po if e.msgstr])
        local_untranslated = len([e for e in local_po if not e.msgstr])

        # Create a dictionary of existing translations
        existing_translations = {}
        for entry in local_po:
            if entry.msgid:
                existing_translations[entry.msgid] = entry.msgstr

        # Process each selected GitHub file
        for repo_file_path in repo_files:
            # Get raw content from GitHub
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{repo_file_path}"

            print(f"Fetching Github file from {raw_url}")

            response = requests.get(raw_url)

            if response.status_code != 200:
                continue

            # Create a temporary file
            with tempfile.NamedTemporaryFile(suffix=".po", delete=False) as temp_file:
                temp_file.write(response.content)
                temp_file_path = temp_file.name

            try:
                # Parse the GitHub PO file
                print(f"temp_file_path {temp_file_path}")

                github_po = polib.pofile(temp_file_path)

                print(f"github_po {github_po}")

                github_entries_total += len(github_po)
                github_translated += len([e for e in github_po if e.msgstr])
                github_untranslated += len([e for e in github_po if not e.msgstr])

                print(f"GitHub PO file loaded with {len(github_po)} entries")

                # Check each entry for potential changes
                for entry in github_po:
                    if not entry.msgid or not entry.msgstr:
                        continue

                    print(f"entry.msgid {entry.msgid}")

                    if entry.msgid in existing_translations:
                        if existing_translations[entry.msgid]:
                            # Entry exists and has translation
                            if existing_translations[entry.msgid] != entry.msgstr:
                                updated += 1
                                print(f"Found update for: {entry.msgid[:20]}...")
                            else:
                                unchanged += 1
                        else:
                            # Entry exists but has no translation
                            added += 1
                            print(f"Found new translation for: {entry.msgid[:20]}...")
                    else:
                        # New entry not in local file
                        added += 1
                        print(f"Found completely new entry: {entry.msgid[:20]}...")
            finally:
                # Clean up temp file
                os.unlink(temp_file_path)

        result = {
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

        print(f"Preview result: {result}")
        return result

    except Exception as e:
        print(f"Error in preview_sync: {str(e)}")
        frappe.log_error(f"GitHub sync preview error: {str(e)}")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def apply_sync(repo_url, branch, repo_files, local_file_path):
    """Apply translations from GitHub files to local PO file"""
    try:
        # Parse the GitHub URL
        parsed_url = urlparse(repo_url)
        if "github.com" not in parsed_url.netloc:
            frappe.throw(_("Only GitHub repositories are supported"))

        # Extract owner and repo name from path
        path_parts = parsed_url.path.strip("/").split("/")
        if len(path_parts) < 2:
            frappe.throw(_("Invalid GitHub repository URL"))

        # owner, repo = path_parts[0], path_parts[1]
        owner = path_parts[0]
        # Handle repo names that might end with .git
        repo = path_parts[1]
        if repo.endswith(".git"):
            repo = repo[:-4]  # Remove .git suffix

        # Extract app name from the path
        app_name = local_file_path.split("/")[0]

        # Correct the path format to match [app_name]/locale/th.po
        corrected_path = f"apps/{app_name}/{app_name}/locale/th.po"

        # Load the local PO file - use the validate_file_path function
        resolved_path = validate_file_path(corrected_path)

        print(f"repo_url apply_sync {repo_url}")
        print(f"repo apply_sync {repo}")
        print(f"app_name apply_sync {app_name}")
        print(f"branch apply_sync {branch}")
        print(f"repo_files apply_sync {repo_files}")
        print(f"local_file_path apply_sync {local_file_path}")
        print(f"resolved_path apply_sync {resolved_path}")

        # Load the local PO file
        if not os.path.exists(resolved_path):
            frappe.throw(_("Local PO file not found"))

        local_po = polib.pofile(resolved_path)

        print(f"local_po {local_po}")

        # Create a dictionary of existing entries for quick lookup
        local_entries = {}
        for entry in local_po:
            if entry.msgid:
                local_entries[entry.msgid] = entry

        # Changes counters
        added = 0
        updated = 0
        unchanged = 0
        # github_entries_total = 0

        # Process each selected GitHub file
        for repo_file_path in repo_files:
            # Get raw content from GitHub
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{repo_file_path}"

            print(f"apply_sync: Fetching GitHub file from {raw_url}")

            response = requests.get(raw_url)

            print(f"response apply_sync {response}")

            if response.status_code != 200:
                print(
                    f"apply_sync: Failed to fetch GitHub file: {response.status_code}"
                )
                continue

            # Create a temporary file
            with tempfile.NamedTemporaryFile(suffix=".po", delete=False) as temp_file:
                temp_file.write(response.content)
                temp_file_path = temp_file.name

            try:
                # Parse the GitHub PO file
                github_po = polib.pofile(temp_file_path)
                print(
                    f"apply_sync: GitHub PO file loaded with {len(github_po)} entries"
                )

                # Apply translations from GitHub
                for github_entry in github_po:
                    if not github_entry.msgid or not github_entry.msgstr:
                        continue

                    print(f"github_entry {github_entry}")

                    if github_entry.msgid in local_entries:
                        # Entry exists in local file
                        local_entry = local_entries[github_entry.msgid]

                        print(f"local_entry {local_entry}")

                        if local_entry.msgstr:
                            # Has existing translation
                            if local_entry.msgstr != github_entry.msgstr:
                                local_entry.msgstr = github_entry.msgstr
                                updated += 1
                            else:
                                unchanged += 1
                        else:
                            # No existing translation
                            local_entry.msgstr = github_entry.msgstr
                            added += 1
                    else:
                        # Entry doesn't exist in local file - might need to create it
                        # Note: We're being cautious here, only adding translations for
                        # entries that have exact matches in other fields
                        for local_entry in local_po:
                            if (
                                local_entry.msgid
                                and difflib.SequenceMatcher(
                                    None, local_entry.msgid, github_entry.msgid
                                ).ratio()
                                > 0.9
                            ):
                                # Very close match, likely the same string
                                local_entry.msgstr = github_entry.msgstr
                                added += 1
                                break
            finally:
                # Clean up temp file
                os.unlink(temp_file_path)

        # Save the updated local PO file
        local_po.save(resolved_path)
        print(
            f"apply_sync: Successfully saved PO file with {added} added, {updated} updated, and {unchanged} unchanged entries"
        )

        # Update database cache to reflect new translation statistics
        try:
            from translation_tools.api.po_files import process_po_file
            bench_path = get_bench_path()
            
            # Process the updated file to get new statistics
            file_data = process_po_file(resolved_path, bench_path)
            if file_data:
                # Update the database cache with new translation stats
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
                    print(f"apply_sync: Updated database cache for {relative_path}")
        except Exception as cache_error:
            print(f"apply_sync: Warning - Could not update database cache: {str(cache_error)}")
            # Don't fail the sync if cache update fails

        return {
            "success": True,
            "changes": {"added": added, "updated": updated, "unchanged": unchanged},
        }

    except Exception as e:
        print(f"apply_sync: Error: {str(e)}")
        frappe.log_error(f"GitHub sync error: {str(e)}")
        return {"success": False, "error": str(e)}
