# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe


@frappe.whitelist()
def clear_translation_dashboard_cache():
    """
    Clear all caches related to translation dashboard and reports
    """
    try:
        # Clear various cache patterns
        cache_patterns = [
            "*translation*",
            "*dashboard*", 
            "*report*",
            "*po_file*",
            "*translation_status*"
        ]
        
        cleared_count = 0
        for pattern in cache_patterns:
            try:
                keys = frappe.cache().delete_keys(pattern)
                cleared_count += len(keys) if keys else 0
            except:
                pass
        
        # Also clear Redis cache
        try:
            frappe.cache().delete_key("translation_tools_dashboard_data")
            frappe.cache().delete_key("translation_status_report_data")
        except:
            pass
        
        # Force clear browser cache by updating dashboard chart
        try:
            if frappe.db.exists("Dashboard Chart", "Translation Status"):
                chart = frappe.get_doc("Dashboard Chart", "Translation Status")
                chart.modified = frappe.utils.now()
                chart.save()
        except:
            pass
        
        site = frappe.local.site
        installed_apps = frappe.get_installed_apps()
        
        return {
            "success": True,
            "message": f"Translation dashboard cache cleared for site '{site}'",
            "site": site,
            "installed_apps": installed_apps,
            "cleared_keys": cleared_count
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_dashboard_debug_info():
    """
    Get debug information about dashboard data sources
    """
    try:
        site = frappe.local.site
        installed_apps = frappe.get_installed_apps()
        
        # Check if there are any cached values
        cache_info = {}
        cache_patterns = ["*translation*", "*dashboard*", "*report*"]
        
        for pattern in cache_patterns:
            try:
                keys = frappe.cache().get_keys(pattern)
                cache_info[pattern] = len(keys) if keys else 0
            except:
                cache_info[pattern] = "error"
        
        # Check database for Translation Tools related data
        try:
            po_files_count = frappe.db.count("PO File")
        except:
            po_files_count = "table not exists"
        
        return {
            "site": site,
            "installed_apps": installed_apps,
            "total_installed_apps": len(installed_apps),
            "cache_info": cache_info,
            "po_files_in_db": po_files_count,
            "debug_timestamp": frappe.utils.now()
        }
        
    except Exception as e:
        return {
            "error": str(e)
        }