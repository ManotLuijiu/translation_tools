app_name = "translation_tools"
app_title = "Translation Tools"
app_publisher = "Manot Luijiu"
app_description = "Translate English to Thai in Frappe/ERPNext ecosystem"
app_email = "moocoding@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "translation_tools",
# 		"logo": "/assets/translation_tools/logo.png",
# 		"title": "Translation Tools",
# 		"route": "/translation_tools",
# 		"has_permission": "translation_tools.api.permission.has_app_permission"
# 	}
# ]

after_install = "translation_tools.install.after_install"
