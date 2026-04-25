import os
import frappe
import json
from frappe import _
from frappe.utils import cint, flt
from frappe.utils.password import get_decrypted_password, get_encryption_key, encrypt
from .common import logger, CONFIG_FILE, get_bench_path
import configparser
import requests
import tempfile

DEFAULT_GITHUB_REPO = "https://github.com/ManotLuijiu/erpnext-thai-translation.git"
PRIVATE_GITHUB_REPO = "https://github.com/ManotLuijiu/erpnext-thai-translation-private.git"


def _get_default_branch():
    """Return version-15 or version-16 based on installed Frappe major version."""
    try:
        major = int(frappe.__version__.split(".")[0])
        return f"version-{major}"
    except Exception:
        return "version-15"


@frappe.whitelist()
def has_site_config_token():
    """Check if github_pat_token exists in site_config or common_site_config (never exposes the value)."""
    token = frappe.conf.get("github_pat_token")
    return {"has_token": bool(token and token.strip())}


def save_github_token(github_token):
    """Save GitHub token (Frappe Password field handles encryption automatically)"""
    settings = frappe.get_single("Translation Tools Settings")
    # Store the token directly - Password field type handles encryption automatically
    settings.github_token = github_token  # type: ignore
    settings.save()


def get_github_token():
    """Decrypt and get the GitHub token"""
    settings = frappe.get_single("Translation Tools Settings")
    decrypted_token = get_decrypted_password(
        "Translation Tools Settings", settings.name, "github_token", raise_exception=False
    )
    return decrypted_token


def cast_to_float(value, default=0.0):
    """Safely cast a value to float, with a default fallback."""
    try:
        return flt(value)
    except (ValueError, TypeError):
        return default


@frappe.whitelist()
def get_translation_settings():
    """Get translation tools settings (sensitive fields are masked for security)"""
    # No permission check needed for reading settings (they're masked anyway)
    
    # Get all settings in a single query to improve performance
    settings_doctype = "Translation Tools Settings"

    # Check if the document exists
    if not frappe.db.exists(settings_doctype):
        # Return default settings if doc doesn't exist
        return frappe._dict(
            {
                "default_model_provider": "openai",
                "default_model": "gpt-4.1-mini-2025-04-14",
                "openai_api_key_configured": False,
                "anthropic_api_key_configured": False,
                "batch_size": 10,
                "temperature": 0.3,
                "auto_save": 0,
                "preserve_formatting": 1,
                "github_enable": 0,
                "github_repo": "",
                "github_token_configured": False,
                "default_branch": _get_default_branch(),
            }
        )

    doc = frappe.get_single(settings_doctype)

    # Check if password fields are configured (DO NOT return actual values)
    try:
        openai_api_key = get_decrypted_password(
            settings_doctype,
            settings_doctype,
            "openai_api_key",
            raise_exception=False,
        )

        anthropic_api_key = get_decrypted_password(
            settings_doctype,
            settings_doctype,
            "anthropic_api_key",
            raise_exception=False,
        )

        github_token = get_decrypted_password(
            settings_doctype,
            settings_doctype,
            "github_token",
            raise_exception=False,
        )

        # Return masked values for frontend display, never the actual keys
        openai_configured = bool(openai_api_key and openai_api_key.strip())
        anthropic_configured = bool(anthropic_api_key and anthropic_api_key.strip())
        github_token_configured = bool(github_token and github_token.strip())

    except Exception as e:
        frappe.log_error(f"Error checking password fields: {str(e)}")
        openai_configured = False
        anthropic_configured = False
        github_token_configured = False

    settings = frappe._dict(
        {
            "default_model_provider": doc.default_model_provider or "openai",  # type: ignore
            "default_model": doc.default_model or "gpt-4.1-mini-2025-04-14",  # type: ignore
            "openai_api_key": "****" if openai_configured else "",  # Masked value for frontend
            "openai_api_key_configured": openai_configured,  # Boolean flag
            "anthropic_api_key": "****" if anthropic_configured else "",  # Masked value for frontend
            "anthropic_api_key_configured": anthropic_configured,  # Boolean flag
            "github_token": "****" if github_token_configured else "",  # Masked value for frontend
            "github_token_configured": github_token_configured,  # Boolean flag
            "batch_size": cint(doc.batch_size or 10),  # type: ignore
            "temperature": cast_to_float(doc.temperature, default=0.3),  # type: ignore
            "auto_save": cint(doc.auto_save or 0),  # type: ignore
            "preserve_formatting": cint(doc.preserve_formatting or 1),  # type: ignore
            "github_enable": cint(doc.github_enable or 0),  # type: ignore
            "github_repo": doc.github_repo or DEFAULT_GITHUB_REPO,  # type: ignore
            "use_own_repo": bool(
                doc.github_repo  # type: ignore
                and doc.github_repo.strip()  # type: ignore
                and doc.github_repo.strip().rstrip("/").rstrip(".git").rstrip("/")  # type: ignore
                != DEFAULT_GITHUB_REPO.rstrip("/").rstrip(".git").rstrip("/")
            ),
            "default_branch": _get_default_branch(),
        }
    )

    return settings


