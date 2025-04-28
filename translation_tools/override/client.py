import frappe
from frappe import _
from frappe.client import get_value
from frappe.model.document import is_virtual_doctype


@frappe.whitelist()
def validate_link_optimized(doctype: str, docname: str, fields=None):
    if not isinstance(doctype, str) or not isinstance(docname, str):
        frappe.throw(_("DocType and Document Name must be strings"))

    values = frappe._dict()

    # Try cache meta instead of loading meta fully
    meta = (
        frappe.get_cached_doc("DocType", doctype)
        if not frappe.local.dev_server
        else frappe.get_meta(doctype)
    )

    print(f"meta from validate_link_optimized: {meta}")

    parent_doctype = None
    if meta.get("istable"):
        parent_doctype = frappe.db.get_value(doctype, docname, "parenttype", cache=True)

    # Permission check optimized
    if not (
        frappe.has_permission(doctype, "read", parent_doctype=parent_doctype)
        or frappe.has_permission(doctype, "select", parent_doctype=parent_doctype)
    ):
        frappe.throw(
            _("You do not have Read or Select Permissions for {}").format(
                frappe.bold(doctype)
            ),
            frappe.PermissionError,
        )

    # Handle Virtual Doctype
    if is_virtual_doctype(doctype):
        try:
            frappe.get_doc(doctype, docname)
            values.name = docname
        except frappe.DoesNotExistError:
            frappe.clear_last_message()
            frappe.msgprint(
                _("Document {0} {1} does not exist").format(
                    frappe.bold(doctype), frappe.bold(docname)
                ),
            )
        return values

    # For regular doctypes
    name = frappe.db.get_value(doctype, docname, "name", cache=True)
    if not name:
        return values

    values.name = name

    # Parse fields only if given
    if fields:
        fields = frappe.parse_json(fields)

        if fields:
            try:
                # Combine into single get_value call (faster)
                fieldname = fields[0] if isinstance(fields, list) and fields else fields
                if not isinstance(fieldname, str):
                    frappe.throw(_("Fieldname must be a string"))
                field_values = frappe.db.get_value(
                    doctype, docname, str(fieldname), cache=True
                )
                if isinstance(field_values, dict):
                    values.update(field_values)
                else:
                    # When single field returned, wrap it
                    values.update({fields[0]: field_values})
            except frappe.PermissionError:
                frappe.clear_last_message()
                frappe.msgprint(
                    _("You need {0} permission to fetch values from {1} {2}").format(
                        frappe.bold(_("Read")),
                        frappe.bold(doctype),
                        frappe.bold(docname),
                    ),
                    title=_("Cannot Fetch Values"),
                    indicator="orange",
                )

    else:
        # If no fields, allow cache
        frappe.local.response_headers.set(
            "Cache-Control", "private,max-age=1800,stale-while-revalidate=7200"
        )

    return values
