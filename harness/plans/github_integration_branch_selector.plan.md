# Plan — GitHub Integration branch selector for Translation Tools

**Date:** 2026-07-08
**App:** `translation_tools`
**Goal:** Add an explicit branch field to the ASEAN Translations **GitHub Integration** tab, make version-aware defaults resolve to `version-16` on Frappe v16 sites, and keep the frontend settings tab, GitHub sync APIs, and scheduled sync settings aligned.

## 1. Observed gaps

### Frontend
- `thai_translation_dashboard/src/components/settings/GithubIntegrationSettings.tsx`
  - No branch input is exposed in the GitHub Integration tab.
- `thai_translation_dashboard/src/components/SettingsPanel.tsx`
  - Settings state/type flow does not include `default_branch`.
  - `Test Sync` only sends `github_repo` + `github_token`, so the current unsaved branch cannot be tested.
- `thai_translation_dashboard/src/components/GithubSync.tsx`
  - Local fallback is hardcoded to `version-15` before settings are loaded.

### Backend
- `translation_tools/api/settings.py`
  - `_get_default_branch()` is version-aware, but `get_translation_settings()` returns the computed branch instead of the saved `doc.default_branch` value.
  - `save_translation_settings()` does not persist/update `default_branch`.
  - `test_github_sync()` falls back to `"version-15"` instead of the computed/defaulted branch.
  - `create_translation_tools_settings_doctype()` still seeds `default_branch` with `version-15`.
- `translation_tools/api/app_sync_settings.py`
  - Scheduled/manual app sync uses `GitHub Sync Settings.branch`, so the settings-tab branch and auto-sync branch can drift apart.
- `translation_tools/setup/github_sync_defaults.py`
  - Initial sync defaults still hardcode `version-15`.

### Existing settings storage already available
- `Translation Tools Settings.default_branch`
- `GitHub Sync Settings.branch`

The main issue is **missing propagation + missing UI**, not missing schema.

---

## 2. Source-of-truth decision

Use this rule:

1. **User-facing source of truth:** `Translation Tools Settings.default_branch`
2. **Auto-sync runtime mirror:** `GitHub Sync Settings.branch`
3. **Computed fallback when empty:** `_get_default_branch()` → `version-{frappe_major}`

This keeps the GitHub Integration tab as the place where admins manage the branch, while preserving compatibility with the existing auto-sync pipeline.

---

## 3. Implementation phases

## Phase A — frontend settings tab

### Files
- `thai_translation_dashboard/src/api/settings.ts`
- `thai_translation_dashboard/src/components/SettingsPanel.tsx`
- `thai_translation_dashboard/src/components/settings/GithubIntegrationSettings.tsx`

### Changes
1. Extend `TranslationToolsSettings` with:
   - `default_branch: string`
2. Initialize `SettingsPanel` state with `default_branch`.
3. Pass branch through existing state handlers (`onInputChange`).
4. Add a visible **Branch** input to the GitHub Integration card.
   - Recommended placement: directly under **Github Repo URL** and before token/help blocks.
   - Suggested placeholder: `version-16`
   - Disable behavior should match repo/token inputs when GitHub integration is off.
5. Update `handleTestGitHubSync()` so the current branch value is sent to the backend even before Save is clicked.

### Acceptance
- The GitHub Integration tab shows a branch field.
- On a v16 site with no saved override, the field shows `version-16`.
- User can change the branch and click **Test Sync** without saving first.

---

## Phase B — backend settings persistence + sync alignment

### Files
- `translation_tools/api/settings.py`
- `translation_tools/api/app_sync_settings.py`
- `translation_tools/setup/github_sync_defaults.py`

### Changes
1. In `get_translation_settings()`:
   - Return `doc.default_branch` when present.
   - Fall back to `_get_default_branch()` only when empty/missing.
2. In `save_translation_settings()`:
   - Persist `default_branch` onto `Translation Tools Settings`.
   - Mirror repo/branch into `GitHub Sync Settings` so scheduled sync uses the same branch.
   - Do not overwrite unrelated auto-sync flags while mirroring.
3. In `test_github_sync()`:
   - Accept optional `branch` from the request.
   - Fallback order:
     1. explicit request branch
     2. `GitHub Sync Settings.branch`
     3. `Translation Tools Settings.default_branch`
     4. `_get_default_branch()`
