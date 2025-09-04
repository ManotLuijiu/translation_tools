# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Translation Tools is a Frappe app for ERPNext that provides AI-powered translation capabilities, focusing on English-to-Thai translation for business documents and PO files. The app integrates with OpenAI GPT and Anthropic Claude models and includes a Thai Tax Consultant Bot built on the Model Context Protocol (MCP).

## Essential Development Commands

### Frappe App Development
```bash
# Run tests for the app
bench run-tests --app translation_tools

# Run specific test modules (must be in tests folder)
bench run-tests --module translation_tools.tests.test_translation_tools_settings

# Install app on site
bench --site moo.localhost install-app translation_tools

# Build assets
bench build

# Watch for changes and rebuild assets
bench watch

# Start development server
bench serve --port 8000
```

### Frappe Translation Workflow Commands
```bash
# Generate POT (Portable Object Template) file containing all translatable strings
bench generate-pot-file --app translation_tools
# Creates: apps/translation_tools/translation_tools/locale/main.pot

# Migrate existing CSV translations to PO format (if upgrading from old system)
bench migrate-csv-to-po --app translation_tools --locale th
# Requires: POT file must exist beforehand

# Update existing PO files with latest strings from POT file
bench update-po-files --app translation_tools --locale th
# Syncs: Removes outdated strings, adds new ones

# Compile PO files to binary MO files for runtime usage
bench compile-po-to-mo --app translation_tools --locale th
# Outputs: sites/assets/locale/th/LC_MESSAGES/translation_tools.mo
# Note: Automatically runs during bench build and bench update

# Force recompilation even if files haven't changed
bench compile-po-to-mo --app translation_tools --locale th --force
```

### Frontend Development (React Dashboard)
```bash
# Install PWA dependencies
yarn install-pwa-deps

# Start development server for React dashboard
yarn dev-pwa

# Build production assets for React dashboard
yarn build-pwa

# Full build (includes PWA build)
yarn build
```

### Code Quality
```bash
# Format and lint JavaScript/TypeScript with Biome
npx biome format --write .
npx biome lint .

# ESLint for React dashboard
cd thai_translation_dashboard && npx eslint .

# Python code is handled by Frappe's Ruff configuration (pyproject.toml)
```

## Architecture

### Dual Frontend Architecture
- **Frappe Web Pages**: Traditional Frappe pages for basic functionality
- **React Dashboard**: Modern SPA built with Vite (`thai_translation_dashboard/`) for advanced translation UI

### Core Components

#### Translation Engine
- **AI Integration**: OpenAI GPT and Anthropic Claude API clients
- **PO File Processing**: Uses `polib` library for gettext file manipulation
- **Thai Glossary**: Custom terminology dictionary for consistent translations
- **Batch Processing**: Rate-limited translation processing for large files

#### API Layer (`translation_tools/api/`)
- **translation.py**: Main translation logic and API endpoints
- **ai_models.py**: AI model management and validation
- **po_files.py**: PO file operations (read, write, parse)
- **github_sync.py**: GitHub repository integration
- **glossary.py**: Translation glossary management

#### DocTypes (Frappe Data Models)
- **Translation Tools Settings**: Global configuration and API keys
- **Translation User Settings**: Per-user preferences
- **Translation Glossary Term**: Custom terminology management
- **Translation History Entry**: Translation audit trail

#### Frontend Assets
- **React Components**: Located in `thai_translation_dashboard/src/components/`
- **API Clients**: TypeScript interfaces for Frappe backend communication
- **Styling**: TailwindCSS with custom Thai font support

### File Structure Patterns
```
translation_tools/
├── api/                    # Frappe API endpoints (@frappe.whitelist())
├── translation_tools/      # App module (DocTypes, Pages, etc.)
│   ├── doctype/           # Frappe DocTypes with .json, .py, .js files
│   ├── page/              # Frappe Pages
│   └── workspace/         # Frappe Workspaces
├── public/                # Static assets served by Frappe
├── utils/                 # Python utilities
├── www/                   # Web pages
└── thai_translation_dashboard/  # React SPA
    ├── src/
    │   ├── components/    # React components
    │   ├── api/          # API clients
    │   └── types/        # TypeScript definitions
    └── package.json
```

## Development Standards

### Custom Field Management (MANDATORY)

