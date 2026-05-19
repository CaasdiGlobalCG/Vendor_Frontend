import React, { useState, useMemo } from "react";
import { X, BarChart3, CircleDollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, FileText, Download } from "lucide-react";
import { Bar, Line, Pie, Doughnut } from "react-chartjs-2";
import { format } from 'date-fns';

// --- Color Palette (matching RevenueChart) ---
const CHART_COLORS = [
  "#0f766e",
  "#10b981",
  "#84cc16",
  "#f59e0b",
  "#0f172a",
  "#94a3b8",
  "#06b6d4",
  "#8b5cf6",
];

const formatCurrency = (value) => {
   const numericValue = Number(value);
   if (isNaN(numericValue)) return 'N/A';
   return new Intl.NumberFormat('en-IN', {
       style: 'currency',
       currency: 'INR',
       maximumFractionDigits: 0
   }).format(numericValue);
};

// Placeholder data generators
const generateMonthlyRevenue = () => [
  { month: 'Jan 2025', revenue: 450000, expenses: 320000 },
  { month: 'Feb 2025', revenue: 520000, expenses: 350000 },
  { month: 'Mar 2025', revenue: 480000, expenses: 310000 },
  { month: 'Apr 2025', revenue: 610000, expenses: 380000 },
  { month: 'May 2025', revenue: 580000, expenses: 360000 },
  { month: 'Jun 2025', revenue: 720000, expenses: 420000 },
  { month: 'Jul 2025', revenue: 680000, expenses: 400000 },
  { month: 'Aug 2025', revenue: 750000, expenses: 430000 },
  { month: 'Sep 2025', revenue: 810000, expenses: 460000 },
  { month: 'Oct 2025', revenue: 790000, expenses: 450000 },
  { month: 'Nov 2025', revenue: 920000, expenses: 510000 },
  { month: 'Dec 2025', revenue: 1050000, expenses: 580000 },
];

const generateRevenueBySource = () => [
  { label: 'Infrastructure Projects', value: 4200000, color: '#0f766e' },
  { label: 'Material Supply', value: 3100000, color: '#10b981' },
  { label: 'Consulting Services', value: 1800000, color: '#84cc16' },
  { label: 'Maintenance Contracts', value: 1200000, color: '#f59e0b' },
  { label: 'Tender Winnings', value: 950000, color: '#0f172a' },
  { label: 'Other', value: 450000, color: '#94a3b8' },
];

const generateRecentTransactions = () => [
  { id: 'TXN-2025-001', description: 'Project milestone payment - NH-27 Highway', date: '2025-01-15', amount: 1250000, type: 'income', status: 'completed' },
  { id: 'TXN-2025-002', description: 'Material supply - Smart City Phase 2', date: '2025-01-12', amount: 780000, type: 'income', status: 'completed' },
  { id: 'TXN-2025-003', description: 'Equipment procurement - Heavy machinery', date: '2025-01-10', amount: -450000, type: 'expense', status: 'completed' },
  { id: 'TXN-2025-004', description: 'Consulting fee - MCD Waste Management', date: '2025-01-08', amount: 320000, type: 'income', status: 'pending' },
  { id: 'TXN-2025-005', description: 'Subcontractor payment - Track electrification', date: '2025-01-05', amount: -620000, type: 'expense', status: 'completed' },
  { id: 'TXN-2025-006', description: 'Tender advance - Airport Terminal Renovation', date: '2025-01-02', amount: 2100000, type: 'income', status: 'completed' },
  { id: 'TXN-2025-007', description: 'Software licenses - Project management tools', date: '2024-12-28', amount: -85000, type: 'expense', status: 'completed' },
  { id: 'TXN-2025-008', description: 'Maintenance contract renewal - Q1 2025', date: '2024-12-25', amount: 540000, type: 'income', status: 'completed' },
];

const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        padding: 15,
        boxWidth: 12,
        font: { size: 12, family: 'inherit' },
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleFont: { size: 13, weight: '600' },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context) => formatCurrency(context.parsed?.y ?? context.parsed ?? 0),
      },
    },
  },
};

