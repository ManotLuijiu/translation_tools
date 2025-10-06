"""
Generate CSV translation files by extracting English text from SPA React/TypeScript files.

This solves the problem that Frappe's translation system doesn't scan .tsx/.jsx files.

Workflow:
    1. User installs translation_tools app
    2. This script scans all custom apps for SPA directories
    3. Extracts English text from .tsx/.jsx/.ts files
    4. Creates translations/th.csv with format: English,English
    5. User manually replaces 2nd column with Thai
    6. bench migrate-csv-to-po converts CSV → PO
    7. bench compile-po-to-mo compiles for runtime

Usage:
    bench --site [site] console
    >>> from translation_tools.commands.generate_csv import generate_csv_for_all_spa
    >>> generate_csv_for_all_spa()
"""

import os
import re
import csv
import frappe
from pathlib import Path


def extract_text_from_tsx_file(file_path):
    """
    Extract English text from TypeScript/JSX file.

    Patterns to extract:
    - String literals in JSX: <div>Text</div>, <Button>Click Me</Button>
    - Props: placeholder="Enter name", title="Save", label="Email"
    - Toast/notifications: toast.success("Saved!")
    - Error messages: throw new Error("Invalid input")

    Args:
        file_path: Path to .tsx/.jsx/.ts file

    Returns:
        set: Unique English text found
    """
    texts = set()

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Pattern 1: JSX text content: <tag>Text Here</tag>
        jsx_text = re.findall(r'>\s*([A-Z][A-Za-z\s]{2,50})\s*<', content)
        texts.update(jsx_text)

        # Pattern 2: String props: prop="Text"
        string_props = re.findall(r'(?:title|label|placeholder|description|message|text|name|error|success|warning)=["\']([^"\']{3,100})["\']', content, re.IGNORECASE)
        texts.update(string_props)

        # Pattern 3: Toast notifications: toast.success("Text")
        toast_msgs = re.findall(r'toast\.\w+\(["\']([^"\']{3,100})["\']', content)
        texts.update(toast_msgs)

        # Pattern 4: Error messages: Error("Text"), throw "Text"
        error_msgs = re.findall(r'(?:Error|throw)\s*\(["\']([^"\']{3,100})["\']', content)
        texts.update(error_msgs)

        # Pattern 5: Alert/confirm dialogs: alert("Text"), confirm("Text")
        dialog_msgs = re.findall(r'(?:alert|confirm)\s*\(["\']([^"\']{3,100})["\']', content)
        texts.update(dialog_msgs)

        # Clean up: remove variables, URLs, paths
        cleaned_texts = set()
        for text in texts:
            text = text.strip()
            # Skip if too short, has special chars, or looks like code
            if len(text) < 3:
                continue
            if re.search(r'[{}()\[\]<>/@\\]', text):
                continue
            if text.startswith('http'):
                continue
            if text.isnumeric():
                continue
            # Keep only English text with spaces or single words starting with capital
            if re.match(r'^[A-Z][A-Za-z\s,.\-!?]{2,}$', text):
                cleaned_texts.add(text)

        return cleaned_texts

    except Exception as e:
        print(f"    ⚠️  Error reading {file_path.name}: {str(e)}")
        return set()


def find_spa_directories(app_name):
    """
    Find SPA directories in an app.
    Common patterns: {app_name}/dashboard, {app_name}/frontend, {app_name}/{spa_name}

    Args:
        app_name: App name

    Returns:
        list: Paths to SPA src directories
    """
    app_path = Path(frappe.get_app_path(app_name)).parent
    spa_dirs = []

    # Look for directories with src/ subdirectory (Vite/React pattern)
    for item in app_path.iterdir():
        if item.is_dir():
            src_path = item / "src"
            if src_path.exists() and src_path.is_dir():
                spa_dirs.append(src_path)

    return spa_dirs