#### Naming Convention
All custom fields created by translation_tools MUST follow this naming pattern:
- **App Name**: translation_tools  
- **Prefix**: `tt_custom_`
- **Pattern**: `tt_custom_{descriptive_field_name}`
- **Label**: Can be human-readable without prefix

```python
# CORRECT - Following naming convention
"Print Format": [
    {
        "fieldname": "tt_custom_thai_translation_enabled",
        "label": "Thai Translation Enabled",
        "fieldtype": "Check",
        "default": 0,
        "insert_after": "print_language"
    }
]

# INCORRECT - Missing prefix (legacy fields, to be migrated)
"Print Format": [
    {
        "fieldname": "thai_translation_enabled",  # Missing tt_custom_ prefix
        "label": "Thai Translation Enabled",
        "fieldtype": "Check",
        "default": 0,
        "insert_after": "print_language"
    }
]
```

**Note**: Some legacy fields may not follow this convention yet. New fields MUST use the `tt_custom_` prefix, and existing fields should be migrated when modified.

### Test Folder Structure (MANDATORY)
All test files MUST be placed in the designated tests folder following ERPNext standards:

```
translation_tools/
├── translation_tools/
│   └── tests/                    # MANDATORY test folder location
│       ├── __init__.py          # Required for Python module
│       ├── test_translation_tools_settings.py    # Settings configuration tests
│       ├── test_translation_user_settings.py     # User preferences tests
│       ├── test_glossary_term.py                 # Glossary management tests
│       └── test_translation_history.py           # Translation audit tests
├── api/
│   └── tests/                    # API-specific tests (if needed)
│       ├── __init__.py
│       ├── test_translation.py  # Translation API tests
│       └── test_po_files.py     # PO file processing tests
└── utils/
    └── tests/                    # Utility function tests (if needed)
        ├── __init__.py
        └── test_ai_models.py
```

**Reference Standard**: Follow `apps/erpnext/erpnext/tests` structure as documented in Documentation/rules.md

**Rules**:
1. **All test files** MUST be in `app_name/app_name/tests/` folder
2. **Test files** MUST start with `test_` prefix
3. **Each module** can have its own tests subfolder if complex
4. **Import pattern**: `from translation_tools.tests.test_module import TestClass`

## Development Workflow

### Working with Translations
1. **PO File Operations**: Use `translation_tools.api.po_files` for file parsing
2. **AI Translation**: Call `translation_tools.api.translation.translate_text()`
3. **Glossary Management**: Access via `translation_tools.api.glossary`
4. **Settings**: Configure via Translation Tools Settings DocType

### React Dashboard Development
1. **Hot Reload**: Use `yarn dev-pwa` for development
2. **API Integration**: Uses `frappe-react-sdk` for backend communication
3. **State Management**: React Query for server state
4. **Routing**: React Router for SPA navigation

### Testing
- **Python Tests**: Standard Frappe test classes inheriting from `unittest.TestCase`
- **Frontend**: No automated tests configured (manual testing recommended)
- **API Testing**: Use Frappe's test client or Postman

#### Test Structure Example
```python
# translation_tools/translation_tools/tests/test_translation_tools_settings.py
import frappe
import unittest
from frappe.tests.utils import FrappeTestCase

class TestTranslationToolsSettings(unittest.TestCase):  # or FrappeTestCase
    def setUp(self):
        # Test setup for translation settings
        self.settings_doc = frappe.get_single("Translation Tools Settings")
        pass
    
    def test_settings_validation(self):
        """Test translation settings validation"""
        settings = frappe.get_doc({
            "doctype": "Translation Tools Settings",
            "openai_api_key": "test-key",
            "anthropic_api_key": "test-key",
            "default_model": "gpt-4"
        })
        settings.validate()
        self.assertEqual(settings.default_model, "gpt-4")
    
    def test_api_key_encryption(self):
        """Test that API keys are properly encrypted"""
        settings = frappe.get_single("Translation Tools Settings")
        settings.openai_api_key = "sk-test123456789"
        settings.save()
        # API keys should be encrypted when saved
        self.assertNotEqual(settings.get_password("openai_api_key"), "sk-test123456")
    
    def tearDown(self):
        # Clean up test data
        pass
```

## Configuration

### Environment Setup
- **API Keys**: Configure in Translation Tools Settings DocType
- **Models**: OpenAI (GPT-4, GPT-3.5) and Anthropic (Claude) models supported
- **Thai Fonts**: Sarabun, Noto Sans Thai, and Kanit fonts included

