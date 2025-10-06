"""
Cleanup non-ASEAN translation files from custom apps.

This script removes all CSV files except for ASEAN languages (th, vi, lo, km, my)
from custom apps to save disk space and reduce clutter.
"""

import os
import frappe
from pathlib import Path

# ASEAN language codes + English variants to keep
ASEAN_LOCALES = ["th", "vi", "lo", "km", "my", "en", "en-US", "en-GB"]


def cleanup_non_asean_translations():
    """
    Remove all non-ASEAN language CSV files from custom apps.

    Only affects custom apps (from ManotLuijiu GitHub).
    Core apps (frappe, erpnext, hrms, payments) are not touched.
    """
    from translation_tools.overrides.translate import is_custom_app

    removed_count = 0
    kept_count = 0

    print("\n🧹 Cleaning up non-ASEAN translation files from custom apps...")
    print(f"   Keeping only: {', '.join(ASEAN_LOCALES)}")
    print()

    for app in frappe.get_all_apps():
        # Skip core apps
        if not is_custom_app(app):
            continue

        # Get translations directory
        try:
            translations_dir = Path(frappe.get_app_path(app, "translations"))

            if not translations_dir.exists():
                continue

            print(f"📦 Processing {app}...")

            # Iterate through all CSV files
            for csv_file in translations_dir.glob("*.csv"):
                # Extract language code from filename (e.g., "th.csv" -> "th")
                lang_code = csv_file.stem

                if lang_code in ASEAN_LOCALES:
                    # Keep ASEAN language files
                    kept_count += 1
                    print(f"   ✅ Keeping: {csv_file.name}")
                else:
                    # Remove non-ASEAN language files
                    csv_file.unlink()
                    removed_count += 1
                    print(f"   🗑️  Removed: {csv_file.name}")

        except Exception as e:
            print(f"   ⚠️  Error processing {app}: {e}")
            continue

    print()
    print(f"✅ Cleanup complete!")
    print(f"   Kept: {kept_count} ASEAN language files")
    print(f"   Removed: {removed_count} non-ASEAN language files")
    print()


if __name__ == "__main__":
    cleanup_non_asean_translations()
