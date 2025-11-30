"""
Account Import API - One Stop Service for Chart of Accounts Import

This module provides backend APIs for the Account Import Mapper feature,
enabling direct import of accounts with all custom fields including Thai translations.

APIs:
- get_companies: Get list of existing companies
- generate_abbr: Auto-generate company abbreviation from name
- create_company: Create new company with auto-generated ABBR
- validate_accounts: Validate accounts before import
- import_accounts: Import accounts directly to database

Usage:
    Frontend calls these APIs from AccountMapperPage.tsx
"""

import re
import frappe
from frappe import _
from frappe.utils import cint, flt
from collections import defaultdict
import json


@frappe.whitelist()
def get_companies():
    """
    Get list of existing companies for dropdown selection.

    Returns:
        list: List of companies with name, abbr, default_currency
    """
    companies = frappe.get_all(
        "Company",
        fields=["name", "abbr", "default_currency", "country"],
        order_by="name"
    )
    return companies


@frappe.whitelist()
def generate_abbr(company_name: str) -> str:
    """
    Auto-generate company abbreviation from company name.

    Algorithm:
    1. Extract capital letters and first letters of each word
    2. Remove common suffixes (Co., Ltd., Inc., etc.)
    3. Ensure uniqueness by adding number if needed

    Examples:
        "M Capital Corporation Co., Ltd." -> "MCCCL" or "MCC"
        "Moo Coding Ltd." -> "MCL"
        "AWS Solution Ltd." -> "ASL"

    Args:
        company_name: Full company name

    Returns:
        str: Generated abbreviation (unique)
    """
    if not company_name:
        return ""

    # Remove common suffixes
    name = company_name
    suffixes = [
        r'\s*Co\.,?\s*Ltd\.?',
        r'\s*Ltd\.?',
        r'\s*Inc\.?',
        r'\s*Corp\.?',
        r'\s*Corporation',
        r'\s*Company',
        r'\s*Limited',
        r'\s*จำกัด',
        r'\s*บริษัท',
        r'\s*\(.*?\)',  # Remove anything in parentheses
    ]

    for suffix in suffixes:
        name = re.sub(suffix, '', name, flags=re.IGNORECASE)

    name = name.strip()

    # Strategy 1: Get first letter of each word
    words = name.split()
    abbr = ''.join(word[0].upper() for word in words if word and word[0].isalpha())

    # If too short, try capital letters only
    if len(abbr) < 2:
        capitals = ''.join(c for c in company_name if c.isupper())
        if len(capitals) >= 2:
            abbr = capitals

    # Ensure minimum length
    if len(abbr) < 2:
        abbr = name[:3].upper() if len(name) >= 3 else name.upper()

    # Ensure uniqueness
    base_abbr = abbr
    counter = 1
    while frappe.db.exists("Company", {"abbr": abbr}):
        abbr = f"{base_abbr}{counter}"
        counter += 1
        if counter > 99:
            # Fallback: add random chars
            import random
            import string
            abbr = base_abbr + ''.join(random.choices(string.ascii_uppercase, k=2))
            break

    return abbr


@frappe.whitelist()
def create_company(
    company_name: str,
    abbr: str = None,
    default_currency: str = "THB",
    country: str = "Thailand",
    chart_of_accounts: str = None
) -> dict:
    """
    Create a new company with minimal required fields.

    This creates a basic company structure. The Chart of Accounts
    will be imported separately via import_accounts().

    Args:
        company_name: Full company name
        abbr: Company abbreviation (auto-generated if not provided)
        default_currency: Default currency (default: THB)
        country: Country (default: Thailand)
        chart_of_accounts: Chart of Accounts template (optional)

    Returns:
        dict: Created company details {name, abbr, default_currency}
    """
    # Check if company already exists
    if frappe.db.exists("Company", company_name):
        existing = frappe.get_doc("Company", company_name)
        return {
            "name": existing.name,
            "abbr": existing.abbr,
            "default_currency": existing.default_currency,
            "exists": True,
            "message": _("Company already exists")
        }

    # Auto-generate abbreviation if not provided
    if not abbr:
        abbr = generate_abbr(company_name)

    # Check if abbr is unique
    if frappe.db.exists("Company", {"abbr": abbr}):
        # Generate a unique one
        abbr = generate_abbr(company_name)

    try:
        company = frappe.get_doc({
            "doctype": "Company",
            "company_name": company_name,
            "abbr": abbr,
            "default_currency": default_currency,
            "country": country,
            # Skip chart of accounts - we'll import manually
            "chart_of_accounts": chart_of_accounts or None,
            # Required fields with defaults
            "create_chart_of_accounts_based_on": "Standard Template" if chart_of_accounts else None,
        })

        company.flags.ignore_permissions = True
        company.flags.ignore_mandatory = True
        company.insert()

        frappe.db.commit()

        return {
            "name": company.name,
            "abbr": company.abbr,
            "default_currency": company.default_currency,
            "exists": False,
            "message": _("Company created successfully")
        }

    except Exception as e:
        frappe.log_error(f"Error creating company {company_name}: {str(e)}", "Account Import")
        frappe.throw(_("Failed to create company: {0}").format(str(e)))


@frappe.whitelist()
def validate_accounts(accounts_json: str, company: str) -> dict:
    """
    Validate accounts before import.

    Checks:
    1. All required fields present
    2. Parent accounts exist in the import set
    3. No duplicate account IDs
    4. Root types are valid

    Args:
        accounts_json: JSON string of account list
        company: Target company name

    Returns:
        dict: Validation result with errors and warnings
    """
    try:
        accounts = json.loads(accounts_json) if isinstance(accounts_json, str) else accounts_json
    except json.JSONDecodeError as e:
        return {"valid": False, "errors": [f"Invalid JSON: {str(e)}"], "warnings": []}

    errors = []
    warnings = []

    # Build set of all account IDs in import
    account_ids = set()
    for acc in accounts:
        acc_id = acc.get("ID", "").strip()
        if acc_id:
            account_ids.add(acc_id)

    # Validate each account
    for i, acc in enumerate(accounts):
        row_num = i + 1
        acc_id = acc.get("ID", "").strip()
        acc_name = acc.get("Account Name", "").strip()
        parent = acc.get("Parent Account", "").strip()
        root_type = acc.get("Root Type", "").strip()

        # Required fields
        if not acc_name:
            errors.append(f"Row {row_num}: Account Name is required")

        if not root_type:
            errors.append(f"Row {row_num} ({acc_name}): Root Type is required")
        elif root_type not in ["Asset", "Liability", "Equity", "Income", "Expense"]:
            errors.append(f"Row {row_num} ({acc_name}): Invalid Root Type '{root_type}'")

        # Check parent exists (either in import or already in company)
        if parent:
            if parent not in account_ids:
                # Check if parent exists in database for this company
                if not frappe.db.exists("Account", {"name": parent, "company": company}):
                    errors.append(f"Row {row_num} ({acc_name}): Parent Account '{parent}' not found")

        # Check for duplicates
        if acc_id:
            count = sum(1 for a in accounts if a.get("ID", "").strip() == acc_id)
            if count > 1:
                warnings.append(f"Row {row_num}: Duplicate ID '{acc_id}'")

    # Check for existing accounts that would conflict
    existing_count = 0
    for acc in accounts:
        acc_id = acc.get("ID", "").strip()
        if acc_id and frappe.db.exists("Account", acc_id):
            existing_count += 1

    if existing_count > 0:
        warnings.append(f"{existing_count} accounts already exist and will be skipped")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "total_accounts": len(accounts),
        "existing_accounts": existing_count,
        "new_accounts": len(accounts) - existing_count
    }


