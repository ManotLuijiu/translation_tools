# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
Translation Scheduler Module
Handles automated execution of translation schedules
"""

import frappe
from frappe.utils import now_datetime, get_datetime, add_days
from frappe.utils.background_jobs import enqueue
from datetime import datetime, timedelta


def check_and_run_scheduled_tasks():
    """
    Check all enabled translation schedules and run those that are due.
    This function is called every minute by the cron scheduler.
    """
    try:
        current_time = now_datetime()
        
        # Get all enabled schedules
        schedules = frappe.get_all(
            "Translation Schedule",
            filters={
                "enabled": 1,
                "status": ["in", ["Active", "Error"]]  # Include Error for retry
            },
            fields=["name", "status", "retry_count", "max_retries"]
        )
        
        for schedule in schedules:
            try:
                # Get the full document
                doc = frappe.get_doc("Translation Schedule", schedule.name)
                
                # Check if it should run now
                if doc.should_run_now(current_time):
                    # Check if it's an error retry
                    if doc.status == "Error" and doc.retry_count >= doc.max_retries:
                        # Skip if max retries reached
                        continue
                    
                    # Enqueue the execution as a background job
                    enqueue(
                        execute_scheduled_translation,
                        queue='default',
                        timeout=600,  # 10 minute timeout
                        schedule_name=schedule.name,
                        job_name=f"Translation Schedule: {schedule.name}"
                    )
                    
            except Exception as e:
                frappe.log_error(
                    f"Error checking schedule {schedule.name}: {str(e)}",
                    "Translation Scheduler Error"
                )
                continue
                
    except Exception as e:
        frappe.log_error(
            f"Error in translation scheduler: {str(e)}",
            "Translation Scheduler Critical Error"
        )


def execute_scheduled_translation(schedule_name):
    """
    Execute a scheduled translation command.
    This runs as a background job.
    
    Args:
        schedule_name: Name of the Translation Schedule document
    """
    try:
        # Get the schedule document
        doc = frappe.get_doc("Translation Schedule", schedule_name)
        
        # Execute the command
        result = doc.execute_command()
        
        # Log success
        frappe.logger().info(f"Translation schedule {schedule_name} executed successfully")
        
        return result
        
    except Exception as e:
        frappe.log_error(
            f"Error executing schedule {schedule_name}: {str(e)}",
            f"Translation Schedule Execution Error: {schedule_name}"
        )
        raise


def run_missed_schedules():
    """
    Check for any schedules that might have been missed and run them.
    This is called hourly as a safety net.
    """
    try:
        current_time = now_datetime()
        one_hour_ago = current_time - timedelta(hours=1)
        
        # Find schedules that should have run but didn't
        schedules = frappe.get_all(
            "Translation Schedule",
            filters={
                "enabled": 1,
                "status": "Active",
                "next_run": ["<", current_time],
                "next_run": [">", one_hour_ago]
            },
            fields=["name", "last_run", "next_run"]
        )
        
        for schedule in schedules:
            doc = frappe.get_doc("Translation Schedule", schedule.name)
            
            # Check if it was actually missed (not run since next_run time)
            if not doc.last_run or get_datetime(doc.last_run) < get_datetime(doc.next_run):
                frappe.logger().warning(f"Running missed schedule: {schedule.name}")
                
                enqueue(
                    execute_scheduled_translation,
                    queue='default',
                    timeout=600,
                    schedule_name=schedule.name,
                    job_name=f"Missed Translation Schedule: {schedule.name}"
                )
                
    except Exception as e:
        frappe.log_error(
            f"Error checking missed schedules: {str(e)}",
            "Translation Scheduler Missed Check Error"
        )


def cleanup_old_logs():
    """
    Clean up old execution logs to prevent database bloat.
    Keeps only the last 30 days of logs.
    """
    try:
        thirty_days_ago = add_days(now_datetime(), -30)
        
        # Get schedules with old logs
        schedules = frappe.get_all(
            "Translation Schedule",
            fields=["name", "execution_log"]
        )
        
        for schedule in schedules:
            if schedule.execution_log:
                doc = frappe.get_doc("Translation Schedule", schedule.name)
                
                # Parse and filter log entries
                log_lines = doc.execution_log.split('\n')
                filtered_lines = []
                
                for line in log_lines:
                    # Try to extract date from log line
                    if line.startswith('[') and ']' in line:
                        try:
                            date_str = line[1:line.index(']')]
                            log_date = get_datetime(date_str)
                            
                            if log_date >= thirty_days_ago:
                                filtered_lines.append(line)
                        except:
                            # Keep lines we can't parse
                            filtered_lines.append(line)
                    else:
                        # Keep non-date lines if previous line was kept
                        if filtered_lines:
                            filtered_lines.append(line)
                
                # Update log if changed
                new_log = '\n'.join(filtered_lines)
                if new_log != doc.execution_log:
                    doc.execution_log = new_log
                    doc.save(ignore_permissions=True)
                    
        frappe.db.commit()
        frappe.logger().info("Translation schedule logs cleaned up successfully")
        
    except Exception as e:
        frappe.log_error(
            f"Error cleaning up logs: {str(e)}",
            "Translation Scheduler Cleanup Error"
        )


def run_daily_translation_workflows():
    """
    Run any daily translation workflows.
    This is called once per day.
    """
    try:
        # Get all daily schedules that should run today
        schedules = frappe.get_all(
            "Translation Schedule",
            filters={
                "enabled": 1,
                "schedule_type": "Daily",
                "status": "Active"
            },
            fields=["name"]
        )
        
        frappe.logger().info(f"Daily translation workflow check: {len(schedules)} schedules found")
        
    except Exception as e:
        frappe.log_error(
            f"Error in daily workflow: {str(e)}",
            "Translation Daily Workflow Error"
        )


@frappe.whitelist()
def get_schedule_statistics():
    """
    Get statistics about translation schedules.
    Used for dashboard and monitoring.
    
    Returns:
        dict: Statistics about schedules
    """
    try:
        total = frappe.db.count("Translation Schedule")
        enabled = frappe.db.count("Translation Schedule", filters={"enabled": 1})
        active = frappe.db.count("Translation Schedule", filters={"status": "Active", "enabled": 1})
        running = frappe.db.count("Translation Schedule", filters={"status": "Running"})
        error = frappe.db.count("Translation Schedule", filters={"status": "Error"})
        
        # Get next schedule to run
        next_schedule = frappe.db.get_value(
            "Translation Schedule",
            filters={"enabled": 1, "status": "Active", "next_run": ["!=", ""]},
            fieldname=["name", "next_run", "command_type"],
            order_by="next_run asc",
            as_dict=True
        )
        
        return {
            "total": total,
            "enabled": enabled,
            "active": active,
            "running": running,
            "error": error,
            "next_schedule": next_schedule
        }
        
    except Exception as e:
        frappe.log_error(
            f"Error getting schedule statistics: {str(e)}",
            "Translation Schedule Statistics Error"
        )
        return {}


@frappe.whitelist()
def test_schedule_execution(schedule_name):
    """
    Test a schedule execution without affecting its status.
    For debugging purposes.
    
    Args:
        schedule_name: Name of the schedule to test
        
    Returns:
        dict: Test result
    """
    frappe.only_for("System Manager")
    
    try:
        doc = frappe.get_doc("Translation Schedule", schedule_name)
        
        # Build the command but don't execute
        command = doc.build_command()
        
        return {
            "success": True,
            "command": command,
            "would_run": doc.should_run_now(),
            "next_run": doc.next_run,
            "status": doc.status
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }