import React from 'react';
import { BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';

const ChartRenderer = ({ data, chartType }) => {
  // Use custom chart data if available, otherwise use default
  const chartConfig = data?.customChartData || getDefaultChartData(chartType);
  const { title, xAxisLabel, yAxisLabel, data: chartData, colors } = chartConfig;

  // Calculate chart dimensions and scaling
  const chartWidth = 300;
  const chartHeight = 200;
  const padding = 40;
  const innerWidth = chartWidth - (padding * 2);
  const innerHeight = chartHeight - (padding * 2);

  // Get max value for scaling
  const maxValue = Math.max(...chartData.map(item => item.value));
  const maxX = chartType === 'scatter-plot' ? Math.max(...chartData.map(item => item.x || 0)) : 0;

  // Render different chart types
  const renderBarChart = () => {
    const barWidth = innerWidth / chartData.length * 0.8;
    const barSpacing = innerWidth / chartData.length * 0.2;

    return (
      <svg width={chartWidth} height={chartHeight} className="border border-gray-200 rounded">
        {/* Background */}
        <rect width={chartWidth} height={chartHeight} fill="#fafafa" />
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + innerHeight * ratio}
            x2={chartWidth - padding}
            y2={padding + innerHeight * ratio}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        
        {/* Bars */}
        {chartData.map((item, index) => {
          const barHeight = (item.value / maxValue) * innerHeight;
          const x = padding + (index * (barWidth + barSpacing)) + barSpacing / 2;
          const y = chartHeight - padding - barHeight;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={colors[index] || '#3B82F6'}
                className="hover:opacity-80 transition-opacity"
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight - padding + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {item.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs fill-gray-800 font-medium"
              >
                {item.value}
              </text>
            </g>
          );
        })}
        
        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        {/* X-axis */}
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        
        {/* Axis labels */}
        {yAxisLabel && (
          <text x={15} y={chartHeight / 2} textAnchor="middle" className="text-xs fill-gray-700" transform={`rotate(-90, 15, ${chartHeight / 2})`}>
            {yAxisLabel}
          </text>
        )}
        {xAxisLabel && (
          <text x={chartWidth / 2} y={chartHeight - 5} textAnchor="middle" className="text-xs fill-gray-700">
            {xAxisLabel}
          </text>
        )}
      </svg>
    );
  };

  const renderLineChart = () => {
    const points = chartData.map((item, index) => {
      const x = padding + (index / (chartData.length - 1)) * innerWidth;
      const y = chartHeight - padding - (item.value / maxValue) * innerHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={chartWidth} height={chartHeight} className="border border-gray-200 rounded">
        {/* Background */}
        <rect width={chartWidth} height={chartHeight} fill="#fafafa" />
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + innerHeight * ratio}
            x2={chartWidth - padding}
            y2={padding + innerHeight * ratio}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={colors[0] || '#3B82F6'}
          strokeWidth="3"
          className="hover:opacity-80 transition-opacity"
        />
        
        {/* Data points */}
        {chartData.map((item, index) => {
          const x = padding + (index / (chartData.length - 1)) * innerWidth;
          const y = chartHeight - padding - (item.value / maxValue) * innerHeight;
          
          return (
            <g key={index}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill={colors[index] || colors[0] || '#3B82F6'}
                className="hover:r-6 transition-all"
              />
              <text
                x={x}
                y={chartHeight - padding + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {item.label}
              </text>
            </g>
          );
        })}
        
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        
        {/* Axis labels */}
        {yAxisLabel && (
          <text x={15} y={chartHeight / 2} textAnchor="middle" className="text-xs fill-gray-700" transform={`rotate(-90, 15, ${chartHeight / 2})`}>
            {yAxisLabel}
          </text>
        )}
        {xAxisLabel && (
          <text x={chartWidth / 2} y={chartHeight - 5} textAnchor="middle" className="text-xs fill-gray-700">
            {xAxisLabel}
          </text>
        )}
      </svg>
    );
  };

  const renderPieChart = () => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;
    const radius = Math.min(innerWidth, innerHeight) / 2;

    return (
      <svg width={chartWidth} height={chartHeight} className="border border-gray-200 rounded">
        {/* Background */}
        <rect width={chartWidth} height={chartHeight} fill="#fafafa" />
        
        {/* Pie slices */}
        {chartData.map((item, index) => {
          const sliceAngle = (item.value / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + sliceAngle;
          
          const startX = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
          const startY = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
          const endX = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
          const endY = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
          
          const largeArcFlag = sliceAngle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            'Z'
          ].join(' ');
          
          currentAngle += sliceAngle;
          
          return (
            <path
              key={index}
              d={pathData}
              fill={colors[index] || '#3B82F6'}
              className="hover:opacity-80 transition-opacity"
            />
          );
        })}
        
        {/* Labels */}
        {(() => {
          let angle = 0;
          return chartData.map((item, index) => {
            const sliceAngle = (item.value / total) * 360;
            const labelAngle = angle + sliceAngle / 2;
            const labelRadius = radius * 0.7;
            const labelX = centerX + labelRadius * Math.cos((labelAngle - 90) * Math.PI / 180);
            const labelY = centerY + labelRadius * Math.sin((labelAngle - 90) * Math.PI / 180);
            
            angle += sliceAngle;
            
            return (
              <text
                key={index}
                x={labelX}
                y={labelY}
                textAnchor="middle"
                className="text-xs fill-white font-medium"
              >
                {Math.round((item.value / total) * 100)}%
              </text>
            );
          });
        })()}
      </svg>
    );
  };

  const renderAreaChart = () => {
    const points = chartData.map((item, index) => {
      const x = padding + (index / (chartData.length - 1)) * innerWidth;
      const y = chartHeight - padding - (item.value / maxValue) * innerHeight;
      return { x, y };
    });

    const pathData = [
      `M ${padding} ${chartHeight - padding}`,
      ...points.map(p => `L ${p.x} ${p.y}`),
      `L ${chartWidth - padding} ${chartHeight - padding}`,
      'Z'
    ].join(' ');

    return (
      <svg width={chartWidth} height={chartHeight} className="border border-gray-200 rounded">
        {/* Background */}
        <rect width={chartWidth} height={chartHeight} fill="#fafafa" />
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + innerHeight * ratio}
            x2={chartWidth - padding}
            y2={padding + innerHeight * ratio}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        
        {/* Area */}
        <path
          d={pathData}
          fill={colors[0] || '#3B82F6'}
          fillOpacity="0.3"
          className="hover:fill-opacity-40 transition-all"
        />
        
        {/* Line */}
        <polyline
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={colors[0] || '#3B82F6'}
          strokeWidth="2"
        />
        
        {/* Data points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill={colors[0] || '#3B82F6'}
            />
            <text
              x={point.x}
              y={chartHeight - padding + 15}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {chartData[index].label}
            </text>
          </g>
        ))}
        
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
      </svg>
    );
  };

  const renderDonutChart = () => {
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;
    const outerRadius = Math.min(innerWidth, innerHeight) / 2;
    const innerRadius = outerRadius * 0.5;

    return (
      <svg width={chartWidth} height={chartHeight} className="border border-gray-200 rounded">
        {/* Background */}
        <rect width={chartWidth} height={chartHeight} fill="#fafafa" />
        
        {/* Donut slices */}
        {chartData.map((item, index) => {
          const sliceAngle = (item.value / total) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + sliceAngle;
          
          const startOuterX = centerX + outerRadius * Math.cos((startAngle - 90) * Math.PI / 180);
          const startOuterY = centerY + outerRadius * Math.sin((startAngle - 90) * Math.PI / 180);
          const endOuterX = centerX + outerRadius * Math.cos((endAngle - 90) * Math.PI / 180);
          const endOuterY = centerY + outerRadius * Math.sin((endAngle - 90) * Math.PI / 180);
          
          const startInnerX = centerX + innerRadius * Math.cos((startAngle - 90) * Math.PI / 180);
          const startInnerY = centerY + innerRadius * Math.sin((startAngle - 90) * Math.PI / 180);
          const endInnerX = centerX + innerRadius * Math.cos((endAngle - 90) * Math.PI / 180);
          const endInnerY = centerY + innerRadius * Math.sin((endAngle - 90) * Math.PI / 180);
          
          const largeArcFlag = sliceAngle > 180 ? 1 : 0;
          
          const pathData = [
            `M ${startOuterX} ${startOuterY}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY}`,
            `L ${endInnerX} ${endInnerY}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInnerX} ${startInnerY}`,
            'Z'
          ].join(' ');
          
          currentAngle += sliceAngle;
          
          return (
            <path
              key={index}
              d={pathData}
              fill={colors[index] || '#3B82F6'}
              className="hover:opacity-80 transition-opacity"
            />
          );
        })}
        
        {/* Center text */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          className="text-sm fill-gray-800 font-bold"
        >
          Total
        </text>
        <text
          x={centerX}
          y={centerY + 15}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {total}
        </text>
      </svg>
    );
  };

  const renderScatterPlot = () => {
    return (
      <svg width={chartWidth} height={chartHeight} className="border border-gray-200 rounded">
        {/* Background */}
        <rect width={chartWidth} height={chartHeight} fill="#fafafa" />
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={padding + innerHeight * ratio}
              x2={chartWidth - padding}
              y2={padding + innerHeight * ratio}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <line
              x1={padding + innerWidth * ratio}
              y1={padding}
              x2={padding + innerWidth * ratio}
              y2={chartHeight - padding}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          </g>
        ))}
        
        {/* Data points */}
        {chartData.map((item, index) => {
          const x = padding + ((item.x || 0) / maxX) * innerWidth;
          const y = chartHeight - padding - (item.value / maxValue) * innerHeight;
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="5"
              fill={colors[index] || '#3B82F6'}
              className="hover:r-7 transition-all"
            />
          );
        })}
        
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#374151" strokeWidth="2" />
      </svg>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    switch (chartType) {
      case 'bar-chart':
        return renderBarChart();
      case 'line-chart':
        return renderLineChart();
      case 'pie-chart':
        return renderPieChart();
      case 'area-chart':
        return renderAreaChart();
      case 'donut-chart':
        return renderDonutChart();
      case 'scatter-plot':
        return renderScatterPlot();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className="w-full">
      {/* Chart Title */}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{title}</h3>
      )}
      
      {/* Chart */}
      <div className="flex justify-center mb-4">
        {renderChart()}
      </div>
      
      {/* Legend for pie and donut charts */}
      {(['pie-chart', 'donut-chart'].includes(chartType)) && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index] || '#3B82F6' }}
              />
              <span className="text-xs text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Chart info */}
      <div className="text-center text-xs text-gray-500 mt-2">
        {chartData.length} data points • Click to customize
      </div>
    </div>
  );
};