def get_decrypted_api_keys():
    """Internal function to get decrypted API keys - DO NOT expose as @frappe.whitelist()"""
    # This function is for internal server-side use only, never exposed to web API
    settings_doctype = "Translation Tools Settings"
    
    if not frappe.db.exists(settings_doctype):
        return {"openai_api_key": "", "anthropic_api_key": "", "github_token": ""}
    
    try:
        openai_api_key = get_decrypted_password(
            settings_doctype, settings_doctype, "openai_api_key", raise_exception=False
        ) or ""
        
        anthropic_api_key = get_decrypted_password(
            settings_doctype, settings_doctype, "anthropic_api_key", raise_exception=False
        ) or ""
        
        github_token = get_decrypted_password(
            settings_doctype, settings_doctype, "github_token", raise_exception=False
        ) or ""
        
        return {
            "openai_api_key": openai_api_key,
            "anthropic_api_key": anthropic_api_key,
            "github_token": github_token
        }
    except Exception as e:
        frappe.log_error(f"Error decrypting API keys: {str(e)}")
        return {"openai_api_key": "", "anthropic_api_key": "", "github_token": ""}


@frappe.whitelist()
def test_github_connection(github_repo=None, github_token=None):
    """Test if GitHub connection works with provided credentials

    Args:
        github_repo (str, optional): GitHub repository URL. If not provided, will use settings value.
        github_token (str, optional): GitHub personal access token. If not provided, will use settings value.

    Returns:
        dict: Result of the connection test with success/error message
    """

    # Security: Removed debug print to prevent token exposure

    try:
        # Fetch settings if parameters not provided
        settings = frappe.get_single("Translation Tools Settings")

        if not github_repo:
            github_repo = settings.github_repo  # type: ignore

        if not github_token or set(github_token) == {"*"}:
            # Prefer site_config token (common_site_config.json), fall back to DocType Password field
            github_token = frappe.conf.get("github_pat_token")
            if not github_token:
                github_token = get_decrypted_password(
                    "Translation Tools Settings",
                    settings.name,
                    "github_token",
                    raise_exception=False,
                )

        # Validate inputs
        if not github_repo:
            return {"success": False, "error": "GitHub repository URL not provided."}

        if not github_token:
            return {
                "success": False,
                "error": "GitHub token not provided or is masked.",
            }

        # Clean repo URL
        repo_path = github_repo.strip("/")
        if "github.com/" in repo_path:
            repo_path = repo_path.split("github.com/")[1]
        if repo_path.endswith(".git"):
            repo_path = repo_path[:-4]  # Remove trailing .git

        # Get settings if parameters not provided
        # if not github_repo or not github_token:
        #     settings = frappe.get_single("Translation Tools Settings")
        #     github_token = github_token or settings.github_token  # type: ignore
        # if not github_repo:
        #     github_repo = github_repo or settings.github_repo  # type: ignore
        #     return {"success": False, "error": "GitHub repository URL not provided"}

        # if not github_token:
        #     return {"success": False, "error": "GitHub token not provided"}

        # Clean up the URL to get the repo format GitHub expects
        # Example: https://github.com/username/repo -> username/repo
        # repo_path = github_repo.strip("/")
        # if "github.com/" in repo_path:
        #     repo_path = repo_path.split("github.com/")[1]
        # repo_path = repo_path.replace(".git", "")  # <-- Remove .git if present

        # Make an API call to test the connection
        api_url = f"https://api.github.com/repos/{repo_path}"
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json",
        }

        response = requests.get(api_url, headers=headers, timeout=10)

        if response.status_code == 200:
            repo_data = response.json()
            result = {
                "success": True,
                "message": f"Successfully connected to {repo_data.get('full_name', 'repository')}",
                "sync_triggered": False,
            }

            # Check if sync is needed (last sync > 4 hours ago)
            try:
                if frappe.db.exists("DocType", "GitHub Sync Settings"):
                    sync_settings = frappe.get_single("GitHub Sync Settings")
                    last_sync = getattr(sync_settings, "last_sync_datetime", None)
                    hours_since_sync = None

                    if last_sync:
                        from frappe.utils import time_diff_in_hours, now_datetime
                        hours_since_sync = time_diff_in_hours(now_datetime(), last_sync)

                    # Trigger sync if never synced or last sync > 4 hours ago
                    if last_sync is None or hours_since_sync is None or hours_since_sync > 4:
                        # Get all installed apps with auto-sync enabled
                        import json as json_mod
                        app_settings = {}
                        if getattr(sync_settings, "app_sync_settings", None):
                            try:
                                app_settings = json_mod.loads(sync_settings.app_sync_settings)
                            except (json_mod.JSONDecodeError, TypeError):
                                app_settings = {}

                        enabled_apps = [
                            app for app, config in app_settings.items()
                            if config.get("enabled")
                        ]

                        if enabled_apps and sync_settings.enabled:
                            frappe.enqueue(
                                "translation_tools.tasks.github_auto_sync.run_background_sync",
                                enabled_apps=enabled_apps,
                                queue="long",
                                timeout=1800,
                                job_name="test_connect_github_sync",
                                deduplicate=True,
                            )
                            sync_msg = f"Last sync was {int(hours_since_sync) if hours_since_sync else '?'}h ago. Sync triggered for {len(enabled_apps)} apps."
                            result["sync_triggered"] = True
                            result["sync_apps"] = len(enabled_apps)
                            result["message"] += f" — {sync_msg}"
                        else:
                            result["message"] += " — No apps enabled for auto-sync."
                    else:
                        result["message"] += f" — Last sync {int(hours_since_sync)}h ago (< 4h, skipping sync)."
            except Exception as sync_err:
                # Never fail the connection test because of sync logic
                frappe.log_error(f"Sync check during test_connect: {str(sync_err)}")

            return result
        elif response.status_code == 401:
            return {"success": False, "error": "Authentication failed. Invalid token."}
        elif response.status_code == 404:
            return {"success": False, "error": "Repository not found. Check the URL."}
        else:
            return {
                "success": False,
                "error": f"GitHub API returned status code {response.status_code}: {response.text}",
            }
    except requests.RequestException as e:
        return {"success": False, "error": f"Connection error: {str(e)}"}
    except Exception as e:
        frappe.log_error(f"GitHub connection test error: {str(e)}")
        return {"success": False, "error": f"An error occurred: {str(e)}"}


@frappe.whitelist()
def test_github_sync(github_repo=None, github_token=None):
    """Test GitHub sync for all installed apps on the current site.

    Verifies connection, lists available translation files, and does a dry-run
    sync check for each installed app that has both a local th.po and a
    matching file in the GitHub translation repo.

    Returns:
        dict: Detailed results per app with before/after stats
    """
    import os

    try:
        # Step 1: Resolve credentials (same logic as test_github_connection)
        settings = frappe.get_single("Translation Tools Settings")

        if not github_repo:
            github_repo = settings.github_repo

        if not github_token or set(github_token) == {"*"}:
            from frappe.utils.password import get_decrypted_password
            # Prefer site_config token, fall back to DocType Password field
            github_token = frappe.conf.get("github_pat_token")
            if not github_token:
                github_token = get_decrypted_password(
                    "Translation Tools Settings", settings.name, "github_token", raise_exception=False
                )

        if not github_repo:
            return {"success": False, "error": "GitHub repository URL not configured."}
        if not github_token:
            return {"success": False, "error": "GitHub token not available."}

        # Step 2: Test connection
        repo_path = github_repo.strip("/")
        if "github.com/" in repo_path:
            repo_path = repo_path.split("github.com/")[1]
        if repo_path.endswith(".git"):
            repo_path = repo_path[:-4]

        import requests as req
        api_url = f"https://api.github.com/repos/{repo_path}"
        headers = {"Authorization": f"token {github_token}", "Accept": "application/vnd.github.v3+json"}
        resp = req.get(api_url, headers=headers, timeout=10)

        if resp.status_code != 200:
            return {"success": False, "error": f"Connection failed (HTTP {resp.status_code})"}

        # Step 3: Get GitHub Sync Settings for repo URL
        sync_settings = None
        if frappe.db.exists("DocType", "GitHub Sync Settings"):
            sync_settings = frappe.get_single("GitHub Sync Settings")

        sync_repo_url = sync_settings.repository_url if sync_settings else github_repo
        sync_branch = (sync_settings.branch if sync_settings else None) or "version-15"
        target_language = (sync_settings.target_language if sync_settings else None) or "th"

        # Step 4: Find translation files in GitHub repo
        from translation_tools.api.github_sync import find_translation_files

        gh_result = find_translation_files(
            repo_url=sync_repo_url, branch=sync_branch, target_language=target_language
        )

        if not gh_result.get("success"):
            return {"success": False, "error": f"Cannot list repo files: {gh_result.get('error')}"}

        github_apps = set()
        for f in gh_result.get("files", []):
            parts = f["path"].split("/")
            if len(parts) == 2 and parts[1].endswith(".po"):
                github_apps.add(parts[0])

        # Step 5: Check each installed app
        installed_apps = frappe.get_installed_apps()
        bench_path = frappe.utils.get_bench_path()

        app_results = []
        for app_name in sorted(installed_apps):
            local_po = os.path.join(bench_path, "apps", app_name, app_name, "locale", f"{target_language}.po")

            if not os.path.exists(local_po):
                app_results.append({
                    "app": app_name, "status": "no_po",
                    "message": f"No {target_language}.po file found"
                })
                continue

            if app_name not in github_apps:
                app_results.append({
                    "app": app_name, "status": "no_github",
                    "message": "Not in translation repo"
                })
                continue

            # Read local stats
            try:
                import polib
                po = polib.pofile(local_po)
                translated = len([e for e in po if e.msgstr and e.msgstr != ""])
                total = len(po)
                pct = round(translated * 100 / total, 1) if total > 0 else 0
            except Exception:
                translated, total, pct = 0, 0, 0

            # Fetch GitHub stats (sync FROM GitHub, so show GitHub's translation percentage)
            github_translated, github_total, github_pct = 0, 0, 0
            try:
                raw_url = f"https://raw.githubusercontent.com/{repo_path}/{sync_branch}/{app_name}/th.po"
                gh_resp = requests.get(raw_url, headers={"Authorization": f"token {github_token}"}, timeout=30)
                if gh_resp.status_code == 200:
                    with tempfile.NamedTemporaryFile(suffix=".po", delete=False) as tmp:
                        tmp.write(gh_resp.content)
                        tmp_path = tmp.name
                    try:
                        gh_po = polib.pofile(tmp_path)
                        github_translated = len([e for e in gh_po if e.msgstr and e.msgstr != ""])
                        github_total = len(gh_po)
                        github_pct = round(github_translated * 100 / github_total, 1) if github_total > 0 else 0
                    finally:
                        os.unlink(tmp_path)
            except Exception:
                pass  # GitHub stats are optional

            app_results.append({
                "app": app_name,
                "status": "ready",
                "translated": translated,
                "total": total,
                "percentage": pct,
                "github_translated": github_translated,
                "github_total": github_total,
                "github_percentage": github_pct,
                "github_file": f"{app_name}/th.po",
            })

        ready_count = len([r for r in app_results if r["status"] == "ready"])
        total_apps = len(installed_apps)

        return {
            "success": True,
            "message": f"Connected to {repo_path}. {ready_count}/{total_apps} apps ready to sync.",
            "repo": repo_path,
            "branch": sync_branch,
            "github_apps_count": len(github_apps),
            "installed_apps_count": total_apps,
            "apps": app_results,
        }

    except Exception as e:
        frappe.log_error(f"GitHub sync test error: {str(e)}")
        return {"success": False, "error": f"An error occurred: {str(e)}"}


