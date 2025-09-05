import unittest
import frappe
from frappe.utils import now_datetime, add_to_date


class TestGitHubSyncSettings(unittest.TestCase):
    def setUp(self):
        self.doc = frappe.get_doc({
            "doctype": "GitHub Sync Settings",
            "enabled": 1,
            "repository_url": "https://github.com/test/repo.git",
            "branch": "main",
            "target_language": "th",
            "sync_frequency": "daily",
            "auto_sync_enabled": 1
        })
    
    def test_validation(self):
        # Test missing repository URL
        doc = frappe.get_doc({
            "doctype": "GitHub Sync Settings",
            "enabled": 1
        })
        with self.assertRaises(frappe.ValidationError):
            doc.validate()
    
    def test_custom_cron_validation(self):
        # Test invalid cron expression
        self.doc.sync_frequency = "custom"
        self.doc.custom_cron_expression = "invalid cron"
        with self.assertRaises(frappe.ValidationError):
            self.doc.validate()
        
        # Test valid cron expression
        self.doc.custom_cron_expression = "0 2 * * *"
        self.doc.validate()  # Should not raise exception
    
    def test_schedule_next_sync(self):
        self.doc.schedule_next_sync()
        self.assertIsNotNone(self.doc.next_sync_datetime)
    
    def test_is_sync_due(self):
        # Test with no next sync time
        self.doc.next_sync_datetime = None
        self.assertTrue(self.doc.is_sync_due())
        
        # Test with future sync time
        self.doc.next_sync_datetime = add_to_date(now_datetime(), hours=1)
        self.assertFalse(self.doc.is_sync_due())
        
        # Test with past sync time
        self.doc.next_sync_datetime = add_to_date(now_datetime(), hours=-1)
        self.assertTrue(self.doc.is_sync_due())