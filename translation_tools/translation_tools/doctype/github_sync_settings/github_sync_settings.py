import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, add_to_date, get_datetime
from datetime import datetime

try:
    from croniter import croniter
except ImportError:
    croniter = None


class GitHubSyncSettings(Document):
    def validate(self):
        if self.enabled and not self.repository_url:
            frappe.throw("Repository URL is required when auto sync is enabled")
        
        if self.sync_frequency == "custom" and not self.custom_cron_expression:
            frappe.throw("Custom cron expression is required when sync frequency is set to custom")
        
        if self.custom_cron_expression:
            if croniter is None:
                frappe.throw("croniter package is required for custom cron expressions. Please install it with: pip install croniter")
            try:
                croniter(self.custom_cron_expression)
            except ValueError:
                frappe.throw("Invalid cron expression")
    
    def on_update(self):
        if self.enabled and self.auto_sync_enabled:
            self.schedule_next_sync()
    
    def schedule_next_sync(self):
        if not self.enabled or not self.auto_sync_enabled:
            return
        
        now = now_datetime()
        
        if self.sync_frequency == "hourly":
            next_sync = add_to_date(now, hours=1)
        elif self.sync_frequency == "daily":
            next_sync = add_to_date(now, days=1)
        elif self.sync_frequency == "weekly":
            next_sync = add_to_date(now, weeks=1)
        elif self.sync_frequency == "custom" and self.custom_cron_expression:
            if croniter is None:
                frappe.log_error("croniter package is required for custom cron expressions")
                return
            cron = croniter(self.custom_cron_expression, now)
            next_sync = cron.get_next(datetime)
        else:
            return
        
        self.db_set("next_sync_datetime", next_sync)
    
    def update_sync_status(self, status, changes=None):
        self.db_set("last_sync_datetime", now_datetime())
        self.db_set("last_sync_status", status)
        if changes:
            self.db_set("last_sync_changes", changes)
        
        if status == "Success":
            self.schedule_next_sync()
    
    def is_sync_due(self):
        if not self.enabled or not self.auto_sync_enabled:
            return False
        
        if not self.next_sync_datetime:
            return True
        
        return get_datetime(self.next_sync_datetime) <= now_datetime()
    
    def get_sync_config(self):
        return {
            "repository_url": self.repository_url,
            "branch": self.branch,
            "target_language": self.target_language,
            "conflict_resolution_strategy": self.conflict_resolution_strategy,
            "backup_before_sync": self.backup_before_sync
        }
    
    @frappe.whitelist()
    def trigger_manual_sync(self):
        """Trigger manual sync"""
        if not self.enabled:
            return {"success": False, "error": "Auto sync is not enabled"}
        
        try:
            # Import here to avoid circular imports
            from translation_tools.api.github_sync import trigger_auto_sync
            
            # Trigger sync in background
            frappe.enqueue(
                trigger_auto_sync,
                queue="long",
                timeout=3600
            )
            
            return {"success": True, "message": "Manual sync triggered"}
        except Exception as e:
            frappe.log_error(f"Manual sync error: {str(e)}")
            return {"success": False, "error": str(e)}