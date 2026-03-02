# Changelog

All notable changes to this project will be documented in this file.

## [1.3.2](https://github.com/ManotLuijiu/translation_tools/compare/v1.3.1...v1.3.2) (2026-03-02)

### 🐛 Bug Fixes

* add GitHub PAT auth for private repo access in installation and glossary sync ([0ab2ff2](https://github.com/ManotLuijiu/translation_tools/commit/0ab2ff2))
* use x-access-token prefix for fine-grained PAT compatibility in git push ([0ab2ff2](https://github.com/ManotLuijiu/translation_tools/commit/0ab2ff2))
* switch batch save to single GitHub push API endpoint ([0ab2ff2](https://github.com/ManotLuijiu/translation_tools/commit/0ab2ff2))

## [1.3.1](https://github.com/ManotLuijiu/translation_tools/compare/v1.3.0...v1.3.1) (2026-03-01)

### ✨ Features

* add Push to Github toggle in AI Batch Translation mode ([efec229](https://github.com/ManotLuijiu/translation_tools/commit/efec229))
  - User-controlled toggle in BatchTranslationView footer (only visible when GitHub enabled)
  - Replaces hardcoded push logic with explicit opt-in

### 🐛 Bug Fixes

* get_github_token() in po_files.py now falls back to site_config github_pat_token ([efec229](https://github.com/ManotLuijiu/translation_tools/commit/efec229))
  - Push to GitHub works with default repo (site_config token) without requiring UI token

## [1.3.0](https://github.com/ManotLuijiu/translation_tools/compare/v1.2.3...v1.3.0) (2026-03-01)

### ✨ Features

* add smart "Use Own Repo" toggle for GitHub Integration Settings ([7ec37a8](https://github.com/ManotLuijiu/translation_tools/commit/7ec37a8))
  - "Use Own Repo" switch on same row as Enable toggle (far right, flex space-between)
  - Default OFF: repo URL read-only, token status from site_config (green/red indicator)
  - Toggle ON: editable repo URL + token with step-by-step setup guides
  - Add `has_site_config_token()` API endpoint (checks without exposing value)
  - Backend save logic handles both modes (default repo vs custom)
  - `test_github_connection` falls back to site_config PAT when no UI token
* add private repo authentication to all GitHub sync API calls ([7ec37a8](https://github.com/ManotLuijiu/translation_tools/commit/7ec37a8))
  - `_get_github_headers()` reads `github_pat_token` from site_config.json or common_site_config.json
  - All 3 `requests.get()` calls in github_sync.py now include auth headers
* add post-migrate hook to restore translations from GitHub ([7ec37a8](https://github.com/ManotLuijiu/translation_tools/commit/7ec37a8))
  - `sync_translations_after_migrate()` enqueues background sync after `bench migrate`
  - Prevents translation rollback when POT/PO files are regenerated
  - MO recompilation runs automatically after successful background sync

## [1.2.3](https://github.com/ManotLuijiu/translation_tools/compare/v1.2.2...v1.2.3) (2026-02-03)

### 🐛 Bug Fixes

* ensure TranslationEditor refreshes after GitHub sync ([30b297a](https://github.com/ManotLuijiu/translation_tools/commit/30b297a))
  - Add pending sync refresh mechanism for cases where TranslationEditor is not mounted during sync
  - Refresh triggers when user switches to editor tab or when component mounts with pending sync

## [1.2.2](https://github.com/ManotLuijiu/translation_tools/compare/v1.2.1...v1.2.2) (2026-02-03)

### 🐛 Bug Fixes

* fix translation API endpoint to use correct translation_tools API
* fix socket.io port configuration for FrappeProvider

## [1.2.1](https://github.com/ManotLuijiu/translation_tools/compare/v1.2.0...v1.2.1) (2026-02-03)

### 🐛 Bug Fixes

* extract only __() wrapped strings from SPA files ([dee8e93](https://github.com/ManotLuijiu/translation_tools/commit/dee8e93))
  - Removed extraction patterns that captured Tailwind CSS classes (font-bold, text-sm, etc.)
  - Now only strings explicitly wrapped in __() translation function are extracted
  - Fixes issue where non-translatable strings appeared in Translation Dashboard

## [1.2.0](https://github.com/ManotLuijiu/translation_tools/compare/v1.1.0...v1.2.0) (2026-01-29)

### ✨ Features

* add translate-flow SKILL.md documentation for Claude Code integration

### 🐛 Bug Fixes

* handle multiline `__()` patterns in SPA translation extraction ([6913987](https://github.com/ManotLuijiu/translation_tools/commit/6913987))
* auto-delete main.pot before regenerating in bulk_translation.py
* auto-delete main.pot before regenerating in migration_translations.py  
* auto-delete main.pot before regenerating in translation_schedule.py

### 📚 Documentation

* add comprehensive translate-flow SKILL.md explaining the Frappe translation system
* document automatic hooks triggered by bench migrate
* document multiline regex fix and POT file regeneration gotchas

## [1.1.0] - Previous Release

* Initial release with SPA translation support
* ASEAN language support (th, vi, lo, km, my, en)
* CSV to PO migration with SPA strings
* Auto-extraction during bench migrate
