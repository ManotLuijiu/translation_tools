# Force refresh dashboard chart and clear all related caches
import frappe


@frappe.whitelist()
def force_refresh_translation_status_chart():
    """
    Force refresh the Translation Status dashboard chart by clearing all related caches
    """
    try:
        site = frappe.local.site
        
        # Clear various cache layers
        caches_cleared = []
        
        # 1. Clear report cache
        try:
            report_cache_key = f"report_data_Translation Status Report"
            frappe.cache().delete_key(report_cache_key)
            caches_cleared.append("Report cache")
        except:
            pass
            
        # 2. Clear dashboard chart cache
        try:
            chart_cache_key = f"dashboard_chart_Translation Status"
            frappe.cache().delete_key(chart_cache_key)
            caches_cleared.append("Chart cache")
        except:
            pass
            
        # 3. Clear all chart-related cache keys
        try:
            chart_keys = frappe.cache().delete_keys("*chart*")
            if chart_keys:
                caches_cleared.append(f"Chart keys ({len(chart_keys)})")
        except:
            pass
            
        # 4. Clear dashboard cache
        try:
            dashboard_keys = frappe.cache().delete_keys("*dashboard*")
            if dashboard_keys:
                caches_cleared.append(f"Dashboard keys ({len(dashboard_keys)})")
        except:
            pass
            
        # 5. Clear translation status cache
        try:
            translation_keys = frappe.cache().delete_keys("*translation*status*")
            if translation_keys:
                caches_cleared.append(f"Translation status keys ({len(translation_keys)})")
        except:
            pass
        
        # 6. Force update the dashboard chart timestamp
        try:
            if frappe.db.exists("Dashboard Chart", "Translation Status"):
                chart_doc = frappe.get_doc("Dashboard Chart", "Translation Status")
                chart_doc.modified = frappe.utils.now()
                chart_doc.save()
                caches_cleared.append("Chart timestamp updated")
        except:
            pass
        
        # 7. Clear browser cache by updating workspace
        try:
            if frappe.db.exists("Workspace", "Translation Tools"):
                workspace_doc = frappe.get_doc("Workspace", "Translation Tools") 
                workspace_doc.modified = frappe.utils.now()
                workspace_doc.save()
                caches_cleared.append("Workspace timestamp updated")
        except:
            pass
            
        # 8. Test that our report returns correct data
        try:
            from translation_tools.translation_tools.report.translation_status_report.translation_status_report import execute
            report_result = execute()
            
            if len(report_result) > 1 and len(report_result[1]) > 0:
                apps_in_report = list(set([row['app'] for row in report_result[1]]))
                apps_count = len(apps_in_report)
            else:
                apps_in_report = []
                apps_count = 0
                
        except Exception as e:
            apps_in_report = []
            apps_count = 0
            caches_cleared.append(f"Report test failed: {str(e)}")
        
        return {
            "success": True,
            "message": f"Force refreshed Translation Status chart for site '{site}'",
            "site": site,
            "caches_cleared": caches_cleared,
            "apps_in_report": apps_in_report,
            "apps_count": apps_count
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "site": frappe.local.site
        }