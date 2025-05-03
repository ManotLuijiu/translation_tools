import frappe
import json
import requests
from typing import List, Dict, Optional, Any, Union


class ResendMail:
    """
    Implementation of the mail client for Resend API

    This class provides methods to interact with Resend's API for sending emails
    that integrate with Frappe's email system.
    """

    def __init__(
        self,
        api_key: str,
        sender_email: Optional[str] = None,
        domain: Optional[str] = None,
    ):
        """
        Initialize ResendMail with API credentials

        Args:
            api_key: Resend API key
            sender_email: Default sender email (optional)
            domain: Domain to use for sending (optional)
        """
        self.api_key = api_key
        self.sender_email = sender_email
        self.domain = domain
        self.api_base_url = "https://api.resend.com"

        if not self.api_key:
            frappe.throw("Resend API key is required for ResendMail")

    def send(
        self,
        recipients: List[str],
        subject: str = "",
        message: str = "",
        text_content: str = "",
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[Dict]] = None,
        sender: Optional[str] = None,
        message_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Send an email via Resend API

        Args:
            recipients: List of email recipients
            subject: Email subject
            message: Email body (HTML)
            text_content: Email body (plain text)
            cc: CC recipients
            bcc: BCC recipients
            reply_to: Reply-to email address
            attachments: List of attachment objects
            sender: Sender email address (overrides default)
            message_id: Custom message ID

        Returns:
            Dict with response from Resend API
        """
        try:
            if not recipients:
                return {"error": "No recipients provided"}

            # Build request payload
            payload = {
                "from": sender or self.sender_email,
                "to": recipients,
                "subject": subject,
                "html": message,
            }

            # Add text content if provided
            if text_content:
                payload["text"] = text_content

            # Add CC and BCC if provided
            if cc:
                payload["cc"] = cc
            if bcc:
                payload["bcc"] = bcc

            # Add reply-to if provided
            if reply_to:
                payload["reply_to"] = reply_to

            # Add custom message ID if provided
            if message_id:
                if "headers" not in payload:
                    payload["headers"] = {}
                payload["headers"]["Message-Id"] = message_id

            # Add attachments if provided
            if attachments:
                processed_attachments = []
                for attachment in attachments:
                    if isinstance(attachment, dict):
                        processed_attachments.append(
                            {
                                "filename": attachment.get("fname", "attachment.txt"),
                                "content": attachment.get("fcontent", ""),
                            }
                        )
                if processed_attachments:
                    payload["attachments"] = processed_attachments

            # Send request to Resend API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            response = requests.post(
                f"{self.api_base_url}/emails", headers=headers, json=payload
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "status": "success",
                    "message_id": result.get("id"),
                    "response": result,
                }
            else:
                error_msg = f"Failed to send email via Resend: {response.text}"
                frappe.log_error(error_msg, "ResendMail Error")
                return {
                    "status": "error",
                    "message": error_msg,
                    "response": response.text,
                }

        except Exception as e:
            error_msg = f"Exception when sending via Resend: {str(e)}"
            frappe.log_error(error_msg, "ResendMail Error")
            return {"status": "error", "message": error_msg}

    def send_bulk(
        self,
        recipients: List[Dict[str, str]],
        subject: str = "",
        message: str = "",
        text_content: str = "",
        reply_to: Optional[str] = None,
        attachments: Optional[List[Dict]] = None,
        sender: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Send a batch of emails via Resend API

        Args:
            recipients: List of recipient objects with 'email', 'cc', 'bcc' keys
            subject: Email subject
            message: Email body (HTML)
            text_content: Email body (plain text)
            reply_to: Reply-to email address
            attachments: List of attachment objects
            sender: Sender email address (overrides default)

        Returns:
            List of Dicts with responses from Resend API
        """
        results = []

        for recipient in recipients:
            email = recipient.get("email")
            cc = recipient.get("cc", [])
            bcc = recipient.get("bcc", [])

            # Create personalized message if needed
            personalized_message = message
            personalized_subject = subject

            # Send individual email
            result = self.send(
                recipients=[email] if email else [],
                subject=personalized_subject,
                message=personalized_message,
                text_content=text_content,
                cc=[cc] if isinstance(cc, str) else cc,
                bcc=[bcc] if isinstance(bcc, str) else bcc,
                reply_to=reply_to,
                attachments=attachments,
                sender=sender,
            )

            results.append(
                {
                    "email": email,
                    "status": result.get("status"),
                    "message_id": result.get("message_id", ""),
                    "error": (
                        result.get("message", "")
                        if result.get("status") == "error"
                        else ""
                    ),
                }
            )

        return results
