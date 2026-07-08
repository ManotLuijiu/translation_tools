# Frappe Import Clearance Workflow Playbook

Use this when implementing or changing Import Clearance features.

## Business Goal

Import Clearance records capture import-related clearance information from purchase/import workflows.

## Common Sources

- Purchase Order
- Purchase Order Item
- Forwarder invoice/transaction
- Customs duty
- VAT
- Freight
- Insurance
- Other charges

## Common Targets

- Import Clearance
- Import Clearance Item
- Landed Cost Voucher
- Payment Entry
- Purchase Invoice

## Required Design Questions

1. Is Import Clearance created from one PO or many POs?
2. Can one PO have multiple Import Clearance documents?
3. Where does Forwarder Clearance Transaction live?
4. Is the forwarder a Supplier?
5. Are charges allocated by quantity, amount, weight, or manual allocation?
6. Should Import Clearance create Landed Cost Voucher?
7. Should Import Clearance create Payment Entry?
8. Should Import Clearance remain Draft or be auto-submitted?

## Required Outputs

- Field mapping.
- Duplicate prevention rule.
- Charge allocation rule.
- Permission rule.
- Test cases.