### Build Configuration
- **Vite**: React dashboard build configuration in `thai_translation_dashboard/vite.config.ts`
- **Biome**: JavaScript/TypeScript formatting and linting in `biome.json`
- **Ruff**: Python code quality via `pyproject.toml`

### Frappe Hooks
- **After Install**: Workspace setup and default configuration
- **Scheduler**: Daily AI model availability checks
- **Assets**: Automatic bundle inclusion via hooks.py

## Translation File Management

### Frappe Translation System Overview
Frappe uses the standard gettext internationalization system with PO/POT/MO files:

- **POT Files** (Portable Object Template): Template files containing all translatable strings extracted from the app
- **PO Files** (Portable Object): Language-specific files containing actual translations
- **MO Files** (Machine Object): Compiled binary files used at runtime for performance

### Translation File Structure
```
translation_tools/
└── translation_tools/
    └── locale/
        ├── main.pot           # Template with all translatable strings
        ├── th.po             # Thai translations
        ├── en.po             # English translations (if needed)
        └── [locale].po       # Other language translations
```

### Translation Workflow

#### 1. Extract Translatable Strings
```bash
# Generate or update the POT template file
bench generate-pot-file --app translation_tools
```
This scans all Python, JavaScript, and JSON files for translatable strings marked with:
- Python: `_("string")` or `frappe._("string")`
- JavaScript: `__("string")` or `frappe._("string")`
- JSON: Fields with `translatable: 1` property

#### 2. Create/Update Language Files
```bash
# Update existing PO files with new strings from POT
bench update-po-files --app translation_tools --locale th

# Or update all locales
bench update-po-files --app translation_tools
```

#### 3. Add Translations
Edit the PO files directly or use translation tools:
- Manual editing with text editor
- Use POEdit or similar PO file editors
- Integration with translation platforms (Crowdin, Weblate)

#### 4. Compile for Production
```bash
# Compile PO to binary MO files
bench compile-po-to-mo --app translation_tools --locale th

# Or compile all during build
bench build  # Automatically compiles all PO files
```

#### 5. Migration from Legacy CSV
If upgrading from old CSV-based translations:
```bash
# Migrate CSV translations to PO format
bench migrate-csv-to-po --app translation_tools --locale th
```

### Best Practices for Translatable Strings

#### In Python Files
```python
from frappe import _

# Simple translation
message = _("Document saved successfully")

# With dynamic values (use format, not f-strings)
message = _("Hello {0}, you have {1} new messages").format(user_name, count)

# Context-specific translations
message = _("Bank", context="Financial Institution")
```

#### In JavaScript Files
```javascript
// Simple translation
frappe.msgprint(__("Document saved successfully"));

// With dynamic values
frappe.msgprint(__("Hello {0}, you have {1} new messages", [user_name, count]));

// Context-specific
__("Bank", null, "Financial Institution");
```

#### In DocType JSON Files
```json
{
  "fieldname": "customer_name",
  "label": "Customer Name",
  "translatable": 1
}
```

## Thai Business Context

### Specialized Features
- **Thai Tax Bot**: MCP-based AI assistant for Thai tax law guidance
- **Thai Fonts**: Multiple Thai font families for document generation
- **Business Terms**: Thai business terminology glossary
- **PDF Generation**: Thai-language PDF support with proper font rendering

### Localization Support
- **PO Files**: Standard gettext localization workflow
- **UI Translation**: Both Frappe and React UI support Thai language
- **Document Templates**: Thai-specific print formats and layouts

## API Integration Patterns

### Frappe Whitelisted Methods
```python
@frappe.whitelist()
def method_name():
    # Always validate permissions
    # Return JSON-serializable data
    # Handle errors gracefully
```

### React-Frappe Communication
```typescript
// Use frappe-react-sdk for API calls
import { call } from 'frappe-react-sdk'

const result = await call.post('translation_tools.api.translation.translate_text', {
    text: 'Hello',
    target_lang: 'th'
})
```

## Development Best Practices

### Code Style
- **Python**: Follow Frappe conventions, use type hints where possible
- **JavaScript/TypeScript**: Single quotes, semicolons required (Biome config)
- **React**: Functional components with hooks, TypeScript preferred

### Error Handling
- **Backend**: Use `frappe.throw()` for user-facing errors
- **Frontend**: React Error Boundaries and proper state management
- **API**: Return structured error responses with appropriate HTTP codes

