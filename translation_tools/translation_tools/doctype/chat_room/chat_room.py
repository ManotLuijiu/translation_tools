# -*- coding: utf-8 -*-

# import frappe
from frappe.model.document import Document


class ChatRoom(Document):
    def get_members(self):
        if self.members:
            return [x.strip() for x in self.members.split(",")]
        return []
