/** Keep the default Frappe v16 Desktop grid in English alphabetical order.
 * The grid compares idx before label, so sorting the array alone is insufficient.
 * Work on boot copies only; saved Desktop Layout records retain their own order.
 */
(() => {
  if (typeof frappe === "undefined" || !Array.isArray(frappe.boot?.desktop_icons)) {
    return;
  }

  const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  const label = (icon) => String(icon.label || icon.name || "").trim();
  frappe.boot.desktop_icons = [...frappe.boot.desktop_icons]
    .sort((left, right) => collator.compare(label(left), label(right)))
    .map((icon, index) => ({ ...icon, idx: index + 1 }));

  console.log("[DeskOrdering] Default icons ordered by English label", {
    count: frappe.boot.desktop_icons.length,
    labels: frappe.boot.desktop_icons.map(label),
  });
})();
