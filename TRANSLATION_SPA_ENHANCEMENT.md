# Translation Tools - SPA Enhancement Summary

## Overview

Enhanced the Translation Tools app to provide complete SPA translation support with automatic detection of untranslated strings.

## Changes Made

### 1. Enhanced SPA Text Extraction
**File**: `translation_tools/overrides/translate.py`

**Added Pattern**: `__()` function call extraction (Pattern 6)
```python
# Pattern 6: Translation function calls: __("Text") or __('Text')
# This is the PRIMARY pattern for extracting translatable strings in SPAs
translation_calls = re.findall(r'__\(["\']([^"\']{1,200})["\']', content)
texts.update(translation_calls)
```

**Updated Documentation**:
```python
"""
Patterns to extract:
- Translation calls: __("Text"), __('Text') [PRIMARY PATTERN]
- String literals in JSX: <div>Text</div>, <Button>Click Me</Button>
- Props: placeholder="Enter name", title="Save", label="Email"
- Toast/notifications: toast.success("Saved!")
- Error messages: throw new Error("Invalid input")
- Alert/confirm dialogs: alert("Text"), confirm("Text")
"""
```

### 2. Runtime Translation Detector
**File**: `translation_tools/public/js/translation_detector.js`

**Features**:
- Detects hardcoded English strings in DOM
- Scans for missing translations
- Reports coverage statistics
- Auto-enables in development mode

**Usage**:
```javascript
// Auto-enabled via bundle.js
window.TranslationDetector.reportDetectionResults();

// Or access the report
console.log(window.__translationReport);
```

### 3. Bundle Integration
**File**: `translation_tools/public/js/translation_tools.app.bundle.js`

**Added Import**:
```javascript
import './translation_detector.js';
```

## How It Works

### Build-Time Extraction (Server-Side)

1. **Automatic Extraction**:
   ```bash
   # Run after_migrate hook automatically extracts translations
   bench --site [site] migrate

   # Or manually trigger
   bench rebuild-all-translation-files
   ```

2. **What Gets Extracted**:
   - ✅ `__("Smart Debug Mode")` → Extracted
   - ✅ `<h3>Smart Debug Mode</h3>` → Extracted
   - ✅ `placeholder="Enter name"` → Extracted
   - ✅ `toast.success("Saved!")` → Extracted

3. **Output**:
   - Strings added to `apps/[app]/translations/th.csv`
   - Compiled to `sites/assets/locale/th/LC_MESSAGES/[app].mo`

### Runtime Detection (Client-Side)

1. **Auto-Detection**:
   - Runs automatically in development mode
   - Scans DOM for hardcoded strings
   - Reports to browser console

2. **Console Output**:
   ```
   🔍 Translation Detection Report
   📊 Summary:
     - Hardcoded strings found: 15
     - Missing translations: 736
     - Coverage: 19.4%

   ⚠️ Hardcoded Strings (15)
     "Smart Debug Mode" at body > div#root > h3

   💡 Access full report via: window.__translationReport
   ```

3. **Manual Trigger**:
   ```javascript
   // In browser console
   window.TranslationDetector.detectUntranslatedStrings();
   ```

## Translation Workflow

### For App Developers

1. **Use `__()` for all translatable text**:
   ```typescript
   // ✅ CORRECT
   <h3>{__("Smart Debug Mode")}</h3>

   // ❌ WRONG
   <h3>Smart Debug Mode</h3>
   ```

2. **Run extraction**:
   ```bash
   bench rebuild-all-translation-files
   ```

3. **Check generated CSV**:
   ```bash
   cat apps/m_capital/m_capital/translations/th.csv | grep "Smart Debug"
   ```

4. **Add Thai translation**:
   ```csv
   Smart Debug Mode,โหมดดีบักอัจฉริยะ,
   ```

5. **Compile translations**:
   ```bash
   bench build --app m_capital
   # or
   bench compile-po-to-mo --app m_capital
   ```

### For Translators

1. **Edit CSV files directly**:
   ```bash
   vim apps/m_capital/m_capital/translations/th.csv
   ```

2. **Format**: `English,Thai,Context`
   ```csv
   Loading...,กำลังโหลด...,
   Please wait...,กรุณารอสักครู่...,
   Submit,ส่ง,
   ```

3. **Compile and test**:
   ```bash
   bench build --app m_capital
   ```

## Audit Report

### M Capital Frontend Analysis

**Generated**: Today
**Location**: `/Users/manotlj/frappe-bench/apps/m_capital/missing_translations_full.txt`

**Statistics**:
- Total `__()` calls: 913 unique strings
- Existing translations: 1,027 entries
- Missing translations: 736 strings (80.6% coverage gap)

**Key Finding**:
- "Smart Debug Mode" found hardcoded without `__()`
- Location: `Apply.tsx:487`