export function RevenueDetailModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  const monthlyData = useMemo(() => generateMonthlyRevenue(), []);
  const revenueBySource = useMemo(() => generateRevenueBySource(), []);
  const transactions = useMemo(() => generateRecentTransactions(), []);

  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1);

  const revenueGrowth = 23.5;
  const expenseGrowth = 12.8;

  // Chart data configurations
  const revenueExpenseChartData = useMemo(() => ({
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyData.map(d => d.revenue),
        backgroundColor: '#0f766e',
        borderColor: '#0f766e',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: monthlyData.map(d => d.expenses),
        backgroundColor: '#e2e8f0',
        borderColor: '#94a3b8',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }), [monthlyData]);

  const revenueExpenseChartOptions = {
    ...commonChartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        display: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value) => `₹${(value / 100000).toFixed(1)}L`,
        },
      },
    },
  };

  const trendLineData = useMemo(() => ({
    labels: monthlyData.map(d => d.month),
    datasets: [
      {
        label: 'Revenue Trend',
        data: monthlyData.map(d => d.revenue),
        fill: true,
        backgroundColor: 'rgba(15, 118, 110, 0.08)',
        borderColor: '#0f766e',
        borderWidth: 2.5,
        tension: 0.4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0f766e',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Profit Trend',
        data: monthlyData.map(d => d.revenue - d.expenses),
        fill: false,
        borderColor: '#10b981',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  }), [monthlyData]);

  const trendLineOptions = {
    ...commonChartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        display: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value) => `₹${(value / 100000).toFixed(1)}L`,
        },
      },
    },
  };

  const sourceDoughnutData = useMemo(() => ({
    labels: revenueBySource.map(d => d.label),
    datasets: [{
      data: revenueBySource.map(d => d.value),
      backgroundColor: revenueBySource.map(d => d.color),
      borderColor: '#ffffff',
      borderWidth: 3,
      hoverOffset: 10,
    }],
  }), [revenueBySource]);

  const sourceDoughnutOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          boxWidth: 14,
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        ...commonChartOptions.plugins.tooltip,
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${formatCurrency(value)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] my-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-[28px] border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-sm sm:px-8">
          <div>
            <p className="text-xs font-medium text-emerald-700">Revenue analytics</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Financial overview — detailed view</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Comprehensive breakdown of revenue streams, expenses, and profitability trends.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {}}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Download size={16} />
              Export report
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:px-8 sm:py-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <CircleDollarSign size={15} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Total revenue</p>
              </div>
              <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">{formatCurrency(totalRevenue)}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <ArrowUpRight size={12} />
                +{revenueGrowth}%
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <TrendingUp size={15} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Net profit</p>
              </div>
              <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">{formatCurrency(netProfit)}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <ArrowUpRight size={12} />
                {profitMargin}%
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <BarChart3 size={15} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Total expenses</p>
              </div>
              <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">{formatCurrency(totalExpenses)}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                <ArrowUpRight size={12} />
                +{expenseGrowth}%
              </div>
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar size={15} />
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Active projects</p>
              </div>
              <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">24</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                <ArrowUpRight size={12} />
                8 this quarter
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Revenue vs Expenses */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Revenue vs Expenses</h3>
                <p className="text-xs text-slate-500">Monthly comparison for the current fiscal year</p>
              </div>
              <div className="h-[280px] w-full">
                <Bar data={revenueExpenseChartData} options={revenueExpenseChartOptions} />
              </div>
            </div>

            {/* Trend Line */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Revenue & Profit Trend</h3>
                <p className="text-xs text-slate-500">Trailing 12-month performance curve</p>
              </div>
              <div className="h-[280px] w-full">
                <Line data={trendLineData} options={trendLineOptions} />
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Revenue by Source */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Revenue by source</h3>
                <p className="text-xs text-slate-500">Breakdown by business segment</p>
              </div>
              <div className="h-[260px] w-full">
                <Doughnut data={sourceDoughnutData} options={sourceDoughnutOptions} />
              </div>
              {/* Legend as list */}
              <div className="mt-4 space-y-2">
                {revenueBySource.map((item, idx) => {
                  const total = revenueBySource.reduce((s, i) => s + i.value, 0);
                  const pct = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.label}</span>
                      </div>
                      <span className="font-medium text-slate-900">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="lg:col-span-2 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Recent transactions</h3>
                  <p className="text-xs text-slate-500">Latest income and expense entries</p>
                </div>
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                  View all
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            {tx.date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <FileText size={12} />
                            {tx.id}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {tx.type === 'income' ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 rounded-[18px] border border-emerald-100 bg-emerald-50/50 p-4 text-center">
            <p className="text-xs text-emerald-700">
              This view shows placeholder data for UI confirmation. Connect real data endpoints once the layout is approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
