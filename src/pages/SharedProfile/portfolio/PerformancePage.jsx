import React, { useRef, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Performance page — Magazine spread with Chart.js charts, metric cards, growth indicators.
 * Reference: Business growth page with charts, stats, gradient accents.
 */

let Chart;
try { Chart = require('chart.js/auto'); } catch(e) {}

export default function PerformancePage({ salesMetrics, forecastData, accentColor = '#F5A623' }) {
  const lineRef = useRef(null);
  const pieRef = useRef(null);
  const lineChartRef = useRef(null);
  const pieChartRef = useRef(null);

  const metrics = salesMetrics || {};
  const forecast = forecastData || {};

  // Summary stats
  const summaryStats = [
    { label: 'Revenue', value: metrics.totalRevenue || metrics.revenue || 'N/A', trend: 'up' },
    { label: 'Growth', value: metrics.growthRate || metrics.growth || 'N/A', trend: 'up' },
    { label: 'Clients', value: metrics.totalClients || metrics.clients || 'N/A', trend: 'up' },
    { label: 'Orders', value: metrics.totalOrders || metrics.orders || 'N/A', trend: 'up' },
  ];

  useEffect(() => {
    if (!Chart) return;

    // Line chart
    if (lineRef.current) {
      if (lineChartRef.current) lineChartRef.current.destroy();
      const labels = forecast.labels || forecast.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const data = forecast.values || forecast.data || [30, 45, 35, 55, 48, 65];
      lineChartRef.current = new Chart(lineRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Performance',
            data,
            borderColor: accentColor,
            backgroundColor: `${accentColor}15`,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: accentColor,
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 9 } } },
            y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 9 } } }
          }
        }
      });
    }

    // Pie chart
    if (pieRef.current) {
      if (pieChartRef.current) pieChartRef.current.destroy();
      const pieLabels = metrics.categoryLabels || ['Products', 'Services', 'Consulting', 'Other'];
      const pieData = metrics.categoryValues || [40, 30, 20, 10];
      pieChartRef.current = new Chart(pieRef.current, {
        type: 'doughnut',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieData,
            backgroundColor: [accentColor, '#1a1a1a', '#666', '#ddd'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 9 }, padding: 10, usePointStyle: true, pointStyleWidth: 8 } }
          }
        }
      });
    }

    return () => {
      if (lineChartRef.current) lineChartRef.current.destroy();
      if (pieChartRef.current) pieChartRef.current.destroy();
    };
  }, [accentColor, forecast, metrics]);

  return (
    <div pageTitle="Performance" className="bg-white relative overflow-hidden" style={{ minHeight: '1123px' }}>
      {/* ===== HEADER ===== */}
      <div className="relative bg-gray-900 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 160" preserveAspectRatio="none">
          <polygon points="0,160 400,0 800,160" fill={accentColor} />
        </svg>
        <div className="px-10 md:px-14 py-8 relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-[3px]" style={{ backgroundColor: accentColor }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Analytics</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Business <span className="italic font-light" style={{ color: accentColor }}>Performance</span>
          </h2>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="px-10 md:px-14 -mt-1">
        <div className="grid grid-cols-4 gap-3">
          {summaryStats.map((stat, i) => (
            <div key={i} className="p-4 rounded-sm border border-gray-100 bg-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1"
                style={{ backgroundColor: i === 0 ? accentColor : 'transparent' }} />
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-gray-900">{stat.value}</span>
                {stat.trend === 'up' ? (
                  <ArrowUpRight size={12} className="text-green-500" />
                ) : (
                  <ArrowDownRight size={12} className="text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== CHARTS SECTION ===== */}
      <div className="px-10 md:px-14 py-6">
        <div className="grid grid-cols-5 gap-5">
          {/* Line chart */}
          <div className="col-span-3 p-5 border border-gray-100 rounded-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: accentColor }} />
              <span className="text-xs font-bold text-gray-900">Growth Trend</span>
            </div>
            <div className="h-[200px]">
              <canvas ref={lineRef} />
            </div>
          </div>

          {/* Pie chart */}
          <div className="col-span-2 p-5 border border-gray-100 rounded-sm">
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={14} style={{ color: accentColor }} />
              <span className="text-xs font-bold text-gray-900">Revenue Split</span>
            </div>
            <div className="h-[200px]">
              <canvas ref={pieRef} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== INSIGHT BAR ===== */}
      <div className="px-10 md:px-14">
        <div className="p-5 rounded-sm relative overflow-hidden" style={{ backgroundColor: accentColor }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="flex items-center gap-4 relative z-10">
            <BarChart3 size={20} className="text-white flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-bold">Key Insight</p>
              <p className="text-white/70 text-[10px] leading-relaxed">
                Performance metrics indicate a positive growth trajectory across all key business segments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-2 flex">
        <div className="w-24" style={{ backgroundColor: accentColor }} />
        <div className="flex-1 bg-gray-900" />
      </div>
    </div>
  );
}
