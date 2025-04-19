import frappe
import os
import shutil
from frappe.utils import get_files_path

@frappe.whitelist()
def create_signature_symlink(user, signature_file):
    """Create a symlink to the user's signature file in the public directory"""
    if not signature_file:
        frappe.throw("No signature file provided")
    
    # Get settings
    settings = frappe.get_single("Translation Tools Settings")
    target_dir = settings.signature_path or "files/signatures"
    
    # Create the target directory if it doesn't exist
    public_path = os.path.join(frappe.local.site_path, "public")
    target_path = os.path.join(public_path, target_dir)
    if not os.path.exists(target_path):
        os.makedirs(target_path)
    
    # Get the source file path
    source_file = get_files_path(signature_file.lstrip("/files/"))
    
    if not os.path.exists(source_file):
        frappe.throw(f"Source file {source_file} does not exist")
    
    # Create the symlink filename (use user's name or ID)
    user_doc = frappe.get_doc("User", user)
    safe_name = frappe.scrub(user_doc.full_name or user)
    target_file = os.path.join(target_path, f"{safe_name}.png")
    
    # Remove existing symlink or file if it exists
    if os.path.exists(target_file):
        if os.path.islink(target_file) or os.path.isfile(target_file):
            os.remove(target_file)
    
    # Create a copy instead of symlink for better compatibility
    shutil.copy2(source_file, target_file)
    
    # Update the user's profile to store the signature path
    signature_url = f"/{target_dir}/{safe_name}.png"
    frappe.db.set_value("User Signature", user, "signature_url", signature_url)
    
    return signature_url

@frappe.whitelist()
def get_user_signature(user=None):
    """Get the signature URL for a user"""
    if not user:
        user = frappe.session.user
    
    signature_doc = frappe.db.get_value(
        "User Signature", 
        {"user": user}, 
        ["signature_url", "signature_image"], 
        as_dict=True
    )
    
    if signature_doc and signature_doc.signature_url:
        return signature_doc.signature_url
    elif signature_doc and signature_doc.signature_image:
        # Create the symlink if it doesn't exist
        return create_signature_symlink(user, signature_doc.signature_image)
    else:
        return None