import React, { useEffect, useState, useMemo } from "react";
import { BarChart3, CircleDollarSign, TrendingUp } from "lucide-react";
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
  "#0f766e",
  "#10b981",
  "#84cc16",
  "#f59e0b",
  "#0f172a",
  "#94a3b8",
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
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
     events: isMobileViewport ? [] : undefined,
     plugins: {
        legend: {
          display: chartType === 'pie',
          position: 'top',
          labels: {
            padding: isMobileViewport ? 10 : 15,
            boxWidth: isMobileViewport ? 10 : 14,
            font: { size: isMobileViewport ? 10 : 12 },
          },
        },
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
  }), [chartType, isMobileViewport]); // Dependency on chartType for legend display

   const chartOptionsConfigs = useMemo(() => ({
     bar: {
        ...commonOptions,
        scales: {
           x: {
             type: 'category',
             grid: { display: false },
             ticks: {
               color: '#6b7280',
               maxRotation: 0,
               autoSkip: true,
               autoSkipPadding: isMobileViewport ? 10 : 5,
               font: { size: isMobileViewport ? 10 : 12 },
             },
           },
           y: { display: false, grid: { color: '#e5e7eb' }, ticks: { color: '#6b7280' }, beginAtZero: true },
        },
     },
     line: {
        ...commonOptions,
        scales: {
           x: {
             type: 'time',
             time: {
               unit: timeframe === '5y' || timeframe === 'all' ? 'year' : 'month',
               tooltipFormat: 'MMM dd, yyyy',
               displayFormats: { month: 'MMM yyyy', year: 'yyyy' },
             },
             grid: { display: false },
             ticks: {
               color: '#6b7280',
               maxRotation: 0,
               autoSkip: true,
               autoSkipPadding: isMobileViewport ? 10 : 20,
               font: { size: isMobileViewport ? 10 : 12 },
             },
           },
           y: { display: false, grid: { color: '#e5e7eb' }, ticks: { color: '#6b7280' }, beginAtZero: true },
        },
     },
     pie: { ...commonOptions },
   }), [commonOptions, timeframe, isMobileViewport]); // Depends on commonOptions and timeframe (for line scale unit)


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

  const selectBaseClasses = "appearance-none rounded-full border border-slate-200 bg-white px-4 py-2 pr-9 text-xs font-medium text-slate-700 shadow-sm transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:text-sm";
  const timeframeOptions = [
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '5y', label: '5Y' },
    { value: 'all', label: 'All' },
  ];
  const chartTypeOptions = [
    { value: 'bar', label: 'Bar' },
    { value: 'line', label: 'Line' },
    { value: 'pie', label: 'Pie' },
  ];

  return (
    <div className="rounded-[30px] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mb-5 rounded-[26px] border border-emerald-100 bg-[linear-gradient(135deg,#f8fffc_0%,#effbf5_50%,#ffffff_100%)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium text-emerald-700">Revenue trend</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Financial overview</h2>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              Review the selected revenue window, compare overall performance, and switch chart styles without leaving the dashboard.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 shadow-sm">
            <CircleDollarSign size={14} />
            Revenue snapshot
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
          <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <CircleDollarSign size={15} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Selected total</p>
            </div>
            <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-900 sm:text-[1.5rem]">{formatCurrency(totalRevenue)}</p>
          </div>

          <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <TrendingUp size={15} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Range</p>
            </div>
            <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[1.1rem] font-semibold uppercase tracking-[-0.03em] text-slate-900 sm:text-[1.5rem]">{timeframe}</p>
          </div>

          <div className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm col-span-2 xl:col-span-1">
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 size={15} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Chart</p>
            </div>
            <p className="mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-[1.1rem] font-semibold capitalize tracking-[-0.03em] text-slate-900 sm:text-[1.5rem]">{chartType}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-col gap-1">
          <p className="text-[13px] font-medium text-slate-700">Visualization controls</p>
          <p className="text-xs text-slate-500">Choose the time window and chart type for this panel.</p>
        </div>

        <div className="space-y-3 sm:hidden">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Timeframe</p>
            <div className="grid grid-cols-3 gap-2">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeframe(option.value)}
                  className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${timeframe === option.value ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-200 hover:text-emerald-700'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Chart type</p>
            <div className="grid grid-cols-3 gap-2">
              {chartTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setChartType(option.value)}
                  className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${chartType === option.value ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden grid-cols-1 gap-2 sm:grid sm:grid-cols-2">
           <div className="relative min-w-0">
             <select
               value={timeframe}
               onChange={(e) => setTimeframe(e.target.value)}
               aria-label="Select time frame"
               className={`${selectBaseClasses} w-full`}
             >
               <option value="3m">3 Months</option>
               <option value="6m">6 Months</option>
               <option value="1y">1 Year</option>
               <option value="5y">5 Years</option>
               <option value="all">Overall</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
               <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
           </div>
           <div className="relative min-w-0">
             <select
               value={chartType}
               onChange={(e) => setChartType(e.target.value)}
               aria-label="Select chart type"
               className={`${selectBaseClasses} w-full`}
             >
               <option value="bar">Bar Chart</option>
               <option value="line">Line Chart</option>
               <option value="pie">Pie Chart</option>
             </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
               <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
             </div>
           </div>
        </div>
      </div>

      <div className="h-[240px] w-full touch-pan-y rounded-[24px] border border-slate-200 bg-white p-3 sm:h-[260px] md:h-[300px] xl:h-[320px] sm:p-4">
        {renderChart()}
      </div>

    </div>
  );
};
