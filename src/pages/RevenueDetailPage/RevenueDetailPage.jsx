import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import authFetch from "../../utils/authFetch";
import {
  BarChart3,
  CircleDollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText,
  Download,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Bar, Line, Doughnut } from "react-chartjs-2";

// --- Color Palette ---
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
  if (isNaN(numericValue)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
      labels: {
        padding: 15,
        boxWidth: 12,
        font: { size: 12, family: "inherit" },
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor: "rgba(15, 23, 42, 0.9)",
      titleFont: { size: 13, weight: "600" },
      bodyFont: { size: 12 },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context) => formatCurrency(context.parsed?.y ?? context.parsed ?? 0),
      },
    },
  },
  interaction: { mode: "index", intersect: false },
};

export default function RevenueDetailPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [financeData, setFinanceData] = useState(null);

  // Fetch finance overview data
  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await authFetch('/api/finance/overview');

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          setFinanceData(result.data);
        } else {
          throw new Error(result.message || 'Failed to fetch financial data');
        }
      } catch (err) {
        console.error('Error fetching finance data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  // Use fetched data or fallback to empty state
  const monthlyData = financeData?.monthlyData || [];
  const revenueBySource = financeData?.revenueBySource || [];
  const transactions = financeData?.recentTransactions || [];
  const summary = financeData?.summary || {
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    revenueGrowth: 0,
    expenseGrowth: 0,
    activeStreams: 0
  };

  const totalRevenue = summary.totalRevenue;
  const totalExpenses = summary.totalExpenses;
  const netProfit = summary.netProfit;
  const profitMargin = summary.profitMargin.toFixed(1);
  const revenueGrowth = summary.revenueGrowth;
  const expenseGrowth = summary.expenseGrowth;
  const activeStreams = summary.activeStreams;

  // Chart data configurations
  const revenueExpenseChartData = useMemo(
    () => ({
      labels: monthlyData.map((d) => d.month),
      datasets: [
        {
          label: "Revenue",
          data: monthlyData.map((d) => d.totalRevenue),
          backgroundColor: "#0f766e",
          borderColor: "#0f766e",
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: "Expenses",
          data: monthlyData.map((d) => d.totalExpenses),
          backgroundColor: "#e2e8f0",
          borderColor: "#94a3b8",
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    }),
    [monthlyData]
  );

  const revenueExpenseChartOptions = {
    ...commonChartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        display: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (value) => `₹${(value / 100000).toFixed(1)}L`,
        },
      },
    },
  };

  const trendLineData = useMemo(
    () => ({
      labels: monthlyData.map((d) => d.month),
      datasets: [
        {
          label: "Revenue Trend",
          data: monthlyData.map((d) => d.totalRevenue),
          fill: true,
          backgroundColor: "rgba(15, 118, 110, 0.08)",
          borderColor: "#0f766e",
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#0f766e",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: "Profit Trend",
          data: monthlyData.map((d) => d.netProfit),
          fill: false,
          borderColor: "#10b981",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    }),
    [monthlyData]
  );

  const trendLineOptions = {
    ...commonChartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        display: true,
        grid: { color: "#f1f5f9" },
        ticks: {
          color: "#64748b",
          font: { size: 11 },
          callback: (value) => `₹${(value / 100000).toFixed(1)}L`,
        },
      },
    },
  };

  const sourceDoughnutData = useMemo(
    () => ({
      labels: revenueBySource.map((d) => d.label),
      datasets: [
        {
          data: revenueBySource.map((d) => d.value),
          backgroundColor: revenueBySource.map((d) => d.color),
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 10,
        },
      ],
    }),
    [revenueBySource]
  );

  const sourceDoughnutOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      legend: {
        position: "right",
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
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatCurrency(value)} (${pct}%)`;
          },
        },
      },
    },
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading financial data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6">
          <AlertCircle className="h-8 w-8 text-rose-600" />
          <p className="text-sm font-medium text-rose-900">Failed to load financial data</p>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-10 pt-4 sm:p-5 sm:pb-24">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-emerald-700">Revenue analytics</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Financial overview — detailed view
          </h1>
          <p className="mt-1 text-[13px] text-slate-500">
            Comprehensive breakdown of revenue streams, expenses, and profitability trends.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/VendorDashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
          <button className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
            <Download size={16} />
            Export report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <CircleDollarSign size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Total revenue</p>
          </div>
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">
            {formatCurrency(totalRevenue)}
          </p>
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
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">
            {formatCurrency(netProfit)}
          </p>
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
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">
            {formatCurrency(totalExpenses)}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            <ArrowUpRight size={12} />
            +{expenseGrowth}%
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <BarChart3 size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Active streams</p>
          </div>
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">{activeStreams}</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
            <span className="text-slate-600">Revenue sources</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
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
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600">{item.label}</span>
                  </div>
                  <span className="font-medium text-slate-900">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
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
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-lg p-2 ${
                        tx.type === "income"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {tx.type === "income" ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(tx.date)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileText size={12} />
                          {tx.id}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        tx.type === "income" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {tx.type === "income" ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        tx.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
