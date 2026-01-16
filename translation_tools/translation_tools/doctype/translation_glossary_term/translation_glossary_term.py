# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.naming import make_autoname


class TranslationGlossaryTerm(Document):
	def autoname(self):
		"""Generate name with truncated source_term (max 20 chars)"""
		# Truncate source_term to 20 characters and sanitize for naming
		source = (self.source_term or "")[:20].strip()
		# Replace spaces and special chars with hyphens for cleaner names
		source = frappe.scrub(source).replace("_", "-")
		# Generate sequential number
		self.name = make_autoname(f"TERM-{source}-.####")