def _sort_accounts_by_hierarchy(accounts: list) -> list:
    """
    Sort accounts so that parent accounts are created before children.
    Uses topological sort based on parent-child relationships.

    Args:
        accounts: List of account dictionaries

    Returns:
        list: Sorted list with parents before children
    """
    # Build lookup by account ID
    account_lookup = {}
    for acc in accounts:
        acc_id = acc.get("ID", "").strip()
        if acc_id:
            account_lookup[acc_id] = acc

    # Calculate depth for each account
    def get_depth(acc_id, visited=None):
        if visited is None:
            visited = set()

        if acc_id in visited:
            return 0  # Circular reference protection

        visited.add(acc_id)

        acc = account_lookup.get(acc_id)
        if not acc:
            return 0

        parent_id = acc.get("Parent Account", "").strip()
        if not parent_id or parent_id not in account_lookup:
            return 0

        return 1 + get_depth(parent_id, visited)

    # Calculate depth for each account
    depths = []
    for acc in accounts:
        acc_id = acc.get("ID", "").strip()
        depth = get_depth(acc_id) if acc_id else 0
        depths.append((depth, acc))

    # Sort by depth (root accounts first)
    depths.sort(key=lambda x: x[0])

    return [acc for _, acc in depths]


def _create_single_account(account_data: dict, company: str, abbr: str, available_fields: dict) -> dict:
    """
    Create a single Account document with all fields including custom fields.

    Args:
        account_data: Dictionary of account field values from CSV
        company: Target company name
        abbr: Company abbreviation for ID replacement
        available_fields: Dict of which custom fields are available on Account doctype

    Returns:
        dict: Result with status (created/skipped/failed) and message
    """
    acc_id = account_data.get("ID", "").strip()
    acc_name = account_data.get("Account Name", "").strip()

    # Check if account already exists
    if frappe.db.exists("Account", acc_id):
        return {
            "status": "skipped",
            "account": acc_id,
            "message": "Account already exists"
        }

    try:
        # Build account document
        doc_data = {
            "doctype": "Account",
            "account_name": acc_name,
            "company": company,
            "is_group": cint(account_data.get("Is Group", 0)),
            "root_type": account_data.get("Root Type", "").strip() or None,
            "report_type": account_data.get("Report Type", "").strip() or None,
            "account_currency": account_data.get("Currency", "").strip() or "THB",
            "account_type": account_data.get("Account Type", "").strip() or None,
        }

        # Parent Account
        parent = account_data.get("Parent Account", "").strip()
        if parent:
            doc_data["parent_account"] = parent

        # Account Number
        acc_number = account_data.get("Account Number", "").strip()
        if acc_number:
            doc_data["account_number"] = acc_number

        # Tax Rate
        tax_rate = account_data.get("Tax Rate", "")
        if tax_rate:
            doc_data["tax_rate"] = flt(tax_rate)

        # Frozen
        frozen = account_data.get("Frozen", "").strip()
        if frozen in ["Yes", "1", "true", "True"]:
            doc_data["freeze_account"] = "Yes"
        else:
            doc_data["freeze_account"] = "No"

        # Balance must be
        balance_must_be = account_data.get("Balance must be", "").strip()
        if balance_must_be and balance_must_be in ["Debit", "Credit"]:
            doc_data["balance_must_be"] = balance_must_be

        # Custom fields for Thai localization
        if available_fields.get("account_name_th"):
            thai_name = account_data.get("Account Name (TH)", "").strip()
            if thai_name:
                doc_data["account_name_th"] = thai_name

        if available_fields.get("auto_translate_to_thai"):
            auto_translate = account_data.get("Auto Translate to Thai", "")
            doc_data["auto_translate_to_thai"] = cint(auto_translate)

        if available_fields.get("thai_translation_notes"):
            notes = account_data.get("Thai Translation Notes", "").strip()
            if notes:
                doc_data["thai_translation_notes"] = notes

        # Create account document
        doc = frappe.get_doc(doc_data)
        doc.flags.ignore_permissions = True
        doc.flags.ignore_links = True
        doc.flags.ignore_validate = True
        doc.insert()

        return {
            "status": "created",
            "account": doc.name,
            "message": "Account created successfully"
        }

    except Exception as e:
        frappe.log_error(
            f"Failed to create account {acc_id}: {str(e)}",
            "Account Import Error"
        )
        return {
            "status": "failed",
            "account": acc_id,
            "message": str(e)
        }


