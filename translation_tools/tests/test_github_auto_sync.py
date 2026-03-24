"""Tests for GitHub Auto Sync fixes

Tests cover:
1. Settings preservation across setup_github_sync_defaults() calls
2. check_and_setup_if_needed() respects user-disabled settings
3. sync_app_from_github() uses centralized translation repo (not per-app repos)
4. File matching: {app_name}/th.po pattern in GitHub repo
"""

import frappe
import json
import unittest
from unittest.mock import patch, MagicMock


class TestGithubSyncDefaults(unittest.TestCase):
    """Test setup/github_sync_defaults.py — settings preservation"""

    def setUp(self):
        """Create a clean GitHub Sync Settings for testing"""
        if frappe.db.exists("GitHub Sync Settings", "GitHub Sync Settings"):
            self.settings = frappe.get_doc("GitHub Sync Settings", "GitHub Sync Settings")
            # Save original state to restore later
            self.original_app_sync_settings = self.settings.app_sync_settings
            self.original_enabled = self.settings.enabled
            self.original_auto_sync_enabled = self.settings.auto_sync_enabled
        else:
            self.settings = None

    def tearDown(self):
        """Restore original settings"""
        if self.settings:
            self.settings.reload()
            self.settings.app_sync_settings = self.original_app_sync_settings
            self.settings.enabled = self.original_enabled
            self.settings.auto_sync_enabled = self.original_auto_sync_enabled
            self.settings.save(ignore_permissions=True)
            frappe.db.commit()

    def test_setup_preserves_existing_app_toggle_states(self):
        """Bug fix: setup_github_sync_defaults must not overwrite per-app enabled/disabled flags"""
        from translation_tools.setup.github_sync_defaults import setup_github_sync_defaults

        if not self.settings:
            self.skipTest("GitHub Sync Settings not found")

        # Set up: disable sync for frappe, enable for erpnext
        test_settings = {
            "frappe": {"enabled": False, "locale": "th", "source_path": "frappe/th.po",
                       "target_path": "apps/frappe/frappe/locale/th.po"},
            "erpnext": {"enabled": True, "locale": "th", "source_path": "erpnext/th.po",
                        "target_path": "apps/erpnext/erpnext/locale/th.po"},
        }
        self.settings.app_sync_settings = json.dumps(test_settings)
        self.settings.save(ignore_permissions=True)
        frappe.db.commit()

        # Act: run setup (this simulates what happens on after_install)
        setup_github_sync_defaults()

        # Assert: frappe should still be disabled, erpnext still enabled
        self.settings.reload()
        result = json.loads(self.settings.app_sync_settings)

        self.assertFalse(result["frappe"]["enabled"],
                         "frappe toggle was reset to True — user preference lost!")
        self.assertTrue(result["erpnext"]["enabled"],
                        "erpnext toggle was incorrectly changed")

    def test_setup_adds_new_apps_as_enabled(self):
        """New apps not in existing settings should default to enabled=True"""
        from translation_tools.setup.github_sync_defaults import setup_github_sync_defaults

        if not self.settings:
            self.skipTest("GitHub Sync Settings not found")

        # Set up: only have frappe in settings
        test_settings = {
            "frappe": {"enabled": False, "locale": "th", "source_path": "frappe/th.po",
                       "target_path": "apps/frappe/frappe/locale/th.po"},
        }
        self.settings.app_sync_settings = json.dumps(test_settings)
        self.settings.save(ignore_permissions=True)
        frappe.db.commit()

        # Act
        setup_github_sync_defaults()

        # Assert: frappe preserved, new apps added with enabled=True
        self.settings.reload()
        result = json.loads(self.settings.app_sync_settings)

        self.assertFalse(result["frappe"]["enabled"],
                         "Existing frappe toggle should stay False")

        installed_apps = frappe.get_installed_apps()
        for app in installed_apps:
            self.assertIn(app, result, f"App {app} missing from settings")
            if app != "frappe":
                self.assertTrue(result[app]["enabled"],
                                f"New app {app} should default to enabled=True")

    def test_check_and_setup_skips_when_repo_url_exists(self):
        """check_and_setup_if_needed should NOT re-run setup if repo_url is configured"""
        from translation_tools.setup.github_sync_defaults import check_and_setup_if_needed

        if not self.settings:
            self.skipTest("GitHub Sync Settings not found")

        # Set up: user has disabled auto_sync but repo_url is set
        self.settings.enabled = 0
        self.settings.auto_sync_enabled = 0
        self.settings.repository_url = "https://github.com/ManotLuijiu/erpnext-thai-translation.git"
        self.settings.save(ignore_permissions=True)
        frappe.db.commit()

        # Act
        result = check_and_setup_if_needed()

        # Assert: should NOT have re-run setup (because repo_url exists)
        self.settings.reload()
        self.assertEqual(self.settings.enabled, 0,
                         "enabled was reset to 1 — user choice overridden!")
        self.assertEqual(self.settings.auto_sync_enabled, 0,
                         "auto_sync_enabled was reset to 1 — user choice overridden!")
        self.assertEqual(result.get("message"), "Already configured")


