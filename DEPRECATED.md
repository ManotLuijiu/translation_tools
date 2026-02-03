# ⚠️ DEPRECATED BRANCH

> **This `main` branch is deprecated and no longer actively maintained.**

## Migration Guide

Since Frappe Framework v15+, we use version-specific branches:

| Branch | Frappe Version | Status |
|--------|---------------|--------|
| `version-15` | Frappe v15.x | ✅ Active |
| `version-16` | Frappe v16.x | ✅ Active |
| `main` | Legacy | ⛔ Deprecated |

## Recommended Actions

1. **For new installations**: Use `version-15` or `version-16` branch
   ```bash
   bench get-app [app] --branch version-15
   # or
   bench get-app [app] --branch version-16
   ```

2. **For existing installations**: Switch to the appropriate version branch
   ```bash
   cd apps/[app]
   git fetch origin
   git checkout version-15  # or version-16
   ```

## Note

- All new features and bug fixes go to `develop` branch
- `develop` is auto-merged to `version-15` (and `version-16` where applicable)
- The `main` branch will no longer receive updates

---
*Last updated: February 2026*
