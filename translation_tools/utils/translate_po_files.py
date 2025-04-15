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

from translation_tools.utils.thai_glossary import GLOSSARY
import os
import re
import sys
import time
import argparse
import polib
from typing import List, Dict, Optional
from datetime import datetime
import openai
import anthropic
import json
import random
from tqdm import tqdm

# Import glossary if available
# try:
#     # Try to import from translation_tools first
#     from thai_glossary import GLOSSARY
# except ImportError:
#     try:
#         # Try to import from frappe as fallback
#         from thai_business_suite.utils.translation.thai_glossary import GLOSSARY
#     except ImportError:
#         # If not available, use an empty glossary
#         GLOSSARY = {}

# Constants
DEFAULT_TARGET_LANG = "th"
# DEFAULT_MODEL = "gpt-4"
DEFAULT_MODEL = "gpt-4-1106-preview"  # Using a model that supports JSON format
DEFAULT_BATCH_SIZE = 10
SLEEP_TIME = 0.5  # Seconds to sleep between API calls to avoid rate limiting


def backoff_wait(attempt):
    wait_time = min((2**attempt) + random.uniform(0, 0.5), 60)
    print(f"Rate limit reached. Retrying in {wait_time:.2f} seconds...")
    time.sleep(wait_time)


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
    parser.add_argument(
        "--api-key", required=True, help="API key (OpenAI or Anthropic)"
    )
    parser.add_argument(
        "--model-provider",
        default="openai",
        choices=["openai", "claude"],
        help="AI model provider to use (default: openai)",
    )
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
    parser.add_argument(
        "--temperature",
        type=float,
        default=0.3,
        help="Model temperature (default: 0.3)",
    )
    parser.add_argument(
        "--max-tokens",
        type=int,
        default=512,
        help="Max tokens per API call (default: 512)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show which entries will be translated without sending API requests",
    )

    return parser.parse_args()


# def translate_batch_openai(entries: List[Dict], target_lang: str, api_key: str, model: str) -> List[str]:
#     """Translate a batch of entries using OpenAI API."""

#     openai.api_key = api_key

#     # Format the batch for translation
#     messages_to_translate = [entry["msgid"] for entry in entries]

#     # Create system prompt with instructions
#     system_prompt = f"""
#     You are an expert translator specializing in technical and software localization.
#     Translate the following text from English to {target_lang}.
#     For Thai language translations, ensure proper tone and formality appropriate for business software.
#     Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
#     For technical terms, you may keep them in English if that's conventional.
#     Return ONLY the translations as plain text, one per line, without any JSON formatting.
#     """

#     # Prepare messages for the API call
#     messages = [
#         {"role": "system", "content": system_prompt},
#         {"role": "user", "content": "Please translate each of the following messages, one per line:\n" + "\n".join(messages_to_translate)}
#     ]

#     # Make the API call
#     try:
#         response = openai.chat.completions.create(
#             model=model,
#             messages=messages,
#             temperature=0.3,  # Lower temperature for more consistent translations
#         )

#         # Extract the response text
#         response_text = response.choices[0].message.content

#         # Split the response by new lines
#         translations = [line.strip() for line in response_text.strip().split("\n")]

#         # Make sure we have the correct number of translations
#         if len(translations) != len(messages_to_translate):
#             print(f"Warning: Expected {len(messages_to_translate)} translations but got {len(translations)}")

#             # Try to fix by padding with empty strings if needed
#             if len(translations) < len(messages_to_translate):
#                 translations.extend([""] * (len(messages_to_translate) - len(translations)))
#             else:
#                 translations = translations[:len(messages_to_translate)]

#         return translations

#     except Exception as e:
#         print(f"Error during translation: {e}")
#         return ["" for _ in entries]  # Return empty strings on error


def translate_batch_claude(
    entries: List[Dict], target_lang: str, api_key: str, model: str
) -> List[str]:
    """Translate a batch of entries using Anthropic Claude API."""
    client = anthropic.Anthropic(api_key=api_key)
    GLOSSARY_TEXT = json.dumps(GLOSSARY, indent=2)

    # Format the batch for translation
    messages_to_translate = [entry["msgid"] for entry in entries]

    # Create prompt with instructions
    prompt = f"""
    You are an expert translator specializing in technical and software localization. 
    Translate the following text from English to {target_lang}. 
    For Thai language translations, use these specific term translations:
    {GLOSSARY_TEXT}
    
    Ensure proper tone and formality appropriate for business software.
    Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
    For technical terms not in the glossary, you may keep them in English if that's conventional.
    Return a JSON array of translations in the same order.
    """

    # Make the API call
    try:
        response = client.messages.create(
            model=model or "claude-3-haiku-20240307",
            max_tokens=1000,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )

        # Extract the response text
        response_text = response.content[0].text  # type: ignore

        # Split the response by new lines
        translations = [line.strip() for line in response_text.strip().split("\n")]

        # Make sure we have the correct number of translations
        if len(translations) != len(messages_to_translate):
            print(
                f"Warning: Expected {len(messages_to_translate)} translations but got {len(translations)}"
            )

            # Try to fix by padding with empty strings if needed
            if len(translations) < len(messages_to_translate):
                translations.extend(
                    [""] * (len(messages_to_translate) - len(translations))
                )
            else:
                translations = translations[: len(messages_to_translate)]

        return translations

    except Exception as e:
        print(f"Error during translation: {e}")
        return ["" for _ in entries]  # Return empty strings on error


