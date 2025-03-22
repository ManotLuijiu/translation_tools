import click
import frappe
from frappe.commands import pass_context
import os
import subprocess
from translation_tools.reinstall import reset_installation

@click.command('repair-translation-tools')
@pass_context
def repair_translation_tools(context):
    """Repair Translation Tools installation"""
    # Call the reset_installation function from reinstall.py
    reset_installation()
    
    click.echo("\nRepair process completed. Follow the instructions above to finish setup.")

commands = [
    repair_translation_tools
]