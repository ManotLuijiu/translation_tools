import frappe
import json
from frappe import _
from frappe.utils import cint
from .common import logger
# from translation_tools.utils.json_logger import get_json_logger

# logger = get_json_logger(console=True)


@frappe.whitelist()
def update_glossary_term_categories():
    """Update categories for existing glossary terms"""
    logger.info("Start update glossary category")

    terms = frappe.get_all(
        "Translation Glossary Term", fields=["name", "source_term"], as_list=False
    )

    # Define categories mapping
    categories = {
        # Business terms
        "Invoice": "Business",
        "Sales Invoice": "Business",
        "Purchase Invoice": "Business",
        "Quotation": "Business",
        "Customer": "Business",
        "Supplier": "Business",
        "Item": "Business",
        "Account": "Business",
        "Journal Entry": "Business",
        "Payment": "Business",
        "Purchase Order": "Business",
        "Sales Order": "Business",
        "Delivery Note": "Business",
        "Receipt": "Business",
        "Sales": "Business",
        "Purchases": "Business",
        "Inventory": "Business",
        "Accounting": "Business",
        "Description": "Business",
        "Quantity": "Business",
        "Unit Price": "Business",
        # Technical terms
        "ERPNext Module": "Technical",
        "CRM": "Technical",
        "All": "Technical",
        "Business": "Technical",
        "Category": "Technical",
        "Context": "Technical",
        "Module": "Technical",
        "Module Name": "Technical",
        # UI terms
        "Loading translation dashboard...": "UI",
        "Print Message": "UI",
        "Priority": "UI",
        "Refresh": "UI",
        "Source Term": "UI",
        "Thai Translation": "UI",
        "Translation Dashboard": "UI",
        # Date/Time terms
        "Date/Time": "Date/Time",
        "Date and Time": "Date/Time",
        "Date": "Date/Time",
        "Time": "Date/Time",
        "Year": "Date/Time",
        "Month": "Date/Time",
        "Day": "Date/Time",
        # Status terms
        "Pending": "Status",
        "Completed": "Status",
        "Cancelled": "Status",
        "Draft": "Status",
        "Submitted": "Status",
        "Paid": "Status",
        "Is Approved": "Status",
        "Is Rejected": "Status",
        "Status": "Status",
    }

    # Statistics
    updated_count = 0

    # Update each term
    for term in terms:
        # Determine category
        category = categories.get(
            term.source_term, "Business"
        )  # Default to Business if not found

        # Update the document
        doc = frappe.get_doc("Translation Glossary Term", term.name)
        if doc.category != category:  # type: ignore
            doc.category = category  # type: ignore
            doc.save()
            updated_count += 1

    frappe.db.commit()
    return {"success": True, "message": f"Updated categories for {updated_count} terms"}


@frappe.whitelist()
def clean_duplicate_glossary_terms():
    """Remove duplicate glossary terms from the database"""
    logger.info("Start delete duplicate glossary")
    terms = frappe.get_all(
        "Translation Glossary Term", fields=["name", "source_term"], as_list=False
    )

    # Track processed terms
    processed_terms = {}
    deleted_count = 0

    for term in terms:
        if term.source_term in processed_terms:
            # This is a duplicate, delete it
            frappe.delete_doc("Translation Glossary Term", term.name)
            deleted_count += 1
        else:
            # First occurrence, mark as processed
            processed_terms[term.source_term] = term.name

    frappe.db.commit()
    return {"success": True, "message": f"Deleted {deleted_count} duplicate terms"}


