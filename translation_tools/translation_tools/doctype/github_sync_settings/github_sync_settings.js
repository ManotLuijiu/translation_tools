frappe.ui.form.on('GitHub Sync Settings', {
    refresh: function(frm) {
        if (frm.doc.enabled) {
            frm.add_custom_button(__('Sync Now'), function() {
                frm.call('trigger_manual_sync').then(r => {
                    if (r.message.success) {
                        frappe.msgprint(__('Sync triggered successfully'));
                        frm.reload_doc();
                    } else {
                        frappe.msgprint(__('Sync failed: ') + r.message.error);
                    }
                });
            });
            
            frm.add_custom_button(__('View Sync History'), function() {
                frappe.set_route('List', 'GitHub Sync History Entry');
            });
        }
    },
    
    enabled: function(frm) {
        if (frm.doc.enabled) {
            frm.set_df_property('repository_url', 'reqd', 1);
            frm.set_df_property('branch', 'reqd', 1);
            frm.set_df_property('target_language', 'reqd', 1);
        } else {
            frm.set_df_property('repository_url', 'reqd', 0);
            frm.set_df_property('branch', 'reqd', 0);
            frm.set_df_property('target_language', 'reqd', 0);
        }
    },
    
    sync_frequency: function(frm) {
        if (frm.doc.sync_frequency === 'custom') {
            frm.set_df_property('custom_cron_expression', 'reqd', 1);
        } else {
            frm.set_df_property('custom_cron_expression', 'reqd', 0);
        }
    }
});