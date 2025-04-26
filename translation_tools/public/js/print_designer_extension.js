frappe.provide('frappe.ui.form');

// Store the original PrintDesigner class
const originalPrintDesigner = frappe.ui.form.PrintDesigner;

// Extend the original fonts list
frappe.ui.form.PrintDesigner = class ThaiPrintDesigner extends (
  originalPrintDesigner
) {
  constructor(opts) {
    super(opts);

    // Add Thai fonts to the font options
    this.fonts = [
      {
        label: 'Sarabun',
        value: 'Sarabun, sans-serif',
      },
      ...this.fonts,
    ];
  }
};
