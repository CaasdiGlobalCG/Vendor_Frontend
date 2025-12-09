import React, { useState, useMemo } from "react";
// Import necessary chart types and elements from react-chartjs-2 and chart.js
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement, // Needed for Line chart points
  ArcElement,   // Needed for Pie chart segments
  Title,
  Tooltip,
  Legend,
  TimeScale, // Import TimeScale for date handling
  Filler        // Import Filler for area under line chart (optional)
} from "chart.js";
import 'chartjs-adapter-date-fns'; // Import the date adapter
import { format } from 'date-fns'; // Import format function

// Register all necessary components including TimeScale and Filler
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale, // Register TimeScale
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler // Register Filler
);

// --- Color Palette ---
const CHART_COLORS = [
  "#1976D2", "#F88FEB", "#000000", 
  '#4BC0C0', // Teal
  '#FF9F40', // Orange
  '#9966FF',
 
];

// Helper to format currency
const formatCurrency = (value) => {
   // Handle potential non-numeric input gracefully
   const numericValue = Number(value);
   if (isNaN(numericValue)) return 'N/A';
   return new Intl.NumberFormat('en-IN', {
       style: 'currency',
       currency: 'INR',
       maximumFractionDigits: 0
   }).format(numericValue);
};

// Function to filter data based on timeframe
const filterDataByTimeframe = (fullData, timeframe) => {
  if (!fullData || fullData.length === 0) return { filteredRevenueData: [], labels: [], filteredDateObjects: [] };

  const now = new Date();
  let startDate = new Date(); // Will be adjusted based on timeframe

  // Ensure 'now' is set to the end of the current day for inclusive filtering
  now.setHours(23, 59, 59, 999);

  switch (timeframe) {
    case '3m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); // Start of month 3 months ago
      break;
    case '6m':
      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1); // Start of month 6 months ago
      break;
    case '1y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1); // Start of month 1 year ago
      break;
    case '5y':
      startDate = new Date(now.getFullYear() - 5, now.getMonth(), 1); // Start of month 5 years ago
      break;
    case 'all':
    default:
      // Find the earliest date in the data for 'all'
      const earliestDate = new Date(Math.min(...fullData.map(d => new Date(d.date))));
      startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1); // Start of the earliest month
      break;
  }
   // Ensure start date is set to the beginning of the day
   startDate.setHours(0, 0, 0, 0);

  const filtered = fullData
    .map(item => ({ ...item, dateObj: new Date(item.date) })) // Convert date string to Date object once
    .filter(item => item.dateObj >= startDate && item.dateObj <= now)
    .sort((a, b) => a.dateObj - b.dateObj); // Ensure chronological order

  // Generate labels (e.g., 'MMM YYYY') and extract revenue data
  const labels = filtered.map(item => format(item.dateObj, 'MMM yyyy'));
  const revenues = filtered.map(item => item.revenue);
  const dateObjects = filtered.map(item => item.dateObj); // Keep date objects for time scale

  return { filteredRevenueData: revenues, labels, filteredDateObjects: dateObjects };
};

// --- REVISED: Aggregate Data Function ---
const aggregateDataForChart = (revenues, dates, maxSegments = 6) => {
    if (!revenues || revenues.length === 0) {
        return { aggregatedLabels: [], aggregatedRevenues: [] };
    }

    const n = revenues.length;

    // If fewer data points than max segments, return them directly
    if (n <= maxSegments) {
        const labels = dates.map(date => format(date, 'MMM yyyy'));
        return { aggregatedLabels: labels, aggregatedRevenues: revenues };
    }

    const aggregatedSegments = [];
    let currentIndex = 0; // Keep track of the current position in the original data

    // Calculate base size and remainder for distribution
    const baseSegmentSize = Math.floor(n / maxSegments);
    const remainder = n % maxSegments;

    for (let i = 0; i < maxSegments; i++) {
        // Determine the exact size for this segment (distribute remainder)
        const currentSegmentSize = baseSegmentSize + (i < remainder ? 1 : 0);

        // Ensure we don't try to slice beyond the available data
        if (currentIndex >= n) break;

        // Calculate end index for slicing
        const endIndex = Math.min(currentIndex + currentSegmentSize, n);

        // Slice the data for the current segment
        const segmentRevenues = revenues.slice(currentIndex, endIndex);
        const segmentDates = dates.slice(currentIndex, endIndex);

        // Aggregate and format the label
        if (segmentRevenues.length > 0) { // Make sure segment is not empty
            const sumRevenue = segmentRevenues.reduce((acc, val) => acc + val, 0);
            const startDate = segmentDates[0];
            const endDate = segmentDates[segmentDates.length - 1];

            let label = format(startDate, 'MMM yyyy');
            if (segmentDates.length > 1 && format(startDate, 'yyyyMM') !== format(endDate, 'yyyyMM')) {
                label += ` - ${format(endDate, 'MMM yyyy')}`;
            }
            aggregatedSegments.push({ label, revenue: sumRevenue });
        }

        // Move to the next starting index
        currentIndex = endIndex;
    }

    // Safety check: If due to rounding/logic, we have slightly fewer segments than maxSegments
    // but more than 1, this is acceptable. If we have exactly 1 segment when we expected more,
    // it might indicate an issue, but usually the logic handles it.

    return {
        aggregatedLabels: aggregatedSegments.map(s => s.label),
        aggregatedRevenues: aggregatedSegments.map(s => s.revenue)
    };
};

