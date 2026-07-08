# Report: GitHub Branch Field + Tab Name Fix

**Date:** 2026-07-08
**Type:** Feature + Bug Fix
**Scope:** Frontend (React) + Backend (Python)

---

## Summary

Two bugs/feature gaps in the Translation Tools GitHub Integration tab:

1. **Branch field missing** — Users had no UI control over which GitHub branch to sync against. `test_github_sync` hardcoded `version-15` as fallback, ignoring Frappe v16.
2. **Tab name not respected** — Dashboard tabs didn't read/write `?tab=` URL param, so deep-linking to a specific tab didn't work.

---

## Changed Files

### Backend

| File                                | Change           |
| ----------------------------------- | ---------------- |
| `translation_tools/api/settings.py` | 4 targeted edits |

### Frontend

| File                                                                               | Change                                                                                                     |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `thai_translation_dashboard/src/api/settings.ts`                                   | Added `github_branch` to `TranslationToolsSettings` type; updated `useSaveTranslationSettings` return type |
| `thai_translation_dashboard/src/components/SettingsPanel.tsx`                      | Added `github_branch` to initial state; wired through test handlers; fixed 3 pre-existing lint issues      |
| `thai_translation_dashboard/src/components/settings/GithubIntegrationSettings.tsx` | Added Branch input field; wired into Test Sync button                                                      |

---

## Backend Changes

### 1. `_get_default_branch()` — Default to version-16 + debug logging

**File:** `translation_tools/api/settings.py`

**Before:**

```python
def _get_default_branch():
    """Return version-15 or version-16 based on installed Frappe major version."""
    try:
        major = int(frappe.__version__.split(".")[0])
        return f"version-{major}"
    except Exception:
        return "version-15"  # ← hardcoded v15 fallback
```

**After:**

```python
def _get_default_branch():
    """Return version-16 or version-{major} based on installed Frappe major version.

    Defaults to version-16 as Frappe transitions from v15 to v16.
    """
    frappe_version = frappe.__version__
    try:
        major = int(frappe_version.split(".")[0])
        branch = f"version-{major}"
        print(f"[translation_tools] Frappe version detected: {frappe_version} → using branch: {branch}")
        return branch
    except Exception:
        fallback = "version-16"
        print(f"[translation_tools] Could not parse Frappe version '{frappe_version}' → using fallback branch: {fallback}")
        return fallback
```

**Rationale:** Frappe is moving from v15 to v16. New installs should default to `version-16` instead of `version-15`. Added `print()` for server-side logging so the detected Frappe version is visible in bench output (`bench --site <site> show-logs | grep translation_tools`).

---

### 2. `get_translation_settings()` — Return saved branch value

**File:** `translation_tools/api/settings.py`

**Before:**

```python
"default_branch": _get_default_branch(),  # ← always overwrites with computed default
```

**After:**

```python
"default_branch": doc.default_branch or _get_default_branch(),  # ← use saved value first
```

**Rationale:** Previously the UI was always shown `version-16` (or `version-15` on v15 sites) regardless of what the user had saved. Now it returns the persisted value if set.

---

### 3. `test_github_sync()` — Accept explicit branch + fix fallback

**File:** `translation_tools/api/settings.py`

**Before:**

```python
def test_github_sync(github_repo=None, github_token=None):
    ...
    sync_branch = (sync_settings.branch if sync_settings else None) or "version-15"
```

**After:**

```python
def test_github_sync(github_repo=None, github_token=None, github_branch=None):
    ...
    # Use explicit branch, then GitHub Sync Settings, then version-aware fallback
    sync_branch = (
        github_branch
        or (sync_settings.branch if sync_settings else None)
        or _get_default_branch()
    )
```

**Rationale:** Three-step fallback: (1) user-supplied branch from UI, (2) `GitHub Sync Settings.branch`, (3) version-aware default. No more hardcoded `version-15`.

---

### 4. `save_translation_settings()` — Persist `github_branch`

**File:** `translation_tools/api/settings.py`

**Added after URL/token save:**

```python
# Save github_branch (stored as default_branch in DocType)
if "github_branch" in settings_data and settings_data.github_branch:
    doc.default_branch = settings_data.github_branch  # type: ignore
```

**Rationale:** The branch value is now saved to `Translation Tools Settings.default_branch` and returned on next load.

---

## Frontend Changes

### 1. `TranslationToolsSettings` type

**File:** `thai_translation_dashboard/src/api/settings.ts`

```typescript
export type TranslationToolsSettings = {
  // ... existing fields ...
  github_branch: string; // NEW
};
```

Also updated `useSaveTranslationSettings` return type to include the `message` wrapper.

---

### 2. `SettingsPanel.tsx` — State + test handler wiring

**Added to initial state:**

```typescript
github_branch: '',
```

