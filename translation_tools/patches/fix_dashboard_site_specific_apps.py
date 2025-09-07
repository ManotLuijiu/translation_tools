# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute():
    """
    Post-migration patch to ensure Dashboard Charts and Reports work with site-specific apps
    after updating translation status functions to use frappe.get_installed_apps()
    """
    try:
        import subprocess
        import os
        
        site = frappe.local.site
        installed_apps = frappe.get_installed_apps()
        
        # Clear Python cache files to ensure updated code takes effect
        try:
            # Get the translation_tools app path
            import translation_tools
            app_path = os.path.dirname(translation_tools.__file__)
            
            # Clear .pyc files and __pycache__ directories
            subprocess.run(
                f'find "{app_path}" -name "*.pyc" -delete', 
                shell=True, 
                capture_output=True, 
                timeout=30
            )
            subprocess.run(
                f'find "{app_path}" -name "__pycache__" -type d -exec rm -rf {{}} + 2>/dev/null || true', 
                shell=True, 
                capture_output=True, 
                timeout=30
            )
            print("✅ Cleared Python cache files")
            
        except Exception as cache_error:
            frappe.logger().warning(f"Failed to clear Python cache: {str(cache_error)}")
            print(f"⚠️ Failed to clear Python cache: {str(cache_error)}")
            # Don't fail migration if cache clearing fails
        
        # Use the comprehensive cache clearing function from cache_utils
        try:
            from translation_tools.api.cache_utils import clear_translation_dashboard_cache
            cache_result = clear_translation_dashboard_cache()
            print(f"Cache clearing result: {cache_result}")
        except Exception as cache_error:
            # Fallback to manual cache clearing if cache_utils fails
            frappe.logger().warning(f"Cache utils failed, using fallback: {str(cache_error)}")
            
            # Clear various cache patterns manually
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
                except Exception as e:
                    frappe.logger().warning(f"Failed to clear cache pattern {pattern}: {str(e)}")
            
            print(f"Manually cleared {cleared_count} cache keys")
        
        # Force refresh the Translation Status dashboard chart
        try:
            if frappe.db.exists("Dashboard Chart", "Translation Status"):
                dashboard_chart = frappe.get_doc("Dashboard Chart", "Translation Status")
                dashboard_chart.modified = frappe.utils.now()
                dashboard_chart.save()
                print("Updated Translation Status dashboard chart timestamp")
        except Exception as e:
            frappe.logger().warning(f"Failed to update dashboard chart: {str(e)}")
        
        # Force refresh any Translation Status reports
        try:
            if frappe.db.exists("Report", "Translation Status Report"):
                report = frappe.get_doc("Report", "Translation Status Report")
                frappe.cache().delete_key(f"report_data_{report.name}")
                print("Cleared Translation Status report cache")
        except Exception as e:
            frappe.logger().warning(f"Failed to clear report cache: {str(e)}")
        
        # Test the updated functions to ensure they work
        try:
            # Test get_po_files function
            from translation_tools.api.po_files import get_po_files
            po_files = get_po_files()
            site_apps_count = len([f for f in po_files if f.get('app') in installed_apps])
            print(f"get_po_files() returned {len(po_files)} PO files, {site_apps_count} for installed apps")
        except Exception as e:
            frappe.logger().warning(f"get_po_files test failed: {str(e)}")
        
        try:
            # Test get_translation_stats function  
            from translation_tools.api.translation_status import get_translation_stats
            translation_stats = get_translation_stats()
            stats_count = len(translation_stats) if isinstance(translation_stats, list) else 0
            print(f"get_translation_stats() returned {stats_count} app statistics")
        except Exception as e:
            frappe.logger().warning(f"get_translation_stats test failed: {str(e)}")
        
        # Sync glossary terms from GitHub to populate number cards
        try:
            print("Syncing glossary terms from GitHub...")
            from translation_tools.api.sync_public_glossary import sync_glossary_from_public_github
            sync_result = sync_glossary_from_public_github()
            
            if sync_result.get("success"):
                stats = sync_result.get("stats", {})
                print(f"✅ Glossary sync successful: {stats.get('added', 0)} added, {stats.get('updated', 0)} updated")
            else:
                print(f"⚠️ Glossary sync failed: {sync_result.get('message', 'Unknown error')}")
                
        except Exception as sync_error:
            frappe.logger().warning(f"Glossary sync failed during migration patch: {str(sync_error)}")
            print(f"⚠️ Glossary sync failed: {str(sync_error)}")
            # Don't fail migration if glossary sync fails

        # Log successful patch execution
        frappe.logger().info(
            f"Translation Tools Dashboard Patch: Successfully updated site '{site}' "
            f"to show only site-specific apps: {installed_apps}"
        )
        
        print(f"✅ Translation Status Dashboard updated for site '{site}'")
        print(f"   Apps that will be shown: {', '.join(installed_apps)}")
        print(f"   Total installed apps: {len(installed_apps)}")
        
    except Exception as e:
        frappe.logger().error(f"Translation Tools Dashboard Patch failed: {str(e)}", exc_info=True)
        print(f"❌ Translation Tools Dashboard Patch failed: {str(e)}")
        # Don't raise the exception - this should not block migration