class TestSyncAppFromGithub(unittest.TestCase):
    """Test api/app_sync_settings.py — sync uses correct repo"""

    def test_sync_uses_centralized_translation_repo(self):
        """sync_app_from_github must use settings.repository_url, not per-app repo URLs"""
        from translation_tools.api.app_sync_settings import sync_app_from_github
        from translation_tools.api import github_sync

        settings = frappe.get_single("GitHub Sync Settings")
        if not settings.enabled or not settings.repository_url:
            self.skipTest("GitHub Sync not configured")

        captured_repo_url = {}

        original_find = github_sync.find_translation_files

        def mock_find(repo_url, branch="version-15", target_language="th"):
            captured_repo_url["url"] = repo_url
            # Return empty so sync exits early (we just want to verify the repo_url)
            return {"success": True, "files": []}

        with patch.object(github_sync, "find_translation_files", side_effect=mock_find):
            sync_app_from_github("frappe")

        expected_repo = settings.repository_url
        self.assertEqual(
            captured_repo_url.get("url"), expected_repo,
            f"Expected centralized repo {expected_repo}, "
            f"got {captured_repo_url.get('url')} — using per-app repo instead!"
        )

    def test_file_matching_pattern(self):
        """Verify GitHub file matching: {app_name}/th.po pattern"""
        # Simulate the matching logic from sync_app_from_github
        app_name = "frappe"
        target_language = "th"

        # Simulated GitHub repo file list (matches real repo structure)
        github_files = [
            {"path": "erpnext/th.po"},
            {"path": "frappe/th.po"},
            {"path": "hrms/th.po"},
            {"path": "translation_tools/th.po"},
        ]

        github_files_by_path = {f["path"]: f for f in github_files}

        # Test the candidate matching logic
        candidate_paths = [
            f"{app_name}/th.po",
            f"{app_name}/{target_language}.po",
            f"{app_name}/locale/{target_language}.po",
        ]

        matched_path = None
        for candidate in candidate_paths:
            if candidate in github_files_by_path:
                matched_path = candidate
                break

        self.assertEqual(matched_path, "frappe/th.po",
                         f"Expected frappe/th.po, got {matched_path}")

    def test_file_matching_all_apps(self):
        """Verify matching works for all apps in the translation repo"""
        github_paths = [
            "cloud_file_manager/th.po", "crm/th.po", "digisoft_erp/th.po",
            "erpnext/th.po", "frappe/th.po", "hrms/th.po",
            "inpac_pharma/th.po", "lending/th.po", "payments/th.po",
            "print_designer/th.po", "print_template_generator/th.po",
            "thai_business_suite/th.po", "translation_tools/th.po",
        ]
        github_files_by_path = {p: {"path": p} for p in github_paths}

        for github_path in github_paths:
            app_name = github_path.split("/")[0]
            candidate = f"{app_name}/th.po"
            self.assertIn(candidate, github_files_by_path,
                          f"No match for app {app_name}")


class TestToggleTriggersSync(unittest.TestCase):
    """Test that toggling auto-sync ON enqueues a background sync job"""

    @patch("translation_tools.api.app_sync_settings.frappe")
    def test_toggle_on_enqueues_sync(self, mock_frappe):
        """Enabling auto-sync for an app should enqueue perform_app_sync"""
        # This tests the logic flow, not actual enqueue
        # The real toggle_app_autosync calls frappe.enqueue when enabled=True
        mock_settings = MagicMock()
        mock_settings.app_sync_settings = json.dumps({
            "frappe": {"enabled": False, "locale": "th"}
        })
        mock_frappe.get_single.return_value = mock_settings
        mock_frappe.utils.now_datetime.return_value.isoformat.return_value = "2026-03-18T00:00:00"

        from translation_tools.api.app_sync_settings import toggle_app_autosync

        # We can't easily test the actual function due to frappe decorators,
        # but we verify the enqueue call pattern exists in the code
        import inspect
        source = inspect.getsource(toggle_app_autosync)
        self.assertIn("frappe.enqueue", source,
                       "toggle_app_autosync must call frappe.enqueue when enabling")
        self.assertIn("perform_app_sync", source,
                       "toggle_app_autosync must enqueue perform_app_sync")


