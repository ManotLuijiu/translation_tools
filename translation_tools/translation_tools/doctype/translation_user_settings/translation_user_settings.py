# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class TranslationUserSettings(Document):
    def validate(self):
        # Ensure only one record per user
        if self.is_new():
            existing = frappe.db.exists("Translation User Settings", {"user": self.user}) # type: ignore
            if existing and existing != self.name:
                frappe.throw(f"Settings already exist for user {self.user}") # type: ignore