@frappe.whitelist()
def sync_all_apps_now():
    """One-click sync of all apps that have a local th.po and a match in the GitHub translation repo.

    Unlike auto-sync, this does NOT require the auto_sync_enabled toggle — it always runs.
    """
    import os

    if not frappe.db.exists("DocType", "GitHub Sync Settings"):
        return {"success": False, "error": "GitHub Sync Settings DocType not found"}

    settings = frappe.get_single("GitHub Sync Settings")

    if not settings.repository_url:
        return {"success": False, "error": "No repository URL configured in GitHub Sync Settings"}

    target_language = getattr(settings, "target_language", None) or "th"
    bench_path = frappe.utils.get_bench_path()
    installed_apps = frappe.get_installed_apps()

    apps_to_sync = []
    for app_name in installed_apps:
        po_path = os.path.join(bench_path, "apps", app_name, app_name, "locale", f"{target_language}.po")
        if os.path.exists(po_path):
            apps_to_sync.append(app_name)

    if not apps_to_sync:
        return {"success": False, "error": f"No apps have a {target_language}.po file"}

    frappe.enqueue(
        "translation_tools.tasks.github_auto_sync.run_background_sync",
        enabled_apps=apps_to_sync,
        queue="long",
        timeout=1800,
        job_name="sync_all_apps_now",
        deduplicate=True,
    )

    return {
        "success": True,
        "message": f"Sync enqueued for {len(apps_to_sync)} apps: {', '.join(apps_to_sync)}",
    }


