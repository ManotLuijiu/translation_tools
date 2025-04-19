frappe.ready(() => {
  frappe
    .call('translation_tools.api.get_preferred_font.get_preferred_font', {
      company: frappe.boot.sysdefaults.company,
    })
    .then((res) => {
      const font = res.message || 'Sarabun';
      document.documentElement.style.setProperty(
        '--preferred-font',
        `'${font}'`
      );
    });
});