### Performance Considerations
- **AI API Calls**: Implement rate limiting and batch processing
- **File Processing**: Stream large PO files rather than loading entirely in memory
- **Caching**: Use Frappe's cache for expensive operations like model validation

---

## CRITICAL DEVELOPMENT RULES

⚠️ **These rules are MANDATORY and must be followed for all development work:**

### 1. File Creation Rule
**ALWAYS scan relevant files before creating new files to prevent redundancy**
- Check if similar functionality already exists
- Review existing API endpoints, components, and utilities
- Avoid duplicate implementations

### 2. Custom Field Naming (ERPNext Guidelines)
**All custom fields MUST use app-specific prefix:**
- **App**: translation_tools → **Prefix**: `tt_custom_`
- **Pattern**: `tt_custom_{descriptive_field_name}`  
- **Example**: `tt_custom_thai_translation_enabled`

### 3. Hooks.py Maintenance  
**Review hooks.py regularly for duplicated functions or redundancy**
- Check for duplicate event handlers
- Remove obsolete or unused hooks
- Ensure clean, maintainable hook configuration

### 4. Uninstall Compliance (CRITICAL)
**All custom fields created by the app MUST be removed during uninstallation**
- Implement `before_uninstall` hook in hooks.py
- Clean up all custom fields to prevent orphaned data
- Reference: https://github.com/frappe/frappe/issues/24108

### 5. Testing Standards
**Follow ERPNext testing patterns:**
- Tests location: `translation_tools/translation_tools/tests/`
- Reference: `apps/erpnext/erpnext/tests` structure
- Documentation: https://docs.frappe.io/framework/user/en/testing

---

## Development Rules & Standards

### Custom Field Naming Convention (MANDATORY)
Following [Documentation/rules.md](/home/frappe/frappe-bench/Documentation/rules.md):

- **App Name**: translation_tools
- **Prefix**: `tt_custom_` (required by ERPNext Custom Field Guidelines)
- **Pattern**: `tt_custom_{descriptive_field_name}`

#### Examples
```python
# ✅ CORRECT - Following naming convention
custom_field = {
    "fieldname": "tt_custom_source_language",
    "fieldtype": "Select",
    "label": "Source Language"
}

# ❌ INCORRECT - Missing app-specific prefix
custom_field = {
    "fieldname": "source_language",  # Should be tt_custom_source_language
    "fieldtype": "Select",
    "label": "Source Language"
}
```

### Testing Standards
- **Test Location**: `translation_tools/translation_tools/tests/`
- **Reference**: Follow `apps/erpnext/erpnext/tests` structure
- **Docs**: https://docs.frappe.io/framework/user/en/testing

### Uninstall Compliance
- **Requirement**: All custom fields MUST be removed during app uninstallation
- **Implementation**: Add `before_uninstall` hook in `hooks.py`
- **Reference Issue**: https://github.com/frappe/frappe/issues/24108

#### Current Status
✅ **Note**: Translation Tools appears to use custom DocTypes rather than custom fields. If any custom fields exist, they should follow the `tt_custom_` naming convention.

### File Creation Guidelines (MANDATORY)
- **Scan relevant files before creating new files** to prevent redundancy
- **Check hooks.py regularly** for duplicated functions or redundancy  
- **Follow ERPNext Custom Field Guidelines** consistently for all custom field operations

### Uninstall Requirements (CRITICAL)
- **All custom fields created by translation_tools MUST be removed during app uninstallation**
- **Reference Issue**: https://github.com/frappe/frappe/issues/24108
- **Implementation**: Use `before_uninstall` hook in hooks.py to clean up custom fields
- **Testing**: Verify that uninstallation leaves no orphaned custom fields

### Priority Compliance Checklist
1. ✅ **Custom Field Naming**: Use `tt_custom_` prefix for all new custom fields  
2. ❓ **Uninstall Cleanup**: Review if app creates custom fields and add cleanup logic if needed
3. ✅ **Test Structure**: Maintain tests in `translation_tools/translation_tools/tests/` folder
4. ❓ **Hooks Review**: Check hooks.py for redundant or duplicated functions  

### Current Compliance Status
- **Custom Fields**: Translation Tools primarily uses custom DocTypes rather than custom fields
- **Testing**: Test structure follows ERPNext standards (`apps/erpnext/erpnext/tests` pattern)
- **File Organization**: Follows recommended structure and patterns
- **Documentation**: Comprehensive CLAUDE.md with guidelines and examples