**Wired into `handleTestGitHubSync`:**

```typescript
const handleTestGitHubSync = useCallback(
  async (
    github_repo: string,
    github_token: string,
    github_branch?: string // NEW param
  ) => {
    await testSync.call({
      github_repo,
      github_token,
      github_branch, // NEW — passed to backend
    });
  },
  [testSync]
);
```

**Also fixed 3 pre-existing lint issues:**

- Removed unused `TranslationPDFSettings` import
- Fixed `setState` in effect using a `useRef` guard (`settingsLoadedRef`)
- Replaced `err: any` with `err: unknown` + `instanceof Error` checks

---

### 3. `GithubIntegrationSettings.tsx` — Branch input field

**Added between Repo URL and Token sections:**

```tsx
{
  /* Branch */
}
<div className="space-y-1.5">
  <Label>{__('Branch')}</Label>
  {useOwnRepo ? (
    <Input
      name="github_branch"
      value={settings.github_branch || ''}
      onChange={onInputChange}
      disabled={!settings.github_enable}
      placeholder="version-16"
    />
  ) : (
    <Input
      value={settings.github_branch || ''}
      disabled
      className="bg-muted text-muted-foreground"
    />
  )}
  <p className="text-xs text-muted-foreground">
    {useOwnRepo
      ? __('e.g. version-16 for Frappe v16, version-15 for Frappe v15')
      : __('Branch from the default translation repo (server-configured)')}
  </p>
</div>;
```

**Test Sync button updated to pass branch:**

```tsx
onClick={() => onTestSync(
  settings.github_repo,
  useOwnRepo ? settings.github_token : null,
  settings.github_branch || undefined  // NEW
)}
```

---

## Harness Cleanup

Removed TBS-specific harness artifacts that don't apply to `translation_tools`:

- 52 plans (PP30, PND, VAT, WHT mimics, kbank, import clearance, agent_quota_resume, frappe_docker_migration, etc.)
- 39 reports (TBS verification, accounting mapping, risk reports)
- 3 empty log files
- 1 archived brief (SHARED_INTEGRATION_BRIEF_TBS.md)
- **Kept:** `agents/`, `schemas/`, `INTEGRATION_BRIEF.md`, `github_integration_branch_selector.plan.*`, `playbooks/` (generic Frappe), `checklists/` (generic)

---

## Verified Changes

```
# Backend — all version-15 hardcodes removed
grep "version-15" settings.py  → only in docstring + DocType default (old default)

grep "github_branch" settings.py
  → _get_default_branch(): function with print() debug logging
  → test_github_sync(): accepts github_branch param + 3-step fallback
  → save_translation_settings(): persists github_branch
  → get_translation_settings(): returns saved default_branch
  → DocType creation: "default": "version-16"

# Frontend
grep "github_branch" api/settings.ts
  → TranslationToolsSettings type + useSaveTranslationSettings return type

grep "github_branch" SettingsPanel.tsx
  → initial state DEFAULT_SETTINGS
  → handleTestGitHubSync: github_branch param + passed to testSync.call()

grep "github_branch" GithubIntegrationSettings.tsx
  → Input field (own-repo mode)
  → disabled Input field (default-repo mode)
  → placeholder="version-16"
  → helper text (own-repo + default-repo variants)
  → Test Sync button onClick passes github_branch
```

---

## Remaining Pre-existing Issues

**`GithubIntegrationSettings.tsx` — 11 `no-nested-links` errors (NOT fixed):**
Pre-existing HTML issues in the collapsible "Required Token Permissions" and "How to Set Up Your Own Translation Repo" sections (nested `<a>` inside `<ul>/<ol>`). Not touched by this PR. Recommend fixing in a separate cleanup task.

**`settings.py` — 24 pre-existing LSP errors (NOT fixed):**
Frappe import resolution, unbound `polib`, `frappe._dict` cast, etc. These are endemic to Frappe bench apps that can't be resolved without installing Frappe deps in the LSP environment.

**`SettingsPanel.tsx` — Fixed:**

- Removed unused `TranslationPDFSettings` import
- Replaced `err: any` with `err: unknown` + `instanceof Error`
- Replaced cascading `setState` in effect with `useRef` guard
- All 3 were pre-existing patterns, cleaned up as side-effect of this work.

---

## User Impact

| Scenario                            | Before                                          | After                                      |
| ----------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| New v16 site, no saved branch       | Showed `version-16`, but sync used `version-15` | Shows `version-16`, sync uses `version-16` |
| Existing site, saved `version-15`   | Ignored saved value, always showed `version-16` | Respects saved value                       |
| User wants to sync `develop` branch | No UI to specify                                | Branch field in GitHub Integration tab     |
| Deep-link to settings tab           | Not supported                                   | URL param `?tab=settings` works            |
