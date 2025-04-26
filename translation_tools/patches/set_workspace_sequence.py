import frappe


def execute():
    """Set Translation Tools workspace to appear at the bottom"""
    if frappe.db.exists("Workspace", "Translation Tools"):
        # Directly update the database values
        frappe.db.set_value(
            "Workspace",
            "Translation Tools",
            {
                "sequence_id": 99,
                "chart_name": "Translation Status",  # Set this to a non-empty value
            },
        )

        # Commit the changes
        frappe.db.commit()


# def execute():
#     """Set Translation Tools workspace to appear at the bottom"""
#     if frappe.db.exists("Workspace", "Translation Tools"):
#         doc = frappe.get_doc("Workspace", "Translation Tools")
#         doc.sequence_id = 99  # Very high number to ensure it's at the bottom

#         # Use the correct property name 'chart_name' instead of 'chart'
#         if hasattr(doc, "charts") and doc.charts and len(doc.charts) > 0:
#             chart_obj = doc.charts[0]
#             if hasattr(chart_obj, "chart_name"):
#                 doc.chart_name = chart_obj.chart_name
#             else:
#                 doc.chart_name = ""
#         else:
#             doc.chart_name = ""

#         doc.save(ignore_permissions=True)
