// Copyright (c) 2025, Manot Luijiu and contributors
// For license information, please see license.txt

frappe.ui.form.on("Translation Schedule", {
    refresh(frm) {
        // Add custom buttons
        if (!frm.is_new()) {
            // Run Now button
            frm.add_custom_button(__('Run Now'), function() {
                frappe.confirm(
                    __('Are you sure you want to run this translation command now?'),
                    function() {
                        run_translation_now(frm);
                    }
                );
            }, __('Actions'));
            
            // Reset Status button (for errors)
            if (frm.doc.status === 'Error') {
                frm.add_custom_button(__('Reset Status'), function() {
                    reset_schedule_status(frm);
                }, __('Actions'));
            }
            
            // Clear Log button
            if (frm.doc.execution_log) {
                frm.add_custom_button(__('Clear Log'), function() {
                    frappe.confirm(
                        __('Are you sure you want to clear the execution log?'),
                        function() {
                            clear_execution_log(frm);
                        }
                    );
                }, __('Actions'));
            }
            
            // View Log button
            if (frm.doc.execution_log) {
                frm.add_custom_button(__('View Full Log'), function() {
                    show_full_log(frm);
                });
            }
        }
        
        // Show status indicator
        if (frm.doc.status) {
            const indicator_map = {
                'Active': 'green',
                'Running': 'blue',
                'Paused': 'orange',
                'Error': 'red',
                'Completed': 'grey'
            };
            
            const indicator = indicator_map[frm.doc.status] || 'grey';
            frm.dashboard.add_indicator(__('Status: {0}', [frm.doc.status]), indicator);
        }
        
        // Show next run time
        if (frm.doc.enabled && frm.doc.next_run) {
            const next_run = frappe.datetime.str_to_user(frm.doc.next_run);
            frm.dashboard.add_indicator(__('Next Run: {0}', [next_run]), 'blue');
        }
        
        // Add example cron expressions
        if (frm.doc.schedule_type === 'Cron') {
            add_cron_examples(frm);
        }
    },
    
    schedule_type(frm) {
        // Clear irrelevant fields when schedule type changes
        if (frm.doc.schedule_type !== 'Weekly') {
            frm.set_value('weekday', '');
        }
        if (frm.doc.schedule_type !== 'Monthly') {
            frm.set_value('day_of_month', '');
        }
        if (frm.doc.schedule_type !== 'Cron') {
            frm.set_value('cron_expression', '');
        }
        if (!['Daily', 'Weekly', 'Once'].includes(frm.doc.schedule_type)) {
            frm.set_value('time', '');
        }
        
        // Add cron examples if Cron is selected
        if (frm.doc.schedule_type === 'Cron') {
            add_cron_examples(frm);
        }
        
        // Trigger next run calculation
        calculate_and_show_next_run(frm);
    },
    
    time(frm) {
        calculate_and_show_next_run(frm);
    },
    
    weekday(frm) {
        calculate_and_show_next_run(frm);
    },
    
    day_of_month(frm) {
        calculate_and_show_next_run(frm);
    },
    
    cron_expression(frm) {
        if (frm.doc.cron_expression) {
            validate_cron_expression(frm);
        }
    },
    
    enabled(frm) {
        if (!frm.doc.enabled) {
            frm.set_value('next_run', '');
        } else {
            calculate_and_show_next_run(frm);
        }
    },
    
    command_type(frm) {
        // Show helpful description for each command type
        const descriptions = {
            'generate_pot': __('Extract all translatable strings from the app into a POT template file'),
            'update_po': __('Update PO translation files with new strings from the POT template'),
            'compile_mo': __('Compile PO files into binary MO files for runtime usage'),
            'migrate_csv_to_po': __('Migrate legacy CSV translations to the PO format'),
            'full_workflow': __('Run complete translation workflow: Generate POT → Update PO → Compile MO')
        };
        
        if (descriptions[frm.doc.command_type]) {
            frm.set_df_property('command_type', 'description', descriptions[frm.doc.command_type]);
        }
    }
});

function run_translation_now(frm) {
    frappe.call({
        method: 'run_now',
        doc: frm.doc,
        freeze: true,
        freeze_message: __('Running translation command...'),
        callback: function(r) {
            if (!r.exc) {
                frappe.show_alert({
                    message: __('Translation command executed successfully'),
                    indicator: 'green'
                }, 5);
                frm.reload_doc();
            }
        },
        error: function(r) {
            frappe.msgprint({
                title: __('Execution Error'),
                message: r.message || __('An error occurred while running the command'),
                indicator: 'red'
            });
        }
    });
}

