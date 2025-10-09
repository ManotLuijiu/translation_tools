#!/usr/bin/env python3
"""
Test script for CSV Translation API
Tests the new CSV translation functionality
"""

import frappe
import os
import sys

def test_csv_translation():
    """Test CSV translation with exp.csv file"""

    print("=" * 60)
    print("CSV Translation API Test")
    print("=" * 60)

    # Path to test CSV
    csv_path = os.path.join(
        frappe.get_site_path(),
        '..', '..', 'apps',
        'inpac_pharma/inpac_pharma/public/images/local/exp.csv'
    )

    if not os.path.exists(csv_path):
        print(f"❌ Test CSV not found: {csv_path}")
        return

    print(f"\n📁 Test file: {csv_path}")

    # Read CSV content
    with open(csv_path, 'r', encoding='utf-8') as f:
        csv_content = f.read()

    print(f"✅ Loaded CSV ({len(csv_content)} bytes)")

    # Step 1: Analyze CSV
    print("\n" + "=" * 60)
    print("Step 1: Analyzing CSV...")
    print("=" * 60)

    from translation_tools.api.csv_translation import analyze_csv_file

    analysis = analyze_csv_file(csv_content, 'exp.csv')

    if not analysis['success']:
        print(f"❌ Analysis failed: {analysis.get('error')}")
        return

    print(f"✅ Analysis successful!")
    print(f"\n📊 CSV Structure:")
    print(f"   Columns: {len(analysis['columns'])}")
    print(f"   Rows: ~{analysis['total_rows']}")

    print(f"\n🔍 Column Analysis:")
    for col in analysis['column_analysis']:
        print(f"\n   Column: {col['name']}")
        print(f"   Type: {col['type']}")
        if col['suggested_direction']:
            print(f"   Suggested: {col['suggested_direction']}")
        if col['sample_values']:
            print(f"   Sample: {col['sample_values'][0][:50]}...")

    # Step 2: Configure translation
    print("\n" + "=" * 60)
    print("Step 2: Translation Configuration")
    print("=" * 60)

    # Find Thai column (thname)
    thai_col = next((c for c in analysis['column_analysis'] if c['name'] == 'thname'), None)
    en_col = next((c for c in analysis['column_analysis'] if c['name'] == 'enname'), None)

    if not thai_col or not en_col:
        print("❌ Required columns not found (thname, enname)")
        return

    print(f"✅ Configuration:")
    print(f"   Source: {thai_col['name']} (Thai)")
    print(f"   Target: {en_col['name']} (English)")
    print(f"   Direction: Thai → English")
    print(f"   Provider: OpenAI")

    # Ask user confirmation
    print(f"\n⚠️  This will translate entries with missing English names")

    # Count entries to translate
    import csv
    import io
    reader = csv.DictReader(io.StringIO(csv_content))
    rows = list(reader)
    missing_count = sum(1 for row in rows if row['enname'] == '-' and row['thname'] != '-')

    print(f"   Total entries: {len(rows)}")
    print(f"   Missing English names: {missing_count}")
    print(f"   Estimated cost: ~${missing_count * 0.001:.2f} USD")

    response = input("\n   Translate first 3 entries as test? (y/N): ")

    if response.lower() != 'y':
        print("\n❌ Test cancelled by user")
        return

    # Step 3: Translate (first 3 only for testing)
    print("\n" + "=" * 60)
    print("Step 3: Running Translation Test (3 entries)")
    print("=" * 60)

    from translation_tools.api.csv_translation import translate_csv_column

    # Create test CSV with only first 3 rows needing translation
    test_rows = [row for row in rows if row['enname'] == '-' and row['thname'] != '-'][:3]
    test_rows_with_header = [dict(id='id', code='code', enname='enname', thname='thname')] + test_rows

    # Convert back to CSV string
    test_csv_content = csv_content.split('\n')[0] + '\n'  # Header
    for row in test_rows:
        test_csv_content += f'{row["id"]},{row["code"]},"-","{row["thname"]}"\n'

    result = translate_csv_column(
        file_content=test_csv_content,
        source_column='thname',
        target_column='enname',
        direction='th_to_en',
        model_provider='openai',
        model='gpt-4o-mini',
        batch_size=3,
        skip_empty=True,
        skip_existing=True
    )

    if not result['success']:
        print(f"❌ Translation failed: {result.get('error')}")
        return

    print(f"✅ Translation successful!")
    print(f"\n📊 Results:")
    print(f"   Translated: {result['translated_count']} entries")
    print(f"   Total: {result['total_rows']} entries")

    # Show sample results
    if result.get('csv_content'):
        print(f"\n📝 Sample Translations:")
        import csv
        reader = csv.DictReader(io.StringIO(result['csv_content']))
        for i, row in enumerate(reader):
            if i >= 3:
                break
            print(f"\n   {row['code']}:")
            print(f"   TH: {row['thname'][:60]}...")
            print(f"   EN: {row['enname'][:60]}...")

    print("\n" + "=" * 60)
    print("✅ Test Complete!")
    print("=" * 60)
    print("\n💡 To translate the full CSV:")
    print("   1. Use the Translation Dashboard UI")
    print("   2. Or call translate_csv_column() with full CSV content")
    print("   3. Set batch_size=20 for optimal performance")


if __name__ == "__main__":
    # Initialize Frappe
    site = 'moo.localhost'  # Change this to your site

    frappe.init(site=site)
    frappe.connect()

    try:
        test_csv_translation()
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        frappe.destroy()
