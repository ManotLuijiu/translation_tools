"""
Override Frappe's write_translations_file to include SPA React/TypeScript translations.

This override extends Frappe's translation system to support modern SPA pages built with
React/TypeScript, which use .tsx/.jsx files that Frappe's default extractors don't scan.

Workflow:
    1. Frappe calls write_translations_file (original)
    2. We intercept and add SPA translations to app_messages
    3. Call original function with enhanced messages
    4. Result: CSV files include both Frappe + SPA translations
"""

import os
import re
from pathlib import Path

import frappe

# ASEAN language codes + English variants - only generate CSV files for these languages
ASEAN_LOCALES = ["th", "vi", "lo", "km", "my", "en", "en-US", "en-GB"]


def rebuild_all_translation_files():
    """
    Override of frappe.translate.rebuild_all_translation_files

    For custom apps: Only rebuild ASEAN language translations (th, vi, lo, km, my)
    For core apps: SKIP (don't touch existing translations)

    This ensures we don't overwrite existing core app translations while
    providing ASEAN-focused translation support for custom apps.
    """
    for app in frappe.get_all_apps():
        # Only process custom apps - skip core apps entirely
        if not is_custom_app(app):
            # Skip core apps (frappe, erpnext, hrms, payments)
            # They maintain their own translations
            continue

        # Custom apps: Only ASEAN languages
        languages = ASEAN_LOCALES
        print(f"🌏 Rebuilding ASEAN translations for custom app: {app}")

        # Build translation files for ASEAN languages
        for lang in languages:
            write_translations_file(app, lang)

        # Cleanup: Remove non-ASEAN files from custom apps
        try:
            cleanup_non_asean_files(app)
        except Exception as e:
            print(f"   ⚠️  Cleanup warning for {app}: {e}")


def write_translations_file(app, lang, full_dict=None, app_messages=None):
    """
    Override of frappe.translate.write_translations_file

    Extends the original function to include translations from SPA React/TypeScript files.

    Args:
        app: App name
        lang: Language code
        full_dict: Full translated language dict (optional)
        app_messages: Source strings (optional)
    """
    # Import original Frappe function
    from frappe.translate import (
        get_messages_for_app,
        get_all_translations,
        write_csv_file
    )

    # Step 1: Get standard Frappe messages (if not provided)
    if not app_messages:
        app_messages = get_messages_for_app(app)

    # Step 2: Extract SPA messages and add to app_messages
    spa_messages = get_messages_from_spa(app)

    if spa_messages:
        # Convert SPA messages to Frappe format: (path, message, context, lineno)
        # Frappe expects tuples, we'll add our SPA messages in compatible format
        for message in spa_messages:
            # Add as tuple: (file_path, message_text, None, 0)
            # Context is None, lineno is 0 for SPA extractions
            app_messages.append(("SPA", message, None, 0))

        print(f"  📱 Added {len(spa_messages)} SPA translations for {app}")

    # Step 3: Return if no messages at all
    if not app_messages:
        return

    # Step 4: Write CSV file (call original Frappe function)
    tpath = frappe.get_app_path(app, "translations")
    frappe.create_folder(tpath)
    write_csv_file(
        os.path.join(tpath, lang + ".csv"),
        app_messages,
        full_dict or get_all_translations(lang)
    )


