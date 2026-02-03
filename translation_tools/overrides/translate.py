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

    Rebuilds ASEAN language translations (th, vi, lo, km, my, en) for:
    - Core apps (frappe, erpnext, hrms, payments)
    - Custom apps (from ManotLuijiu GitHub)

    All apps get SPA extraction if they have SPA directories.
    """
    core_apps = ['frappe', 'erpnext', 'hrms', 'payments']

    for app in frappe.get_all_apps():
        # Process both core apps and custom apps
        is_core = app in core_apps
        is_custom = is_custom_app(app)

        if not is_core and not is_custom:
            # Skip apps that are neither core nor custom (unknown origin)
            continue

        app_type = "core" if is_core else "custom"
        languages = ASEAN_LOCALES
        print(f"🌏 Rebuilding ASEAN translations for {app_type} app: {app}")

        # Build translation files for ASEAN languages
        for lang in languages:
            write_translations_file(app, lang)

        # Cleanup: Remove non-ASEAN files (only for custom apps to be safe)
        if is_custom:
            try:
                cleanup_non_asean_files(app)
            except Exception as e:
                print(f"   ⚠️  Cleanup warning for {app}: {e}")


def write_translations_file(app, lang, full_dict=None, app_messages=None):
    """
    Override of frappe.translate.write_translations_file

    Extends the original function to include translations from SPA React/TypeScript files.

    IMPORTANT FIX: This custom version writes ALL messages to CSV, including those
    without existing translations. Frappe's default write_csv_file skips messages
    without translations, which causes SPA strings to be silently dropped.

    Args:
        app: App name
        lang: Language code
        full_dict: Full translated language dict (optional)
        app_messages: Source strings (optional)
    """
    # Import original Frappe function
    from frappe.translate import (
        get_messages_for_app,
        get_all_translations
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

    # Step 4: Write CSV file (CUSTOM function that writes ALL messages)
    tpath = frappe.get_app_path(app, "translations")
    frappe.create_folder(tpath)

    # Get translation dict
    lang_dict = full_dict or get_all_translations(lang)

    # Use custom write function that includes untranslated messages
    write_csv_file_with_spa(
        os.path.join(tpath, lang + ".csv"),
        app_messages,
        lang_dict
    )


def write_csv_file_with_spa(path, app_messages, lang_dict):
    """
    Custom CSV writer that writes ALL messages, including those without translations.

    This fixes Frappe's default behavior where messages without existing translations
    are silently skipped, causing SPA-extracted strings to not appear in CSV files.

    Args:
        path: Output CSV file path
        app_messages: List of message tuples (path, message, context, lineno)
        lang_dict: Dictionary of existing translations {message: translation}
    """
    from csv import writer
    import re

    # Pattern to strip whitespace (from Frappe's CSV_STRIP_WHITESPACE_PATTERN)
    CSV_STRIP_WHITESPACE_PATTERN = re.compile(r"{\s?([0-9]+)\s?}")

    # Sort messages alphabetically
    app_messages.sort(key=lambda x: x[1])

    with open(path, "w", newline="") as msgfile:
        w = writer(msgfile, lineterminator="\n")

        for app_message in app_messages:
            context = None
            if len(app_message) == 2:
                path, message = app_message
            elif len(app_message) == 3:
                path, message, lineno = app_message
            elif len(app_message) == 4:
                path, message, context, lineno = app_message
            else:
                continue

            # Get translation if exists, otherwise use empty string
            t = lang_dict.get(message, "")

            # Strip whitespaces in translation
            translated_string = CSV_STRIP_WHITESPACE_PATTERN.sub(r"{\g<1>}", t)

            # IMPORTANT FIX: Write row even if translation is empty
            # Frappe's original only writes: if translated_string:
            # We write ALL messages so they appear in CSV for manual translation
            w.writerow([message, translated_string, context or ""])


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

    Scans ALL apps (core + custom) that have SPA directories (Vite/React pattern).
    Core apps like hrms also use SPA, so they are included.

    For apps without SPA directories, this function returns empty set
    (no overhead for non-SPA apps).

    Args:
        app: App name

    Returns:
        set: Unique translatable strings found in SPA files
    """
    messages = set()

    try:
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
    Extract translatable text from TypeScript/JSX file.

    ONLY extracts strings wrapped in __() translation function calls.
    This ensures we capture intentionally marked translatable strings
    and avoid extracting CSS classes, variable names, or other code artifacts.

    Supported patterns:
    - __("Text")
    - __('Text')
    - __(
        "Multiline text"
      )

    Args:
        file_path: Path to .tsx/.jsx file

    Returns:
        set: Unique translatable strings found in __() calls
    """
    texts = set()

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # ONLY extract from __("Text") or __('Text') translation function calls
        # Uses \s* to handle multiline patterns like:
        #   __(
        #     "Capture the back side with ID"
        #   )
        translation_calls = re.findall(r'__\(\s*["\']([^"\']{1,200})["\']\s*\)', content)

        # Add all found translation strings
        for text in translation_calls:
            text = text.strip()
            if text:  # Skip empty strings
                texts.add(text)

        return texts

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
