# CSV Translation Feature Integration Guide

## Overview

This guide explains how to integrate the new CSV Translation feature into your existing Translation Tools dashboard.

## Components Created

### Backend API (`translation_tools/api/csv_translation.py`)
- `analyze_csv_file()` - Analyzes uploaded CSV structure and detects column types
- `translate_csv_column()` - Translates specific columns with user-defined mapping
- `_batch_translate_csv()` - Batch translation with OpenAI/Claude

### Frontend Component (`thai_translation_dashboard/src/components/CSVTranslationTab.tsx`)
- File upload interface
- Column analysis display
- Translation configuration
- Result download

## Integration Steps

### 1. Add Tab to Main Dashboard

Edit `thai_translation_dashboard/src/App.tsx`:

```typescript
import CSVTranslationTab from './components/CSVTranslationTab';

// Inside your Tabs component:
<Tabs defaultValue="po-files" className="w-full">
  <TabsList>
    <TabsTrigger value="po-files">PO Files</TabsTrigger>
    <TabsTrigger value="csv">CSV Translation</TabsTrigger>  {/* NEW */}
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="po-files">
    {/* Existing PO translation component */}
  </TabsContent>

  <TabsContent value="csv">
    <CSVTranslationTab />  {/* NEW */}
  </TabsContent>

  <TabsContent value="settings">
    {/* Existing settings component */}
  </TabsContent>
</Tabs>
```

### 2. Add API Exports

Edit `translation_tools/api/__init__.py`:

```python
from . import csv_translation  # Add this line
```

### 3. Rebuild Frontend

```bash
cd apps/translation_tools/thai_translation_dashboard
yarn build
```

### 4. Restart Bench

```bash
bench restart
```

## Usage Workflow

### User Flow:
1. **Upload CSV** - User selects CSV file
2. **Analyze** - System detects columns and suggests translation pairs
3. **Configure** - User selects:
   - Source column (what to translate)
   - Target column (where to put translation)
   - Direction (TH→EN or EN→TH)
   - AI provider (OpenAI or Claude)
4. **Translate** - System processes in batches
5. **Download** - User downloads translated CSV

### Example Use Case: Expense Types (exp.csv)

```
Original CSV:
id,code,enname,thname
792,EXP-01,"-","ค่าคำขอโฆษณา"

Configuration:
- Source: thname
- Target: enname
- Direction: Thai → English
- Skip existing: Yes (skip if enname != "-")

Result CSV:
id,code,enname,thname
792,EXP-01,"Advertising License Fee","ค่าคำขอโฆษณา"
```

## Features

### Column Auto-Detection
- **Thai columns**: Detects Thai Unicode characters
- **English columns**: Detects Latin characters
- **Numeric columns**: Skips translation
- **Mixed columns**: Flags for user review

### Smart Options
- **Skip Empty**: Don't translate empty cells
- **Skip Existing**: Don't overwrite existing translations
- **Batch Processing**: Efficient API usage (20 entries/batch)

### Supported Formats
- Standard CSV with UTF-8 encoding
- Any column structure (flexible)
- Large files (processes in chunks)

## API Reference

### Analyze CSV
```python
POST /api/method/translation_tools.api.csv_translation.analyze_csv_file
{
  "file_content": "base64_or_raw_csv",
  "filename": "expenses.csv"
}

Response:
{
  "success": true,
  "columns": ["id", "code", "enname", "thname"],
  "column_analysis": [
    {
      "name": "thname",
      "type": "thai",
      "suggested_direction": "th_to_en",
      "sample_values": ["ค่าคำขอโฆษณา", ...]
    }
  ],
  "total_rows": 2380
}
```

### Translate CSV
```python
POST /api/method/translation_tools.api.csv_translation.translate_csv_column
{
  "file_content": "csv_content",
  "source_column": "thname",
  "target_column": "enname",
  "direction": "th_to_en",
  "model_provider": "openai",
  "batch_size": 20,
  "skip_empty": true,
  "skip_existing": true
}

Response:
{
  "success": true,
  "translated_count": 1705,
  "total_rows": 2380,
  "skipped_count": 675,
  "csv_content": "translated_csv_string"
}
```

## Troubleshooting

### Issue: "Column not found"
**Solution**: Check CSV encoding (must be UTF-8) and column names match exactly

### Issue: Translation fails
**Solution**:
1. Verify API keys in Translation Tools Settings
2. Check model provider is configured
3. Review batch size (reduce if timeout occurs)

### Issue: Encoding problems
**Solution**: Ensure CSV is UTF-8 encoded:
```bash
# Convert to UTF-8
iconv -f <source-encoding> -t UTF-8 input.csv > output.csv
```

## Performance Considerations

### Batch Size
- **Small files (<100 rows)**: batch_size=50
- **Medium files (100-1000 rows)**: batch_size=20 (default)
- **Large files (>1000 rows)**: batch_size=10

### Cost Estimation
- OpenAI GPT-4o-mini: ~$0.001 per entry
- Claude Haiku: ~$0.0005 per entry
- Example: 2000 entries ≈ $2 USD

### API Rate Limits
- OpenAI: 10,000 tokens/min (tier 1)
- Claude: 50,000 tokens/min (tier 1)
- Built-in 2-second delay between batches

## Security Notes

- File content stays in memory (not saved to disk)
- API keys encrypted in Translation Tools Settings
- Uses existing frappe-react-sdk authentication
- No CSV data logged to server

## Future Enhancements

Possible improvements:
- [ ] Save translation jobs history
- [ ] Resume interrupted translations
- [ ] Multi-column translation (translate multiple columns at once)
- [ ] Custom glossary support for CSV-specific terms
- [ ] Export translation quality report
- [ ] Preview before download

## Support

For issues or questions:
1. Check Translation Tools Settings for API key configuration
2. Review browser console for errors
3. Check Frappe error logs: `bench --site [site] logs`
