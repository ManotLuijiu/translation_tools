# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
from frappe import _
import os
import glob
import polib
from frappe.utils import get_bench_path


@frappe.whitelist()
def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    chart = get_chart(data)

    return columns, data, None, chart


def get_columns():
    return [
        {
            "fieldname": "app",
            "label": _("Application"),
            "fieldtype": "Data",
            "width": 150,
        },
        {
            "fieldname": "file_path",
            "label": _("File Path"),
            "fieldtype": "Data",
            "width": 250,
        },
        {
            "fieldname": "total_strings",
            "label": _("Total Strings"),
            "fieldtype": "Int",
            "width": 120,
        },
        {
            "fieldname": "translated",
            "label": _("Translated"),
            "fieldtype": "Int",
            "width": 120,
        },
        {
            "fieldname": "untranslated",
            "label": _("Untranslated"),
            "fieldtype": "Int",
            "width": 120,
        },
        {
            "fieldname": "percentage",
            "label": _("Completion %"),
            "fieldtype": "Percent",
            "width": 120,
        },
        {
            "fieldname": "last_updated",
            "label": _("Last Updated"),
            "fieldtype": "Date",
            "width": 120,
        },
    ]


def get_data(filters=None):
    data = []

    bench_path = get_bench_path()
    apps_path = os.path.join(bench_path, "apps")

    for app_dir in os.listdir(apps_path):
        app_path = os.path.join(apps_path, app_dir)
        if not os.path.isdir(app_path):
            continue

        # Look for th.po files in the app
        po_files = []
        for root, dirs, files in os.walk(app_path):
            for file in files:
                if file == "th.po":
                    po_files.append(os.path.join(root, file))

        # If no th.po files found, skip to next app
        if not po_files:
            continue

        for po_file in po_files:
            try:
                rel_path = os.path.relpath(po_file, apps_path)
                po = polib.pofile(po_file)

                total_strings = len(po)
                translated = len(po.translated_entries())
                untranslated = len(po.untranslated_entries())
                percentage = (
                    (translated / total_strings * 100) if total_strings > 0 else 0
                )

                # Get last updated date from PO file header
                last_updated = None
                for key, value in po.metadata.items():
                    if key == "PO-Revision-Date":
                        try:
                            # Extract the date part from the PO-Revision-Date
                            last_updated = value.split()[0]
                        except:
                            pass

                data.append(
                    {
                        "app": app_dir,
                        "file_path": rel_path,
                        "total_strings": total_strings,
                        "translated": translated,
                        "untranslated": untranslated,
                        "percentage": percentage,
                        "last_updated": last_updated,
                    }
                )
            except Exception as e:
                frappe.log_error(f"Error processing PO file {po_file}: {str(e)}")
                continue

    # Sort by app name and then by percentage (descending)
    data.sort(key=lambda x: (x["app"], -x["percentage"]))

    return data


def get_chart(data):
    if not data:
        return None

    apps = []
    translated_percentages = []
    untranslated_percentages = []

    # Group by app
    app_data = {}
    for row in data:
        app = row["app"]
        if app not in app_data:
            app_data[app] = {"total": 0, "translated": 0}
        app_data[app]["total"] += row["total_strings"]
        app_data[app]["translated"] += row["translated"]

    # Calculate percentages
    for app, stats in app_data.items():
        total = stats["total"]
        if total > 0:
            translated_pct = (stats["translated"] / total) * 100
            untranslated_pct = 100 - translated_pct

            apps.append(app)
            translated_percentages.append(round(translated_pct, 1))
            untranslated_percentages.append(round(untranslated_pct, 1))

    chart = {
        "data": {
            "labels": apps,
            "datasets": [
                {"name": _("Translated"), "values": translated_percentages},
                {"name": _("Untranslated"), "values": untranslated_percentages},
            ],
        },
        "type": "bar",
        "height": 300,
        "colors": ["#28a745", "#dc3545"],
    }

    return chart
