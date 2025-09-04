# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

"""
Schedule Management API
Provides endpoints for managing translation schedules
"""

import frappe
from frappe import _
from frappe.utils import now_datetime, get_datetime, add_days
from frappe.utils.background_jobs import enqueue
from datetime import datetime, timedelta


@frappe.whitelist()
def get_schedule_dashboard():
    """
    Get dashboard data for translation schedules.
    
    Returns:
        dict: Dashboard data with schedules and statistics
    """
    try:
        # Get all schedules with key fields
        schedules = frappe.db.sql("""
            SELECT 
                name,
                schedule_name,
                command_type,
                app_name,
                locale,
                schedule_type,
                time,
                last_run,
                next_run,
                status,
                enabled,
                retry_count,
                max_retries
            FROM `tabTranslation Schedule`
            ORDER BY 
                CASE 
                    WHEN enabled = 1 AND status = 'Active' AND next_run IS NOT NULL THEN next_run
                    ELSE '9999-12-31 23:59:59'
                END ASC,
                schedule_name ASC
        """, as_dict=True)
        
        # Calculate statistics
        total = len(schedules)
        enabled = len([s for s in schedules if s.enabled])
        active = len([s for s in schedules if s.enabled and s.status == 'Active'])
        running = len([s for s in schedules if s.status == 'Running'])
        error = len([s for s in schedules if s.status == 'Error'])
        
        # Get next schedule to run
        next_schedule = None
        current_time = now_datetime()
        
        for schedule in schedules:
            if (schedule.enabled and schedule.status == 'Active' and 
                schedule.next_run and get_datetime(schedule.next_run) > current_time):
                next_schedule = {
                    'name': schedule.name,
                    'schedule_name': schedule.schedule_name,
                    'next_run': schedule.next_run,
                    'command_type': schedule.command_type,
                    'time_until': str(get_datetime(schedule.next_run) - current_time)
                }
                break
        
        return {
            'schedules': schedules,
            'stats': {
                'total': total,
                'enabled': enabled,
                'active': active,
                'running': running,
                'error': error
            },
            'next_schedule': next_schedule
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting schedule dashboard: {str(e)}")
        return {
            'schedules': [],
            'stats': {'total': 0, 'enabled': 0, 'active': 0, 'running': 0, 'error': 0},
            'next_schedule': None
        }


@frappe.whitelist()
def create_schedule(schedule_data):
    """
    Create a new translation schedule.
    
    Args:
        schedule_data: Dictionary containing schedule configuration
        
    Returns:
        dict: Result with created schedule name or error
    """
    frappe.only_for("System Manager", "Translation Manager")
    
    try:
        # Validate required fields
        required_fields = ['schedule_name', 'command_type', 'schedule_type']
        for field in required_fields:
            if not schedule_data.get(field):
                frappe.throw(f"Required field '{field}' is missing")
        
        # Create the schedule document
        doc = frappe.get_doc({
            'doctype': 'Translation Schedule',
            **schedule_data
        })
        doc.insert()
        
        return {
            'success': True,
            'name': doc.name,
            'message': f'Translation schedule "{doc.schedule_name}" created successfully'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def run_schedule_now(schedule_name):
    """
    Manually trigger a schedule to run immediately.
    
    Args:
        schedule_name: Name of the Translation Schedule document
        
    Returns:
        dict: Result of the execution
    """
    frappe.only_for("System Manager", "Translation Manager")
    
    try:
        doc = frappe.get_doc("Translation Schedule", schedule_name)
        result = doc.run_now()
        
        return {
            'success': True,
            'message': 'Translation command executed successfully',
            'result': result
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def toggle_schedule(schedule_name, enabled):
    """
    Enable or disable a translation schedule.
    
    Args:
        schedule_name: Name of the Translation Schedule document
        enabled: Boolean to enable/disable the schedule
        
    Returns:
        dict: Result of the operation
    """
    frappe.only_for("System Manager", "Translation Manager")
    
    try:
        doc = frappe.get_doc("Translation Schedule", schedule_name)
        doc.enabled = int(enabled)
        
        if doc.enabled:
            doc.status = "Active"
            doc.calculate_next_run()
        else:
            doc.next_run = None
            
        doc.save()
        
        status = "enabled" if doc.enabled else "disabled"
        return {
            'success': True,
            'message': f'Schedule "{doc.schedule_name}" {status} successfully'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def reset_schedule_status(schedule_name):
    """
    Reset a schedule's status (useful for error recovery).
    
    Args:
        schedule_name: Name of the Translation Schedule document
        
    Returns:
        dict: Result of the operation
    """
    frappe.only_for("System Manager")
    
    try:
        doc = frappe.get_doc("Translation Schedule", schedule_name)
        doc.reset_status()
        
        return {
            'success': True,
            'message': f'Schedule "{doc.schedule_name}" status reset successfully'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def get_schedule_logs(schedule_name, limit=50):
    """
    Get execution logs for a specific schedule.
    
    Args:
        schedule_name: Name of the Translation Schedule document
        limit: Maximum number of log entries to return
        
    Returns:
        dict: Log entries and metadata
    """
    try:
        doc = frappe.get_doc("Translation Schedule", schedule_name)
        
        if not doc.execution_log:
            return {
                'logs': [],
                'total_entries': 0
            }
        
        # Parse log entries (assuming they're separated by newlines with timestamps)
        log_lines = doc.execution_log.split('\n')
        entries = []
        current_entry = None
        
        for line in log_lines:
            if line.startswith('[') and ']' in line:
                # Start of a new log entry
                if current_entry:
                    entries.append(current_entry)
                
                try:
                    # Extract timestamp and status
                    end_bracket = line.index(']')
                    timestamp = line[1:end_bracket]
                    rest = line[end_bracket + 1:].strip()
                    
                    # Determine status from the line
                    if 'SUCCESS' in rest:
                        status = 'success'
                    elif 'ERROR' in rest:
                        status = 'error'
                    else:
                        status = 'info'
                    
                    current_entry = {
                        'timestamp': timestamp,
                        'status': status,
                        'message': rest,
                        'details': []
                    }
                except:
                    # If parsing fails, treat as a regular line
                    if current_entry:
                        current_entry['details'].append(line)
            else:
                # Continuation of current entry
                if current_entry:
                    current_entry['details'].append(line)
        
        # Add the last entry
        if current_entry:
            entries.append(current_entry)
        
        # Reverse to get newest first and limit
        entries = entries[::-1][:limit]
        
        return {
            'logs': entries,
            'total_entries': len(entries),
            'schedule_name': doc.schedule_name
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting schedule logs: {str(e)}")
        return {
            'logs': [],
            'total_entries': 0,
            'error': str(e)
        }


@frappe.whitelist()
def preview_cron_schedule(cron_expression, count=5):
    """
    Preview the next few runs for a cron expression.
    
    Args:
        cron_expression: Cron expression string
        count: Number of future runs to calculate
        
    Returns:
        list: List of datetime strings for next runs
    """
    try:
        from croniter import croniter
        
        current_time = now_datetime()
        cron = croniter(cron_expression, current_time)
        
        next_runs = []
        for _ in range(count):
            next_run = cron.get_next(datetime)
            next_runs.append(next_run.strftime('%Y-%m-%d %H:%M:%S'))
        
        return next_runs
        
    except ImportError:
        return ["Error: croniter library not installed"]
    except Exception as e:
        return [f"Error: {str(e)}"]


@frappe.whitelist()
def get_translation_apps():
    """
    Get list of apps that can be used for translation schedules.
    
    Returns:
        list: List of app names
    """
    try:
        # Get installed apps
        from frappe.utils import get_bench_path
        import os
        
        bench_path = get_bench_path()
        apps_path = os.path.join(bench_path, "apps")
        
        apps = []
        if os.path.exists(apps_path):
            for item in os.listdir(apps_path):
                app_path = os.path.join(apps_path, item)
                if os.path.isdir(app_path) and not item.startswith('.'):
                    apps.append(item)
        
        # Sort and ensure common ones are first
        common_apps = ['erpnext', 'frappe', 'translation_tools', 'hrms']
        sorted_apps = []
        
        for app in common_apps:
            if app in apps:
                sorted_apps.append(app)
                apps.remove(app)
        
        sorted_apps.extend(sorted(apps))
        
        return sorted_apps
        
    except Exception as e:
        frappe.log_error(f"Error getting translation apps: {str(e)}")
        return ['translation_tools', 'erpnext', 'frappe']


@frappe.whitelist()
def export_schedule_config(schedule_name):
    """
    Export a schedule configuration for backup or sharing.
    
    Args:
        schedule_name: Name of the Translation Schedule document
        
    Returns:
        dict: Schedule configuration
    """
    frappe.only_for("System Manager", "Translation Manager")
    
    try:
        doc = frappe.get_doc("Translation Schedule", schedule_name)
        
        # Export relevant fields (excluding system fields)
        config = {
            'schedule_name': doc.schedule_name,
            'command_type': doc.command_type,
            'app_name': doc.app_name,
            'locale': doc.locale,
            'schedule_type': doc.schedule_type,
            'time': str(doc.time) if doc.time else None,
            'weekday': doc.weekday,
            'day_of_month': doc.day_of_month,
            'cron_expression': doc.cron_expression,
            'max_retries': doc.max_retries,
            'enabled': doc.enabled
        }
        
        return {
            'success': True,
            'config': config,
            'exported_at': now_datetime().strftime('%Y-%m-%d %H:%M:%S')
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def import_schedule_config(config_data):
    """
    Import a schedule configuration.
    
    Args:
        config_data: Dictionary containing schedule configuration
        
    Returns:
        dict: Result of the import operation
    """
    frappe.only_for("System Manager")
    
    try:
        # Validate the configuration
        required_fields = ['schedule_name', 'command_type', 'schedule_type']
        for field in required_fields:
            if field not in config_data or not config_data[field]:
                frappe.throw(f"Required field '{field}' is missing from configuration")
        
        # Check if schedule with same name already exists
        existing = frappe.db.exists("Translation Schedule", {"schedule_name": config_data['schedule_name']})
        if existing:
            config_data['schedule_name'] = f"{config_data['schedule_name']} (Imported)"
        
        # Create the schedule
        result = create_schedule(config_data)
        
        if result['success']:
            result['message'] = f"Schedule configuration imported successfully as '{config_data['schedule_name']}'"
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }