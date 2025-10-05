# Translation Automation

This document describes the automatic translation processing that runs after site migrations.

## Overview

The translation automation system automatically runs translation commands for specified apps after every site migration. This ensures that translation files are always up-to-date without manual intervention.

## Automated Process

When you run `bench --site {site_name} migrate`, the following translation commands are automatically executed for each configured app:

1. `bench generate-pot-file --app {app_name}`
2. `bench migrate-csv-to-po --app {app_name} --locale th`
3. `bench update-po-files --app {app_name} --locale th`
4. `bench compile-po-to-mo --app {app_name} --locale th`

### Configured Apps

The following apps are configured for automatic translation processing:
- `m_capital`
- `lending`
- `thai_business_suite`

### Default Locale

The system is configured to process Thai (`th`) locale by default.

## Manual Commands

You can also run the translation commands manually using the provided bench commands:

### Update All Apps

```bash
bench --site {site_name} update-app-translations
```

### Update Specific App

```bash
bench --site {site_name} update-app-translations --app m_capital
```

### Update with Different Locale

```bash
bench --site {site_name} update-app-translations --app m_capital --locale en
```

### List Apps with Translation Capabilities

```bash
bench --site {site_name} list-translatable-apps
```

## Implementation Details

### Hook Configuration

The automation is implemented using Frappe's `after_migrate` hook in `translation_tools/hooks.py`:

```python
after_migrate = [
    "translation_tools.setup.update_workspace.rebuild_workspace",
    "translation_tools.utils.migration_translations.run_translation_commands_after_migrate"
]
```

### Core Function

The main automation logic is in `translation_tools/utils/migration_translations.py`:

- `run_translation_commands_after_migrate()`: Main function that runs after migrations
- `run_translation_commands_for_single_app()`: Helper for processing a single app
- `get_apps_needing_translation()`: Returns list of apps with translation capabilities

### Error Handling

- Commands have a 5-minute timeout to prevent hanging
- Failed commands are logged but don't stop the migration process
- Non-existent apps are skipped with a warning

### Logging

All translation automation activities are logged using Frappe's logger:
- Successful commands: INFO level
- Errors and warnings: ERROR/WARNING level
- Progress updates: INFO level

## Customization

To modify the apps or locales that are processed automatically, edit the configuration in `migration_translations.py`:

```python
# List of apps that need translation processing
apps_to_translate = ["m_capital", "lending", "thai_business_suite"]
locale = "th"  # Thai locale
```

## Troubleshooting

### Check Logs

If translation automation fails, check the Frappe logs for error messages:

```bash
tail -f logs/frappe.log
```

### Manual Verification

You can verify that translation files exist by checking:

```bash
ls apps/{app_name}/{app_name}/locale/th/
```

### Test Individual Commands

Test individual translation commands manually:

```bash
bench generate-pot-file --app m_capital
bench migrate-csv-to-po --app m_capital --locale th
bench update-po-files --app m_capital --locale th
bench compile-po-to-mo --app m_capital --locale th
```

## Benefits

1. **Automated Workflow**: No need to remember to run translation commands after migrations
2. **Consistency**: Ensures all configured apps are processed uniformly
3. **Time Saving**: Eliminates manual repetitive tasks
4. **Error Prevention**: Reduces chance of forgetting translation updates
5. **Logging**: Provides clear audit trail of translation processing