def _check_custom_fields_exist() -> dict:
    """
    Check if required custom fields exist on Account DocType.

    Returns:
        dict: Field availability {field_name: bool}
    """
    custom_fields = {
        "account_name_th": False,
        "auto_translate_to_thai": False,
        "thai_translation_notes": False,
    }

    meta = frappe.get_meta("Account")
    for field in meta.fields:
        if field.fieldname in custom_fields:
            custom_fields[field.fieldname] = True

    return custom_fields


@frappe.whitelist()
def import_accounts(accounts_json: str, company: str, abbr: str) -> dict:
    """
    Import accounts directly to database with ALL custom fields.

    This is the main import function that:
    1. Validates company exists
    2. Sorts accounts by hierarchy (parents first)
    3. Creates each account with all fields including custom Thai fields
    4. Returns detailed results

    Args:
        accounts_json: JSON string of account list (mapped from CSV)
        company: Target company name
        abbr: Company abbreviation for ID replacement

    Returns:
        dict: Import results {
            created: list of created account IDs,
            skipped: list of skipped account IDs,
            failed: list of {account, error} for failed accounts,
            total: total count,
            success: bool
        }
    """
    # Parse accounts JSON
    try:
        accounts = json.loads(accounts_json) if isinstance(accounts_json, str) else accounts_json
    except json.JSONDecodeError as e:
        frappe.throw(_("Invalid accounts data: {0}").format(str(e)))

    # Validate company exists
    if not frappe.db.exists("Company", company):
        frappe.throw(_("Company '{0}' does not exist").format(company))

    # Get company abbr if not provided
    if not abbr:
        abbr = frappe.get_cached_value("Company", company, "abbr")

    # Check custom fields availability
    available_fields = _check_custom_fields_exist()

    # Sort accounts by hierarchy
    sorted_accounts = _sort_accounts_by_hierarchy(accounts)

    # Results tracking
    results = {
        "created": [],
        "skipped": [],
        "failed": [],
        "total": len(sorted_accounts),
        "success": True,
        "custom_fields_available": available_fields
    }

    # Import accounts
    for i, account in enumerate(sorted_accounts):
        result = _create_single_account(account, company, abbr, available_fields)

        if result["status"] == "created":
            results["created"].append(result["account"])
        elif result["status"] == "skipped":
            results["skipped"].append(result["account"])
        else:
            results["failed"].append({
                "account": result["account"],
                "error": result["message"]
            })

        # Commit every 50 accounts to avoid transaction issues
        if (i + 1) % 50 == 0:
            frappe.db.commit()

    # Final commit
    frappe.db.commit()

    # Set overall success status
    results["success"] = len(results["failed"]) == 0

    return results


@frappe.whitelist()
def get_import_progress(job_id: str) -> dict:
    """
    Get progress of a long-running import job.

    For future use with background jobs for large imports.

    Args:
        job_id: Background job ID

    Returns:
        dict: Progress information
    """
    # Placeholder for background job progress tracking
    return {
        "status": "not_implemented",
        "message": "Background job progress tracking not yet implemented"
    }


@frappe.whitelist()
def delete_all_accounts(company: str, confirm: bool = False) -> dict:
    """
    Delete all accounts for a company (use with extreme caution).

    This is a utility function for testing/development purposes.
    Requires explicit confirmation.

    Args:
        company: Company name
        confirm: Must be True to proceed

    Returns:
        dict: Deletion result
    """
    if not confirm:
        frappe.throw(_("Deletion requires explicit confirmation"))

    if not frappe.db.exists("Company", company):
        frappe.throw(_("Company '{0}' does not exist").format(company))

    # Check if user has permission
    if not frappe.has_permission("Account", "delete"):
        frappe.throw(_("You don't have permission to delete accounts"))

    # Get all accounts for company (deepest first)
    accounts = frappe.get_all(
        "Account",
        filters={"company": company},
        fields=["name"],
        order_by="lft desc"
    )

    deleted = 0
    failed = []

    for acc in accounts:
        try:
            frappe.delete_doc("Account", acc.name, force=True, ignore_permissions=True)
            deleted += 1
        except Exception as e:
            failed.append({"account": acc.name, "error": str(e)})

    frappe.db.commit()

    return {
        "deleted": deleted,
        "failed": failed,
        "total": len(accounts)
    }