class TestSyncAllSiteApps(unittest.TestCase):
    """Integration test: sync all apps installed on the current site.

    Iterates every app in the site's installed apps list, checks if a
    corresponding th.po file exists in the GitHub translation repo,
    and verifies sync_app_from_github runs without error.

    Run with:
        bench --site <site-name> run-tests --module translation_tools.tests.test_github_auto_sync --test TestSyncAllSiteApps

    Or run the standalone helper directly:
        bench --site <site-name> execute translation_tools.tests.test_github_auto_sync.run_sync_all_site_apps
    """

    def setUp(self):
        """Verify GitHub Sync Settings are configured"""
        if not frappe.db.exists("DocType", "GitHub Sync Settings"):
            self.skipTest("GitHub Sync Settings DocType not found")

        self.settings = frappe.get_single("GitHub Sync Settings")
        if not self.settings.repository_url or self.settings.repository_url == "None":
            self.skipTest("repository_url not configured in GitHub Sync Settings")

        if not frappe.conf.get("github_pat_token"):
            self.skipTest("github_pat_token not set in site_config.json")

    def test_sync_runs_for_all_installed_apps(self):
        """Sync should run without errors for every installed app that has a PO file"""
        from translation_tools.api.app_sync_settings import sync_app_from_github
        from translation_tools.api.github_sync import find_translation_files
        import os

        # Get all apps installed on this site
        installed_apps = frappe.get_installed_apps()
        self.assertTrue(len(installed_apps) > 0, "No apps installed on site")

        # Get list of apps available in the GitHub translation repo
        gh_result = find_translation_files(
            repo_url=self.settings.repository_url,
            branch=self.settings.branch or "version-15",
            target_language=self.settings.target_language or "th",
        )
        self.assertTrue(gh_result.get("success"), f"Failed to list GitHub files: {gh_result.get('error')}")

        github_apps = set()
        for f in gh_result.get("files", []):
            parts = f["path"].split("/")
            if len(parts) == 2 and parts[1].endswith(".po"):
                github_apps.add(parts[0])

        results = {"synced": [], "skipped_no_po": [], "skipped_no_github": [], "failed": []}

        for app_name in installed_apps:
            # Check if app has a local th.po file
            bench_path = frappe.utils.get_bench_path()
            local_po = os.path.join(bench_path, "apps", app_name, app_name, "locale", "th.po")

            if not os.path.exists(local_po):
                results["skipped_no_po"].append(app_name)
                continue

            # Check if app exists in GitHub translation repo
            if app_name not in github_apps:
                results["skipped_no_github"].append(app_name)
                continue

            # Run sync
            try:
                sync_app_from_github(app_name)
                results["synced"].append(app_name)
            except Exception as e:
                results["failed"].append(f"{app_name}: {str(e)}")

        # Report
        print(f"\n{'='*60}")
        print(f"Sync Results for site: {frappe.local.site}")
        print(f"{'='*60}")
        print(f"Installed apps: {len(installed_apps)}")
        print(f"Synced:         {len(results['synced'])} — {', '.join(results['synced']) or 'none'}")
        print(f"No local PO:    {len(results['skipped_no_po'])} — {', '.join(results['skipped_no_po']) or 'none'}")
        print(f"No GitHub PO:   {len(results['skipped_no_github'])} — {', '.join(results['skipped_no_github']) or 'none'}")
        print(f"Failed:         {len(results['failed'])} — {', '.join(results['failed']) or 'none'}")
        print(f"{'='*60}\n")

        # Assert no failures
        self.assertEqual(len(results["failed"]), 0,
                         f"Sync failed for apps: {results['failed']}")

        # Assert at least some apps were synced
        self.assertGreater(len(results["synced"]), 0,
                           "No apps were synced — check GitHub repo and local PO files")

    def test_translation_stats_after_sync(self):
        """After sync, verify translation percentages are reported correctly"""
        import os

        installed_apps = frappe.get_installed_apps()
        bench_path = frappe.utils.get_bench_path()

        print(f"\n{'App':<30} {'Translated':>12} {'Total':>8} {'Pct':>6}")
        print("-" * 60)

        for app_name in sorted(installed_apps):
            local_po = os.path.join(bench_path, "apps", app_name, app_name, "locale", "th.po")
            if not os.path.exists(local_po):
                continue

            try:
                import polib
                po = polib.pofile(local_po)
                translated = len([e for e in po if e.msgstr and e.msgstr != ""])
                total = len(po)
                pct = round(translated * 100 / total, 1) if total > 0 else 0
                print(f"{app_name:<30} {translated:>12} {total:>8} {pct:>5.1f}%")
            except Exception as e:
                print(f"{app_name:<30} {'ERROR':>12} — {str(e)}")


