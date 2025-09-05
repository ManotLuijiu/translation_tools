# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
import unittest
from frappe.utils import now_datetime, add_days, get_datetime
from datetime import datetime, timedelta


class TestTranslationSchedule(unittest.TestCase):
    def setUp(self):
        """Set up test data"""
        self.test_schedule_name = "Test Daily Schedule"
        
        # Clean up any existing test schedules
        existing = frappe.get_all("Translation Schedule", 
                                 filters={"schedule_name": self.test_schedule_name})
        for schedule in existing:
            frappe.delete_doc("Translation Schedule", schedule.name, force=True)
    
    def tearDown(self):
        """Clean up test data"""
        existing = frappe.get_all("Translation Schedule", 
                                 filters={"schedule_name": self.test_schedule_name})
        for schedule in existing:
            frappe.delete_doc("Translation Schedule", schedule.name, force=True)
    
    def test_schedule_creation(self):
        """Test creating a translation schedule"""
        schedule = frappe.get_doc({
            "doctype": "Translation Schedule",
            "schedule_name": self.test_schedule_name,
            "command_type": "generate_pot",
            "app_name": "translation_tools",
            "locale": "th",
            "schedule_type": "Daily",
            "time": "02:00:00",
            "enabled": 1
        })
        schedule.insert()
        
        # Verify the schedule was created
        self.assertTrue(schedule.name)
        self.assertEqual(schedule.status, "Active")
        self.assertTrue(schedule.next_run)
        
        # Verify next_run is calculated correctly
        expected_time = get_datetime(f"{(now_datetime() + timedelta(days=1)).date()} 02:00:00")
        actual_time = get_datetime(schedule.next_run)
        
        # Allow some tolerance for execution time
        time_diff = abs((actual_time - expected_time).total_seconds())
        self.assertLess(time_diff, 60)  # Within 1 minute
    
    def test_schedule_validation(self):
        """Test schedule validation"""
        # Test missing time for daily schedule
        with self.assertRaises(frappe.exceptions.ValidationError):
            schedule = frappe.get_doc({
                "doctype": "Translation Schedule",
                "schedule_name": "Invalid Schedule",
                "command_type": "generate_pot",
                "app_name": "translation_tools",
                "schedule_type": "Daily",
                "enabled": 1
                # Missing time field
            })
            schedule.insert()
    
    def test_weekly_schedule_calculation(self):
        """Test weekly schedule next run calculation"""
        schedule = frappe.get_doc({
            "doctype": "Translation Schedule",
            "schedule_name": "Test Weekly Schedule",
            "command_type": "update_po",
            "app_name": "translation_tools",
            "locale": "th",
            "schedule_type": "Weekly",
            "weekday": "Monday",
            "time": "03:00:00",
            "enabled": 1
        })
        schedule.insert()
        
        # Verify next_run is calculated for next Monday
        self.assertTrue(schedule.next_run)
        next_run = get_datetime(schedule.next_run)
        self.assertEqual(next_run.weekday(), 0)  # Monday is 0
        self.assertEqual(next_run.hour, 3)
        self.assertEqual(next_run.minute, 0)
        
        # Clean up
        frappe.delete_doc("Translation Schedule", schedule.name, force=True)
    
    def test_cron_schedule_validation(self):
        """Test cron schedule validation"""
        # This test requires croniter library
        try:
            from croniter import croniter
            
            schedule = frappe.get_doc({
                "doctype": "Translation Schedule",
                "schedule_name": "Test Cron Schedule",
                "command_type": "compile_mo",
                "app_name": "translation_tools",
                "schedule_type": "Cron",
                "cron_expression": "0 2 * * *",  # Daily at 2 AM
                "enabled": 1
            })
            schedule.insert()
            
            # Verify next_run is calculated
            self.assertTrue(schedule.next_run)
            
            # Clean up
            frappe.delete_doc("Translation Schedule", schedule.name, force=True)
            
        except ImportError:
            # Skip test if croniter is not installed
            self.skipTest("croniter library not installed")
    
    def test_should_run_now(self):
        """Test the should_run_now method"""
        current_time = now_datetime()
        
        # Create a schedule that should run now
        schedule = frappe.get_doc({
            "doctype": "Translation Schedule",
            "schedule_name": "Test Run Now",
            "command_type": "generate_pot",
            "app_name": "translation_tools",
            "schedule_type": "Once",
            "time": current_time.strftime("%H:%M:%S"),
            "enabled": 1
        })
        schedule.insert()
        
        # Test should_run_now method
        should_run = schedule.should_run_now(current_time + timedelta(seconds=30))
        self.assertTrue(should_run)
        
        # Test that it shouldn't run again after being run
        schedule.last_run = current_time
        schedule.save()
        should_run = schedule.should_run_now(current_time + timedelta(seconds=30))
        self.assertFalse(should_run)
        
        # Clean up
        frappe.delete_doc("Translation Schedule", schedule.name, force=True)
    
    def test_command_building(self):
        """Test command building functionality"""
        schedule = frappe.get_doc({
            "doctype": "Translation Schedule",
            "schedule_name": "Test Command Build",
            "command_type": "update_po",
            "app_name": "translation_tools",
            "locale": "th",
            "schedule_type": "Daily",
            "time": "02:00:00",
            "enabled": 1
        })
        schedule.insert()
        
        # Test command building
        command = schedule.build_command()
        expected = "update-po-files --app translation_tools --locale th"
        self.assertEqual(command, expected)
        
        # Test generate_pot command (no locale)
        schedule.command_type = "generate_pot"
        command = schedule.build_command()
        expected = "generate-pot-file --app translation_tools"
        self.assertEqual(command, expected)
        
        # Clean up
        frappe.delete_doc("Translation Schedule", schedule.name, force=True)
    
    def test_schedule_api_functions(self):
        """Test schedule management API functions"""
        from translation_tools.api.schedule_management import get_schedule_dashboard, get_translation_apps
        
        # Test get_schedule_dashboard
        dashboard_data = get_schedule_dashboard()
        self.assertIn('schedules', dashboard_data)
        self.assertIn('stats', dashboard_data)
        self.assertIsInstance(dashboard_data['schedules'], list)
        
        # Test get_translation_apps
        apps = get_translation_apps()
        self.assertIsInstance(apps, list)
        self.assertIn('translation_tools', apps)


if __name__ == "__main__":
    unittest.main()