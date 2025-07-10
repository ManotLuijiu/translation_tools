# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Translation Tools is a Frappe app for ERPNext that provides AI-powered translation capabilities, focusing on English-to-Thai translation for business documents and PO files. The app integrates with OpenAI GPT and Anthropic Claude models and includes a Thai Tax Consultant Bot built on the Model Context Protocol (MCP).

## Essential Development Commands

### Frappe App Development
```bash
# Run tests for the app
bench run-tests --app translation_tools

# Run specific test modules
bench run-tests --module translation_tools.translation_tools.doctype.translation_tools_settings.test_translation_tools_settings

# Install app on site
bench --site moo.localhost install-app translation_tools

# Build assets
bench build

# Watch for changes and rebuild assets
bench watch

# Start development server
bench serve --port 8000
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