function reset_schedule_status(frm) {
    frappe.call({
        method: 'reset_status',
        doc: frm.doc,
        callback: function(r) {
            if (!r.exc) {
                frm.reload_doc();
            }
        }
    });
}

function clear_execution_log(frm) {
    frappe.call({
        method: 'clear_log',
        doc: frm.doc,
        callback: function(r) {
            if (!r.exc) {
                frm.reload_doc();
            }
        }
    });
}

function show_full_log(frm) {
    const dialog = new frappe.ui.Dialog({
        title: __('Execution Log'),
        fields: [
            {
                fieldname: 'log',
                fieldtype: 'Long Text',
                label: __('Log'),
                default: frm.doc.execution_log,
                read_only: 1
            }
        ],
        size: 'large',
        primary_action_label: __('Close'),
        primary_action: function() {
            dialog.hide();
        }
    });
    
    dialog.show();
    
    // Make the log field larger
    dialog.$wrapper.find('.frappe-control[data-fieldname="log"] textarea').css({
        'height': '400px',
        'font-family': 'monospace',
        'font-size': '12px'
    });
}

function add_cron_examples(frm) {
    const examples = [
        { expression: '0 2 * * *', description: 'Daily at 2:00 AM' },
        { expression: '0 */6 * * *', description: 'Every 6 hours' },
        { expression: '0 0 * * 1', description: 'Every Monday at midnight' },
        { expression: '0 0 1 * *', description: 'First day of every month at midnight' },
        { expression: '*/30 * * * *', description: 'Every 30 minutes' },
        { expression: '0 9-17 * * 1-5', description: 'Every hour from 9 AM to 5 PM on weekdays' }
    ];
    
    let html = '<div class="cron-examples"><strong>' + __('Cron Expression Examples:') + '</strong><ul>';
    examples.forEach(function(example) {
        html += '<li><code>' + example.expression + '</code> - ' + __(example.description) + '</li>';
    });
    html += '</ul></div>';
    
    frm.set_df_property('cron_expression', 'description', html);
}

function validate_cron_expression(frm) {
    // Basic validation of cron expression format
    const cron = frm.doc.cron_expression;
    const parts = cron.split(' ');
    
    if (parts.length !== 5) {
        frappe.msgprint({
            message: __('Cron expression should have 5 parts: minute hour day month weekday'),
            indicator: 'orange'
        });
        return false;
    }
    
    // Show preview of next runs
    frappe.call({
        method: 'translation_tools.api.schedule_management.preview_cron_schedule',
        args: {
            cron_expression: cron,
            count: 5
        },
        callback: function(r) {
            if (r.message) {
                let preview = __('Next 5 runs:') + '<br>';
                r.message.forEach(function(run) {
                    preview += '• ' + frappe.datetime.str_to_user(run) + '<br>';
                });
                frm.set_df_property('cron_expression', 'description', preview);
            }
        }
    });
}

function calculate_and_show_next_run(frm) {
    if (!frm.doc.enabled) {
        return;
    }
    
    // This would typically call a server method to calculate next run
    // For now, we'll just show a message that it will be calculated on save
    if (frm.doc.schedule_type && !frm.is_new()) {
        frappe.show_alert({
            message: __('Next run time will be calculated when you save the document'),
            indicator: 'blue'
        }, 3);
    }
}

// List view customization
frappe.listview_settings['Translation Schedule'] = {
    add_fields: ['enabled', 'status', 'next_run', 'command_type'],
    
    get_indicator: function(doc) {
        if (doc.status === 'Running') {
            return [__('Running'), 'blue', 'status,=,Running'];
        } else if (doc.status === 'Error') {
            return [__('Error'), 'red', 'status,=,Error'];
        } else if (!doc.enabled) {
            return [__('Disabled'), 'grey', 'enabled,=,0'];
        } else if (doc.status === 'Active') {
            return [__('Active'), 'green', 'status,=,Active'];
        }
    },
    
    formatters: {
        next_run: function(value) {
            if (value) {
                const now = frappe.datetime.now_datetime();
                const next = frappe.datetime.str_to_obj(value);
                const diff = (next - new Date(now)) / 1000; // difference in seconds
                
                if (diff < 0) {
                    return '<span class="text-danger">Overdue</span>';
                } else if (diff < 3600) {
                    return '<span class="text-warning">In ' + Math.round(diff / 60) + ' minutes</span>';
                } else if (diff < 86400) {
                    return '<span class="text-info">In ' + Math.round(diff / 3600) + ' hours</span>';
                } else {
                    return frappe.datetime.str_to_user(value);
                }
            }
        }
    }
};