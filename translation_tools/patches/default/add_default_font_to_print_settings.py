import frappe

def execute():
    """Add default font to print settings"""
    # Instead of creating a custom field directly, which might be causing fixture issues
    # Let's first check if the actual Print Settings document has the default_font field
    
    if not frappe.db.exists("Custom Field", "Print Settings-default_font"):
        try:
            # Create custom field through proper API
            from frappe.custom.doctype.custom_field.custom_field import create_custom_field

            create_custom_field('Print Settings', {
                    'fieldname': 'default_font',
                    'label': 'Default Font',
                    'fieldtype': 'Select',
                    'insert_after': 'pdf_page_size',
                    'options': "\n".join([
                        "Sarabun",
                        "Inter",
                        "Prompt",
                        "Kanit",
                        "IBM Plex Sans Thai",
                        "Pridi",
                        "Mitr"
                    ]),
                    'default': "Sarabun"
                })
            frappe.db.commit()
                
        except Exception as e:
            frappe.log_error(f"Error adding default font: {str(e)}")
            # Continue with migration even if this fails
            pass
    
    # Make sure we have the default font set
    print_settings = frappe.get_doc("Print Settings", "Print Settings")
    if not print_settings.get("default_font"):
        print_settings.set("default_font", "Sarabun")
        print_settings.save()


# def execute():
#     """Add default font to print settings"""
#     # Check if the custom field already exists to avoid duplicate creation
#     if not frappe.db.exists("Custom Field", "Print Settings-default_font"):
#         custom_field = frappe.get_doc({
#             "doctype": "Custom Field",
#             "dt": "Print Settings",
#             "fieldname": "default_font",
#             "label": "Default Font",
#             "fieldtype": "Select",
#             "insert_after": "pdf_page_size",
#             "options": "\n".join([
#                 "Sarabun",
#                 "Inter",
#                 "Prompt",
#                 "Kanit",
#                 "IBM Plex Sans Thai",
#                 "Pridi",
#                 "Mitr"
#             ]),
#             "default": "Sarabun"
#         })

#         # Set owner, modified_by and other standard fields
#         custom_field.save(ignore_permissions=True)
#         frappe.db.commit()


