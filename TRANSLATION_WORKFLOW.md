# Translation Workflow - Install vs Migrate

## Overview

The translation system has two different behaviors depending on when it runs:

1. **During Install** → Complete setup (CSV, POT, PO, MO)
2. **During Migrate** → Lightweight update (CSV only)

This design ensures:
- ✅ First-time setup is complete and ready to use
- ✅ Migrations are fast and don't touch existing .po files
- ✅ Developers have full control over PO/MO updates

## During Installation (`bench install-app translation_tools`)

### What Happens Automatically

```
🌍 Setting up complete translation workflow...

Step 1: CSV Generation (ASEAN filtering)
  └─> Custom apps: th, vi, lo, km, my, en, en-US, en-GB (8 files)
  └─> Core apps: SKIPPED (not touched)
  └─> SPA support: .tsx/.jsx extraction included
  └─> Cleanup: Non-ASEAN files automatically removed

Step 2: POT Template Generation
  └─> bench generate-pot-file --app <custom_app>
  └─> Creates: apps/<app>/locale/main.pot

Step 3: PO File Setup
  └─> bench migrate-csv-to-po --app <custom_app> --locale th
  └─> bench update-po-files --app <custom_app> --locale th
  └─> Creates/updates: apps/<app>/locale/th.po (and vi, lo, km, my)

Step 4: MO Compilation
  └─> bench compile-po-to-mo --app <custom_app> --locale th
  └─> Creates: sites/assets/locale/th/LC_MESSAGES/<app>.mo

✅ Translation system setup complete (CSV, POT, PO, MO)
```

### Files Created During Install

```
apps/inpac_pharma/
├── inpac_pharma/
│   ├── translations/          # CSV files (8 ASEAN languages)
│   │   ├── th.csv
│   │   ├── vi.csv
│   │   ├── lo.csv
│   │   ├── km.csv
│   │   ├── my.csv
│   │   ├── en.csv
│   │   ├── en-US.csv
│   │   └── en-GB.csv
│   └── locale/                # PO files
│       ├── main.pot           # Template
│       ├── th.po              # Thai translations
│       ├── vi.po              # Vietnamese
│       ├── lo.po              # Lao
│       ├── km.po              # Khmer
│       └── my.po              # Myanmar

sites/dev.manotlj.com/assets/locale/
├── th/LC_MESSAGES/
│   └── inpac_pharma.mo        # Compiled Thai translations
├── vi/LC_MESSAGES/
│   └── inpac_pharma.mo        # Compiled Vietnamese
└── ...
```

## During Migration (`bench migrate`)

### What Happens Automatically

```
🌍 Updating translation CSV files (ASEAN languages)...

Step 1: CSV Regeneration Only
  └─> Custom apps: Rebuild CSV files (ASEAN languages)
  └─> Core apps: SKIPPED
  └─> SPA support: Extract new strings from .tsx/.jsx
  └─> Cleanup: Remove non-ASEAN CSV files

✅ Translation CSV files updated successfully
   📁 Location: apps/*/translations/*.csv
   🌏 Languages: th, vi, lo, km, my, en, en-US, en-GB
```

### What Does NOT Happen

- ❌ POT files are NOT regenerated
- ❌ PO files are NOT updated
- ❌ MO files are NOT recompiled

**Why?** To avoid:
- Unexpected changes to existing .po files
- Long migration times
- Conflicts with developer translation workflows

### When You Need PO/MO Updates

Run these commands **manually** when needed:

```bash
# Update PO files with new translatable strings
bench update-po-files --app inpac_pharma --locale th

# Compile PO to MO for runtime
bench compile-po-to-mo --app inpac_pharma --locale th

# Or do all ASEAN languages at once
for locale in th vi lo km my; do
  bench update-po-files --app inpac_pharma --locale $locale
  bench compile-po-to-mo --app inpac_pharma --locale $locale
done
```

## Comparison Table

| Operation | Install | Migrate | Manual Command |
|-----------|---------|---------|----------------|
| **CSV Generation** | ✅ Auto | ✅ Auto | `bench build-message-files` |
| **ASEAN Filtering** | ✅ Auto | ✅ Auto | N/A (always active) |
| **SPA Extraction** | ✅ Auto | ✅ Auto | N/A (part of CSV generation) |
| **Cleanup Non-ASEAN** | ✅ Auto | ✅ Auto | N/A (automatic) |
| **POT Generation** | ✅ Auto | ❌ Manual | `bench generate-pot-file --app <app>` |
| **PO Update** | ✅ Auto | ❌ Manual | `bench update-po-files --app <app> --locale <locale>` |
| **MO Compilation** | ✅ Auto | ❌ Manual | `bench compile-po-to-mo --app <app> --locale <locale>` |

## Benefits of This Approach

### For Installation
- **Complete Setup**: Everything ready to use immediately
- **No Manual Steps**: Developers don't need to run additional commands
- **Proper Structure**: All translation files (CSV, POT, PO, MO) created correctly

### For Migration
- **Fast Execution**: Only regenerates CSV files (lightweight)
- **Safe Updates**: Doesn't modify existing .po files unexpectedly
- **Developer Control**: Manual PO/MO updates when needed

### For Development Workflow
- **Predictable Behavior**: Developers know exactly what happens when
- **No Surprises**: PO files only change when explicitly requested
- **Flexibility**: Can update translations on custom schedule

## Best Practices

### When to Update PO/MO Files

1. **After adding new features**: New translatable strings added to code
2. **Before translation**: Preparing files for translators
3. **After receiving translations**: Compiling updated translations
4. **Before production deployment**: Ensuring latest translations are compiled

### Recommended Workflow

```bash
# 1. Develop new features (add translatable strings)
#    Use frappe._() in Python, __() in JavaScript

# 2. Update PO files with new strings
bench update-po-files --app my_app --locale th

# 3. Translate new strings in .po files
#    Edit apps/my_app/locale/th.po manually or use translation tools

# 4. Compile updated translations
bench compile-po-to-mo --app my_app --locale th

# 5. Test translations
#    Refresh browser, check if new translations appear

# 6. Commit all translation files to git
git add apps/my_app/locale/
git add apps/my_app/translations/
git commit -m "feat: add Thai translations for new features"
```

## Troubleshooting

### CSV files not updating during migrate
**Solution**: Clear cache and rebuild
```bash
bench clear-cache
bench migrate
```

### PO files not reflecting new strings
**Solution**: Manually update PO files
```bash
bench update-po-files --app <app> --locale th
```

### Translations not appearing in UI
**Solution**: Compile MO files
```bash
bench compile-po-to-mo --app <app> --locale th
bench clear-cache
# Refresh browser
```

### Wrong languages in custom apps
**Solution**: System only generates ASEAN languages automatically
- If you need other languages, add them to `ASEAN_LOCALES` in `overrides/translate.py`
- Or manually create CSV/PO files for additional languages

## Migration from Old System

If you have an existing app with translations:

```bash
# 1. Install translation_tools
bench install-app translation_tools
# This will create CSV files for ASEAN languages

# 2. Your existing .po files are preserved
# The system only adds new ASEAN language files

# 3. If you want to update existing .po files
bench update-po-files --app <app> --locale th

# 4. Compile for runtime
bench compile-po-to-mo --app <app> --locale th
```

The system is designed to be **additive** - it won't delete or overwrite your existing translation work.
