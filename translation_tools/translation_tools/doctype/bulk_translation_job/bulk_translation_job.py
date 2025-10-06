# Copyright (c) 2025, Manot Luijiu and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import uuid


class BulkTranslationJob(Document):
	"""
	DocType for tracking bulk ASEAN translation jobs
	Provides real-time progress updates for long-running translation operations
	"""

	def before_insert(self):
		"""Generate job_id before insert if not provided"""
		if not self.job_id:
			self.job_id = str(uuid.uuid4())

	def on_update(self):
		"""Publish real-time updates via Frappe realtime"""
		# Only publish updates if progress or status changed
		if self.has_value_changed("progress") or self.has_value_changed("status"):
			frappe.publish_realtime(
				event="bulk_translation_progress",
				message={
					"job_id": self.job_id,
					"status": self.status,
					"progress": self.progress or 0,
					"current_app": self.current_app,
					"current_locale": self.current_locale,
					"processed_apps": self.processed_apps or 0,
					"total_apps": self.total_apps,
					"processed_locales": self.processed_locales or 0,
					"total_locales": self.total_locales
				},
				user=self.owner
			)
