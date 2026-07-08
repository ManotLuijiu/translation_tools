# Frappe DocType Workflow Playbook

Use this when creating or modifying a Frappe DocType workflow.

## Steps

1. Inspect DocType JSON.
2. Inspect controller Python file.
3. Inspect client JS file.
4. Inspect hooks.py.
5. Identify required fields.
6. Identify child tables.
7. Identify permissions.
8. Identify naming strategy.
9. Identify workflow state or docstatus dependency.
10. Add backend logic.
11. Add frontend trigger only if needed.
12. Add tests.
13. Verify changed files.

## Rules

- Do not directly edit DocType JSON unless schema change is required.
- If schema change is required, stop before migration and request approval.
- Business logic belongs in Python.
- UI behavior belongs in JS.
