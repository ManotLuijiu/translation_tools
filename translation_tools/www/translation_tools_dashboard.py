import json
import re

import frappe
import frappe.sessions
from frappe import _
from frappe.boot import load_translations
from frappe.utils.telemetry import capture

no_cache = 1

SCRIPT_TAG_PATTERN = re.compile(r"\<script[^<]*\</script\>")
CLOSING_SCRIPT_TAG_PATTERN = re.compile(r"</script\>")


def get_context(context):
	csrf_token = frappe.sessions.get_csrf_token()
	# Manually commit the CSRF token here
	frappe.db.commit()  # nosemgrep

	# Determine user's preferred language
	user_language = None
	if frappe.session.user != "Guest":
		try:
			# Get user's language preference from User DocType
			user_doc = frappe.get_doc("User", frappe.session.user)
			user_language = user_doc.get("language")
			print(f"🔍 User {frappe.session.user} language preference: {user_language}")
		except Exception as e:
			print(f"❌ Error getting user language preference: {e}")

	# Set language priority: User preference > Default to Thai
	if user_language:
		# User has set a language preference
		frappe.local.lang = user_language
		print(f"✅ Using user preferred language: {user_language}")
	else:
		# No preference set, default to Thai
		frappe.local.lang = "th"
		print(f"🇹🇭 No preference set, defaulting to Thai: {frappe.local.lang}")

	# Get full boot data (same as frappe.boot)
	if frappe.session.user == "Guest":
		boot = frappe.website.utils.get_boot_data()
	else:
		try:
			boot = frappe.sessions.get()
		except Exception as e:
			raise frappe.SessionBootFailed from e

	# Add push relay server URL configuration
	boot["push_relay_server_url"] = frappe.conf.get("push_relay_server_url")

	# Add server_script_enabled in boot
	if "server_script_enabled" in frappe.conf:
		enabled = frappe.conf.server_script_enabled
	else:
		enabled = True
	boot["server_script_enabled"] = enabled

	# Load translations for the determined language
	boot.lang = frappe.local.lang
	load_translations(boot)
	print(f"🌐 Final boot.lang: {boot.lang} with {len(boot.get('__messages', {}))} messages")

	# Sanitize and prepare for injection
	boot_json = frappe.as_json(boot, indent=None, separators=(",", ":"))
	boot_json = SCRIPT_TAG_PATTERN.sub("", boot_json)
	boot_json = CLOSING_SCRIPT_TAG_PATTERN.sub("", boot_json)
	boot_json = json.dumps(boot_json)

	# Update context with boot data
	context.update(
		{
			"build_version": frappe.utils.get_build_version(),
			"boot": boot_json,
			"csrf_token": csrf_token,
		}
	)

	# App name configuration
	app_name = frappe.get_website_settings("app_name") or frappe.get_system_settings("app_name")
	if app_name and app_name != "Frappe":
		context["app_name"] = app_name + " | " + "Translation Tools"
	else:
		context["app_name"] = "Translation Tools"

	# Favicon and icon configuration
	favicon = frappe.get_website_settings("favicon")
	context["icon_96"] = favicon or "/assets/translation_tools/thai_translation_dashboard/moo_logo.svg"
	context["apple_touch_icon"] = favicon or "/assets/translation_tools/thai_translation_dashboard/moo_logo.svg"
	context["mask_icon"] = favicon or "/assets/translation_tools/thai_translation_dashboard/moo_logo.svg"
	context["favicon_svg"] = favicon or "/assets/translation_tools/thai_translation_dashboard/moo_logo.svg"
	context["favicon_ico"] = favicon or "/assets/translation_tools/thai_translation_dashboard/moo_logo.svg"
	context["sitename"] = boot.get("sitename")

	# Preload critical APIs for performance
	if frappe.session.user != "Guest":
		capture("active_site", "translation_tools")
		context["preload_links"] = """
			<link rel="preload" href="/api/method/frappe.auth.get_logged_user" as="fetch" crossorigin="use-credentials">
			"""
	else:
		context["preload_links"] = ""

	return context


@frappe.whitelist(methods=["POST"], allow_guest=True)
def get_context_for_dev():
	if not frappe.conf.developer_mode:
		frappe.throw(_("This method is only meant for developer mode"))
	return json.loads(get_boot())


def get_boot():
	try:
		boot = frappe.sessions.get()
	except Exception as e:
		raise frappe.SessionBootFailed from e

	# Add push relay server URL configuration
	boot["push_relay_server_url"] = frappe.conf.get("push_relay_server_url")

	# Sanitize and prepare for injection
	boot_json = frappe.as_json(boot, indent=None, separators=(",", ":"))
	boot_json = SCRIPT_TAG_PATTERN.sub("", boot_json)
	boot_json = CLOSING_SCRIPT_TAG_PATTERN.sub("", boot_json)
	boot_json = json.dumps(boot_json)

	return boot_json