def is_custom_app(app):
    """
    Check if an app is a custom app (from ManotLuijiu GitHub) or core Frappe app.

    Custom apps are identified by git remote URL containing:
    - https://github.com/ManotLuijiu/*
    - git@github.com:ManotLuijiu/*

    Args:
        app: App name

    Returns:
        bool: True if custom app, False if core app or unknown
    """
    import subprocess

    try:
        # Get the app's git directory
        app_path = Path(frappe.get_app_path(app)).parent

        # Check if it's a git repository
        git_dir = app_path / '.git'
        if not git_dir.exists():
            # Not a git repo - assume not custom
            return False

        # Get git remote URL
        result = subprocess.run(
            ['git', 'config', '--get', 'remote.origin.url'],
            cwd=app_path,
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            # No remote configured - assume not custom
            return False

        remote_url = result.stdout.strip()

        # Check if remote URL matches ManotLuijiu patterns
        custom_patterns = [
            'https://github.com/ManotLuijiu/',
            'git@github.com:ManotLuijiu/',
        ]

        for pattern in custom_patterns:
            if pattern in remote_url:
                return True

        # Not a ManotLuijiu custom app
        return False

    except Exception as e:
        # Error checking git remote - assume not custom to be safe
        print(f"Warning: Could not determine if {app} is custom app: {e}")
        return False


def get_messages_from_spa(app):
    """
    Extract translatable messages from SPA React/TypeScript files.

    Optimized to only scan custom apps with SPA pages to save server compute time.
    Only processes apps that have SPA directories (Vite/React pattern).

    Custom app detection:
    1. Core apps (frappe, erpnext, hrms, payments) are skipped
    2. Apps with git remote from https://github.com/ManotLuijiu/* are considered custom
    3. Apps with git remote from git@github.com:ManotLuijiu/* are considered custom

    Args:
        app: App name

    Returns:
        set: Unique translatable strings found in SPA files
    """
    messages = set()

    try:
        # Define core Frappe ecosystem apps
        core_apps = ['frappe', 'erpnext', 'hrms', 'payments']

        # Skip core apps entirely - they have their own translation workflows
        if app in core_apps:
            return messages

        # Check if app is a custom app (from ManotLuijiu GitHub)
        if not is_custom_app(app):
            return messages

        # Find SPA directories
        app_path = Path(frappe.get_app_path(app)).parent
        spa_dirs = []

        # Look for directories with src/ subdirectory (Vite/React pattern)
        for item in app_path.iterdir():
            if item.is_dir():
                src_path = item / "src"
                if src_path.exists() and src_path.is_dir():
                    spa_dirs.append(src_path)

        if not spa_dirs:
            # No SPA directories found - skip this app
            return messages

        # Extract from all .tsx/.jsx files in SPA directories
        for spa_dir in spa_dirs:
            # Process .tsx files
            for file_path in spa_dir.rglob("*.tsx"):
                texts = extract_text_from_tsx_file(file_path)
                messages.update(texts)

            # Process .jsx files
            for file_path in spa_dir.rglob("*.jsx"):
                texts = extract_text_from_tsx_file(file_path)
                messages.update(texts)

        return messages

    except Exception as e:
        frappe.log_error(str(e), f"SPA Translation Extraction - {app}")
        return messages


def extract_text_from_tsx_file(file_path):
    """
    Extract English text from TypeScript/JSX file.

    Patterns to extract:
    - String literals in JSX: <div>Text</div>, <Button>Click Me</Button>
    - Props: placeholder="Enter name", title="Save", label="Email"
    - Toast/notifications: toast.success("Saved!")
    - Error messages: throw new Error("Invalid input")

    Args:
        file_path: Path to .tsx/.jsx file

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
        string_props = re.findall(
            r'(?:title|label|placeholder|description|message|text|name|error|success|warning)=["\']([^"\']{3,100})["\']',
            content,
            re.IGNORECASE
        )
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
        return set()


def cleanup_non_asean_files(app):
    """
    Remove non-ASEAN translation CSV files from a custom app.

    This function is called automatically after rebuild_all_translation_files()
    to clean up any CSV files that were generated by Frappe's default behavior
    but aren't in the ASEAN_LOCALES list.

    Args:
        app: App name to clean up
    """
    try:
        translations_dir = Path(frappe.get_app_path(app, "translations"))

        if not translations_dir.exists():
            return

        removed_count = 0
        kept_count = 0

        # Iterate through all CSV files
        for csv_file in translations_dir.glob("*.csv"):
            lang_code = csv_file.stem  # Get filename without .csv extension

            if lang_code in ASEAN_LOCALES:
                # Keep ASEAN language files
                kept_count += 1
            else:
                # Remove non-ASEAN language files
                csv_file.unlink()
                removed_count += 1

        if removed_count > 0:
            print(f"   🧹 Cleaned up {removed_count} non-ASEAN files (kept {kept_count} ASEAN files)")

    except Exception as e:
        # Don't fail the entire process if cleanup fails
        print(f"   ⚠️  Cleanup error: {e}")
