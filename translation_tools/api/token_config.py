import frappe
from frappe import _

def create_default_token_packages():
    """Create default token packages if they don't exist"""
    packages = [
        {
            "package_name": "Basic",
            "token_amount": 5000,
            "price": 199,
            "currency": "THB",
            "description": "Perfect for occasional tax consultation needs.",
            "is_active": 1
        },
        {
            "package_name": "Premium",
            "token_amount": 15000,
            "price": 499,
            "currency": "THB",
            "description": "Ideal for regular tax consultation and simple bookkeeping assistance.",
            "is_active": 1
        },
        {
            "package_name": "Professional",
            "token_amount": 50000,
            "price": 1499,
            "currency": "THB",
            "description": "Complete access to all tax consultation and advanced bookkeeping features.",
            "is_active": 1
        }
    ]
    
    for package_data in packages:
        if not frappe.db.exists("Token Package", package_data["package_name"]):
            package = frappe.new_doc("Token Package")
            package.update(package_data)
            package.insert(ignore_permissions=True)
            frappe.db.commit()

def setup_token_system():
    """Setup the token system with default packages"""
    create_default_token_packages()
    frappe.msgprint(_("Token packages have been created successfully!"))

def get_site_config_for_stripe():
    """Add Stripe configuration to your site_config.json"""
    print("""
To configure Stripe, add the following to your site_config.json file:

{
    "stripe_public_key": "pk_test_your_public_key",
    "stripe_secret_key": "sk_test_your_secret_key",
    "stripe_webhook_secret": "whsec_your_webhook_secret"
}

Replace the placeholder values with your actual Stripe API keys.
    """)