4. In `update_github_sync_global_settings()`:
   - Keep current enable/disable behavior.
   - Ensure branch initialization uses `_get_default_branch()` instead of stale hardcoded assumptions.
5. In `setup/github_sync_defaults.py`:
   - Replace hardcoded `version-15` with a version-aware default helper.
6. In `create_translation_tools_settings_doctype()`:
   - Replace the seeded `default_branch` default from `version-15` to version-aware logic or a neutral runtime-populated value.

### Acceptance
- Saving the settings tab persists the chosen branch.
- Reloading the settings tab shows the saved branch.
- `GitHub Sync Settings.branch` stays aligned after Save.
- Fresh/default setup on v16 resolves to `version-16`, not `version-15`.

---

## Phase C — GitHub sync modal parity

### File
- `thai_translation_dashboard/src/components/GithubSync.tsx`

### Changes
1. Remove the hardcoded `version-15` fallback.
2. Use backend-provided `settings.default_branch` as the first visible value.
3. Keep a local fallback only as a last resort.
   - Prefer blank + backend-loaded value, or derive from already-returned settings payload.

### Acceptance
- The Sync-from-GitHub dialog no longer boots with `version-15` on v16 sites.
- The dialog branch matches the settings-tab branch after data loads.

---

## Phase D — tests and regression coverage

### Files
- `translation_tools/tests/test_github_auto_sync.py`
- `translation_tools/translation_tools/doctype/github_sync_settings/test_github_sync_settings.py`
- Add a focused backend test file if needed, e.g. `translation_tools/tests/test_translation_settings_branch.py`

### Coverage to add/update
1. `_get_default_branch()` returns `version-16` on v16.
2. `get_translation_settings()` prefers saved `default_branch` over fallback.
3. `save_translation_settings()` persists `default_branch` and mirrors it to `GitHub Sync Settings.branch`.
4. `test_github_sync()` respects explicit `branch` input.
5. Existing tests using `version-15` defaults are updated to version-aware expectations where appropriate.

### Acceptance
- Regression coverage exists for both:
  - saved branch override
  - version-based fallback

---

## 4. Out of scope for this task

These paths should **not** be changed unless a separate approval/decision is made:

- `translation_tools/api/po_files.py` PR/direct-push behavior tied to `version-15`
  - This is a broader push workflow decision, not required to fix the GitHub Integration tab default/sync issue.
- Any bench command, migration, commit, or push.
- Compiled assets under `translation_tools/public/thai_translation_dashboard/assets/*`
  - Source files should be changed; asset refresh is a user-controlled follow-up.

---

## 5. Recommended execution order for Minimax

1. Backend fallback/persistence fixes in `settings.py`
2. GitHub Sync Settings mirror logic
3. Frontend types/state + branch input UI
4. `test_github_sync()` request branch plumbing
5. `GithubSync.tsx` fallback cleanup
6. Tests
7. Static verification only

---

## 6. Static verification checklist

Minimax should stop after source edits and static checks only:

- Python syntax check for changed backend files
- Type/script syntax check for changed frontend files if available without heavy bench operations
- `rg -n "version-15"` on changed source paths to confirm only intentional references remain

Do **not** run bench operations automatically.

---

## 7. Expected edited source files

### Frontend
- `thai_translation_dashboard/src/api/settings.ts`
- `thai_translation_dashboard/src/components/SettingsPanel.tsx`
- `thai_translation_dashboard/src/components/settings/GithubIntegrationSettings.tsx`
- `thai_translation_dashboard/src/components/GithubSync.tsx`

### Backend
- `translation_tools/api/settings.py`
- `translation_tools/api/app_sync_settings.py`
- `translation_tools/setup/github_sync_defaults.py`
- optionally a focused backend test file

### Tests
- `translation_tools/tests/test_github_auto_sync.py`
- `translation_tools/translation_tools/doctype/github_sync_settings/test_github_sync_settings.py`

---

## 8. Definition of done

This task is done when all of the following are true:

- GitHub Integration tab exposes a branch field.
- Default branch resolves to `version-16` on this v16 environment.
- Saved branch persists across reloads.
- Test Sync can use the unsaved branch value.
- Scheduled/manual sync settings use the same saved branch.
- No unintended source references keep forcing `version-15` for this settings flow.