// Default chart data for different chart types
const getDefaultChartData = (chartType) => {
  const defaultConfigs = {
    'bar-chart': {
      title: 'Sample Bar Chart',
      xAxisLabel: 'Categories',
      yAxisLabel: 'Values',
      data: [
        { label: 'A', value: 30 },
        { label: 'B', value: 45 },
        { label: 'C', value: 25 },
        { label: 'D', value: 35 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    },
    'line-chart': {
      title: 'Sample Line Chart',
      xAxisLabel: 'Time',
      yAxisLabel: 'Value',
      data: [
        { label: 'Jan', value: 20 },
        { label: 'Feb', value: 35 },
        { label: 'Mar', value: 25 },
        { label: 'Apr', value: 45 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    },
    'pie-chart': {
      title: 'Sample Pie Chart',
      xAxisLabel: '',
      yAxisLabel: '',
      data: [
        { label: 'Desktop', value: 60 },
        { label: 'Mobile', value: 30 },
        { label: 'Tablet', value: 10 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981']
    },
    'area-chart': {
      title: 'Sample Area Chart',
      xAxisLabel: 'Period',
      yAxisLabel: 'Growth',
      data: [
        { label: 'Q1', value: 20 },
        { label: 'Q2', value: 35 },
        { label: 'Q3', value: 45 },
        { label: 'Q4', value: 55 }
      ],
      colors: ['#3B82F6']
    },
    'donut-chart': {
      title: 'Sample Donut Chart',
      xAxisLabel: '',
      yAxisLabel: '',
      data: [
        { label: 'Sales', value: 40 },
        { label: 'Marketing', value: 25 },
        { label: 'Support', value: 20 },
        { label: 'Dev', value: 15 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    },
    'scatter-plot': {
      title: 'Sample Scatter Plot',
      xAxisLabel: 'X Values',
      yAxisLabel: 'Y Values',
      data: [
        { label: 'A', value: 20, x: 10 },
        { label: 'B', value: 35, x: 25 },
        { label: 'C', value: 45, x: 40 },
        { label: 'D', value: 30, x: 55 }
      ],
      colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B']
    }
  };

  return defaultConfigs[chartType] || defaultConfigs['bar-chart'];
};

export default ChartRenderer;
