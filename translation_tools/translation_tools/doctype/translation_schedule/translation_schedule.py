# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, get_datetime, add_days, add_to_date, cint
from datetime import datetime, timedelta
import subprocess
import os


class TranslationSchedule(Document):
    def validate(self):
        """Validate the translation schedule configuration"""
        self.validate_schedule_configuration()
        self.calculate_next_run()
        
    def validate_schedule_configuration(self):
        """Validate that required fields are set based on schedule type"""
        if self.schedule_type in ["Daily", "Weekly", "Once"] and not self.time:
            frappe.throw(f"Time is required for {self.schedule_type} schedule type")
            
        if self.schedule_type == "Weekly" and not self.weekday:
            frappe.throw("Weekday is required for Weekly schedule type")
            
        if self.schedule_type == "Monthly" and not self.day_of_month:
            frappe.throw("Day of Month is required for Monthly schedule type")
            
        if self.schedule_type == "Cron" and not self.cron_expression:
            frappe.throw("Cron Expression is required for Cron schedule type")
            
        if self.day_of_month and (self.day_of_month < 1 or self.day_of_month > 31):
            frappe.throw("Day of Month must be between 1 and 31")
    
    def calculate_next_run(self):
        """Calculate the next run time based on schedule configuration"""
        if not self.enabled:
            self.next_run = None
            return
            
        current_time = now_datetime()
        
        if self.schedule_type == "Once":
            if self.time:
                scheduled_time = get_datetime(f"{current_time.date()} {self.time}")
                if scheduled_time > current_time:
                    self.next_run = scheduled_time
                elif not self.last_run:
                    # If time has passed today and never run, schedule for tomorrow
                    self.next_run = add_days(scheduled_time, 1)
                    
        elif self.schedule_type == "Daily":
            if self.time:
                scheduled_time = get_datetime(f"{current_time.date()} {self.time}")
                if scheduled_time > current_time:
                    self.next_run = scheduled_time
                else:
                    self.next_run = add_days(scheduled_time, 1)
                    
        elif self.schedule_type == "Weekly":
            self.next_run = self.get_next_weekly_run(current_time)
            
        elif self.schedule_type == "Monthly":
            self.next_run = self.get_next_monthly_run(current_time)
            
        elif self.schedule_type == "Cron":
            self.next_run = self.get_next_cron_run(current_time)
    
    def get_next_weekly_run(self, current_time):
        """Calculate next weekly run time"""
        if not self.weekday or not self.time:
            return None
            
        weekday_map = {
            "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
            "Friday": 4, "Saturday": 5, "Sunday": 6
        }
        
        target_weekday = weekday_map.get(self.weekday)
        if target_weekday is None:
            return None
            
        current_weekday = current_time.weekday()
        days_ahead = target_weekday - current_weekday
        
        if days_ahead < 0:  # Target day already happened this week
            days_ahead += 7
        elif days_ahead == 0:  # Same day
            scheduled_time = get_datetime(f"{current_time.date()} {self.time}")
            if scheduled_time <= current_time:
                days_ahead = 7  # Schedule for next week
                
        next_date = add_days(current_time.date(), days_ahead)
        return get_datetime(f"{next_date} {self.time}")
    
    def get_next_monthly_run(self, current_time):
        """Calculate next monthly run time"""
        if not self.day_of_month:
            return None
            
        try:
            # Try to create date with current month
            next_date = current_time.replace(day=self.day_of_month)
            
            # If date has passed this month, move to next month
            if next_date <= current_time:
                if current_time.month == 12:
                    next_date = next_date.replace(year=current_time.year + 1, month=1)
                else:
                    next_date = next_date.replace(month=current_time.month + 1)
                    
            if self.time:
                next_date = get_datetime(f"{next_date.date()} {self.time}")
                
            return next_date
            
        except ValueError:
            # Handle invalid dates like Feb 31
            # Move to next valid month
            next_month = current_time.month + 1
            next_year = current_time.year
            
            if next_month > 12:
                next_month = 1
                next_year += 1
                
            # Find the next valid date
            while True:
                try:
                    next_date = datetime(next_year, next_month, self.day_of_month)
                    if self.time:
                        next_date = get_datetime(f"{next_date.date()} {self.time}")
                    return next_date
                except ValueError:
                    next_month += 1
                    if next_month > 12:
                        next_month = 1
                        next_year += 1
    
    def get_next_cron_run(self, current_time):
        """Calculate next run time from cron expression"""
        if not self.cron_expression:
            return None
            
        try:
            from croniter import croniter
            
            base_time = self.last_run or current_time
            cron = croniter(self.cron_expression, base_time)
            next_run = cron.get_next(datetime)
            
            # Ensure next run is in the future
            if next_run <= current_time:
                cron = croniter(self.cron_expression, current_time)
                next_run = cron.get_next(datetime)
                
            return next_run
            
        except ImportError:
            frappe.throw("croniter library is required for Cron schedules. Please install it using: pip install croniter")
        except Exception as e:
            frappe.throw(f"Invalid cron expression: {str(e)}")
    
    def should_run_now(self, current_time=None):
        """Check if the schedule should run now"""
        if not self.enabled or self.status != "Active":
            return False
            
        if not current_time:
            current_time = now_datetime()
            
        # Check if already run recently (within 1 minute)
        if self.last_run:
            time_since_last_run = (current_time - get_datetime(self.last_run)).total_seconds()
            if time_since_last_run < 60:
                return False
        
        if self.schedule_type == "Once":
            # Run once if not already run
            if not self.last_run and self.next_run:
                return abs((current_time - get_datetime(self.next_run)).total_seconds()) < 60
                
        elif self.next_run:
            # Check if within execution window (1 minute tolerance)
            time_diff = abs((current_time - get_datetime(self.next_run)).total_seconds())
            return time_diff < 60
            
        return False
    
    def execute_command(self):
        """Execute the translation command"""
        if self.status == "Running":
            frappe.throw("Schedule is already running")
            
        self.status = "Running"
        self.save(ignore_permissions=True)
        frappe.db.commit()
        
        try:
            # Build the bench command
            command = self.build_command()
            
            # Execute the command
            result = self.run_bench_command(command)
            
            # Update schedule record
            self.last_run = now_datetime()
            self.status = "Active"
            self.retry_count = 0
            
            # Add to log
            log_entry = f"\n[{now_datetime()}] SUCCESS\nCommand: {command}\n{result}\n"
            self.execution_log = (log_entry + (self.execution_log or ""))[:10000]  # Keep last 10000 chars
            
            # Calculate next run
            self.calculate_next_run()
            
            self.save(ignore_permissions=True)
            frappe.db.commit()
            
            return result
            
        except Exception as e:
            return self.handle_execution_error(e, command)
    
    def build_command(self):
        """Build the bench command based on configuration"""
        command_map = {
            "generate_pot": f"generate-pot-file --app {self.app_name}",
            "update_po": f"update-po-files --app {self.app_name}",
            "compile_mo": f"compile-po-to-mo --app {self.app_name}",
            "migrate_csv_to_po": f"migrate-csv-to-po --app {self.app_name}",
            "full_workflow": None  # Special handling
        }
        
        base_command = command_map.get(self.command_type)
        
        if self.command_type == "full_workflow":
            # Will be handled separately
            return "full_workflow"
            
        if not base_command:
            frappe.throw(f"Unknown command type: {self.command_type}")
            
        # Add locale if specified and not "all"
        if self.locale and self.locale != "all" and self.command_type != "generate_pot":
            base_command += f" --locale {self.locale}"
            
        return base_command
    
    def run_bench_command(self, command):
        """Execute a bench command and return the result"""
        if command == "full_workflow":
            return self.run_full_workflow()
            
        # Get the bench path
        bench_path = frappe.utils.get_bench_path()
        
        # Build full command
        full_command = f"cd {bench_path} && bench {command}"
        
        # Execute the command
        try:
            result = subprocess.run(
                full_command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout
                raise Exception(f"Command failed: {error_msg}")
                
            return result.stdout
            
        except subprocess.TimeoutExpired:
            raise Exception("Command timed out after 5 minutes")
        except Exception as e:
            raise Exception(f"Command execution failed: {str(e)}")
    
    def run_full_workflow(self):
        """Run the complete translation workflow"""
        results = []
        
        try:
            # Step 1: Generate POT
            result = self.run_bench_command(f"generate-pot-file --app {self.app_name}")
            results.append(f"POT Generation: Success\n{result}")
            
            # Step 2: Update PO files
            locale_part = f"--locale {self.locale}" if self.locale and self.locale != "all" else ""
            result = self.run_bench_command(f"update-po-files --app {self.app_name} {locale_part}")
            results.append(f"PO Update: Success\n{result}")
            
            # Step 3: Compile MO files
            result = self.run_bench_command(f"compile-po-to-mo --app {self.app_name} {locale_part}")
            results.append(f"MO Compilation: Success\n{result}")
            
            return "\n\n".join(results)
            
        except Exception as e:
            results.append(f"Error: {str(e)}")
            raise Exception("\n\n".join(results))
    
    def handle_execution_error(self, error, command):
        """Handle errors during command execution"""
        self.retry_count = (self.retry_count or 0) + 1
        
        if self.retry_count < self.max_retries:
            self.status = "Error"
            # Will retry on next schedule check
        else:
            self.status = "Error"
            # Max retries reached, needs manual intervention
            
        # Add to log
        log_entry = f"\n[{now_datetime()}] ERROR (Retry {self.retry_count}/{self.max_retries})\nCommand: {command}\n{str(error)}\n"
        self.execution_log = (log_entry + (self.execution_log or ""))[:10000]
        
        self.save(ignore_permissions=True)
        frappe.db.commit()
        
        # Send notification if max retries reached
        if self.retry_count >= self.max_retries:
            frappe.publish_realtime(
                "translation_schedule_error",
                {"schedule": self.name, "error": str(error)},
                user=frappe.session.user
            )
            
        raise error
    
    @frappe.whitelist()
    def run_now(self):
        """Manually trigger the schedule to run now"""
        frappe.only_for("System Manager", "Translation Manager")
        
        try:
            result = self.execute_command()
            frappe.msgprint(f"Translation command executed successfully", indicator="green", alert=True)
            return result
        except Exception as e:
            frappe.throw(str(e))
    
    @frappe.whitelist()
    def reset_status(self):
        """Reset the schedule status"""
        frappe.only_for("System Manager")
        
        self.status = "Active"
        self.retry_count = 0
        self.save(ignore_permissions=True)
        frappe.msgprint("Schedule status reset", indicator="green")
    
    @frappe.whitelist()
    def clear_log(self):
        """Clear the execution log"""
        frappe.only_for("System Manager")
        
        self.execution_log = ""
        self.save(ignore_permissions=True)
        frappe.msgprint("Execution log cleared", indicator="green")