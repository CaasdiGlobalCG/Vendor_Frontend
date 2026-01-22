import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, BarChart3, LineChart, PieChart, TrendingUp, Palette, Upload } from 'lucide-react';

const ChartConfigModal = ({ isOpen, onClose, onConfirm, chartType }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [chartData, setChartData] = useState([]);
  const [chartTitle, setChartTitle] = useState('');
  const [xAxisLabel, setXAxisLabel] = useState('');
  const [yAxisLabel, setYAxisLabel] = useState('');
  const [colors, setColors] = useState([]);
  const [fileName, setFileName] = useState('');
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

  // Parse CSV data
  const parseCsvData = async (file) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row.');
        setIsProcessing(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1);

      // Assume first column is labels, second is values, third is x-values (for scatter plot)
      const parsedData = dataRows.map(row => {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        const dataPoint = {
          label: values[0] || 'Unknown',
          value: parseFloat(values[1]) || 0
        };
        
        // Add x-value for scatter plots
        if (chartType === 'scatter-plot' && values[2] !== undefined) {
          dataPoint.x = parseFloat(values[2]) || 0;
        }
        
        return dataPoint;
      }).filter(item => !isNaN(item.value));

      if (parsedData.length === 0) {
        alert('No valid data found in CSV file.');
        setIsProcessing(false);
        return;
      }

      setChartData(parsedData);
      setColors(defaultColors.slice(0, parsedData.length));
      
      // Set labels from headers if available
      if (headers[0]) setXAxisLabel(headers[0]);
      if (headers[1]) setYAxisLabel(headers[1]);
      
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
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <ChartIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Configure {currentConfig.name}</h2>
              <p className="text-xs text-gray-600 mt-0.5">Set up your chart data and customize colors</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 font-medium text-xs border-b-2 transition-colors ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 font-medium text-xs border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Chart Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chart Title</label>
                <input
                  type="text"
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter chart title"
                />
              </div>
              {currentConfig.defaultXAxis && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">X-Axis Label</label>
                  <input
                    type="text"
                    value={xAxisLabel}
                    onChange={(e) => setXAxisLabel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter X-axis label"
                  />
                </div>
              )}
              {currentConfig.defaultYAxis && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Y-Axis Label</label>
                  <input
                    type="text"
                    value={yAxisLabel}
                    onChange={(e) => setYAxisLabel(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Y-axis label"
                  />
                </div>
              )}
            </div>
          </div>

          {activeTab === 'manual' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Data Points</h3>
                <button
                  onClick={addDataPoint}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Point</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {chartData.map((item, index) => (
                  <div key={index} className="flex items-center space-x-1.5 p-1.5 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateDataPoint(index, 'label', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Label"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => updateDataPoint(index, 'value', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Value"
                      />
                    </div>
                    {chartType === 'scatter-plot' && (
                      <div className="flex-1">
                        <input
                          type="number"
                          value={item.x || 0}
                          onChange={(e) => updateDataPoint(index, 'x', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="X Value"
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <input
                        type="color"
                        value={colors[index] || defaultColors[0]}
                        onChange={(e) => updateColor(index, e.target.value)}
                        className="w-6 h-6 border border-gray-300 rounded cursor-pointer"
                        title="Choose color"
                      />
                      <button
                        onClick={() => removeDataPoint(index)}
                        disabled={chartData.length === 1}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Data File</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">Upload your data file</p>
                  <p className="text-xs text-gray-600">
                    Supports CSV files with columns: Label, Value{chartType === 'scatter-plot' ? ', X-Value' : ''}
                  </p>
                </div>
                
                <div className="mt-6">
                  <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {isProcessing ? 'Processing...' : `Loaded: ${fileName}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-xs text-gray-900 mb-1.5">CSV Format Requirements:</h4>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li>• First row should contain headers</li>
                  <li>• First column: Labels (text)</li>
                  <li>• Second column: Values (numbers)</li>
                  {chartType === 'scatter-plot' && <li>• Third column: X-Values (numbers, for scatter plots)</li>}
                  <li>• Use commas to separate values</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              {chartData.length} data point{chartData.length !== 1 ? 's' : ''} configured
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-1.5 border border-gray-300 text-xs text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={chartData.length === 0 || isProcessing}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
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
