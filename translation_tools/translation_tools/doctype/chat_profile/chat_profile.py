# -*- coding: utf-8 -*-

import frappe
from frappe.model.document import Document


class ChatProfile(Document):
    def before_save(self):
        self.ip_address = frappe.local.request_ip
        self.token = frappe.generate_hash()
