import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("../public/js/desktop_order.js", import.meta.url), "utf8");
function apply(frappe) {
  runInNewContext(source, { frappe, console: { log() {} } });
}
function labels(icons) {
  return Array.from(icons, (icon) => icon.label);
}

test("default grid sorts Accounting and Assets before apps with lower stored indices", () => {
  const icons = [
    { label: "Translation Tools", idx: 0 },
    { label: "Framework", idx: 0 },
    { label: "Assets", idx: 1 },
    { label: "Accounting", idx: 1 },
  ];
  const frappe = { boot: { desktop_icons: icons } };
  apply(frappe);
  const gridOrder = [...frappe.boot.desktop_icons].sort((a, b) => a.idx - b.idx);
  assert.deepEqual(labels(gridOrder), ["Accounting", "Assets", "Framework", "Translation Tools"]);
  assert.deepEqual(icons.map((icon) => icon.idx), [0, 0, 1, 1]);
});

test("English ordering is case insensitive and handles numeric labels", () => {
  const frappe = { boot: { desktop_icons: [
    { label: "Report 10" }, { label: "assets" }, { label: "Report 2" }, { label: "Accounting" },
  ] } };
  apply(frappe);
  assert.deepEqual(labels(frappe.boot.desktop_icons), ["Accounting", "assets", "Report 2", "Report 10"]);
});

test("sorting preserves hidden flags, folders and permissions metadata", () => {
  const frappe = { boot: { desktop_icons: [
    { label: "Stock", parent_icon: "ERPNext", hidden: 0, link_to: "Stock" },
    { label: "ERPNext", hidden: 1, icon_type: "Folder" },
  ] } };
  apply(frappe);
  const stock = frappe.boot.desktop_icons.find((icon) => icon.label === "Stock");
  assert.equal(stock.parent_icon, "ERPNext");
  assert.equal(stock.hidden, 0);
  assert.equal(stock.link_to, "Stock");
  assert.equal(frappe.boot.desktop_icons[0].hidden, 1);
});

test("saved user layouts are preserved and repeated execution is stable", () => {
  const saved = [{ label: "Stock", idx: 1 }, { label: "Accounting", idx: 2 }];
  const frappe = { boot: { desktop_icons: saved }, desktop_icons: saved,
    pages: { desktop: { desktop_page: { data: saved } } } };
  apply(frappe);
  const first = JSON.stringify(frappe.boot.desktop_icons);
  apply(frappe);
  assert.equal(JSON.stringify(frappe.boot.desktop_icons), first);
  assert.equal(frappe.pages.desktop.desktop_page.data, saved);
  assert.equal(frappe.desktop_icons, saved);
  assert.deepEqual(labels(saved), ["Stock", "Accounting"]);
});

test("missing or legacy boot data does not break Desk", () => {
  assert.doesNotThrow(() => apply(undefined));
  assert.doesNotThrow(() => apply({}));
  assert.doesNotThrow(() => apply({ boot: {} }));
});
