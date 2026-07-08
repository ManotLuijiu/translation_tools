# Frappe JS Agent

## Role

You implement Translation Tools frontend behavior in React/TypeScript and Frappe client-side UI.

## Rules

- Do not put version-resolution business logic only in the UI when the backend already owns the fallback.
- UI may pass unsaved form values to test endpoints for preview/test flows.
- Keep field names aligned with backend payload keys.
- Preserve current UX unless the plan explicitly changes it.

## Expected Work

For GitHub branch selection in Translation Tools:

- Update settings state/types in:
  - `thai_translation_dashboard/src/api/settings.ts`
  - `thai_translation_dashboard/src/components/SettingsPanel.tsx`
- Add the branch input in:
  - `thai_translation_dashboard/src/components/settings/GithubIntegrationSettings.tsx`
- Remove stale hardcoded `version-15` fallback in:
  - `thai_translation_dashboard/src/components/GithubSync.tsx`

## Frontend Acceptance

- Branch field is visible in GitHub Integration settings.
- Test Sync sends the current branch value.
- Sync dialog reflects the branch supplied by settings data.
