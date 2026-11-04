import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, BarChart3, LineChart, PieChart, TrendingUp, Palette, Upload } from 'lucide-react';
import { csvToChartPoints } from '../../utils/chartCsv';

const ChartConfigModal = ({ isOpen, onClose, onConfirm, chartType }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [chartData, setChartData] = useState([]);
  const [chartTitle, setChartTitle] = useState('');
  const [xAxisLabel, setXAxisLabel] = useState('');
  const [yAxisLabel, setYAxisLabel] = useState('');
  const [colors, setColors] = useState([]);
  const [fileName, setFileName] = useState('');
  const [importNotice, setImportNotice] = useState(null); // what the last CSV import did
  const [isProcessing, setIsProcessing] = useState(false);

  // Default colors palette
  const defaultColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
  ];

  // Chart type configurations
  const chartConfigs = {
    'bar-chart': {
      name: 'Bar Chart',
      icon: BarChart3,
      defaultData: [
        { label: 'Product A', value: 120 },
        { label: 'Product B', value: 80 },
        { label: 'Product C', value: 150 },
        { label: 'Product D', value: 90 }
      ],
      defaultTitle: 'Sales by Product',
      defaultXAxis: 'Products',
      defaultYAxis: 'Sales ($)',
      supportsMultiSeries: true
    },
    'line-chart': {
      name: 'Line Chart',
      icon: LineChart,
      defaultData: [
        { label: 'Jan', value: 65 },
        { label: 'Feb', value: 78 },
        { label: 'Mar', value: 90 },
        { label: 'Apr', value: 81 },
        { label: 'May', value: 95 }
      ],
      defaultTitle: 'Monthly Trends',
      defaultXAxis: 'Months',
      defaultYAxis: 'Value',
      supportsMultiSeries: true
    },
    'pie-chart': {
      name: 'Pie Chart',
      icon: PieChart,
      defaultData: [
        { label: 'Desktop', value: 45 },
        { label: 'Mobile', value: 35 },
        { label: 'Tablet', value: 20 }
      ],
      defaultTitle: 'Device Usage',
      defaultXAxis: '',
      defaultYAxis: '',
      supportsMultiSeries: false
    },
    'area-chart': {
      name: 'Area Chart',
      icon: TrendingUp,
      defaultData: [
        { label: 'Q1', value: 40 },
        { label: 'Q2', value: 55 },
        { label: 'Q3', value: 70 },
        { label: 'Q4', value: 85 }
      ],
      defaultTitle: 'Quarterly Growth',
      defaultXAxis: 'Quarters',
      defaultYAxis: 'Revenue ($K)',
      supportsMultiSeries: true
    },
    'donut-chart': {
      name: 'Donut Chart',
      icon: PieChart,
      defaultData: [
        { label: 'Marketing', value: 30 },
        { label: 'Development', value: 40 },
        { label: 'Sales', value: 20 },
        { label: 'Support', value: 10 }
      ],
      defaultTitle: 'Budget Allocation',
      defaultXAxis: '',
      defaultYAxis: '',
      supportsMultiSeries: false
    },
    'scatter-plot': {
      name: 'Scatter Plot',
      icon: TrendingUp,
      defaultData: [
        { label: 'Point 1', value: 25, x: 10 },
        { label: 'Point 2', value: 45, x: 20 },
        { label: 'Point 3', value: 35, x: 30 },
        { label: 'Point 4', value: 55, x: 40 }
      ],
      defaultTitle: 'Data Correlation',
      defaultXAxis: 'X Values',
      defaultYAxis: 'Y Values',
      supportsMultiSeries: false
    }
  };

  const currentConfig = chartConfigs[chartType] || chartConfigs['bar-chart'];

  // Initialize default values when modal opens
  useEffect(() => {
    if (isOpen) {
      setChartData(currentConfig.defaultData);
      setChartTitle(currentConfig.defaultTitle);
      setXAxisLabel(currentConfig.defaultXAxis);
      setYAxisLabel(currentConfig.defaultYAxis);
      setColors(defaultColors.slice(0, currentConfig.defaultData.length));
      setActiveTab('manual');
      setFileName('');
      setImportNotice(null);
      setIsProcessing(false);
    }
  }, [isOpen, chartType]);

  // Add new data point
  const addDataPoint = () => {
    const newPoint = {
      label: `Item ${chartData.length + 1}`,
      value: 0,
      ...(chartType === 'scatter-plot' && { x: 0 })
    };
    setChartData([...chartData, newPoint]);
    setColors([...colors, defaultColors[colors.length % defaultColors.length]]);
  };

  // Remove data point
  const removeDataPoint = (index) => {
    if (chartData.length > 1) {
      setChartData(chartData.filter((_, i) => i !== index));
      setColors(colors.filter((_, i) => i !== index));
    }
  };

  // Update data point
  const updateDataPoint = (index, field, value) => {
    const updatedData = chartData.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setChartData(updatedData);
  };

  // Update color
  const updateColor = (index, color) => {
    const updatedColors = colors.map((c, i) => i === index ? color : c);
    setColors(updatedColors);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      if (file.name.endsWith('.csv')) {
        await parseCsvData(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // For now, show message that Excel support can be added
        alert('Excel file support coming soon! Please use CSV format for now.');
        setIsProcessing(false);
        return;
      } else {
        alert('Please upload a CSV file.');
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check the format.');
      setIsProcessing(false);
    }
  };

  // Parse CSV data (see utils/chartCsv.js: quotes, thousands separators, currency,
  // other delimiters; rows that are not numbers are skipped and reported, never zeroed)
  const parseCsvData = async (file) => {
    try {
      const text = await file.text();
      const result = csvToChartPoints(text, { scatter: chartType === 'scatter-plot' });

      if (result.error || result.points.length === 0) {
        alert(result.error || 'No valid data found in CSV file.');
        setImportNotice(null);
        setIsProcessing(false);
        return;
      }

      setChartData(result.points);
      setColors(defaultColors.slice(0, result.points.length));

      // Axis labels come from the columns that were actually used
      const labelHeader = result.headers[result.labelColumn];
      const valueHeader = result.headers[result.valueColumn];
      if (labelHeader && !/^Column \d+$/.test(labelHeader)) setXAxisLabel(labelHeader);
      if (valueHeader && !/^Column \d+$/.test(valueHeader)) setYAxisLabel(valueHeader);

      setImportNotice({
        imported: result.imported,
        skipped: result.skipped,
        labelHeader: labelHeader || `Column ${result.labelColumn + 1}`,
        valueHeader: valueHeader || `Column ${result.valueColumn + 1}`,
      });
      setActiveTab('manual'); // Switch to manual tab to show the data
      setIsProcessing(false);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the format.');
      setIsProcessing(false);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    if (chartData.length === 0) {
      alert('Please add at least one data point.');
      return;
    }

    const chartConfig = {
      type: chartType,
      title: chartTitle,
      xAxisLabel,
      yAxisLabel,
      data: chartData,
      colors: colors,
      config: currentConfig
    };

    onConfirm(chartConfig);
    onClose();
  };

  if (!isOpen) return null;

  const ChartIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-line bg-black">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-info/10 rounded-lg">
              <ChartIcon className="w-4 h-4 text-info" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Configure {currentConfig.name}</h2>
              <p className="text-xs text-dim mt-0.5">Set up your chart data and customize colors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-dim" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-line">
          <div className="flex">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 font-medium text-xs border-b-2 transition-colors ${
                activeTab === 'manual'
                  ? 'border-info text-info bg-info/10'
                  : 'border-transparent text-dim hover:text-ink hover:bg-canvas'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 font-medium text-xs border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-info text-info bg-info/10'
                  : 'border-transparent text-dim hover:text-ink hover:bg-canvas'
              }`}
            >
              Upload Data
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Chart Settings */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Chart Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Chart Title</label>
                <input
                  type="text"
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info"
                  placeholder="Enter chart title"
                />
              </div>
              {currentConfig.defaultXAxis && (
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">X-Axis Label</label>
                  <input
                    type="text"
                    value={xAxisLabel}
                    onChange={(e) => setXAxisLabel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info"
                    placeholder="Enter X-axis label"
                  />
                </div>
              )}
              {currentConfig.defaultYAxis && (
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Y-Axis Label</label>
                  <input
                    type="text"
                    value={yAxisLabel}
                    onChange={(e) => setYAxisLabel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info"
                    placeholder="Enter Y-axis label"
                  />
                </div>
              )}
            </div>
          </div>

          {activeTab === 'manual' && (
            <div>
              {importNotice && (
                <div className={`mb-3 p-3 rounded-lg border text-xs ${importNotice.skipped.length ? 'bg-warning/10 border-warning/30 text-ink' : 'bg-success/10 border-success/30 text-ink'}`}>
                  <p className="font-medium">
                    Imported {importNotice.imported} row{importNotice.imported === 1 ? '' : 's'} from {fileName || 'the file'}
                    {' '}· labels from “{importNotice.labelHeader}”, values from “{importNotice.valueHeader}”
                  </p>
                  {importNotice.skipped.length > 0 && (
                    <p className="mt-1 text-dim">
                      Skipped {importNotice.skipped.length}: {importNotice.skipped.slice(0, 4).map((k) => `row ${k.row} (${k.reason})`).join('; ')}
                      {importNotice.skipped.length > 4 ? `; and ${importNotice.skipped.length - 4} more` : ''}
                    </p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-ink">Data Points</h3>
                <button
                  onClick={addDataPoint}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-info text-white rounded-lg hover:bg-info transition-colors text-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Point</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-1.5 p-1.5 bg-canvas rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateDataPoint(index, 'label', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info"
                        placeholder="Label"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => updateDataPoint(index, 'value', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info"
                        placeholder="Value"
                      />
                    </div>
                    {chartType === 'scatter-plot' && (
                      <div className="flex-1">
                        <input
                          type="number"
                          value={item.x || 0}
                          onChange={(e) => updateDataPoint(index, 'x', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info"
                          placeholder="X Value"
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <input
                        type="color"
                        value={colors[index] || defaultColors[0]}
                        onChange={(e) => updateColor(index, e.target.value)}
                        className="w-6 h-6 border border-line rounded cursor-pointer"
                        title="Choose color"
                      />
                      <button
                        onClick={() => removeDataPoint(index)}
                        disabled={chartData.length === 1}
                        className="p-1 text-danger hover:bg-danger/10 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div>
              <h3 className="text-sm font-semibold text-ink mb-3">Upload Data File</h3>
              
              <div className="border-2 border-dashed border-line rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-dim mx-auto mb-2" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink">Upload your data file</p>
                  <p className="text-xs text-dim">
                    Supports CSV files with columns: Label, Value{chartType === 'scatter-plot' ? ', X-Value' : ''}
                  </p>
                </div>
                
                <div className="mt-6">
                  <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-info text-white rounded-lg hover:bg-info transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                </div>

                {fileName && (
                  <div className="mt-4 p-3 bg-info/10 rounded-lg">
                    <p className="text-sm text-info">
                      {isProcessing ? 'Processing...' : `Loaded: ${fileName}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-canvas rounded-lg">
                <h4 className="font-medium text-xs text-ink mb-1.5">CSV Format Requirements:</h4>
                <ul className="text-xs text-dim space-y-0.5">
                  <li>• First row can hold headers</li>
                  <li>• One column of labels (text) and one column of numbers; other columns are ignored</li>
                  {chartType === 'scatter-plot' && <li>• For scatter plots, a second numbers column is used as the X value</li>}
                  <li>• Commas, semicolons or tabs can separate columns; amounts like ₹1,20,000 or 12% are read as numbers</li>
                  <li>• A row whose value is not a number is skipped and listed, never counted as 0</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-line bg-canvas">
          <div className="flex justify-between items-center">
            <div className="text-xs text-dim">
              {chartData.length} data point{chartData.length !== 1 ? 's' : ''} configured
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 border border-line text-xs text-ink rounded-lg hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={chartData.length === 0 || isProcessing}
                className="px-4 py-1.5 bg-info text-white rounded-lg hover:bg-info disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
              >
                Create Chart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartConfigModal;