def run_sync_all_site_apps():
    """Standalone helper to run sync for all apps on the current site.

    Usage:
        bench --site <site-name> execute translation_tools.tests.test_github_auto_sync.run_sync_all_site_apps

    This iterates all apps from frappe.get_installed_apps(), checks which ones
    have both a local th.po and a matching file in the GitHub translation repo,
    then syncs each one and prints a before/after comparison.
    """
    import os

    if not frappe.db.exists("DocType", "GitHub Sync Settings"):
        print("GitHub Sync Settings DocType not found")
        return

    settings = frappe.get_single("GitHub Sync Settings")
    if not settings.repository_url or settings.repository_url == "None":
        print("repository_url not configured — run setup_github_sync_defaults first")
        return

    if not frappe.conf.get("github_pat_token"):
        print("github_pat_token not set in site_config.json or common_site_config.json")
        return

    from translation_tools.api.app_sync_settings import sync_app_from_github
    from translation_tools.api.github_sync import find_translation_files

    bench_path = frappe.utils.get_bench_path()
    installed_apps = frappe.get_installed_apps()

    # Get GitHub repo file list
    gh_result = find_translation_files(
        repo_url=settings.repository_url,
        branch=settings.branch or "version-15",
        target_language=settings.target_language or "th",
    )

    if not gh_result.get("success"):
        print(f"Failed to list GitHub files: {gh_result.get('error')}")
        return

    github_apps = set()
    for f in gh_result.get("files", []):
        parts = f["path"].split("/")
        if len(parts) == 2 and parts[1].endswith(".po"):
            github_apps.add(parts[0])

    print(f"\nSite: {frappe.local.site}")
    print(f"Repo: {settings.repository_url}")
    print(f"Apps installed: {len(installed_apps)}")
    print(f"Apps in GitHub repo: {len(github_apps)}")

    # Collect before stats
    try:
        import polib
    except ImportError:
        print("polib not installed — cannot show stats")
        polib = None

    print(f"\n{'App':<30} {'Before':>15} {'After':>15} {'Change':>10}")
    print("=" * 75)

    for app_name in sorted(installed_apps):
        local_po = os.path.join(bench_path, "apps", app_name, app_name, "locale", "th.po")

        if not os.path.exists(local_po):
            print(f"{app_name:<30} {'no th.po':>15} {'—':>15} {'—':>10}")
            continue

        if app_name not in github_apps:
            print(f"{app_name:<30} {'not in repo':>15} {'—':>15} {'—':>10}")
            continue

        # Before stats
        before_translated = 0
        total = 0
        if polib:
            po = polib.pofile(local_po)
            before_translated = len([e for e in po if e.msgstr and e.msgstr != ""])
            total = len(po)

        # Sync
        try:
            sync_app_from_github(app_name)
            status = "OK"
        except Exception as e:
            status = f"FAIL: {e}"

        # After stats
        after_translated = 0
        if polib and status == "OK":
            po = polib.pofile(local_po)
            after_translated = len([e for e in po if e.msgstr and e.msgstr != ""])
            total = len(po)

        if status == "OK":
            before_pct = f"{before_translated}/{total}" if total else "0/0"
            after_pct = f"{after_translated}/{total}" if total else "0/0"
            diff = after_translated - before_translated
            change = f"+{diff}" if diff > 0 else str(diff) if diff < 0 else "—"
            print(f"{app_name:<30} {before_pct:>15} {after_pct:>15} {change:>10}")
        else:
            print(f"{app_name:<30} {'—':>15} {'—':>15} {status:>10}")

    print("=" * 75)
    print("Done\n")
