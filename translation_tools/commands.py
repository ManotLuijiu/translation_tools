import click
import frappe
from frappe.commands import pass_context
import os
import subprocess
import webbrowser
from translation_tools.reinstall import reset_installation

@click.command('open-translation-dashboard')
@pass_context
def open_translation_dashboard(context):
    """Open the Thai Translation Dashboard in the default browser"""
    site = context.sites[0] if context.sites else frappe.utils.get_site_name(context.site)
    
    if not site:
        click.echo("No site specified")
        return
    
    url = f"http://{site}/app/thai-translation-dashboard"
    click.echo(f"Opening Thai Translation Dashboard in your browser: {url}")
    webbrowser.open(url)

@click.command('repair-translation-tools')
@pass_context
def repair_translation_tools(context):
    """Repair Translation Tools installation"""
    # Call the reset_installation function from reinstall.py
    reset_installation()
    
    click.echo("\nRepair process completed. Follow the instructions above to finish setup.")

commands = [
    repair_translation_tools,
     open_translation_dashboard
]