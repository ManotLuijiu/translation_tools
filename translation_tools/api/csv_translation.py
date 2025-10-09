"""
CSV Translation API for Translation Tools
Flexible system for translating CSV files with user-defined column mapping
"""

import csv
import io
import json
import os
import tempfile
import frappe
from frappe import _
from frappe.utils import now
import openai
from .settings import get_translation_settings, get_decrypted_api_keys
from .translation import _translate_with_openai, _translate_with_claude


@frappe.whitelist()
def analyze_csv_file(file_content, filename):
    """
    Analyze uploaded CSV file and return column structure

    Args:
        file_content (str): Base64 encoded CSV content or raw CSV string
        filename (str): Original filename

    Returns:
        dict: CSV analysis result with columns and sample data
    """
    try:
        # Decode if base64
        try:
            import base64
            file_content = base64.b64decode(file_content).decode('utf-8')
        except:
            # Already decoded or plain text
            pass

        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(file_content))

        # Get column names
        fieldnames = csv_reader.fieldnames or []

        # Get sample rows (first 5)
        sample_rows = []
        row_count = 0

        for row in csv_reader:
            sample_rows.append(row)
            row_count += 1
            if len(sample_rows) >= 5:
                break

        # Count total rows (approximate from already read rows)
        total_rows = row_count

        # Try to detect language in each column
        column_analysis = []
        for col in fieldnames:
            # Get sample values
            sample_values = [row.get(col, '') for row in sample_rows if row.get(col)]

            # Detect if contains Thai characters
            has_thai = any(_contains_thai(val) for val in sample_values)
            has_english = any(_contains_english(val) for val in sample_values)
            is_numeric = all(val.replace('.', '').replace('-', '').isdigit()
                           for val in sample_values if val)

            # Determine column type
            if is_numeric:
                col_type = 'numeric'
                suggested_direction = None
            elif has_thai and not has_english:
                col_type = 'thai'
                suggested_direction = 'th_to_en'
            elif has_english and not has_thai:
                col_type = 'english'
                suggested_direction = 'en_to_th'
            elif has_thai and has_english:
                col_type = 'mixed'
                suggested_direction = None
            else:
                col_type = 'unknown'
                suggested_direction = None

            column_analysis.append({
                'name': col,
                'type': col_type,
                'suggested_direction': suggested_direction,
                'sample_values': sample_values[:3]  # First 3 samples
            })

        return {
            'success': True,
            'filename': filename,
            'columns': fieldnames,
            'column_analysis': column_analysis,
            'total_rows': total_rows,
            'sample_rows': sample_rows[:3],
            'message': f'CSV analyzed: {len(fieldnames)} columns, ~{total_rows} rows'
        }

    except Exception as e:
        frappe.log_error(f"CSV analysis error: {str(e)}")
        return {
            'success': False,
            'error': f'Failed to analyze CSV: {str(e)}'
        }


@frappe.whitelist()
def translate_csv_column(
    file_content,
    source_column,
    target_column,
    direction='th_to_en',
    model_provider='openai',
    model=None,
    batch_size=20,
    skip_empty=True,
    skip_existing=True
):
    """
    Translate a specific column in CSV file

    Args:
        file_content (str): CSV content (base64 or raw)
        source_column (str): Column name to translate FROM
        target_column (str): Column name to translate TO (can be same as source)
        direction (str): Translation direction ('th_to_en' or 'en_to_th')
        model_provider (str): AI provider ('openai' or 'claude')
        model (str): Specific model to use
        batch_size (int): Number of entries to translate per API call
        skip_empty (bool): Skip empty source values
        skip_existing (bool): Skip if target already has value

    Returns:
        dict: Translation result with updated CSV content
    """
    try:
        # Decode CSV content
        try:
            import base64
            file_content = base64.b64decode(file_content).decode('utf-8')
        except:
            pass

        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(file_content))
        fieldnames = csv_reader.fieldnames or []

        # Validate columns
        if source_column not in fieldnames:
            return {
                'success': False,
                'error': f'Source column "{source_column}" not found in CSV'
            }

        # Add target column if not exists
        if target_column not in fieldnames:
            fieldnames.append(target_column)

        # Load all rows
        rows = list(csv_reader)

        # Get API settings
        settings = get_translation_settings()
        api_keys = get_decrypted_api_keys()

        # Determine final provider and model
        final_provider = model_provider or settings.get('default_model_provider', 'openai')
        final_model = model or settings.get('default_model', 'gpt-4o-mini')

        # Get API key
        if final_provider == 'openai':
            api_key = api_keys.get('openai_api_key')
        else:
            api_key = api_keys.get('anthropic_api_key')

        if not api_key:
            return {
                'success': False,
                'error': f'{final_provider} API key not configured'
            }

        # Identify rows to translate
        rows_to_translate = []
        for idx, row in enumerate(rows):
            source_value = row.get(source_column, '').strip()
            target_value = row.get(target_column, '').strip()

            # Skip conditions
            if skip_empty and not source_value:
                continue
            if skip_existing and target_value and target_value != '-':
                continue

            rows_to_translate.append({
                'index': idx,
                'source': source_value
            })

        if not rows_to_translate:
            return {
                'success': True,
                'translated_count': 0,
                'skipped_count': len(rows),
                'message': 'No rows to translate (all already have values or are empty)'
            }

        # Translate in batches
        translated_count = 0
        total_batches = (len(rows_to_translate) + batch_size - 1) // batch_size

        for batch_idx in range(total_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, len(rows_to_translate))
            batch = rows_to_translate[start_idx:end_idx]

            # Extract source texts
            source_texts = [item['source'] for item in batch]

            # Translate batch
            translations = _batch_translate_csv(
                api_key,
                final_model,
                final_provider,
                source_texts,
                direction
            )

            # Apply translations
            for item, translation in zip(batch, translations):
                if translation:
                    row_idx = item['index']
                    rows[row_idx][target_column] = translation
                    translated_count += 1

        # Generate output CSV
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

        output_content = output.getvalue()

        return {
            'success': True,
            'translated_count': translated_count,
            'total_rows': len(rows),
            'skipped_count': len(rows) - len(rows_to_translate),
            'csv_content': output_content,
            'message': f'Successfully translated {translated_count} entries'
        }

    except Exception as e:
        frappe.log_error(f"CSV translation error: {str(e)}")
        return {
            'success': False,
            'error': f'Translation failed: {str(e)}'
        }


def _batch_translate_csv(api_key, model, provider, texts, direction):
    """
    Translate a batch of texts for CSV translation

    Args:
        api_key (str): API key for provider
        model (str): Model to use
        provider (str): Provider ('openai' or 'claude')
        texts (list): List of texts to translate
        direction (str): Translation direction

    Returns:
        list: Translated texts
    """
    if not texts:
        return []

    # Prepare batch prompt
    batch_items = []
    for i, text in enumerate(texts, 1):
        batch_items.append(f"{i}. {text}")

    batch_text = "\n".join(batch_items)

    # Set translation direction
    if direction == 'th_to_en':
        source_lang = 'Thai'
        target_lang = 'English'
        instructions = """Keep technical/scientific terms in English.
Translate administrative/operational terms clearly.
Preserve numeric values and units exactly."""
    else:  # en_to_th
        source_lang = 'English'
        target_lang = 'Thai'
        instructions = """Use formal, professional Thai appropriate for business.
Translate to natural, fluent Thai - avoid literal word-by-word translation.
Maintain technical terms where appropriate."""

    system_prompt = f"""You are a professional {source_lang}-{target_lang} translator specializing in business and technical terminology.

TRANSLATION GUIDELINES:
{instructions}

OUTPUT FORMAT:
Return ONLY the numbered list of translations, one per line.
Example format:
1. [translated text]
2. [translated text]

Do not add explanations or extra text."""

    user_prompt = f"""Translate from {source_lang} to {target_lang}:

{batch_text}

{target_lang} translations (numbered list only):"""

    try:
        if provider == 'openai':
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                temperature=0.3,
                max_tokens=3000,
                timeout=60
            )
            raw_response = response.choices[0].message.content.strip()
        else:  # claude
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=model,
                messages=[
                    {'role': 'user', 'content': f"{system_prompt}\n\n{user_prompt}"}
                ],
                max_tokens=3000,
                temperature=0.3
            )
            raw_response = response.content[0].text.strip()

        # Parse numbered translations
        translations = []
        for line in raw_response.split('\n'):
            line = line.strip()
            if not line:
                continue

            # Remove numbering: "1. " or "1) " or "1 - "
            import re
            line = re.sub(r'^\d+[\.\)\-\s]+', '', line)
            translations.append(line.strip())

        # Ensure we have the right number of translations
        while len(translations) < len(texts):
            translations.append('')

        return translations[:len(texts)]

    except Exception as e:
        frappe.log_error(f"Batch translation error: {str(e)}")
        return [''] * len(texts)


def _contains_thai(text):
    """Check if text contains Thai characters"""
    if not text:
        return False
    import re
    thai_pattern = re.compile(r'[\u0E00-\u0E7F]')
    return bool(thai_pattern.search(text))


def _contains_english(text):
    """Check if text contains English characters"""
    if not text:
        return False
    import re
    english_pattern = re.compile(r'[a-zA-Z]')
    return bool(english_pattern.search(text))


@frappe.whitelist()
def get_csv_translation_history(limit=10):
    """Get recent CSV translation history"""
    # This would query a CSV Translation Log doctype if you create one
    # For now, return empty
    return {
        'success': True,
        'history': []
    }