@frappe.whitelist()
def save_translation_settings(settings):
    """Save Translation Tools Settings"""
    settings_data = (
        frappe._dict(settings)
        if isinstance(settings, dict)
        else frappe._dict(json.loads(settings))
    )

    # Security: Removed debug print to prevent API key exposure

    # Check if Translation Tools Settings doctype exists, create if not
    if not frappe.db.exists("DocType", "Translation Tools Settings"):
        print("To Create Translation Tools Settings")
        create_translation_tools_settings_doctype()

    # Get or create the settings doc
    if not frappe.db.exists("Translation Tools Settings", "Translation Tools Settings"):
        doc = frappe.new_doc("Translation Tools Settings")
        doc.name = "Translation Tools Settings"
    else:
        doc = frappe.get_single("Translation Tools Settings")

    # Update settings
    doc.default_model_provider = settings_data.get("default_model_provider", "openai")  # type: ignore
    doc.default_model = settings_data.get("default_model", "gpt-4.1-mini-2025-04-14")  # type: ignore

    if "openai_api_key" in settings_data and settings_data.openai_api_key:
        # Only update if key is provided and not just asterisks
        if not set(settings_data.openai_api_key) == {"*"}:
            doc.openai_api_key = settings_data.openai_api_key  # type: ignore

    if "anthropic_api_key" in settings_data and settings_data.anthropic_api_key:
        # Only update if key is provided and not just asterisks
        if not set(settings_data.anthropic_api_key) == {"*"}:
            doc.anthropic_api_key = settings_data.anthropic_api_key  # type: ignore

    doc.batch_size = cint(settings_data.get("batch_size", 10))  # type: ignore
    doc.temperature = float(settings_data.get("temperature", 0.3))  # type: ignore
    doc.auto_save = cint(settings_data.get("auto_save", 0))  # type: ignore
    doc.preserve_formatting = cint(settings_data.get("preserve_formatting", 1))  # type: ignore

    # First set the github_enable based on user preference or default
    doc.github_enable = cint(settings_data.get("github_enable", 0))  # type: ignore

    # Then, if either URL or token has a value and github_enable wasn't explicitly set to disabled
    if (
        settings_data.get("github_repo") or settings_data.get("github_token")
    ) and "github_enable" not in settings_data:
        doc.github_enable = 1  # type: ignore

    use_own_repo = settings_data.get("use_own_repo", False)
    if isinstance(use_own_repo, str):
        use_own_repo = use_own_repo.lower() in ("true", "1", "yes")

    if use_own_repo:
        # Client's own repo: save both repo URL and token
        if "github_repo" in settings_data:
            doc.github_repo = settings_data.github_repo  # type: ignore
        if "github_token" in settings_data and settings_data.github_token:
            if not set(settings_data.github_token) == {"*"}:
                doc.github_token = settings_data.github_token  # type: ignore
    else:
        # Default repo: save default URL, don't touch token (uses site_config)
        doc.github_repo = DEFAULT_GITHUB_REPO  # type: ignore

    doc.save()
    frappe.db.commit()

    # Check if any API keys are configured and create a warning if not
    warnings = []
    if not (doc.openai_api_key or doc.anthropic_api_key):  # type: ignore
        warnings.append(
            "No API keys configured. You need at least one API key to use translation services."
        )

    return {
        "success": True,
        "message": "Settings saved successfully",
        "warnings": warnings,
    }


