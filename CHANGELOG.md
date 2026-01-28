# Changelog

All notable changes to this project will be documented in this file.

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
