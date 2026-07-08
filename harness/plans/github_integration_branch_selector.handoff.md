# Minimax Handoff — Translation Tools GitHub branch selector

**Scope:** `translation_tools` only
**Feature:** ASEAN Translations → GitHub Integration tab branch field + version-aware branch propagation
**Primary objective:** Stop defaulting to `version-15` on this v16 environment and let admins manage/test the branch from the settings tab.

## Read first

1. `harness/plans/github_integration_branch_selector.plan.md`
2. `harness/plans/github_integration_branch_selector.plan.json`
3. `AGENTS.md`

## Files you are expected to edit

### Frontend
- `thai_translation_dashboard/src/api/settings.ts`
- `thai_translation_dashboard/src/components/SettingsPanel.tsx`
- `thai_translation_dashboard/src/components/settings/GithubIntegrationSettings.tsx`
- `thai_translation_dashboard/src/components/GithubSync.tsx`

### Backend
- `translation_tools/api/settings.py`
- `translation_tools/api/app_sync_settings.py`
- `translation_tools/setup/github_sync_defaults.py`

### Tests
- `translation_tools/tests/test_github_auto_sync.py`
- `translation_tools/translation_tools/doctype/github_sync_settings/test_github_sync_settings.py`
- add a focused backend test file if needed

## What you should implement

### 1) Settings tab
Add a visible branch field to the GitHub Integration tab.

Use `settings.default_branch` as the frontend key.

Expected behavior:
- If no saved value exists on a v16 site, show `version-16`
- If a saved value exists, show that saved value
- Field should be editable before saving
- `Test Sync` should use the current typed branch value immediately

### 2) Backend persistence
`Translation Tools Settings.default_branch` already exists in schema. The missing parts are:
- returning the saved value from `get_translation_settings()`
- persisting it in `save_translation_settings()`
- mirroring it into `GitHub Sync Settings.branch`

Keep the fallback order deterministic:
1. explicit request branch
2. `GitHub Sync Settings.branch`
3. `Translation Tools Settings.default_branch`
4. `_get_default_branch()`

### 3) Remove stale hardcoded defaults
Fix the version-15 assumptions in:
- `translation_tools/setup/github_sync_defaults.py`
- `thai_translation_dashboard/src/components/GithubSync.tsx`
- `translation_tools/api/settings.py` sync test fallback path
- any related source-only version-15 fallback in this settings/sync flow

### 4) Keep scope tight
Do **not** expand into unrelated GitHub publish flow changes unless required.

Specifically avoid touching `translation_tools/api/po_files.py` PR/direct-push semantics unless you discover an unavoidable blocker and document it first.

## Acceptance checklist

- [ ] GitHub Integration tab has a branch field
- [ ] v16 default resolves to `version-16`
- [ ] Saving settings persists the branch
- [ ] Reloading settings shows the same branch
- [ ] `GitHub Sync Settings.branch` is aligned after save
- [ ] `Test Sync` can use an unsaved branch value
- [ ] GitHub sync modal no longer starts at `version-15` on this environment
- [ ] Tests updated for version-aware behavior

## Static verification only

Stop after source edits and static checks.

Allowed:
- Python syntax checks
- Source-level TS/JS syntax/type checks if lightweight
- targeted grep verification

Do not run bench operations automatically.

## Deliverables back to user

1. Short summary of edited files
2. What was changed in backend vs frontend
3. Any remaining risks
4. Exact manual follow-up commands for the user if they want runtime verification later
