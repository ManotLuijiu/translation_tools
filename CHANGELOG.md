# Changelog

All notable changes to this project will be documented in this file.

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
