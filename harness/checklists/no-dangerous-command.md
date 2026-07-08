# No Dangerous Command Checklist

The agent must not run these without explicit approval:

```bash
bench migrate
bench update
bench update --reset
bench restart
frappe.db.sql("DELETE ...")
frappe.db.sql("UPDATE ...")
git commit
git push
rm -rf
