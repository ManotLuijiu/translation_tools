#!/usr/bin/env python3
"""
AI-Powered PO File Translator for ERPNext
This script translates PO files that are generated from the 'bench update-po-files' command.
It uses the OpenAI API to translate content while preserving the PO file format.

Usage:
  python translate_po_files.py [options] <po_file_path>

Options:
  --target-lang=<language>   Target language (default: th for Thai)
  --api-key=<key>            OpenAI API key (required)
  --model=<model>            OpenAI model to use (default: gpt-4)
  --batch-size=<size>        Number of entries to translate in a batch (default: 10)
  --output=<path>            Output file path (default: input file with .translated suffix)
  --help                     Show this help message
"""

import os
import re
import sys
import time
import argparse
import polib
from typing import List, Dict, Optional
from datetime import datetime
import openai
import json

# Constants
DEFAULT_TARGET_LANG = "th"
DEFAULT_MODEL = "gpt-4"
DEFAULT_BATCH_SIZE = 10
SLEEP_TIME = 0.5  # Seconds to sleep between API calls to avoid rate limiting


def setup_argparse() -> argparse.Namespace:
    """Set up command line argument parsing."""
    parser = argparse.ArgumentParser(
        description="AI-Powered PO File Translator for ERPNext"
    )
    parser.add_argument("po_file_path", help="Path to the PO file to translate")
    parser.add_argument(
        "--target-lang",
        default=DEFAULT_TARGET_LANG,
        help=f"Target language (default: {DEFAULT_TARGET_LANG})",
    )
    parser.add_argument("--api-key", required=True, help="OpenAI API key")
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"OpenAI model to use (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help=f"Number of entries to translate in a batch (default: {DEFAULT_BATCH_SIZE})",
    )
    parser.add_argument(
        "--output",
        help="Output file path (default: input file with .translated suffix)",
    )

    return parser.parse_args()


def translate_batch(
    entries: List[Dict], target_lang: str, api_key: str, model: str
) -> List[str]:
    """Translate a batch of entries using OpenAI API."""
    openai.api_key = api_key

    # Format the batch for translation
    messages_to_translate = [entry["msgid"] for entry in entries]

    # Create system prompt with instructions
    system_prompt = f"""
    You are an expert translator specializing in technical and software localization. 
    Translate the following text from English to {target_lang}. 
    For Thai language translations, ensure proper tone and formality appropriate for business software.
    Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
    For technical terms, you may keep them in English if that's conventional.
    Return ONLY the translations, nothing else.
    """

    # Prepare messages for the API call
    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": "Please translate each of the following messages. Return only a JSON array of translations in the same order:\n"
            + json.dumps(messages_to_translate),
        },
    ]

    # Make the API call
    try:
        response = openai.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,  # Lower temperature for more consistent translations
            response_format={"type": "json_object"},
        )

        # Parse the JSON response
        response_text = response.choices[0].message.content
        response_json = json.loads(response_text)

        # Verify the response structure
        if "translations" in response_json and isinstance(
            response_json["translations"], list
        ):
            return response_json["translations"]
        else:
            # Try to extract translations from whatever structure was returned
            if isinstance(response_json, list):
                return response_json
            else:
                print(f"Warning: Unexpected response format: {response_json}")
                # Make a best-effort attempt to extract values
                return (
                    list(response_json.values())
                    if isinstance(response_json, dict)
                    else []
                )

    except Exception as e:
        print(f"Error during translation: {e}")
        return ["" for _ in entries]  # Return empty strings on error


def translate_po_file(
    po_file_path: str,
    target_lang: str,
    api_key: str,
    model: str,
    batch_size: int,
    output_path: Optional[str] = None,
) -> str:
    """
    Translate PO file content while preserving format.

    Args:
        po_file_path: Path to the input PO file
        target_lang: Target language code (e.g., 'th' for Thai)
        api_key: OpenAI API key
        model: OpenAI model to use
        batch_size: Number of entries to translate in a batch
        output_path: Path for the output file (optional)

    Returns:
        Path to the translated file
    """
    if not output_path:
        base, ext = os.path.splitext(po_file_path)
        output_path = f"{base}.translated{ext}"

    # Parse the PO file
    po = polib.pofile(po_file_path)

    # Prepare entries that need translation
    entries_to_translate = []
    for entry in po:
        if not entry.msgstr and entry.msgid and entry.msgid != "":
            entries_to_translate.append({"entry": entry, "msgid": entry.msgid})

    print(f"Found {len(entries_to_translate)} entries to translate")

    # Process in batches
    total_batches = (len(entries_to_translate) + batch_size - 1) // batch_size

    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(entries_to_translate))
        current_batch = entries_to_translate[start_idx:end_idx]

        print(
            f"Translating batch {batch_num + 1}/{total_batches} ({len(current_batch)} entries)"
        )

        # Translate the batch
        translations = translate_batch(current_batch, target_lang, api_key, model)

        # Apply translations to the entries
        for i, translation in enumerate(translations):
            if i < len(current_batch):
                current_batch[i]["entry"].msgstr = translation

        # Save after each batch (checkpoint)
        po.save(output_path)
        print(f"Saved progress to {output_path}")

        # Sleep to avoid rate limiting
        if batch_num < total_batches - 1:
            time.sleep(SLEEP_TIME)

    # Update metadata
    po.metadata["PO-Revision-Date"] = datetime.now().strftime("%Y-%m-%d %H:%M%z")
    po.metadata["Language"] = target_lang

    # Save final version
    po.save(output_path)

    print(f"Translation completed! Output saved to: {output_path}")
    print(f"Translated {len(entries_to_translate)} entries to {target_lang}")

    return output_path


def main():
    """Main function to run the translator."""
    args = setup_argparse()

    # Validate inputs
    if not os.path.exists(args.po_file_path):
        print(f"Error: PO file not found: {args.po_file_path}")
        sys.exit(1)

    print(f"Starting translation of {args.po_file_path} to {args.target_lang}")

    # Run the translation
    output_path = translate_po_file(
        args.po_file_path,
        args.target_lang,
        args.api_key,
        args.model,
        args.batch_size,
        args.output,
    )

    print(f"Translation complete! Output saved to: {output_path}")


if __name__ == "__main__":
    main()