export const RevenueChart = ({ data: fullData }) => {
  const [chartType, setChartType] = useState("bar"); // 'bar', 'line', 'pie'
  const [timeframe, setTimeframe] = useState("1y"); // Default to '1 Year'

  // 1. Get original filtered data based on timeframe
  const { filteredRevenueData, filteredDateObjects } = useMemo(
    () => filterDataByTimeframe(fullData, timeframe),
    [fullData, timeframe]
  );

  // 2. Aggregate data specifically for Bar and Pie charts (max 6 segments)
  const { aggregatedLabels, aggregatedRevenues } = useMemo(
    () => aggregateDataForChart(filteredRevenueData, filteredDateObjects, 6),
    [filteredRevenueData, filteredDateObjects] // Depends on the output of the first memo
  );

  // 3. Calculate total revenue from the original filtered data
  const totalRevenue = useMemo(
    () => filteredRevenueData.reduce((sum, rev) => sum + rev, 0),
    [filteredRevenueData]
  );

  // --- Chart Data Configurations (uses aggregatedLabels/Revenues for bar/pie) ---
   const chartDataConfigs = useMemo(() => ({ // Wrap in useMemo for dependency tracking
     bar: {
       labels: aggregatedLabels,
       datasets: [{ data: aggregatedRevenues, backgroundColor: CHART_COLORS, borderRadius: 5, borderSkipped: false }],
     },
     line: {
       datasets: [{
           data: filteredDateObjects.map((date, index) => ({ x: date, y: filteredRevenueData[index] })),
           fill: true, backgroundColor: CHART_COLORS[4], borderColor: CHART_COLORS[4],
           tension: 0.3, pointBackgroundColor: CHART_COLORS[4], pointBorderColor: "#F88FEB",
           pointHoverBackgroundColor: "#F88FEB", pointHoverBorderColor: CHART_COLORS[4],
           pointRadius: timeframe === '3m' || timeframe === '6m' ? 3 : 1, pointHoverRadius: 5,
       }],
     },
     pie: {
       // Use aggregated data for pie chart as well for consistency
       labels: aggregatedLabels,
       datasets: [{ data: aggregatedRevenues, backgroundColor: CHART_COLORS, borderColor: "#ffffff", borderWidth: 2, hoverOffset: 6 }],
     },
   }), [aggregatedLabels, aggregatedRevenues, filteredDateObjects, filteredRevenueData, timeframe]); // Add dependencies


  // --- Chart Options Configurations (remain the same) ---
   const commonOptions = useMemo(() => ({ // Wrap options in useMemo as well
     responsive: true,
     maintainAspectRatio: false,
     plugins: {
        legend: { display: chartType === 'pie', position: 'top', labels: { padding: 15 } },
        tooltip: {
           enabled: true, backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 14 },
           bodyFont: { size: 12 }, padding: 10, cornerRadius: 4, intersect: false, mode: 'index',
           callbacks: {
              title: (tooltipItems) => {
                 if (chartType === 'bar' || chartType === 'pie') return tooltipItems[0].label;
                 if (tooltipItems[0]?.parsed?.x) return format(new Date(tooltipItems[0].parsed.x), 'MMMM yyyy');
                 return '';
              },
              label: (context) => {
                 let value = 0;
                 if (chartType === 'pie') value = context.parsed;
                 else if (chartType === 'bar' || chartType === 'line') value = context.parsed?.y;
                 return formatCurrency(value);
              }
           }
        },
     },
     interaction: { mode: 'index', intersect: false },
   }), [chartType]); // Dependency on chartType for legend display

   const chartOptionsConfigs = useMemo(() => ({
     bar: {
        ...commonOptions,
        scales: {
           x: { type: 'category', grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true, autoSkipPadding: 5 } },
           y: { display: false, grid: { color: '#e5e7eb' }, ticks: { color: '#6b7280' }, beginAtZero: true },
        },
     },
     line: {
        ...commonOptions,
        scales: {
           x: { type: 'time', time: { unit: timeframe === '5y' || timeframe === 'all' ? 'year' : 'month', tooltipFormat: 'MMM dd, yyyy', displayFormats: { month: 'MMM yyyy', year: 'yyyy' } }, grid: { display: false }, ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true, autoSkipPadding: 20 } },
           y: { display: false, grid: { color: '#e5e7eb' }, ticks: { color: '#6b7280' }, beginAtZero: true },
        },
     },
     pie: { ...commonOptions },
   }), [commonOptions, timeframe]); // Depends on commonOptions and timeframe (for line scale unit)


  // Function to render the selected chart
  const renderChart = () => {
     // Check aggregated data for bar/pie, filtered for line
     const noData = chartType === 'line'
         ? (!filteredRevenueData || filteredRevenueData.length === 0)
         : (!aggregatedRevenues || aggregatedRevenues.length === 0);

     if (noData) {
         return <div className="flex items-center justify-center h-full text-gray-500">No data available for selected period.</div>;
     }

    const currentData = chartDataConfigs[chartType];
    const currentOptions = chartOptionsConfigs[chartType];

    switch (chartType) {
      case "line": return <Line data={currentData} options={currentOptions} />;
      case "pie": return <Pie data={currentData} options={currentOptions} />;
      case "bar": default: return <Bar data={currentData} options={currentOptions} />;
    }
  };

  const selectBaseClasses = "appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-1.5 sm:p-2 pr-8 cursor-pointer";

  return (
    <div className="bg-white p-4 sm:p-6 rounded-[20px] shadow-lg"> {/* Adjusted padding and shadow */}
      {/* Header Section */}<div className="text-red-500 text-xs">Note: It's Just for example purpose</div>
      <div className="flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-4 mb-4"> {/* Changed to items-start */}
        {/* Left Side: Title & Total Revenue */}
        <div className="flex flex-col">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Revenue</h2>
          <p className="text-xs sm:text-sm font-medium text-gray-500">
            Total ({timeframe}):{" "} {/* Indicate timeframe in total */}
            <span className="text-base sm:text-lg font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
          </p>
        </div>

        {/* Right Side: Selectors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
           {/* Timeframe Selector */}
           <div className="relative flex-grow sm:flex-grow-0">
             <select
               value={timeframe}
               onChange={(e) => setTimeframe(e.target.value)}
               aria-label="Select time frame"
               className={`${selectBaseClasses} w-full min-w-[100px] sm:min-w-[120px]`} // Adjusted width
             >
               <option value="3m">3 Months</option>
               <option value="6m">6 Months</option>
               <option value="1y">1 Year</option>
               <option value="5y">5 Years</option>
               <option value="all">Overall</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
               <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
           </div>
           {/* Chart Type Selector */}
           <div className="relative flex-grow sm:flex-grow-0">
             <select
               value={chartType}
               onChange={(e) => setChartType(e.target.value)}
               aria-label="Select chart type"
               className={`${selectBaseClasses} w-full min-w-[100px] sm:min-w-[120px]`} // Adjusted width
             >
               <option value="bar">Bar Chart</option>
               <option value="line">Line Chart</option>
               <option value="pie">Pie Chart</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
               <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
           </div>
        </div>
      </div>

      {/* Chart container - Responsive Height */}
      <div className="h-[200px] sm:h-[250px] md:h-[300px] w-full"> {/* Increased height slightly */}
        {renderChart()}
      </div>

       {/* Labels below chart (Now removed, handled by TimeScale axis) */}
       {/* You might add custom legends or summaries here if needed */}

    </div>
  );
};
