# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
Database Cleanup Utilities
Handles cleanup of duplicate entries and database inconsistencies
"""

import frappe
import logging

logger = logging.getLogger("translation_tools.cleanup")


@frappe.whitelist()
def cleanup_duplicate_po_files():
    """
    Clean up any duplicate PO File entries in the database
    This can happen due to race conditions or previous bugs
    """
    try:
        # Find duplicate entries based on file_path
        duplicates_query = """
        SELECT file_path, COUNT(*) as count 
        FROM `tabPO File` 
        GROUP BY file_path 
        HAVING COUNT(*) > 1
        """
        
        duplicates = frappe.db.sql(duplicates_query, as_dict=True)
        
        if not duplicates:
            return {
                "success": True,
                "message": "No duplicate PO File entries found",
                "cleaned_count": 0
            }
        
        cleaned_count = 0
        total_duplicates = len(duplicates)
        
        logger.info(f"Found {total_duplicates} file_path values with duplicate entries")
        
        for duplicate in duplicates:
            file_path = duplicate["file_path"]
            count = duplicate["count"]
            
            try:
                # Get all entries for this file_path, ordered by creation date
                entries = frappe.get_all(
                    "PO File", 
                    filters={"file_path": file_path},
                    fields=["name", "creation", "modified"],
                    order_by="creation DESC"  # Keep the newest one
                )
                
                if len(entries) > 1:
                    # Keep the first (newest) entry, delete the rest
                    keep_entry = entries[0]
                    delete_entries = entries[1:]
                    
                    logger.info(f"Keeping newest entry {keep_entry['name']} for {file_path}")
                    
                    for entry in delete_entries:
                        try:
                            frappe.delete_doc("PO File", entry["name"], ignore_permissions=True)
                            logger.info(f"Deleted duplicate entry {entry['name']} for {file_path}")
                            cleaned_count += 1
                        except Exception as delete_error:
                            logger.error(f"Failed to delete duplicate {entry['name']}: {str(delete_error)}")
                            
            except Exception as e:
                logger.error(f"Error cleaning duplicates for {file_path}: {str(e)}")
        
        frappe.db.commit()
        
        return {
            "success": True,
            "message": f"Cleaned up {cleaned_count} duplicate PO File entries",
            "cleaned_count": cleaned_count,
            "total_file_paths_with_duplicates": total_duplicates
        }
        
    except Exception as e:
        frappe.db.rollback()
        logger.error(f"Failed to cleanup duplicate PO files: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_po_file_duplicate_status():
    """
    Check for duplicate PO File entries without cleaning them
    """
    try:
        # Count total PO Files
        total_count = frappe.db.count("PO File")
        
        # Find duplicates
        duplicates_query = """
        SELECT file_path, COUNT(*) as count 
        FROM `tabPO File` 
        GROUP BY file_path 
        HAVING COUNT(*) > 1
        """
        
        duplicates = frappe.db.sql(duplicates_query, as_dict=True)
        duplicate_file_paths = len(duplicates)
        total_duplicate_entries = sum(d["count"] - 1 for d in duplicates)  # Subtract 1 because we keep one
        
        return {
            "success": True,
            "total_po_files": total_count,
            "duplicate_file_paths": duplicate_file_paths,
            "total_duplicate_entries": total_duplicate_entries,
            "needs_cleanup": duplicate_file_paths > 0,
            "duplicate_details": duplicates
        }
        
    except Exception as e:
        logger.error(f"Failed to check PO file duplicate status: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist() 
def emergency_fix_po_file_scanning():
    """
    Emergency fix for PO file scanning issues
    This can be called when scanning is completely broken
    """
    try:
        result = {
            "steps": [],
            "success": True
        }
        
        # Step 1: Check for duplicates
        duplicate_status = get_po_file_duplicate_status()
        result["steps"].append({
            "step": "Check duplicates",
            "status": "completed",
            "details": duplicate_status
        })
        
        # Step 2: Clean duplicates if needed
        if duplicate_status.get("needs_cleanup"):
            cleanup_result = cleanup_duplicate_po_files()
            result["steps"].append({
                "step": "Clean duplicates", 
                "status": "completed",
                "details": cleanup_result
            })
        else:
            result["steps"].append({
                "step": "Clean duplicates",
                "status": "skipped", 
                "details": "No duplicates found"
            })
        
        # Step 3: Clear any stuck scans
        frappe.db.sql("DELETE FROM `tabSingleton` WHERE doctype = 'PO File Scan Status'")
        frappe.db.commit()
        result["steps"].append({
            "step": "Clear scan status",
            "status": "completed",
            "details": "Cleared any stuck scanning status"
        })
        
        return {
            "success": True,
            "message": "Emergency fix completed successfully",
            "details": result
        }
        
    except Exception as e:
        frappe.db.rollback()
        logger.error(f"Emergency fix failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }