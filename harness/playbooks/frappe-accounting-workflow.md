# Frappe Accounting Workflow Playbook

Use this when workflow affects accounting, purchase, import, tax, cost, payment, or ledger impact.

## Required Checks

- Does this create accounting entries?
- Does this change landed cost?
- Does this affect stock valuation?
- Does this affect VAT?
- Does this affect Payment Entry?
- Does this affect Purchase Invoice?
- Does this affect exchange gain/loss?
- Does this require approval from accountant/user?

## Must Inspect

- Purchase Order
- Purchase Receipt
- Purchase Invoice
- Landed Cost Voucher
- Payment Entry
- Currency Exchange
- Tax templates

## Rules

- Never assume tax treatment.
- Never auto-submit accounting documents unless explicitly requested.
- Never change submitted documents unless explicitly approved.
- Always produce accounting risk notes.
