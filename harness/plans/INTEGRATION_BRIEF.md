# Translation Tools Integration Brief

**Purpose:** Single source of truth for the Translation Tools app architecture, navigation surfaces, and integration patterns.

**Maintained by:** Translation Tools development team
**Last updated:** 2026-07-08
**Context:** Translation Tools — ASEAN/Thai translation management for Frappe/ERPNext, not Thai tax reports.

---

## 1. App Architecture

`translation_tools` is a Frappe app installed alongside ERPNext. It provides:

| Feature            | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| File Explorer      | Browse installed apps' `.po` translation files               |
| Translation Editor | Edit PO entries (manual or AI-assisted)                      |
| Glossary Manager   | Manage translation glossary terms                            |
| Settings Panel     | Configure API keys, GitHub integration, translation defaults |

**App structure:**

- `translation_tools/` — Python backend (api, doctype, page, tasks)
- `thai_translation_dashboard/` — React frontend (SPA via Frappe website route rules)

---

## 2. Frontend Architecture (React SPA)

The SPA is served via Frappe's `website_route_rules` under `/translation_tools_dashboard`.

### Routing

```
/translation_tools_dashboard/
  /asean-translations    → ASEANTranslationsPage → Dashboard
    ?tab=files|editor|glossary|settings
  /csv-translations      → CSVTranslationsPage
  /uuid-generator        → UUIDGeneratorPage
  /account-mapper         → AccountMapperPage
```

### The Dashboard Tabs

The main `Dashboard` component (at `/asean-translations`) uses a `Tabs` component with 4 tabs:

| Tab value  | Display name       | Content                                                                         |
| ---------- | ------------------ | ------------------------------------------------------------------------------- |
| `files`    | File Explorer      | FileExplorer component                                                          |
| `editor`   | Translation Editor | TranslationEditor (disabled until file selected)                                |
| `glossary` | Glossary Manager   | GlossaryManager                                                                 |
| `settings` | Settings           | SettingsPanel → 3 sub-tabs (AI Models, Translation Options, GitHub Integration) |

### URL Tab Synchronization

When navigating to `/asean-translations`, the active tab should be readable from the URL query param `?tab=`.

**Pattern:**

```typescript
// Read from URL on mount
const params = new URLSearchParams(location.search);
const tabFromUrl = params.get('tab'); // 'files' | 'editor' | 'glossary' | 'settings'

// Set as initial state
const [activeTab, setActiveTab] = useState<TabType>(
  (tabFromUrl as TabType) || 'files'
);
```

**Frappe website route rule** should map `translation_tools_dashboard/asean-translations` to the SPA.

### SettingsPanel Sub-tabs

`SettingsPanel` renders inside the Dashboard's `settings` tab content. It has its own 3 sub-tabs:

| Tab value             | Display name        |
| --------------------- | ------------------- |
| `ai-models`           | AI Models           |
| `translation-options` | Translation Options |
| `github-integration`  | GitHub Integration  |

---

## 3. GitHub Integration

### Settings Flow

1. **Translation Tools Settings** (DocType: `Translation Tools Settings`, single) — stores API keys, model prefs, GitHub URL/token
2. **GitHub Sync Settings** (DocType: `GitHub Sync Settings`, single) — stores repo URL, branch, auto-sync flags, per-app settings

### Branch Resolution

The `default_branch` is stored in `Translation Tools Settings` and mirrored to `GitHub Sync Settings.branch` for scheduled sync compatibility.

**Fallback order:**

1. Saved `Translation Tools Settings.default_branch`
2. Frappe major version → `version-{major}` (e.g., `version-16` on Frappe v16)
3. Hardcoded `version-15`

### Key API Endpoints

| Endpoint                                                                     | Purpose                         |
| ---------------------------------------------------------------------------- | ------------------------------- |
| `translation_tools.api.settings.get_translation_settings`                    | Get settings (masked passwords) |
| `translation_tools.api.settings.save_translation_settings`                   | Save settings                   |
| `translation_tools.api.settings.test_github_connection`                      | Test GitHub connection          |
| `translation_tools.api.settings.test_github_sync`                            | Dry-run sync for all apps       |
| `translation_tools.api.app_sync_settings.get_app_sync_settings`              | Get per-app sync state          |
| `translation_tools.api.app_sync_settings.update_github_sync_global_settings` | Toggle global/auto-sync         |

### Branch Field Placement

In the GitHub Integration sub-tab of SettingsPanel:

- **Field:** `github_branch` (Data, text input)
- **Position:** Under `github_repo` (Repo URL), above `github_token`
- **Persistence:** Saved as `Translation Tools Settings.default_branch`, mirrored to `GitHub Sync Settings.branch`
- **Test Sync:** Pass explicit branch value to `test_github_sync`

---

## 4. Harness for Translation Tools

The `harness/` directory contains:

| Path                            | Purpose                             |
| ------------------------------- | ----------------------------------- |
| `agents/`                       | 7 specialist agent role definitions |
| `schemas/task_plan.schema.json` | JSON Schema for task plans          |
| `plans/`                        | Concrete implementation plans       |
| `reports/`                      | Verification and review reports     |

### Available Agents

- `planner_agent` — Break goal into dependent tasks
- `frappe_architect` — Inspect DocType schemas, map fields
- `business_logic_agent` — Define workflow/fallback rules
- `python_frappe_agent` — Backend Python implementation
- `frappe_js_agent` — Frontend React/JS implementation
- `test_agent` — Regression test coverage
- `verifier_agent` — Final static review

### Required Task Order

1. Inspect existing source of truth and affected files
2. Define workflow / fallback order
3. Update backend behavior
4. Update frontend behavior
5. Add tests
6. Verify with static checks only

### Approval Gates

- `before_schema_change` — DocType modifications may need migration
- `before_migrate` — `bench migrate`
- `before_commit` — Git commit/push
- `No bench operations` — User approval required for heavy commands

---

## 5. Patterns to Follow

### Settings state management

- Initialize from `useGetTranslationSettings()` via `useEffect`
- Handle masked password fields (values are `****`, flags tell if configured)
- Pass state down via props, handlers up via callbacks

### Translation function

- Use `useTranslation()` hook from `@/context/TranslationContext`
- Wrap Thai labels with `__(...)` — labels already in Thai need NO wrapper
- `translate: __` from context

### Form inputs

- `onInputChange` handler on parent (SettingsPanel) → prop-drilled
- `name` attribute matches settings key (e.g., `name="github_repo"`)
- `value` from settings state

### API calls

- Use `useFrappePostCall` / `useFrappeGetCall` from `frappe-react-sdk`
- Never manually set `X-Frappe-CSRF-Token` — SDK handles it
- Wrap `window.csrf_token` read in `(window as any).csrf_token`

### Frappe website route rules (hooks.py)

```python
website_route_rules = [
    {"from_route": "/translation_tools_dashboard/<path:app_route>", "to_route": "translation_tools_dashboard"},
]
website_pages = {
    "translation_tools_dashboard": "www.translation_tools_dashboard.index",
}
```
