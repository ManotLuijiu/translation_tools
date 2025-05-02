import frappe
import json
import requests
from frappe import _
from frappe.email.email_body import get_message_id
from frappe.utils import get_datetime, now_datetime


class ResendEmailProvider:
    """
    Resend Email Provider for Frappe

    This class implements the necessary methods to send emails via Resend API.
    """

    def __init__(self, api_key=None, domain=None, from_address=None):
        """Initialize Resend email provider with API key"""
        self.api_key = api_key or frappe.conf.get("resend_api_key")
        self.domain = domain or frappe.conf.get("resend_domain")
        self.from_address = from_address or frappe.conf.get("resend_from_address")

        if not self.api_key:
            frappe.throw(
                _(
                    "Resend API Key not provided. Please set it in site_config.json as resend_api_key."
                )
            )

        self.api_endpoint = "https://api.resend.com/emails"

    def send(self, message):
        """
        Send an email using Resend API.

        Args:
            message: The email message dict with all necessary fields.

        Returns:
            dict: Response from Resend API with email ID or error.
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = self._prepare_payload(message)

            response = requests.post(self.api_endpoint, headers=headers, json=payload)

            if response.status_code == 200:
                result = response.json()
                self._update_email_queue_status(message, "Sent", result.get("id"))
                return {"status": "success", "message_id": result.get("id")}
            else:
                error_msg = f"Failed to send email via Resend: {response.text}"
                self._update_email_queue_status(
                    message, "Error", error_details=error_msg
                )
                return {"status": "error", "message": error_msg}

        except Exception as e:
            error_msg = f"Exception when sending via Resend: {str(e)}"
            frappe.log_error(error_msg, "Resend Email Provider Error")
            self._update_email_queue_status(message, "Error", error_details=error_msg)
            return {"status": "error", "message": error_msg}

    def _prepare_payload(self, message):
        """
        Prepare the payload for Resend API from Frappe email message format.

        Args:
            message: The email message dict.

        Returns:
            dict: Prepared payload for Resend API.
        """
        # Get recipients
        recipients = []
        if message.get("recipients"):
            recipients = message.get("recipients")

        # Get CC and BCC
        cc = message.get("cc", [])
        bcc = message.get("bcc", [])

        # Determine sender
        sender = message.get("sender") or self.from_address
        if not sender:
            frappe.throw(
                _("No sender email address found. Please set a default from address.")
            )

        # Prepare attachments if any
        attachments = []
        if message.get("attachments"):
            for attachment in message.get("attachments"):
                if isinstance(attachment, dict):
                    attachments.append(
                        {
                            "filename": attachment.get("fname", "attachment.txt"),
                            "content": attachment.get("fcontent", ""),
                        }
                    )

        # Create payload
        payload = {
            "from": sender,
            "to": recipients,
            "subject": message.get("subject", ""),
            "html": message.get("message", ""),
            "text": message.get("text_content", ""),
        }

        # Add CC and BCC if present
        if cc:
            payload["cc"] = cc
        if bcc:
            payload["bcc"] = bcc

        # Add attachments if present
        if attachments:
            payload["attachments"] = attachments

        # Add reply-to if present
        if message.get("reply_to"):
            payload["reply_to"] = message.get("reply_to")

        # Add headers if necessary
        if message.get("message_id"):
            if not payload.get("headers"):
                payload["headers"] = {}
            payload["headers"]["Message-Id"] = message.get("message_id")

        return payload

    def _update_email_queue_status(
        self, message, status, message_id=None, error_details=None
    ):
        """
        Update the Email Queue status after sending.

        Args:
            message: The original message dict
            status: Status to update in email queue (Sent/Error)
            message_id: Message ID from Resend API response
            error_details: Error details if any
        """
        try:
            if message.get("email_queue_id"):
                # Update the email queue document
                queue_doc = frappe.get_doc("Email Queue", message.get("email_queue_id"))
                queue_doc.status = status  # type: ignore

                if message_id:
                    queue_doc.message_id = message_id  # type: ignore

                if error_details:
                    queue_doc.error = error_details  # type: ignore

                queue_doc.save(ignore_permissions=True)
                frappe.db.commit()
        except Exception as e:
            frappe.log_error(
                f"Failed to update Email Queue status: {str(e)}",
                "Resend Email Provider Error",
            )
