# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class TranslationToolsSettings(Document):
    def validate(self):
        # Validate that at least one provider has an API key
        if not self.openai_api_key and not self.anthropic_api_key:  # type: ignore
            frappe.msgprint(
                "Warning: No API keys configured. You need at least one API key to use translation services.",
                indicator="yellow",
                alert=True,
            )