@frappe.whitelist()
def sync_glossary_from_file():
    """Load glossary from thai_glossary.py and update the database"""
    logger.info("Start sync glossary process")
    try:
        # Import the glossary from file
        from translation_tools.utils.thai_glossary import GLOSSARY

        # Get existing terms from database
        # existing_terms = {term.source_term: term for term in get_glossary_terms()}

        # Get existing terms from database
        existing_terms = frappe.get_all(
            "Translation Glossary Term", fields=["name", "source_term"], as_list=False
        )

        logger.debug(f"existing terms: {existing_terms}")

        # Convert to a dictionary for easier lookup
        existing_terms_dict = {term.source_term: term.name for term in existing_terms}

        # Statistics for report
        stats = {"added": 0, "exists": 0, "errors": 0}

        # Define categories mapping
        categories = {
            # Business terms
            "Invoice": "Business",
            "Sales Invoice": "Business",
            "Purchase Invoice": "Business",
            "Quotation": "Business",
            "Customer": "Business",
            "Supplier": "Business",
            "Item": "Business",
            "Account": "Business",
            "Journal Entry": "Business",
            "Payment": "Business",
            "Purchase Order": "Business",
            "Sales Order": "Business",
            "Delivery Note": "Business",
            "Receipt": "Business",
            "Sales": "Business",
            "Purchases": "Business",
            "Inventory": "Business",
            "Accounting": "Business",
            "Description": "Business",
            "Quantity": "Business",
            "Unit Price": "Business",
            # Technical terms
            "ERPNext Module": "Technical",
            "CRM": "Technical",
            "All": "Technical",
            "Business": "Technical",
            "Category": "Technical",
            "Context": "Technical",
            "Module": "Technical",
            "Module Name": "Technical",
            # UI terms
            "Loading translation dashboard...": "UI",
            "Print Message": "UI",
            "Priority": "UI",
            "Refresh": "UI",
            "Source Term": "UI",
            "Thai Translation": "UI",
            "Translation Dashboard": "UI",
            # Date/Time terms
            "Date/Time": "Date/Time",
            "Date and Time": "Date/Time",
            "Date": "Date/Time",
            "Time": "Date/Time",
            "Year": "Date/Time",
            "Month": "Date/Time",
            "Day": "Date/Time",
            # Status terms
            "Pending": "Status",
            "Completed": "Status",
            "Cancelled": "Status",
            "Draft": "Status",
            "Submitted": "Status",
            "Paid": "Status",
            "Is Approved": "Status",
            "Is Rejected": "Status",
            "Status": "Status",
        }

        # Process each term in the glossary file
        for source_term, thai_translation in GLOSSARY.items():
            try:
                # Skip if term already exists
                if source_term in existing_terms_dict:
                    stats["exists"] += 1
                    continue

                # Determine category
                category = categories.get(
                    source_term, "Business"
                )  # Default to Business if not found

                # Add new term
                doc = frappe.new_doc("Translation Glossary Term")
                doc.source_term = source_term  # type: ignore
                doc.thai_translation = thai_translation  # type: ignore
                doc.is_approved = 1  # type: ignore
                doc.category = category  # type: ignore
                doc.insert()
                stats["added"] += 1

            except Exception as e:
                logger.error(f"Error adding glossary term {source_term}: {str(e)}")
                stats["errors"] += 1

        frappe.db.commit()

        # Log the stats but return the actual terms
        logger.info(
            f"Sync complete: {stats['added']} terms added, {stats['exists']} already exist, {stats['errors']} errors"
        )

        # Return the actual glossary terms directly
        return get_glossary_terms()

    except ImportError:
        logger.error("Could not import GLOSSARY from thai_glossary.py file")
        # Return empty array to avoid frontend errors
        return []
    except Exception as e:
        logger.error(f"Error syncing glossary: {str(e)}")
        return []


@frappe.whitelist()
def get_glossary_terms():
    """Get all glossary terms"""
    logger.info("Start get_glossary_terms")
    return frappe.get_all(
        "Translation Glossary Term",
        fields=[
            "name",
            "source_term",
            "thai_translation",
            "context",
            "category",
            "module",
            "is_approved",
        ],
        order_by="source_term",
    )


def get_glossary_terms_dict():
    """Get glossary terms as a dictionary for AI context"""
    terms = get_glossary_terms()
    return {
        term.source_term: term.thai_translation for term in terms if term.is_approved
    }


@frappe.whitelist()
def add_glossary_term(term):
    """Add a new glossary term"""
    term_data = (
        frappe._dict(term) if isinstance(term, dict) else frappe._dict(json.loads(term))
    )

    doc = frappe.new_doc("Translation Glossary Term")
    doc.source_term = term_data.source_term  # type: ignore
    doc.thai_translation = term_data.thai_translation  # type: ignore

    if term_data.context:
        doc.context = term_data.context  # type: ignore

    if term_data.category:
        doc.category = term_data.category  # type: ignore

    if term_data.module:
        doc.module = term_data.module  # type: ignore

    doc.is_approved = cint(term_data.is_approved)  # type: ignore

    doc.insert()
    frappe.db.commit()

    return {"success": True, "name": doc.name}


@frappe.whitelist()
def update_glossary_term(term_name, updates):
    """Update a glossary term"""
    updates_data = (
        frappe._dict(updates)
        if isinstance(updates, dict)
        else frappe._dict(json.loads(updates))
    )

    doc = frappe.get_doc("Translation Glossary Term", term_name)

    # Update fields
    if "source_term" in updates_data:
        doc.source_term = updates_data.source_term  # type: ignore

    if "thai_translation" in updates_data:
        doc.thai_translation = updates_data.thai_translation  # type: ignore

    if "context" in updates_data:
        doc.context = updates_data.context  # type: ignore

    if "category" in updates_data:
        doc.category = updates_data.category  # type: ignore

    if "module" in updates_data:
        doc.module = updates_data.module  # type: ignore

    if "is_approved" in updates_data:
        doc.is_approved = cint(updates_data.is_approved)  # type: ignore

    doc.save()
    frappe.db.commit()

    return {"success": True}


@frappe.whitelist()
def delete_glossary_term(term_name):
    """Delete a glossary term"""
    frappe.delete_doc("Translation Glossary Term", term_name)
    frappe.db.commit()

    return {"success": True}


@frappe.whitelist()
def get_erpnext_modules():
    """Get all ERPNext modules"""
    return frappe.get_all(
        "ERPNext Module",
        fields=["name", "module_name", "description"],
        order_by="module_name",
    )