**Sample Missing Translations**:
```
Accept, Accept & Continue, Account Preferences, Active Customers,
Add New Customer, Additional Files, Address Details, AI Processing,
Application Details, Apply for a Loan, Auto-save, Back to Results,
Calculate Loan, Camera opens instantly, Change Password, Dark Mode,
Edit Application, Email Address, Emergency Contact, GPS Location,
Loan Calculator, Monthly Payment, Next Step, Personal Details,
Quick Apply, Save Draft, Smart Debug Mode, Submit Application,
Toggle Theme, Upload Documents, Vehicle Details, View Details
```

## Commands Reference

### Translation Extraction
```bash
# Extract translations from all custom apps
bench rebuild-all-translation-files

# Extract for specific app
bench --site [site] execute "translation_tools.overrides.translate.write_translations_file('m_capital', 'th')"

# Generate POT template
bench generate-pot-file --app m_capital
```

### Translation Compilation
```bash
# Compile all translations
bench compile-po-to-mo

# Compile specific app
bench compile-po-to-mo --app m_capital

# Compile specific language
bench compile-po-to-mo --app m_capital --locale th
```

### Build and Deploy
```bash
# Full build (includes translation compilation)
bench build --app m_capital

# Clear cache after translation updates
bench --site [site] clear-cache

# Restart bench to apply changes
bench restart
```

## Files Modified

1. **translation_tools/overrides/translate.py**
   - Added `__()` pattern extraction (line 278-281)
   - Updated docstring (line 237)

2. **translation_tools/public/js/translation_detector.js**
   - New file: Runtime translation detection

3. **translation_tools/public/js/translation_tools.app.bundle.js**
   - Added import for translation_detector.js (line 3)

## Files Created

1. **apps/m_capital/missing_translations_full.txt**
   - Complete list of 736 missing translations

2. **TRANSLATION_SPA_ENHANCEMENT.md** (this file)
   - Documentation of enhancements

## Testing

### Verify Extraction Works

1. **Create test file**:
   ```typescript
   // apps/m_capital/frontend/src/Test.tsx
   export const Test = () => {
     return <div>{__("Test Translation String")}</div>
   }
   ```

2. **Run extraction**:
   ```bash
   bench rebuild-all-translation-files
   ```

3. **Check output**:
   ```bash
   grep "Test Translation String" apps/m_capital/m_capital/translations/th.csv
   ```

4. **Expected**: Should find the string in CSV

### Verify Runtime Detection

1. **Open browser console** in development mode

2. **Check for auto-detection**:
   ```
   🔍 Translation Detection Report
   ```

3. **Manual check**:
   ```javascript
   window.TranslationDetector.reportDetectionResults();
   ```

## Next Steps

1. **Fix "Smart Debug Mode"** hardcoded string:
   ```typescript
   // Change from:
   <h3 className="font-medium text-primary">Smart Debug Mode</h3>

   // To:
   <h3 className="font-medium text-primary">{__("Smart Debug Mode")}</h3>
   ```

2. **Add 736 missing translations** to `th.csv`

3. **Run extraction** to update CSV files:
   ```bash
   bench rebuild-all-translation-files
   ```

4. **Test in browser** with language toggle

## Benefits

✅ **Complete SPA Support**: Automatically extracts `__()` calls from React/TypeScript files
✅ **Runtime Detection**: Identifies hardcoded strings during development
✅ **Comprehensive Coverage**: 6 extraction patterns for complete coverage
✅ **ASEAN Focus**: Only generates translations for ASEAN languages
✅ **Zero Configuration**: Works automatically after installation
✅ **Developer Friendly**: Console reporting with detailed diagnostics

## Architecture

```
┌─────────────────────────────────────────────┐
│         Translation Tools App               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │  Build-Time (Server)                 │  │
│  │  - overrides/translate.py            │  │
│  │  - Extracts __() calls from SPAs     │  │
│  │  - Generates CSV files               │  │
│  │  - Compiles to .mo files             │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │  Runtime (Client)                    │  │
│  │  - public/js/translation_detector.js │  │
│  │  - Scans DOM for hardcoded strings   │  │
│  │  - Reports missing translations      │  │
│  │  - Console diagnostics               │  │
│  └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
                      ↓
        ┌─────────────────────────┐
        │  M Capital App (SPA)    │
        │  - Uses __() for text   │
        │  - Auto-extracted       │
        │  - Auto-detected        │
        └─────────────────────────┘
```

## Compatibility

- **Frappe Framework**: v14+
- **ERPNext**: v14+
- **Node.js**: v16+
- **Python**: 3.10+
- **Browsers**: Modern browsers with ES6 support

## Support

For issues or questions:
- **Repository**: https://github.com/ManotLuijiu/translation_tools
- **Email**: moocoding@gmail.com
- **Documentation**: See TRANSLATION_WORKFLOW.md

---

**Author**: Manot Luijiu
**Date**: October 18, 2025
**Version**: 1.0.0
