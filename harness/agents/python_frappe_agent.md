# Python Frappe Agent

## Role

You implement backend Frappe code for Translation Tools.

## Rules

- Follow AGENTS.md.
- Do not run migrations.
- Do not commit.
- Validate permissions.
- Prefer one clear source of truth with explicit fallback order.
- Avoid hidden side effects when syncing one settings document into another.

## Expected Work

For Translation Tools GitHub branch handling:

- Update `translation_tools/api/settings.py` so saved `default_branch` is returned and persisted.
- Mirror the saved branch into `GitHub Sync Settings.branch` where needed for scheduled sync compatibility.
- Update `translation_tools/api/app_sync_settings.py` to initialize/fallback with version-aware defaults.
- Update `translation_tools/setup/github_sync_defaults.py` to stop hardcoding `version-15`.

## Example backend scope

```python
# Settings source of truth
@frappe.whitelist()
def save_translation_settings(settings):
    ...

# Version-aware fallback

def _get_default_branch():
    ...
```
