# ASEAN Translation System Setup

## Overview

The translation system has been updated to only generate CSV files for ASEAN languages + English variants for custom apps, saving disk space and reducing clutter.

## Supported Languages

Custom apps will only generate translation files for these 8 languages:

### ASEAN Languages (5)
- 🇹🇭 **th** - Thailand (Thai)
- 🇻🇳 **vi** - Vietnam (Vietnamese)
- 🇱🇦 **lo** - Laos (Lao)
- 🇰🇭 **km** - Cambodia (Khmer)
- 🇲🇲 **my** - Myanmar (Burmese)

### English Variants (3)
- 🇬🇧 **en-GB** - English (British)
- 🇺🇸 **en-US** - English (American)
- 🌍 **en** - English (Generic)

## Custom App Detection

Apps are considered "custom" if they meet ALL of these criteria:
1. NOT a core app (frappe, erpnext, hrms, payments)
2. Git remote URL contains:
   - `https://github.com/ManotLuijiu/*` OR
   - `git@github.com:ManotLuijiu/*`

## How It Works

### 1. Automatic CSV Generation + Cleanup

When you run `bench migrate` or install an app, the system **automatically**:

```python
# For custom apps: Only ASEAN + English CSV files
rebuild_all_translation_files()
# Step 1: Generates: th.csv, vi.csv, lo.csv, km.csv, my.csv, en.csv, en-US.csv, en-GB.csv
# Step 2: Automatically removes any non-ASEAN CSV files
# Step 3: Result: Only 8 CSV files remain in apps/*/translations/

# For core apps: SKIP entirely
# Core apps (frappe, erpnect, hrms, payments) are NOT touched
# Their existing translations remain unchanged
```

**What happens during `bench migrate`**:
- ✅ CSV files generated for ASEAN languages (custom apps only)
- ✅ Non-ASEAN CSV files automatically removed
- ✅ SPA translations extracted from .tsx/.jsx files
- ❌ PO/MO files are NOT automatically updated (to avoid unexpected changes)

**PO/MO compilation is MANUAL**:
The system does NOT automatically run `bench update-po-files` or `bench compile-po-to-mo` during migration. This is intentional to:
1. Avoid unexpected updates to existing .po files
2. Give developers control over when translations are compiled
3. Prevent conflicts with existing translation workflows

**When you need PO/MO files**, run manually:
```bash
# Generate POT template
bench generate-pot-file --app <app>

# Update PO files (merges new strings, preserves existing translations)
bench update-po-files --app <app> --locale th

# Compile PO to MO (for runtime)
bench compile-po-to-mo --app <app> --locale th
```

### 2. SPA Translation Support

The system also extracts translatable strings from React/TypeScript SPA files:
- Scans `.tsx` and `.jsx` files in `src/` directories
- Extracts JSX text, props, toast messages, error messages
- Only processes custom apps to save server compute time

## Usage

### Rebuild Translation Files

```bash
# Option 1: Run migrate (triggers automatic rebuild)
bench --site dev.manotlj.com migrate

# Option 2: Manual rebuild (uses our override)
cd /Users/manotlj/frappe-bench
bench build-message-files
```

### Automatic Cleanup (No Manual Steps Needed)

The cleanup happens automatically when you rebuild translations:

```bash
# Rebuild translations (cleanup happens automatically)
bench --site dev.manotlj.com migrate
# OR
bench build-message-files
```

Output example:
```
🌏 Rebuilding ASEAN translations for custom app: translation_tools
  📱 Added 156 SPA translations for translation_tools
  🧹 Cleaned up 77 non-ASEAN files (kept 8 ASEAN files)
```

**No manual cleanup needed!** The system automatically:
- ✅ Keeps: th.csv, vi.csv, lo.csv, km.csv, my.csv, en.csv, en-US.csv, en-GB.csv
- 🗑️  Removes: All other language CSV files (ar.csv, de.csv, fr.csv, etc.)

## File Locations

