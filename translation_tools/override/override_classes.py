import frappe
from frappe.printing.doctype.print_format.print_format import PrintFormat

class CustomPrintFormat(PrintFormat):
    def before_save(self):
        # Example override: Add a prefix to the name before saving
        if self.name and not self.name.startswith("Custom-"):
            self.name = f"Custom-{self.name}"
        
        # Only call super().before_save() if it exists in the parent class
        # if hasattr(PrintFormat, 'before_save'):
        #     super().before_save()

    # You can override other methods as needed
    # def validate(self):
    #     super().validate()
    #     # custom validation logic