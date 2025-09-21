import frappe


def boot_session(bootinfo):
    """Extend bootinfo with Translation Tools data"""

    # Thai tax compliance settings
    # bootinfo.thai_compliance = {
    #     "enabled": frappe.get_system_settings("enable_thai_tax_compliance") or 0,
    #     "vat_rate": 7.0,
    #     "wht_rates": get_wht_rates(),
    #     "required_fields": ["subject_to_wht", "is_paid"],
    # }

    # Purchase Invoice business rules
    # bootinfo.purchase_rules = {
    #     "credit_services_disable_vat_report": True,
    #     "fifo_vat_validation": True,
    # }

    # Custom modules availability
    # bootinfo.digisoft_features = {
    #     "input_vat_report": frappe.db.exists("Report", "Thai Input VAT Report"),
    #     "wht_certificates": True,
    #     "retention_management": True,
    # }

    # User-specific company settings
    if frappe.session.user != "Guest":
        bootinfo.user_defaults = {
            "company": frappe.defaults.get_user_default("company"),
            "currency": frappe.defaults.get_user_default("currency"),
            "fiscal_year": frappe.defaults.get_user_default("fiscal_year"),
        }
    translation_tools_settings = frappe.get_single("Translation Tools Settings")
    github_token = translation_tools_settings.github_token

    if github_token:
        bootinfo.github_token = github_token
    else:
        bootinfo.github_token = ""


def get_wht_rates():
    """Get standard Thai WHT rates"""
    return {
        "professional_services": 3.0,
        "construction": 3.0,
        "rental": 5.0,
        "advertising": 2.0,
        "service_fees": 3.0,
        "transportation": 1.0,
    }
