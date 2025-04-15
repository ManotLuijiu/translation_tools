import frappe
import os
import base64
from frappe import _


@frappe.whitelist()
def get_font_base64(font_name):
    """Return font file as base64 string"""
    try:
        # Define allowed fonts and their paths
        fonts = {
            "THSarabun": "public/fonts/Sarabun/Sarabun-Regular.ttf",
            "THSarabunBold": "public/fonts/Sarabun/Sarabun-Bold.ttf",
            "Kanit-Regular": "translation_tools/public/fonts/Kanit/Kanit-Regular.ttf",
            "Kanit-Bold": "translation_tools/public/fonts/Kanit/Kanit-Bold.ttf",
        }

        if font_name not in fonts:
            frappe.throw(_(f"Font not found or not allowed {font_name}/{fonts}"))

        font_path = os.path.join(
            frappe.get_app_path("translation_tools"), os.path.normpath(fonts[font_name])
        )

        if not os.path.exists(font_path):
            frappe.throw(_(f"Font file does not exist {font_path}"))

        with open(font_path, "rb") as f:
            font_data = f.read()
            return base64.b64encode(font_data).decode("utf-8")

    except Exception as e:
        frappe.log_error(
            message=f"Error loading font: {str(e)}", title="PDF Font Error"
        )
        return {"error": str(e)}
