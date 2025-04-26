frappe.pages['translation-status'].on_page_load = function (wrapper) {
  frappe.ui.make_app_page({
    parent: wrapper,
    title: __('Translation Status'),
    single_column: true,
  });
  $(wrapper)
    .find('.layout-main-section')
    .html('<div id="translation_status_container"></div>');

  // Initialize the page
  new frappe.TranslationStatus(wrapper);
};

frappe.TranslationStatus = class TranslationStatus {
  constructor(wrapper) {
    this.page = wrapper.page;
    this.wrapper = $(wrapper).find('#translation_status_container');

    this.make();
  }

  make() {
    // Add Filters
    this.setup_filters();

    // Create dashboard view
    this.make_dashboard();

    // Create table view
    this.make_table();

    // Add refresh button
    this.page.set_primary_action(
      __('Refresh'),
      () => this.refresh(),
      'refresh'
    );

    // Load data
    this.refresh();
  }

  setup_filters() {
    this.page.add_field({
      fieldname: 'app',
      label: __('Application'),
      fieldtype: 'Link',
      options: 'App',
      change: () => this.refresh(),
    });

    this.page.add_field({
      fieldname: 'completion_threshold',
      label: __('Completion Threshold (%)'),
      fieldtype: 'Int',
      default: 50,
      change: () => this.refresh(),
    });
  }

  make_dashboard() {
    this.dashboard_container = $(
      '<div class="dashboard-container mb-5"></div>'
    ).appendTo(this.wrapper);
  }

  make_table() {
    this.table_container = $('<div class="table-container"></div>').appendTo(
      this.wrapper
    );
  }

  refresh() {
    const app = this.page.get_form_values().app;
    const threshold = this.page.get_form_values().completion_threshold || 50;

    // Show loading state
    this.dashboard_container.html(
      __('<div class="text-center">Loading chart...</div>')
    );
    this.table_container.html(
      __('<div class="text-center">Loading data...</div>')
    );

    frappe.call({
      method:
        'translation_tools.translation_tools.report.translation_status_report.translation_status_report.execute',
      args: {
        filters: {
          app: app,
          threshold: threshold,
        },
      },
      callback: (r) => {
        if (r.message) {
          const columns = r.message[0];
          const data = r.message[1];
          const chart = r.message[3];

          this.render_dashboard(chart, r);
          this.render_table(columns, data);
        }
      },
    });
  }

  render_dashboard(chart, r) {
    this.dashboard_container.empty();

    if (!chart || !r || r.length === 0) {
      this.dashboard_container.html(
        __('<div class="text-center text-muted">No data available</div>')
      );
      return;
    }

    // Create overview tiles
    const total_apps = [...new Set(r.message[1].map((d) => d.app))].length;
    const total_files = r.message[1].length;
    const avg_completion =
      r.message[1].reduce((sum, d) => sum + d.percentage, 0) / total_files;

    // const total_apps = [...new Set(data.map((d) => d.app))].length;
    // const total_files = data.length;
    // const avg_completion =
    //   data.reduce((sum, d) => sum + d.percentage, 0) / total_files;

    // const tiles_html = `
    // 		<div class="row mb-4">
    // 			<div class="col-md-4">
    // 				<div class="card p-3">
    // 					<div class="h6 text-uppercase text-muted">Applications</div>
    // 					<div class="h3">${total_apps}</div>
    // 				</div>
    // 			</div>
    // 			<div class="col-md-4">
    // 				<div class="card p-3">
    // 					<div class="h6 text-uppercase text-muted">PO Files</div>
    // 					<div class="h3">${total_files}</div>
    // 				</div>
    // 			</div>
    // 			<div class="col-md-4">
    // 				<div class="card p-3">
    // 					<div class="h6 text-uppercase text-muted">Average Completion</div>
    // 					<div class="h3">${avg_completion.toFixed(1)}%</div>
    // 				</div>
    // 			</div>
    // 		</div>
    // 	`;

    const tiles_html = `
    <div class="row mb-4">
        <div class="col-md-4">
            <div class="widget">
                <div class="widget-head">
                    <div class="widget-label">
                        <span class="widget-title">Applications</span>
                    </div>
                </div>
                <div class="widget-body">
                    <div class="widget-content-area">
                        <div class="stat-value h3">${total_apps}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="widget">
                <div class="widget-head">
                    <div class="widget-label">
                        <span class="widget-title">PO Files</span>
                    </div>
                </div>
                <div class="widget-body">
                    <div class="widget-content-area">
                        <div class="stat-value h3">${total_files}</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="widget">
                <div class="widget-head">
                    <div class="widget-label">
                        <span class="widget-title">Average Completion</span>
                    </div>
                </div>
                <div class="widget-body">
                    <div class="widget-content-area">
                        <div class="stat-value h3">${avg_completion.toFixed(1)}%</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

    this.dashboard_container.append(tiles_html);

    // Create chart
    const chart_container = $(
      '<div class="chart-container" style="height: 300px;"></div>'
    ).appendTo(this.dashboard_container);

    frappe.chart_manager = new frappe.Chart(chart_container[0], chart);
  }

  render_table(columns, data) {
    this.table_container.empty();

    // Add a center container div
    const centerContainer = $('<div class="w-100"></div>');
    this.table_container.append(centerContainer);

    // if (!data || data.length === 0) {
    //   this.table_container.html(
    //     '<div class="text-center text-muted">No data available</div>'
    //   );
    //   return;
    // }

    if (!data || data.length === 0) {
      centerContainer.html(
        __('<div class="text-center text-muted">No data available</div>')
      );
      return;
    }

    // Create a wrapper div for the table with center styling
    const tableWrapper = $('<div style="margin: 0 auto; width: 95%"></div>');
    centerContainer.append(tableWrapper);

    // Create datatable
    // this.datatable = new frappe.DataTable(this.table_container[0], {
    //   columns: columns.map((col) => ({
    //     name: col.label,
    //     id: col.fieldname,
    //     width: col.width,
    //     editable: false,
    //     format: (value) => {
    //       if (col.fieldtype === 'Percent') {
    //         return value.toFixed(1) + '%';
    //       }
    //       return value;
    //     },
    //   })),
    //   data: data,
    //   layout: 'fixed',
    //   serialNoColumn: true,
    //   checkboxColumn: false,
    //   dynamicRowHeight: true,
    // });

    // Format the dates to show both date and time
    data.forEach((row) => {
      if (row.last_updated) {
        // Convert the date string to a formatted date with time
        const dateObj = new Date(row.last_updated);
        row.last_updated = frappe.datetime.str_to_user(
          frappe.datetime.get_datetime_as_string(dateObj)
        );
      }
    });

    // Modify the columns array - keep all original widths except the last column
    const modifiedColumns = columns.map((col, index) => {
      // Keep the original configuration
      const columnConfig = {
        name: col.label,
        id: col.fieldname,
        width: col.width, // Use the original width
        editable: false,
        format: (value) => {
          if (col.fieldtype === 'Percent') {
            return value.toFixed(2) + '%';
          }
          return value;
        },
        align:
          col.fieldname === 'app' || col.fieldname === 'file_path'
            ? 'left'
            : 'right',
      };

      // For the last column, change the width to accommodate remaining space
      if (index === columns.length - 1) {
        columnConfig.width = 150; // Base width for last column
        columnConfig.resizable = true; // Allow last column to be resized
      }

      return columnConfig;
    });

    // Create datatable with the modified columns
    this.datatable = new frappe.DataTable(tableWrapper[0], {
      columns: modifiedColumns,
      data: data,
      layout: 'fixed', // Using fixed layout for more control
      serialNoColumn: true,
      checkboxColumn: false,
      dynamicRowHeight: true,
      inlineFilters: true,
      cellHeight: 40,
      headerDropdown: false,
    });

    // Add CSS to distribute column widths appropriately
    const style = document.createElement('style');
    style.textContent = `
	  .dt-scrollable {
		width: 100% !important;
	  }
	  .dt-cell {
		overflow: hidden;
		text-overflow: ellipsis;
	  }
	`;
    document.head.appendChild(style);
  }
};

// frappe.pages['translation-status'].on_page_show = function (wrapper) {
//   load_desk_page(wrapper);
// };

// function load_desk_page(wrapper) {
//   let $parent = $(wrapper).find('.layout-main-section');
//   $parent.empty();

//   frappe.require('translation_status.bundle.jsx').then(() => {
//     frappe.translation_status = new frappe.ui.TranslationStatus({
//       wrapper: $parent,
//       page: wrapper.page,
//     });
//   });
// }
