import * as React from 'react';
import Chart from 'chart.js/auto';

export function App() {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [filter, setFilter] = React.useState({
    app: '',
    threshold: 50,
  });

  // Chart references
  const appChartRef = React.useRef(null);
  const appChartInstance = React.useRef(null);
  const trendChartRef = React.useRef(null);
  const trendChartInstance = React.useRef(null);

  // Expose methods to parent component
  React.useEffect(() => {
    window.$translation_status = {
      refreshData: fetchData,
      exportCSV: handleExportCSV,
      exportPDF: handleExportPDF,
    };
  }, []);

  // Fetch data on mount and when filter changes
  React.useEffect(() => {
    fetchData();
  }, [filter]);

  // Create/update charts when data changes
  React.useEffect(() => {
    if (data.length > 0) {
      createAppChart();
      createTrendChart();
    }
    return () => {
      // Cleanup charts on unmount
      if (appChartInstance.current) {
        appChartInstance.current.destroy();
      }
      if (trendChartInstance.current) {
        trendChartInstance.current.destroy();
      }
    };
  }, [data]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await frappe.call({
        method:
          'translation_tools.api.translation_status.get_translation_stats',
        args: {
          app: filter.app || null,
        },
      });

      if (response.message) {
        // Filter by threshold if specified
        const filteredData = filter.threshold
          ? response.message.filter((app) => app.percentage >= filter.threshold)
          : response.message;

        setData(filteredData);
      } else {
        setData([]);
      }
    } catch (error) {
      setError('Failed to load translation data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createAppChart = () => {
    if (!appChartRef.current) return;

    // Destroy previous chart if it exists
    if (appChartInstance.current) {
      appChartInstance.current.destroy();
    }

    // Prepare data for chart
    const labels = data.map((app) => app.app);
    const translatedData = data.map((app) => app.percentage.toFixed(1));
    const untranslatedData = data.map((app) =>
      (100 - app.percentage).toFixed(1)
    );

    appChartInstance.current = new Chart(appChartRef.current, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: __('Translated (%)'),
            data: translatedData,
            backgroundColor: '#28a745',
            borderWidth: 1,
          },
          {
            label: __('Untranslated (%)'),
            data: untranslatedData,
            backgroundColor: '#dc3545',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Translation Status by Application',
            font: {
              size: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || '';
                const value = context.raw || 0;
                return `${label}: ${value}%`;
              },
            },
          },
        },
      },
    });
  };

  const createTrendChart = () => {
    if (!trendChartRef.current) return;

    // Destroy previous chart if it exists
    if (trendChartInstance.current) {
      trendChartInstance.current.destroy();
    }

    // Get file data for trend analysis
    // For this example, we'll simulate some file data with dates
    const allFiles = data.flatMap((app) => app.files || []);

    // Group files by month
    const filesByMonth = {};
    allFiles.forEach((file) => {
      if (file.last_updated) {
        const month = file.last_updated.substring(0, 7); // YYYY-MM format
        if (!filesByMonth[month]) {
          filesByMonth[month] = {
            totalStrings: 0,
            translated: 0,
          };
        }
        filesByMonth[month].totalStrings += file.total_strings;
        filesByMonth[month].translated += file.translated;
      }
    });

    // Convert to array and sort by date
    const trendData = Object.entries(filesByMonth)
      .map(([month, stats]) => ({
        month,
        percentage: (stats.translated / stats.totalStrings) * 100 || 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    trendChartInstance.current = new Chart(trendChartInstance.current, {
      type: 'line',
      data: {
        labels: trendData.map((item) => item.month),
        datasets: [
          {
            label: 'Translation Completion Trend (%)',
            data: trendData.map((item) => item.percentage.toFixed(1)),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52,152,219,0.2)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
        plugins: {
          title: {
            display: true,
            text: 'Translation Completion Trend',
            font: {
              size: 16,
            },
          },
        },
      },
    });
  };

  const handleAppFilterChange = (e) => {
    setFilter((prev) => ({
      ...prev,
      app: e.target.value,
    }));
  };

  const handleThresholdChange = (e) => {
    setFilter((prev) => ({
      ...prev,
      threshold: parseInt(e.target.value) || 0,
    }));
  };

  const handleExportCSV = () => {
    if (!data.length) return;

    // Prepare CSV content
    let csvContent =
      'Application,Total Strings,Translated,Untranslated,Percentage (%),Files Count\n';

    data.forEach((app) => {
      csvContent += `${app.app},${app.total_strings},${app.translated},${app.untranslated},${app.percentage.toFixed(1)},${(app.files || []).length}\n`;
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'translation_status.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    frappe.show_alert({
      message: __('Generating PDF report...'),
      indicator: 'blue',
    });

    // Use our custom weasyprint server-side PDF generation
    frappe.call({
      method:
        'translation_tools.translation_tools.api.pdf.convert_report_to_pdf',
      args: {
        report_name: 'Translation Status Report',
        filters: filter,
      },
      callback: function (r) {
        console.info('r', r);

        frappe.show_alert({
          message: __('PDF Generated Successfully'),
          indicator: 'green',
        });
      },
    });
  };
  return (
    <div className="page-form">
      <div className="filter-section mb-4">
        <div className="row">
          <div className="col-md-3 form-group">
            <label className="control-label">{__('Application Filter')}</label>
            <input
              type="text"
              className="form-control"
              value={filter.app}
              onChange={handleAppFilterChange}
              placeholder={__('All Applications')}
            />
          </div>

          <div className="col-md-3 form-group">
            <label className="control-label">
              {__('Completion Threshold')}
            </label>
            <div className="input-group">
              <input
                type="range"
                min="0"
                max="100"
                value={filter.threshold}
                onChange={handleThresholdChange}
                className="form-range w-75"
              />
              <span className="input-group-text">{filter.threshold}%</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center my-5">
          <div className="fa fa-spinner fa-spin fa-2x"></div>
          <p>{__('Loading data...')}</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : data.length === 0 ? (
        <div className="alert alert-warning">
          {__('No translation data found. Try adjusting your filters.')}
        </div>
      ) : (
        <div>
          {/* Summary Statistics */}
          <div className="row stats-container mb-4">
            <div className="col-md-3">
              <div className="stats-card card">
                <div className="card-body">
                  <h6 className="text-muted">{__('Applications')}</h6>
                  <h3 className="font-weight-bold">{data.length}</h3>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="stats-card card">
                <div className="card-body">
                  <h6 className="text-muted">{__('Total PO Files')}</h6>
                  <h3 className="font-weight-bold">
                    {data.reduce(
                      (sum, app) => sum + (app.files?.length || 0),
                      0
                    )}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="stats-card card">
                <div className="card-body">
                  <h6 className="text-muted">{__('Total Strings')}</h6>
                  <h3 className="font-weight-bold">
                    {data
                      .reduce((sum, app) => sum + app.total_strings, 0)
                      .toLocaleString()}
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-md-3">
              <div className="stats-card card">
                <div className="card-body">
                  <h6 className="text-muted">{__('Average Completion')}</h6>
                  <h3 className="font-weight-bold">
                    {(
                      data.reduce((sum, app) => sum + app.percentage, 0) /
                      data.length
                    ).toFixed(1)}
                    %
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="chart-container" style={{ height: '300px' }}>
                    <canvas ref={appChartRef}></canvas>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="chart-container" style={{ height: '300px' }}>
                    <canvas ref={trendChartRef}></canvas>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Apps Table */}
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th className="text-left">{__('Application')}</th>
                      <th className="text-left">{__('Total Strings')}</th>
                      <th className="text-left">{__('Translated')}</th>
                      <th className="text-left">{__('Completion')}</th>
                      <th className="text-right">{__('Files')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((app, index) => (
                      <tr key={index}>
                        <td className="text-left">{app.app}</td>
                        <td className="text-left">
                          {app.total_strings.toLocaleString()}
                        </td>
                        <td className="text-left">
                          {app.translated.toLocaleString()} (
                          {app.percentage.toFixed(1)}%)
                        </td>
                        <td className="text-left">
                          <div className="progress" style={{ height: '10px' }}>
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{ width: `${app.percentage}%` }}
                              aria-valuenow={app.percentage}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="badge badge-pill badge-info">
                            {app.files?.length || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