def translate_batch(
    entries: List[Dict],
    target_lang: str,
    api_key: str,
    model: str,
    temperature: float = 0.3,
    max_tokens: int = 512,
) -> List[str]:
    """Translate a batch of entries using OpenAI API."""
    # openai.api_key = api_key
    client = openai.OpenAI(api_key=api_key)
    GLOSSARY_TEXT = json.dumps(GLOSSARY, indent=2)

    # Format the batch for translation
    messages_to_translate = [entry["msgid"] for entry in entries]

    # Create system prompt with instructions
    system_prompt = f"""
    You are an expert translator specializing in technical and software localization. 
    Translate the following text from English to {target_lang}. 
    For Thai language translations, use these specific term translations:
    {GLOSSARY_TEXT}
    
    Ensure proper tone and formality appropriate for business software.
    Preserve any formatting placeholders like {{% s }}, {{ }}, or {0}.
    For technical terms not in the glossary, you may keep them in English if that's conventional.
    Return a JSON array of translations in the same order.
    """

    # Prepare messages for the API call
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": json.dumps(messages_to_translate)},
    ]

    # Make the API call
    print(f"Attempting to call OpenAI API with model: {model}")
    attempt = 0
    while attempt < 5:
        try:
            print("Making API call...")

            if "gpt-4-" in model and "-1106" in model:
                # For newer models that support JSON response format
                api_params = {"response_format": {"type": "json_object"}}
            else:
                # For older models that don't support JSON response format
                api_params = {}

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,  # Lower temperature for more consistent translations
                max_tokens=max_tokens,
                # response_format={"type": "json_object"},
                # response_format="json",
                **api_params,
                timeout=30,
            )
            print("API call completed successfully")

            # Parse the JSON response
            response_text = response.choices[0].message.content
            print(f"Raw response: {response_text[:200]}...")  # Print first 200 chars
            # response_json = json.loads(response_text)
            # translations = json.loads(response_text)
            # Try to parse the JSON
            try:
                response_json = json.loads(response_text)
                print(f"Parsed JSON type: {type(response_json)}")
                print(
                    f"JSON keys: {list(response_json.keys()) if isinstance(response_json, dict) else 'Not a dict'}"
                )

                # Handle different response formats
                if isinstance(response_json, list):
                    return response_json
                elif (
                    isinstance(response_json, dict) and "translations" in response_json
                ):
                    return response_json["translations"]
                elif isinstance(response_json, dict):
                    # Return all values as a fallback
                    return list(response_json.values())
                else:
                    print(f"Unrecognized JSON format: {type(response_json)}")
                    return [""] * len(entries)
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")

                # If JSON parsing fails, try to extract translations line by line
                lines = [line.strip() for line in response_text.strip().split("\n")]
                if len(lines) == len(entries):
                    print("Falling back to line-by-line parsing")
                    return lines
                else:
                    return [""] * len(entries)

        except openai.APIError as e:
            print(f"OpenAI API error: {e}")
            wait_time = min((2**attempt) + random.uniform(0, 0.5), 60)
            print(f"Retrying in {wait_time:.2f} seconds...")
            time.sleep(wait_time)
            attempt += 1

        except Exception as e:
            print(f"Unexpected error: {e}")
            break
    return [""] * len(entries)  # Return empty translations on failure


def translate_po_file(
    po_file_path: str,
    target_lang: str,
    api_key: str,
    model_provider: str,
    model: str,
    batch_size: int,
    dry_run: bool = False,
    temperature: float = 0.3,
    max_tokens: int = 512,
    output_path: Optional[str] = None,
) -> str:
    """
    Translate PO file content while preserving format.
    """

    # Choose the appropriate translation function
    translate_function = (
        translate_batch_claude if model_provider == "claude" else translate_batch
    )

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

    if dry_run:
        print("Dry run mode: Entries to be translated:")
        for entry in entries_to_translate:
            print(entry["msgid"])
        return "Dry run completed"

    # Process in batches
    total_batches = (len(entries_to_translate) + batch_size - 1) // batch_size

    for batch_num in tqdm(range(total_batches), desc="Translating batches..."):
        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, len(entries_to_translate))
        current_batch = entries_to_translate[start_idx:end_idx]

        print(
            f"Translating batch {batch_num + 1}/{total_batches} ({len(current_batch)} entries)"
        )

        # Translate the batch
        # translations = translate_batch(current_batch, target_lang, api_key, model)
        translations = translate_function(
            current_batch,
            target_lang,
            api_key,
            model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

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
        args.model_provider,  # Fixed order of parameters
        args.model,
        args.batch_size,
        dry_run=args.dry_run,  # Pass the dry_run parameter
        temperature=args.temperature,  # Pass temperature
        max_tokens=args.max_tokens,  # Pass max_tokens
        output_path=args.output,
    )

    print(f"Translation complete! Output saved to: {output_path}")


if __name__ == "__main__":
    main()
