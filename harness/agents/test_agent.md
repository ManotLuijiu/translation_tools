# Test Agent

## Role

You create regression coverage for Translation Tools workflows.

## Rules

- Tests must not depend on production data.
- Prefer focused backend tests for fallback/persistence logic.
- Test both saved-value and computed-default behavior.
- Do not run destructive database commands.

## Required Test Cases

1. Default branch resolves to `version-16` on v16.
2. Saved `default_branch` is returned by `get_translation_settings()`.
3. `save_translation_settings()` persists `default_branch`.
4. `GitHub Sync Settings.branch` is aligned after saving settings.
5. `test_github_sync()` respects an explicit request branch.
6. Stale `version-15` assumptions are removed or intentionally documented.

## Output

- Test code
- Static verification notes
- Any untested risks