def generate_csv_for_app_spa(app_name, locale="th"):
    """
    Generate translations/th.csv from SPA React/TypeScript files.

    Args:
        app_name: App name
        locale: Language code

    Returns:
        bool: Success
    """
    try:
        # Find SPA directories
        spa_dirs = find_spa_directories(app_name)

        if not spa_dirs:
            print(f"  ⏭️  No SPA found")
            return False

        print(f"  📂 Found {len(spa_dirs)} SPA(s): {', '.join([d.parent.name for d in spa_dirs])}")

        # Extract text from all .tsx/.jsx/.ts files
        all_texts = set()
        file_count = 0

        for spa_dir in spa_dirs:
            print(f"  🔍 Scanning: {spa_dir.parent.name}/src/")

            # Walk through src directory
            for file_path in spa_dir.rglob("*.tsx"):
                texts = extract_text_from_tsx_file(file_path)
                all_texts.update(texts)
                file_count += 1

            for file_path in spa_dir.rglob("*.jsx"):
                texts = extract_text_from_tsx_file(file_path)
                all_texts.update(texts)
                file_count += 1

        if not all_texts:
            print(f"  ⚠️  No English text found in {file_count} files")
            return False

        print(f"  📝 Extracted {len(all_texts)} unique texts from {file_count} files")

        # Create CSV file
        app_path = Path(frappe.get_app_path(app_name))
        translations_dir = app_path / "translations"
        csv_path = translations_dir / f"{locale}.csv"

        # Create directory if needed
        if not translations_dir.exists():
            translations_dir.mkdir(parents=True)

        # Sort texts for consistent output
        sorted_texts = sorted(all_texts)

        # Write CSV: English,English, (with trailing comma to match HRMS format)
        # Format matches: apps/hrms/hrms/translations/th.csv
        csv_data = [[text, text, ""] for text in sorted_texts]

        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerows(csv_data)

        rel_path = csv_path.relative_to(app_path.parent.parent)
        print(f"  ✅ Created: {rel_path}")
        print(f"  📊 Total entries: {len(csv_data)}")

        return True

    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        frappe.log_error(str(e), f"SPA CSV Generation - {app_name}")
        return False


def generate_csv_for_all_spa(locale="th"):
    """
    Generate CSV files for all custom apps with SPAs.

    Args:
        locale: Language code

    Returns:
        dict: Results
    """
    try:
        # Skip core apps
        core_apps = {"frappe", "erpnext", "hrms", "payments"}

        # Get custom apps
        all_apps = frappe.get_installed_apps()
        custom_apps = [app for app in all_apps if app not in core_apps]

        if not custom_apps:
            print("\n  ℹ️  No custom apps found")
            return {"success": [], "no_spa": [], "skipped": []}

        print(f"\n{'=' * 80}")
        print(f"📝 GENERATE CSV FROM SPA REACT/TYPESCRIPT FILES")
        print(f"{'=' * 80}")
        print(f"🌐 Locale: {locale.upper()}")
        print(f"📦 Apps: {', '.join(custom_apps)}")
        print(f"{'=' * 80}\n")

        success = []
        no_spa = []
        skipped = []

        for app in custom_apps:
            print(f"📦 {app}:")

            # Check if CSV already exists
            app_path = Path(frappe.get_app_path(app))
            csv_path = app_path / "translations" / f"{locale}.csv"

            if csv_path.exists():
                print(f"  ⏭️  Skip: CSV exists")
                print(f"  💡 Delete to regenerate: {csv_path.relative_to(app_path.parent.parent)}")
                skipped.append(app)
            elif generate_csv_for_app_spa(app, locale):
                success.append(app)
            else:
                no_spa.append(app)

            print()

        # Summary
        print(f"{'=' * 80}")
        print(f"📊 SUMMARY")
        print(f"{'=' * 80}")

        if success:
            print(f"✅ Generated: {len(success)}")
            for app in success:
                print(f"   • {app}")

        if no_spa:
            print(f"\n⏭️  No SPA found: {len(no_spa)}")
            for app in no_spa:
                print(f"   • {app}")

        if skipped:
            print(f"\n⏭️  Skipped (CSV exists): {len(skipped)}")
            for app in skipped:
                print(f"   • {app}")

        print(f"{'=' * 80}\n")

        if success:
            print("📋 Next steps:")
            print(f"   1. Edit CSV files - replace English (2nd column) with Thai")
            print(f"   2. Run: bench migrate-csv-to-po --app <app> --locale {locale}")
            print(f"   3. Run: bench compile-po-to-mo --app <app> --locale {locale}")
            print(f"   OR let after_migrate hook automate steps 2-3\n")

        return {"success": success, "no_spa": no_spa, "skipped": skipped}

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        frappe.log_error(str(e), "Batch SPA CSV Generation")
        return {"success": [], "no_spa": [], "skipped": []}