def create_translation_tools_settings_doctype():
    """Create the Translation Tools Settings DocType"""
    # from frappe.modules.import_file import import_doc_from_dict

    # Create Translation Tools Settings DocType
    translation_tools_settings_doctype = {
        "actions": [],
        "creation": "2025-04-15 23:27:25.446695",
        "doctype": "DocType",
        "editable_grid": 1,
        "engine": "InnoDB",
        "field_order": [
            "general_section",
            "enable_translation",
            "default_source_language",
            "default_target_language",
            "api_section",
            "default_model_provider",
            "default_model",
            "openai_section",
            "openai_api_key",
            "openai_model",
            "anthropic_section",
            "anthropic_api_key",
            "anthropic_model",
            "translation_settings_section",
            "batch_size",
            "temperature",
            "auto_save",
            "preserve_formatting",
            "github_section",
            "customer_name",
            "default_branch",
            "github_push_mode",
            "github_enable",
            "github_repo",
            "github_token",
            "api_keys_section",
            "tax_consultant_license_key",
            "chat_enabled",
        ],
        "fields": [
            {
                "fieldname": "general_section",
                "fieldtype": "Section Break",
                "label": "General Settings",
            },
            {
                "default": "1",
                "fieldname": "enable_translation",
                "fieldtype": "Check",
                "label": "Enable Translation Service",
            },
            {
                "default": "1",
                "fieldname": "chat_enabled",
                "fieldtype": "Check",
                "label": "Enable Chat Features",
            },
            {
                "default": "en",
                "fieldname": "default_source_language",
                "fieldtype": "Data",
                "label": "Default Source Language",
            },
            {
                "default": "th",
                "fieldname": "default_target_language",
                "fieldtype": "Data",
                "label": "Default Target Language",
            },
            {
                "fieldname": "api_section",
                "fieldtype": "Section Break",
                "label": "API Settings",
            },
            {
                "default": "openai",
                "fieldname": "default_model_provider",
                "fieldtype": "Select",
                "label": "Default Model Provider",
                "options": "openai\nanthropic",
            },
            {
                "default": "gpt-4.1-mini-2025-04-14",
                "fieldname": "default_model",
                "fieldtype": "Data",
                "label": "Default Model",
            },
            {
                "fieldname": "openai_section",
                "fieldtype": "Section Break",
                "label": "OpenAI Configuration",
            },
            {
                "fieldname": "openai_api_key",
                "fieldtype": "Password",
                "label": "OpenAI API Key",
            },
            {
                "default": "gpt-4.1-mini-2025-04-14",
                "fieldname": "openai_model",
                "fieldtype": "Select",
                "label": "OpenAI Model",
                "options": "gpt-4.1-mini-2025-04-14\ngpt-4.1-2025-04-14\nchatgpt-4o-latest\ngpt-4o-mini-2024-07-18\no4-mini-2025-04-16",
            },
            {
                "fieldname": "anthropic_section",
                "fieldtype": "Section Break",
                "label": "Anthropic Configuration",
            },
            {
                "fieldname": "anthropic_api_key",
                "fieldtype": "Password",
                "label": "Anthropic API Key",
            },
            {
                "default": "claude-3-7-sonnet-20250219",
                "fieldname": "anthropic_model",
                "fieldtype": "Select",
                "label": "Anthropic Model",
                "options": "claude-3-7-sonnet-20250219\nclaude-3-5-haiku-20241022\nclaude-3-5-sonnet-20241022\nclaude-3-opus-20240229\nclaude-3-sonnet-20240229\nclaude-3-haiku-20240307",
            },
            {
                "fieldname": "translation_settings_section",
                "fieldtype": "Section Break",
                "label": "Translation Settings",
            },
            {
                "default": "10",
                "fieldname": "batch_size",
                "fieldtype": "Int",
                "label": "Batch Size",
            },
            {
                "default": "0.3",
                "fieldname": "temperature",
                "fieldtype": "Float",
                "label": "Temperature",
            },
            {
                "default": "0",
                "fieldname": "auto_save",
                "fieldtype": "Check",
                "label": "Auto Save",
            },
            {
                "default": "1",
                "fieldname": "preserve_formatting",
                "fieldtype": "Check",
                "label": "Preserve Formatting",
            },
            {
                "fieldname": "github_section",
                "fieldtype": "Section Break",
                "label": "GitHub Integration",
            },
            {
                "default": "version-15",
                "fieldname": "default_branch",
                "fieldtype": "Data",
                "label": "Github Branch",
            },
            {
                "default": "Auto (Dev=Direct, Prod=PR)",
                "fieldname": "github_push_mode",
                "fieldtype": "Select",
                "label": "Push Mode",
                "options": "Auto (Dev=Direct, Prod=PR)\nAlways Direct Push\nAlways Create PR",
                "description": "Auto: Dev mode pushes directly to main, Production creates PR.",
            },
            {
                "default": "0",
                "fieldname": "github_enable",
                "fieldtype": "Check",
                "label": "Enable GitHub Integration",
            },
            {
                "default": "https://github.com/ManotLuijiu/erpnext-thai-translation.git",
                "fieldname": "github_repo",
                "fieldtype": "Data",
                "label": "Repository URL",
            },
            {
                "description": "Create a token with 'repo' scope at https://github.com/settings/tokens",
                "fieldname": "github_token",
                "fieldtype": "Password",
                "label": "GitHub Personal Access Token (Classic)",
            },
            {
                "fieldname": "api_keys_section",
                "fieldtype": "Section Break",
                "label": "API Keys",
            },
            {
                "fieldname": "tax_consultant_license_key",
                "fieldtype": "Password",
                "label": "Thai Tax Consultant License Key",
            },
            {
                "fieldname": "customer_name",
                "fieldtype": "Data",
                "label": "Customer Name",
            },
        ],
        "grid_page_length": 50,
        "issingle": 1,
        "links": [],
        "modified": "2025-04-29 23:52:17.141854",
        "modified_by": "Administrator",
        "module": "Translation Tools",
        "name": "Translation Tools Settings",
        "owner": "Administrator",
        "permissions": [
            {
                "create": 1,
                "delete": 1,
                "email": 1,
                "print": 1,
                "read": 1,
                "role": "System Manager",
                "share": 1,
                "write": 1,
            }
        ],
        "row_format": "Dynamic",
        "sort_field": "modified",
        "sort_order": "DESC",
        "states": [],
    }

    try:
        doc = frappe.get_doc(translation_tools_settings_doctype).insert()
    except Exception as e:
        frappe.log_error(f"Error creating Translation Tools Settings DocType: {str(e)}")
        frappe.log_error(frappe.get_traceback())

    # doc = import_doc_from_dict(translation_settings_doctype)
    # doc.save()
    # frappe.db.commit()


