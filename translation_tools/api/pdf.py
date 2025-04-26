import frappe


@frappe.whitelist()
def convert_report_to_pdf(report_name, filters=None):
    """Convert a report to PDF using WeasyPrint"""
    from translation_tools.utils.pdf_generator import (
        WeasyPrintGenerator,
    )

    if isinstance(filters, str):
        filters = frappe.parse_json(filters)

    # Get the report data
    report = frappe.get_doc("Report", report_name)
    columns, data, _, chart = report.get_data(filters=filters)  # type: ignore

    # Create HTML for the report
    html = frappe.render_template(
        "translation_tools/templates/reports/translation_status.html",
        {
            "title": report_name,
            "columns": columns,
            "data": data,
            "chart": chart,
            "filters": filters,
        },
    )

    # Generate PDF
    generator = WeasyPrintGenerator(html)
    pdf_content = generator.get_pdf()

    frappe.local.response.filename = f"{report_name.replace(' ', '_')}.pdf"
    frappe.local.response.filecontent = pdf_content
    frappe.local.response.type = "pdf"

    return "success"


@frappe.whitelist()
def get_all_po_files():
    """Get all th.po files in the bench"""
    from frappe.utils import get_bench_path
    import os
    import glob

    bench_path = get_bench_path()
    apps_path = os.path.join(bench_path, "apps")

    po_files = []

    # Find all th.po files in all apps
    for app_dir in os.listdir(apps_path):
        app_path = os.path.join(apps_path, app_dir)
        if not os.path.isdir(app_path):
            continue

        # Search for th.po files in the app directory
        for root, dirs, files in os.walk(app_path):
            for file in files:
                if file == "th.po":
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, apps_path)

                    po_files.append(
                        {"app": app_dir, "path": rel_path, "filename": file}
                    )

    return po_files
