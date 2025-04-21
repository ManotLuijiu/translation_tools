import frappe
import os
import json

def execute():
    """Fix fixtures import by ensuring all fixtures have a proper name field"""
    
    # Get the app root path
    app_path = frappe.get_app_path("translation_tools")
    fixtures_path = os.path.join(app_path, "fixtures")
    
    if not os.path.exists(fixtures_path):
        frappe.log_error("Fixtures path does not exist", "Fixture Import Error")
        return
    
    # Check property_setter.json specifically
    property_setter_path = os.path.join(fixtures_path, "property_setter.json")
    if os.path.exists(property_setter_path):
        try:
            with open(property_setter_path, 'r') as f:
                content = f.read()
                
            data = json.loads(content)
            if isinstance(data, list):
                for item in data:
                    if "name" not in item and "doc_type" in item and "field_name" in item and "property" in item:
                        item["name"] = f"{item['doc_type']}-{item['field_name']}-{item['property']}"
                
                with open(property_setter_path, 'w') as f:
                    f.write(json.dumps(data, indent=2))
                    
        except Exception as e:
            frappe.log_error(f"Error fixing property_setter.json: {str(e)}", "Fixture Import Error")
    
    # Loop through all JSON files in the fixtures folder
    for filename in os.listdir(fixtures_path):
        if not filename.endswith('.json'):
            continue
            
        file_path = os.path.join(fixtures_path, filename)
        
        try:
            # Read the fixture file
            with open(file_path, 'r') as f:
                content = f.read()
                
            # Try to parse as JSON
            try:
                fixture_data = json.loads(content)
                
                # Check if it's a list or a single document
                if isinstance(fixture_data, list):
                    # Check each item for the name field
                    for item in fixture_data:
                        if isinstance(item, dict) and "doctype" in item and "name" not in item:
                            # Try to generate a name based on doctype
                            if "fieldname" in item and "dt" in item:
                                item["name"] = f"{item['dt']}-{item['fieldname']}"
                            elif "label" in item:
                                item["name"] = f"{item['doctype']}-{item['label'].lower().replace(' ', '_')}"
                            else:
                                # Generate a random name
                                import uuid
                                item["name"] = f"{item['doctype']}-{str(uuid.uuid4())[:8]}"
                    
                    # Write back the updated fixture
                    with open(file_path, 'w') as f:
                        f.write(json.dumps(fixture_data, indent=1))
                        
                elif isinstance(fixture_data, dict) and "doctype" in fixture_data and "name" not in fixture_data:
                    # Handle single document
                    if "fieldname" in fixture_data and "dt" in fixture_data:
                        fixture_data["name"] = f"{fixture_data['dt']}-{fixture_data['fieldname']}"
                    elif "label" in fixture_data:
                        fixture_data["name"] = f"{fixture_data['doctype']}-{fixture_data['label'].lower().replace(' ', '_')}"
                    else:
                        # Generate a random name
                        import uuid
                        fixture_data["name"] = f"{fixture_data['doctype']}-{str(uuid.uuid4())[:8]}"
                    
                    # Write back the updated fixture
                    with open(file_path, 'w') as f:
                        f.write(json.dumps(fixture_data, indent=1))
                
            except FileNotFoundError:
                frappe.log_error(f"Fixture file {filename} not found", "Fixture Import Error")
                        
        except Exception as e:
            frappe.log_error(f"Error processing fixture file {filename}: {str(e)}", "Fixture Import Error")
    
    # Make sure the patch for adding default font works properly
    if not frappe.db.exists("Custom Field", "Print Settings-default_font"):
        try:
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
            frappe.log_error(f"Error creating custom field: {str(e)}", "Custom Field Creation Error")