@frappe.whitelist()
def get_translation_tools_settings_file():
    """Get Translation Tools Settings from config file"""
    settings = {
        "api_key": "",
        "model_provider": "openai",
        "model": "gpt-4.1-mini-2025-04-14",
        "batch_size": 10,
        "temperature": 0.3,
        "max_tokens": 512,
    }

    # Try to read from config file
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                config_content = f.read()
                # Extract api key - this is safer than directly evaluating the file
                api_key_match = config_content.strip().split("OPENAI_API_KEY=")
                if len(api_key_match) > 1:
                    # The key is present but we'll mask it
                    settings["api_key"] = "********"

                model_provider_match = config_content.strip().split("MODEL_PROVIDER=")
                if len(model_provider_match) > 1:
                    provider = model_provider_match[1].split('"')[1]
                    if provider in ["openai", "claude"]:
                        settings["model_provider"] = provider

                model_match = config_content.strip().split("MODEL=")
                if len(model_match) > 1:
                    model = model_match[1].split('"')[1]
                    settings["model"] = model

                batch_size_match = config_content.strip().split("BATCH_SIZE=")
                if len(batch_size_match) > 1:
                    batch_size = batch_size_match[1].split("\n")[0]
                    settings["batch_size"] = int(batch_size)

                temperature_match = config_content.strip().split("TEMPERATURE=")
                if len(temperature_match) > 1:
                    temperature = temperature_match[1].split("\n")[0]
                    settings["temperature"] = float(temperature)

                max_tokens_match = config_content.strip().split("MAX_TOKENS=")
                if len(max_tokens_match) > 1:
                    max_tokens = max_tokens_match[1].split("\n")[0]
                    settings["max_tokens"] = int(max_tokens)

        except Exception as e:
            frappe.log_error(f"Error reading translation config: {str(e)}")

    return settings