### Custom Apps (ASEAN + English only)
```
apps/translation_tools/translation_tools/translations/
├── th.csv    ✅ Thai
├── vi.csv    ✅ Vietnamese
├── lo.csv    ✅ Lao
├── km.csv    ✅ Khmer
├── my.csv    ✅ Myanmar
├── en.csv    ✅ English
├── en-US.csv ✅ English (US)
└── en-GB.csv ✅ English (GB)

apps/digisoft_erp/digisoft_erp/translations/
├── th.csv    ✅ Thai
├── vi.csv    ✅ Vietnamese
├── lo.csv    ✅ Lao
├── km.csv    ✅ Khmer
├── my.csv    ✅ Myanmar
├── en.csv    ✅ English
├── en-US.csv ✅ English (US)
└── en-GB.csv ✅ English (GB)
```

### Core Apps (All Frappe languages - no changes)
```
apps/frappe/frappe/translations/
├── ar.csv    ✅ Arabic
├── de.csv    ✅ German
├── fr.csv    ✅ French
├── ... (80+ languages)
└── zh.csv    ✅ Chinese
```

## Benefits

1. **Disk Space Savings**: ~75% reduction in CSV files for custom apps
   - Before: 85 language files per app
   - After: 8 language files per app

2. **Faster Processing**: Only rebuild 8 languages instead of 85
   - Faster `bench migrate`
   - Faster `bench build-message-files`

3. **Focused Translation Effort**: Only maintain translations for languages you actually use

4. **SPA Support**: Automatic extraction from React/TypeScript files

## Technical Implementation

### Files Modified

1. **`translation_tools/overrides/translate.py`**
   - Added `rebuild_all_translation_files()` override
   - Added `ASEAN_LOCALES` constant
   - Enhanced `write_translations_file()` with SPA support

2. **`translation_tools/overrides/__init__.py`**
   - Updated `setup_translation_override()` to patch both functions

3. **`translation_tools/commands/cleanup_translations.py`**
   - New cleanup script for removing non-ASEAN files

### Override Flow

```
bench migrate
  └─> run_translation_commands_after_migrate()
       └─> setup_translation_override()
            └─> Patches frappe.translate.rebuild_all_translation_files
            └─> Patches frappe.translate.write_translations_file
       └─> rebuild_all_translation_files()  # Our override
            └─> For each app:
                 └─> If core app (frappe/erpnext/hrms/payments):
                      └─> SKIP - don't touch existing translations
                 └─> If custom app (ManotLuijiu GitHub):
                      └─> Only ASEAN + English languages (8 total)
                      └─> write_translations_file()  # Our override
                           └─> Add SPA translations from .tsx/.jsx files
                           └─> Write CSV file
                      └─> cleanup_non_asean_files()  # Automatic cleanup
                           └─> Remove non-ASEAN CSV files
                           └─> Keep only 8 ASEAN + English files
```

## Next Steps

After updating the code, just run migrate:

1. **Rebuild translations** (cleanup happens automatically):
   ```bash
   bench --site dev.manotlj.com migrate
   ```

2. **Verify results**:
   ```bash
   # Check custom app (should have only 8 CSV files)
   ls apps/digisoft_erp/digisoft_erp/translations/
   # Expected: th.csv vi.csv lo.csv km.csv my.csv en.csv en-US.csv en-GB.csv

   # Check core app (should have 80+ CSV files - unchanged)
   ls apps/frappe/frappe/translations/
   # Expected: ar.csv de.csv fr.csv ... (all Frappe languages)
   ```

That's it! The cleanup is fully automatic now.

## Troubleshooting

### CSV files still generated for all languages

**Cause**: Override not installed before rebuild
**Solution**:
```python
from translation_tools.overrides import setup_translation_override
setup_translation_override()
```

### SPA translations not extracted

**Cause**: App not detected as custom app
**Solution**: Check git remote URL matches ManotLuijiu pattern

### Custom app gets all 85 languages

**Cause**: Git remote URL doesn't match ManotLuijiu pattern
**Solution**: Update git remote or add app to custom detection logic
