import frappe
from frappe import _
from num2words import num2words

# @frappe.whitelist()
# def set_thai_in_words(docname, doctype="Sales Invoice"):
#     doc = frappe.get_doc(doctype, docname)
#     doc.in_words = num_to_thai_text(doc.grand_total or 0)
#     doc.save()
#     return doc.in_words

@frappe.whitelist()
def set_in_words_thai(doc, method=None):
    try:
        if not doc.in_words:
            grand_total = doc.grand_total or 0
            baht = int(grand_total)
            satang = round((grand_total - baht) * 100)

            baht_text = num2words(baht, lang="th") + "บาท"

            if satang > 0:
                satang_text = num2words(satang, lang="th") + "สตางค์"
                doc.in_words = baht_text + satang_text
            else:
                doc.in_words = baht_text + "ถ้วน"
            # doc.in_words = num2words(doc.grand_total, lang="th") + "บาทถ้วน"
    except Exception as e:
        # fallback to English or log error
        frappe.log_error(_("Error converting amount to Thai words: {0}").format(str(e)))
        doc.in_words = _("Error: Cannot convert to Thai words")