@frappe.whitelist()
def save_translation_tools_settings_file(
    api_key=None,
    model_provider=None,
    model=None,
    batch_size=None,
    temperature=None,
    max_tokens=None,
):
    """Save Translation Tools Settings to file"""
    # Only system manager can change settings
    if not frappe.has_permission("System Manager", "write"):
        frappe.throw("You don't have permission to change settings")

    # Read existing config if it exists
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                for line in f:
                    if "=" in line:
                        key, value = line.strip().split("=", 1)
                        config[key] = value
        except Exception:
            pass

    # Update config with new values
    if api_key and api_key != "********":
        config["OPENAI_API_KEY"] = f'"{api_key}"'

    if model_provider:
        config["MODEL_PROVIDER"] = f'"{model_provider}"'

    if model:
        config["MODEL"] = f'"{model}"'

    if batch_size:
        config["BATCH_SIZE"] = str(int(batch_size))

    if temperature is not None:
        config["TEMPERATURE"] = str(float(temperature))

    if max_tokens:
        config["MAX_TOKENS"] = str(int(max_tokens))

    # Write config back to file
    try:
        with open(CONFIG_FILE, "w") as f:
            for key, value in config.items():
                f.write(f"{key}={value}\n")

        # Make file readable only by the owner
        os.chmod(CONFIG_FILE, 0o600)
        return {"success": True, "message": "Settings saved successfully"}
    except Exception as e:
        frappe.log_error(f"Error saving translation config: {str(e)}")
        return {"error": f"Failed to save settings: {str(e)}"}


@frappe.whitelist()
def save_api_key(api_key, model_provider="openai"):
    """Save the API key to Translation Tools Settings (secure storage)."""
    # Check if user has permission to manage settings
    if "System Manager" not in frappe.get_roles():
        frappe.throw(_("You need System Manager role to save API keys"))

    # Get or create Translation Tools Settings
    if not frappe.db.exists("Translation Tools Settings", "Translation Tools Settings"):
        doc = frappe.new_doc("Translation Tools Settings")
        doc.name = "Translation Tools Settings"
    else:
        doc = frappe.get_single("Translation Tools Settings")

    # Set the API key based on provider
    if model_provider == "openai":
        doc.openai_api_key = api_key
        doc.default_model_provider = "openai"
        doc.default_model = "gpt-4o-mini"
    elif model_provider in ["anthropic", "claude"]:
        doc.anthropic_api_key = api_key
        doc.default_model_provider = "anthropic"
        doc.default_model = "claude-3-haiku-20240307"
    
    # Set default values if not already set
    if not doc.batch_size:
        doc.batch_size = 10
    if not doc.temperature:
        doc.temperature = 0.3
    if not doc.auto_save:
        doc.auto_save = 0
    if not doc.preserve_formatting:
        doc.preserve_formatting = 1
    
    doc.save()
    frappe.db.commit()

    return {"message": "API key saved successfully", "status": "success"}
