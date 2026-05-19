import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import authFetch from "../../utils/authFetch";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
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
  FileSpreadsheet,
  X,
  ChevronDown,
} from "lucide-react";
import { Bar, Line, Doughnut } from "react-chartjs-2";

// --- Color Palette ---
const CHART_COLORS = [
  "#0f766e",
  "#1e40af",
  "#7c3aed",
  "#be123c",
  "#047857",
  "#b45309",
  "#1e3a8a",
  "#9d174d",
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [viewMode, setViewMode] = useState('revenue');
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
  const [dateRange, setDateRange] = useState('all'); // 'all', '30days', '90days', 'quarter', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionFilters, setTransactionFilters] = useState({
    type: 'all', // 'all', 'income', 'expense'
    source: 'all', // 'all', 'Workspace Invoices', 'Workspace Quotes', 'Sales (RFQ Responses)', 'B2B Debit Notes', 'B2B Orders'
    status: 'all', // 'all', 'completed', 'pending'
  });

  // Fetch finance overview data
  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('📊 Frontend: Fetching finance overview data...');
        const response = await authFetch('/api/finance/overview');

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📊 Frontend: Finance data response:', result);
        
        if (result.success) {
          setFinanceData(result.data);
          console.log('📊 Frontend: Finance data set successfully');
          console.log('📊 Frontend - workspace invoices:', result.data?.workspace?.invoices?.length);
          console.log('📊 Frontend - workspace quotes:', result.data?.workspace?.quotes?.length);
          console.log('📊 Frontend - sales quotations:', result.data?.sales?.quotations?.length);
          console.log('📊 Frontend - b2b debit notes:', result.data?.b2b?.debitNotes?.length);
          console.log('📊 Frontend - b2b orders:', result.data?.b2b?.orders?.length);
          console.log('📊 Frontend - summary:', result.data?.summary);
        } else {
          throw new Error(result.message || 'Failed to fetch financial data');
        }
      } catch (err) {
        console.error('📊 Frontend: Error fetching finance data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  const handleExportPDF = async () => {
    if (!financeData) return;
    setExporting(true);
    setShowExportModal(false);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(15, 118, 110);
      doc.text('Financial Overview Report', pageWidth / 2, 20, { align: 'center' });
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 28, { align: 'center' });
      
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Summary', 14, 45);
      
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Revenue', formatCurrency(summary.totalRevenue)],
        ['Total Expenses', formatCurrency(summary.totalExpenses)],
        ['Net Profit', formatCurrency(summary.netProfit)],
        ['Profit Margin', `${summary.profitMargin.toFixed(1)}%`],
        ['Revenue Growth', `+${summary.revenueGrowth}%`],
        ['Expense Growth', `+${summary.expenseGrowth}%`],
        ['Active Streams', summary.activeStreams],
      ];
      
      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Value']],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110] },
        styles: { fontSize: 10 },
      });
      
      // Monthly Data
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Monthly Revenue & Expenses', 14, doc.lastAutoTable.finalY + 15);
      
      const monthlyRows = monthlyData.map(d => [
        d.month,
        formatCurrency(d.totalRevenue),
        formatCurrency(d.totalExpenses),
        formatCurrency(d.netProfit),
      ]);
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Month', 'Revenue', 'Expenses', 'Net Profit']],
        body: monthlyRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110] },
        styles: { fontSize: 9 },
      });
      
      // Revenue by Source
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Revenue by Source', 14, 20);
      
      const totalRevenue = revenueBySource.reduce((sum, item) => sum + item.value, 0);
      const sourceRows = revenueBySource.map(item => {
        const pct = totalRevenue > 0 ? ((item.value / totalRevenue) * 100).toFixed(1) : '0.0';
        return [item.label, formatCurrency(item.value), `${pct}%`];
      });
      
      autoTable(doc, {
        startY: 30,
        head: [['Source', 'Amount', 'Percentage']],
        body: sourceRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110] },
        styles: { fontSize: 10 },
      });
      
      // Recent Transactions
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Recent Transactions', 14, doc.lastAutoTable.finalY + 15);
      
      const transactionRows = transactions.map(tx => [
        formatDate(tx.date),
        tx.description,
        tx.id,
        tx.type === 'income' ? '+' : '-',
        formatCurrency(Math.abs(tx.amount)),
        tx.status,
      ]);
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Description', 'ID', 'Type', 'Amount', 'Status']],
        body: transactionRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 118, 110] },
        styles: { fontSize: 8 },
        columnStyles: {
          3: { fontStyle: 'bold' },
          4: { halign: 'right' },
        },
      });
      
      // Save
      doc.save(`financial-overview-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!financeData) return;
    setExporting(true);
    setShowExportModal(false);
    
    try {
      const workbook = XLSX.utils.book_new();
      
      // Summary Sheet
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Revenue', summary.totalRevenue],
        ['Total Expenses', summary.totalExpenses],
        ['Net Profit', summary.netProfit],
        ['Profit Margin (%)', summary.profitMargin],
        ['Revenue Growth (%)', summary.revenueGrowth],
        ['Expense Growth (%)', summary.expenseGrowth],
        ['Active Streams', summary.activeStreams],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');
      
      // Monthly Data Sheet
      const monthlyDataRows = [
        ['Month', 'Workspace Revenue', 'Workspace Quotes', 'Sales Revenue', 'B2B Spend', 'Total Revenue', 'Total Expenses', 'Net Profit'],
        ...monthlyData.map(d => [
          d.month,
          d.workspaceRevenue,
          d.workspaceQuoteValue,
          d.salesRevenue,
          d.b2bSpend,
          d.totalRevenue,
          d.totalExpenses,
          d.netProfit,
        ]),
      ];
      const monthlyWs = XLSX.utils.aoa_to_sheet(monthlyDataRows);
      XLSX.utils.book_append_sheet(workbook, monthlyWs, 'Monthly Data');
      
      // Revenue by Source Sheet
      const totalRevenue = revenueBySource.reduce((sum, item) => sum + item.value, 0);
      const sourceRows = [
        ['Source', 'Amount', 'Percentage (%)'],
        ...revenueBySource.map(item => {
          const pct = totalRevenue > 0 ? ((item.value / totalRevenue) * 100) : 0;
          return [item.label, item.value, pct.toFixed(2)];
        }),
      ];
      const sourceWs = XLSX.utils.aoa_to_sheet(sourceRows);
      XLSX.utils.book_append_sheet(workbook, sourceWs, 'Revenue by Source');
      
      // Transactions Sheet
      const transactionRows = [
        ['Date', 'Description', 'ID', 'Type', 'Amount', 'Status', 'Source'],
        ...transactions.map(tx => [
          tx.date,
          tx.description,
          tx.id,
          tx.type,
          tx.amount,
          tx.status,
          tx.source,
        ]),
      ];
      const transactionsWs = XLSX.utils.aoa_to_sheet(transactionRows);
      XLSX.utils.book_append_sheet(workbook, transactionsWs, 'Transactions');
      
      // Save
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `financial-overview-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Failed to generate Excel report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Use fetched data or fallback to empty state
  const monthlyData = financeData?.monthlyData || [];
  const transactions = financeData?.recentTransactions || [];
  const workspaceInvoices = financeData?.workspace?.invoices || [];
  const workspaceQuotes = financeData?.workspace?.quotes || [];
  const salesQuotations = financeData?.sales?.quotations || [];
  const b2bDebitNotes = financeData?.b2b?.debitNotes || [];
  const b2bOrders = financeData?.b2b?.orders || [];
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
  const previewTransactions = transactions.slice(0, 5);

  // Filter data based on date range
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = null;

    switch (dateRange) {
      case '30days':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90days':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate);
        break;
      default:
        startDate = null; // all time
    }

    const filterByDate = (items) => {
      if (!startDate) return items;
      return items.filter(item => {
        const itemDate = item.invoiceDate || item.quoteDate || item.createdAt || item.poDate || item.date;
        return itemDate && new Date(itemDate) >= startDate;
      });
    };

    return {
      workspaceInvoices: filterByDate(workspaceInvoices),
      workspaceQuotes: filterByDate(workspaceQuotes),
      salesQuotations: filterByDate(salesQuotations),
      b2bDebitNotes: filterByDate(b2bDebitNotes),
      b2bOrders: filterByDate(b2bOrders),
      monthlyData: monthlyData.filter(m => {
        if (!startDate) return true;
        const monthDate = new Date(m.month + ', 2024');
        return monthDate >= startDate;
      }),
      transactions: filterByDate(transactions),
    };
  }, [workspaceInvoices, workspaceQuotes, salesQuotations, b2bDebitNotes, b2bOrders, monthlyData, transactions, dateRange, customStartDate]);

  const filteredWorkspaceInvoices = filteredData.workspaceInvoices;
  const filteredWorkspaceQuotes = filteredData.workspaceQuotes;
  const filteredSalesQuotations = filteredData.salesQuotations;
  const filteredB2bDebitNotes = filteredData.b2bDebitNotes;
  const filteredB2bOrders = filteredData.b2bOrders;
  const filteredMonthlyData = filteredData.monthlyData;
  const filteredTransactions = filteredData.transactions;

  // Calculate revenueBySource from filtered data
  const revenueBySource = useMemo(() => {
    const workspaceInvoiceRevenue = filteredWorkspaceInvoices.reduce((sum, inv) => {
      const amount = typeof inv.total === 'string' ? parseFloat(inv.total.replace(/,/g, '')) : inv.total;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const workspaceQuoteRevenue = filteredWorkspaceQuotes.reduce((sum, quote) => {
      const amount = typeof quote.total === 'string' ? parseFloat(quote.total.replace(/,/g, '')) : quote.total;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const salesRevenue = filteredSalesQuotations.reduce((sum, quote) => {
      const qty = typeof quote.quantity === 'string' ? parseFloat(quote.quantity.replace(/,/g, '')) : quote.quantity;
      const rate = typeof quote.rate === 'string' ? parseFloat(quote.rate.replace(/,/g, '')) : quote.rate;
      const amount = (qty || 0) * (rate || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const sources = [];
    if (workspaceInvoiceRevenue > 0) {
      sources.push({ label: 'Workspace Invoices', value: workspaceInvoiceRevenue, color: '#0f766e' });
    }
    if (workspaceQuoteRevenue > 0) {
      sources.push({ label: 'Workspace Quotes', value: workspaceQuoteRevenue, color: '#10b981' });
    }
    if (salesRevenue > 0) {
      sources.push({ label: 'Sales (RFQ Responses)', value: salesRevenue, color: '#84cc16' });
    }
    return sources;
  }, [filteredWorkspaceInvoices, filteredWorkspaceQuotes, filteredSalesQuotations]);

  // Recalculate summary based on filtered data
  const filteredSummary = useMemo(() => {
    const workspaceRevenue = filteredWorkspaceInvoices.reduce((sum, inv) => {
      const amount = typeof inv.total === 'string' ? parseFloat(inv.total.replace(/,/g, '')) : inv.total;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const workspaceQuoteValue = filteredWorkspaceQuotes.reduce((sum, quote) => {
      const amount = typeof quote.total === 'string' ? parseFloat(quote.total.replace(/,/g, '')) : quote.total;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const salesRevenue = filteredSalesQuotations.reduce((sum, quote) => {
      const qty = typeof quote.quantity === 'string' ? parseFloat(quote.quantity.replace(/,/g, '')) : quote.quantity;
      const rate = typeof quote.rate === 'string' ? parseFloat(quote.rate.replace(/,/g, '')) : quote.rate;
      const amount = (qty || 0) * (rate || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const b2bSpend = [...filteredB2bDebitNotes, ...filteredB2bOrders].reduce((sum, item) => {
      const raw = item.totalAmount ?? item.amount ?? item.subtotal;
      const amount = typeof raw === 'string' ? parseFloat(raw.replace(/,/g, '')) : Number(raw);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const totalRevenue = workspaceRevenue + workspaceQuoteValue + salesRevenue;
    const totalExpenses = b2bSpend;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: parseFloat(profitMargin),
      workspaceRevenue,
      workspaceQuoteValue,
      salesRevenue,
      b2bSpend,
      revenueGrowth: summary.revenueGrowth,
      expenseGrowth: summary.expenseGrowth,
      activeStreams: [
        workspaceRevenue > 0 ? 'workspace_invoices' : null,
        workspaceQuoteValue > 0 ? 'workspace_quotes' : null,
        salesRevenue > 0 ? 'sales' : null,
        b2bSpend > 0 ? 'b2b' : null
      ].filter(Boolean).length
    };
  }, [filteredWorkspaceInvoices, filteredWorkspaceQuotes, filteredSalesQuotations, filteredB2bDebitNotes, filteredB2bOrders, summary.revenueGrowth, summary.expenseGrowth]);

  const filteredTotalRevenue = filteredSummary.totalRevenue;
  const filteredTotalExpenses = filteredSummary.totalExpenses;
  const filteredNetProfit = filteredSummary.netProfit;
  const filteredProfitMargin = filteredSummary.profitMargin.toFixed(1);
  const filteredRevenueGrowth = filteredSummary.revenueGrowth;
  const filteredExpenseGrowth = filteredSummary.expenseGrowth;
  const filteredActiveStreams = filteredSummary.activeStreams;
  const filteredPreviewTransactions = filteredTransactions.slice(0, 5);

  // Apply transaction filters
  const filteredTransactionsByFilter = useMemo(() => {
    return filteredTransactions.filter((tx) => {
      const typeMatch = transactionFilters.type === 'all' || tx.type === transactionFilters.type;
      const sourceMatch = transactionFilters.source === 'all' || tx.source === transactionFilters.source;
      const statusMatch = transactionFilters.status === 'all' || tx.status === transactionFilters.status;
      return typeMatch && sourceMatch && statusMatch;
    });
  }, [filteredTransactions, transactionFilters]);

  const filteredPreviewTransactionsByFilter = filteredTransactionsByFilter.slice(0, 5);

  // Chart data configurations
  const revenueExpenseChartData = useMemo(
    () => ({
      labels: filteredMonthlyData.map((d) => d.month),
      datasets: [
        {
          label: "Revenue",
          data: filteredMonthlyData.map((d) => d.totalRevenue),
          backgroundColor: "#0f766e",
          borderColor: "#0f766e",
          borderRadius: 4,
        },
        {
          label: "Expenses",
          data: filteredMonthlyData.map((d) => d.totalExpenses),
          backgroundColor: "#f97316",
          borderColor: "#f97316",
          borderRadius: 4,
        },
      ],
    }),
    [filteredMonthlyData]
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
      labels: filteredMonthlyData.map((d) => d.month),
      datasets: [
        {
          label: "Revenue Trend",
          data: filteredMonthlyData.map((d) => d.totalRevenue),
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
          data: filteredMonthlyData.map((d) => d.netProfit),
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
    [filteredMonthlyData]
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

  // Profit margin trend chart
  const profitMarginTrendData = useMemo(
    () => ({
      labels: filteredMonthlyData.map((d) => d.month),
      datasets: [
        {
          label: "Profit Margin %",
          data: filteredMonthlyData.map((d) => {
            const margin = d.totalRevenue > 0 ? ((d.netProfit / d.totalRevenue) * 100) : 0;
            return margin.toFixed(1);
          }),
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#8b5cf6",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }),
    [filteredMonthlyData]
  );

  const profitMarginTrendOptions = {
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
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  const expenseBySource = useMemo(() => {
    const debitNotesTotal = filteredB2bDebitNotes.reduce((sum, note) => {
      const raw = note.totalAmount ?? note.amount ?? note.subtotal;
      const amount = typeof raw === 'string' ? parseFloat(raw.replace(/,/g, '')) : Number(raw);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    const ordersTotal = filteredB2bOrders.reduce((sum, order) => {
      const amount = typeof order.amount === 'string' ? parseFloat(order.amount.replace(/,/g, '')) : order.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const sources = [];
    if (debitNotesTotal > 0) {
      sources.push({ label: 'B2B Debit Notes', value: debitNotesTotal, color: '#dc2626' });
    }
    if (ordersTotal > 0) {
      sources.push({ label: 'B2B Orders', value: ordersTotal, color: '#ea580c' });
    }

    return sources;
  }, [filteredB2bDebitNotes, filteredB2bOrders]);

  const revenueColorMap = {
    'Workspace Invoices': '#0f766e',
    'Workspace Quotes': '#1d4ed8',
    'Sales (RFQ Responses)': '#047857',
  };

  const sourceDoughnutData = useMemo(
    () => {
      const data = viewMode === 'revenue' ? revenueBySource : expenseBySource;
      const sourceColors = data.map((d, idx) =>
        viewMode === 'revenue' ? (revenueColorMap[d.label] || CHART_COLORS[idx % CHART_COLORS.length]) : d.color
      );
      return {
        labels: data.map((d) => d.label),
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: sourceColors,
            borderColor: "#0f172a",
            borderWidth: 0.5,
            hoverOffset: 8,
          },
        ],
      };
    },
    [revenueBySource, expenseBySource, viewMode]
  );

  const sourceDoughnutOptions = {
    ...commonChartOptions,
    cutout: '0%',
    plugins: {
      ...commonChartOptions.plugins,
      legend: {
        display: false, // Hide default legend, we'll use custom clickable one
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
    elements: {
      arc: {
        borderWidth: 0.5,
        borderColor: '#0f172a',
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
          {/* Date Range Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Calendar size={16} />
              {dateRange === 'all' && 'All time'}
              {dateRange === '30days' && 'Last 30 days'}
              {dateRange === '90days' && 'Last 90 days'}
              {dateRange === 'quarter' && 'Last quarter'}
              {dateRange === 'custom' && 'Custom range'}
              <ChevronDown size={14} />
            </button>
            {showDateFilterDropdown && (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => { setDateRange('all'); setShowDateFilterDropdown(false); }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    All time
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDateRange('30days'); setShowDateFilterDropdown(false); }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Last 30 days
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDateRange('90days'); setShowDateFilterDropdown(false); }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Last 90 days
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDateRange('quarter'); setShowDateFilterDropdown(false); }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Last quarter
                  </button>
                  <div className="my-2 border-t border-slate-200" />
                  <div className="px-3 py-2">
                    <p className="mb-2 text-xs font-medium text-slate-500">Custom range</p>
                    <div className="space-y-2">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { setDateRange('custom'); setShowDateFilterDropdown(false); }}
                        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate("/VendorDashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={exporting}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {exporting ? 'Exporting...' : 'Export report'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setSelectedKpi('totalRevenue')}
          className="rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <CircleDollarSign size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Total revenue</p>
          </div>
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">
            {formatCurrency(filteredTotalRevenue)}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <ArrowUpRight size={12} />
            +{filteredRevenueGrowth}%
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedKpi('netProfit')}
          className="rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Net profit</p>
          </div>
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">
            {formatCurrency(filteredNetProfit)}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            <ArrowUpRight size={12} />
            {filteredProfitMargin}%
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedKpi('totalExpenses')}
          className="rounded-[22px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
        >
          <div className="flex items-center gap-2 text-slate-500">
            <BarChart3 size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Total expenses</p>
          </div>
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">
            {formatCurrency(filteredTotalExpenses)}
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
            <ArrowUpRight size={12} />
            +{filteredExpenseGrowth}%
          </div>
        </button>

        <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <BarChart3 size={15} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Active streams</p>
          </div>
          <p className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-900">{filteredActiveStreams}</p>
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

      {/* Additional Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Profit Margin Trend */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Profit Margin Trend</h3>
            <p className="text-xs text-slate-500">Monthly profit margin percentage over time</p>
          </div>
          <div className="h-[280px] w-full">
            <Line data={profitMarginTrendData} options={profitMarginTrendOptions} />
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Expense Breakdown</h3>
            <p className="text-xs text-slate-500">Distribution of expenses by source</p>
          </div>
          <div className="h-[280px] w-full">
            <Doughnut data={sourceDoughnutData} options={sourceDoughnutOptions} />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Revenue by Source */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Financial breakdown</h3>
              <p className="text-xs text-slate-500">Click a source to view detailed breakdown</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                onClick={() => setViewMode('revenue')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  viewMode === 'revenue'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setViewMode('expense')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  viewMode === 'expense'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense
              </button>
            </div>
          </div>
          <div className="h-[260px] w-full">
            <Doughnut data={sourceDoughnutData} options={sourceDoughnutOptions} />
          </div>
          {/* Legend as list with click handlers */}
          <div className="mt-4 space-y-2">
            {(viewMode === 'revenue' ? revenueBySource : expenseBySource).map((item, idx) => {
              const data = viewMode === 'revenue' ? revenueBySource : expenseBySource;
              const total = data.reduce((s, i) => s + i.value, 0);
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
              const isClickable = item.value > 0;
              return (
                <button
                  key={idx}
                  onClick={() => isClickable && setSelectedSource(item.label)}
                  disabled={!isClickable}
                  className={`flex w-full items-center justify-between text-sm transition hover:bg-slate-50 rounded-lg px-2 py-1 ${
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600">{item.label}</span>
                  </div>
                  <span className="font-medium text-slate-900">{pct}%</span>
                </button>
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
            <button
              onClick={() => setShowAllTransactionsModal(true)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredPreviewTransactionsByFilter.length > 0 ? (
              filteredPreviewTransactionsByFilter.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="flex w-full items-center justify-between py-3 transition hover:bg-slate-50 rounded-lg px-2"
                >
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
                </button>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Detail Modal */}
      {selectedKpi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {selectedKpi === 'totalRevenue' && 'Total Revenue Details'}
                  {selectedKpi === 'netProfit' && 'Net Profit Details'}
                  {selectedKpi === 'totalExpenses' && 'Total Expenses Details'}
                </h3>
                <p className="text-sm text-slate-500">Detailed contribution breakdown</p>
              </div>
              <button
                onClick={() => setSelectedKpi(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {selectedKpi === 'totalRevenue' && [
                { label: 'Workspace Invoices', value: filteredSummary.workspaceRevenue },
                { label: 'Workspace Quotes', value: filteredSummary.workspaceQuoteValue },
                { label: 'Sales (RFQ Responses)', value: filteredSummary.salesRevenue },
              ].map((item) => {
                const share = filteredTotalRevenue > 0 ? ((item.value / filteredTotalRevenue) * 100).toFixed(1) : '0.0';
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-slate-500">{share}% of total revenue</p>
                    </div>
                  </div>
                );
              })}

              {selectedKpi === 'totalExpenses' && [
                { label: 'B2B Debit Notes', value: filteredB2bDebitNotes.reduce((s, n) => s + Number(n.totalAmount ?? n.amount ?? n.subtotal ?? 0), 0) },
                { label: 'B2B Orders', value: filteredB2bOrders.reduce((s, o) => s + Number(o.amount ?? o.totalAmount ?? 0), 0) },
              ].map((item) => {
                const share = filteredTotalExpenses > 0 ? ((item.value / filteredTotalExpenses) * 100).toFixed(1) : '0.0';
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">{item.label}</p>
                    <div className="text-right">
                      <p className="font-semibold text-rose-700">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-slate-500">{share}% of total expenses</p>
                    </div>
                  </div>
                );
              })}

              {selectedKpi === 'netProfit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">Total Revenue</p>
                    <p className="font-semibold text-emerald-700">{formatCurrency(filteredTotalRevenue)}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">Total Expenses</p>
                    <p className="font-semibold text-rose-700">{formatCurrency(filteredTotalExpenses)}</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-emerald-50 p-4">
                    <p className="font-semibold text-slate-900">Net Profit</p>
                    <p className="font-bold text-emerald-700">{formatCurrency(filteredNetProfit)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View All Transactions Modal */}
      {showAllTransactionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">All Transactions</h3>
                <p className="text-sm text-slate-500">Complete income and expense history</p>
              </div>
              <button
                onClick={() => setShowAllTransactionsModal(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            {/* Filter Controls */}
            <div className="border-b border-slate-200 p-4 bg-slate-50">
              <div className="flex flex-wrap gap-3">
                <select
                  value={transactionFilters.type}
                  onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select
                  value={transactionFilters.source}
                  onChange={(e) => setTransactionFilters({ ...transactionFilters, source: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="Workspace Invoices">Workspace Invoices</option>
                  <option value="Workspace Quotes">Workspace Quotes</option>
                  <option value="Sales (RFQ Responses)">Sales (RFQ Responses)</option>
                  <option value="B2B Debit Notes">B2B Debit Notes</option>
                  <option value="B2B Orders">B2B Orders</option>
                </select>
                <select
                  value={transactionFilters.status}
                  onChange={(e) => setTransactionFilters({ ...transactionFilters, status: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
                <button
                  onClick={() => setTransactionFilters({ type: 'all', source: 'all', status: 'all' })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Clear filters
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 divide-y divide-slate-100">
              {filteredTransactionsByFilter.length > 0 ? (
                filteredTransactionsByFilter.map((tx) => (
                  <button
                    key={`${tx.id}-${tx.date}`}
                    onClick={() => setSelectedTransaction(tx)}
                    className="flex w-full items-center justify-between py-3 transition hover:bg-slate-50 rounded-lg px-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><Calendar size={12} />{formatDate(tx.date)}</span>
                          <span className="inline-flex items-center gap-1"><FileText size={12} />{tx.id}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase tracking-wide">{tx.source}</span>
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
                  </button>
                ))
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-500">No transactions yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Source Detail Modal */}
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedSource} - Detailed Breakdown</h3>
                <p className="text-sm text-slate-500">Individual items and their contribution to total</p>
              </div>
              <button
                onClick={() => setSelectedSource(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedSource === 'Workspace Invoices' && (
                <div className="space-y-3">
                  {filteredWorkspaceInvoices.length > 0 ? (
                    filteredWorkspaceInvoices.map((inv, idx) => {
                      const totalWorkspaceRevenue = filteredSummary.workspaceRevenue;
                      const amount = typeof inv.total === 'string' ? parseFloat(inv.total.replace(/,/g, '')) : inv.total;
                      const share = totalWorkspaceRevenue > 0 ? ((amount / totalWorkspaceRevenue) * 100).toFixed(1) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                          <div>
                            <p className="font-medium text-slate-900">{inv.projectName || inv.customerName || 'Invoice'}</p>
                            <p className="text-xs text-slate-500">ID: {inv.invoiceId || inv.customInvoiceId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-emerald-700">{formatCurrency(amount)}</p>
                            <p className="text-xs text-slate-500">{share}% of total</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-500">No workspace invoices found</p>
                  )}
                </div>
              )}
              {selectedSource === 'Workspace Quotes' && (
                <div className="space-y-3">
                  {filteredWorkspaceQuotes.length > 0 ? (
                    filteredWorkspaceQuotes.map((quote, idx) => {
                      const totalWorkspaceQuoteValue = filteredSummary.workspaceQuoteValue;
                      const amount = typeof quote.total === 'string' ? parseFloat(quote.total.replace(/,/g, '')) : quote.total;
                      const share = totalWorkspaceQuoteValue > 0 ? ((amount / totalWorkspaceQuoteValue) * 100).toFixed(1) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                          <div>
                            <p className="font-medium text-slate-900">{quote.customerName || quote.projectName || 'Quote'}</p>
                            <p className="text-xs text-slate-500">ID: {quote.quotationId || quote.customQuoteId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-emerald-700">{formatCurrency(amount)}</p>
                            <p className="text-xs text-slate-500">{share}% of total</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-500">No workspace quotes found</p>
                  )}
                </div>
              )}
              {selectedSource === 'Sales (RFQ Responses)' && (
                <div className="space-y-3">
                  {filteredSalesQuotations.length > 0 ? (
                    filteredSalesQuotations.map((quote, idx) => {
                      const totalSalesRevenue = filteredSummary.salesRevenue;
                      const qty = typeof quote.quantity === 'string' ? parseFloat(quote.quantity.replace(/,/g, '')) : quote.quantity;
                      const rate = typeof quote.rate === 'string' ? parseFloat(quote.rate.replace(/,/g, '')) : quote.rate;
                      const amount = (qty || 0) * (rate || 0);
                      const share = totalSalesRevenue > 0 ? ((amount / totalSalesRevenue) * 100).toFixed(1) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                          <div>
                            <p className="font-medium text-slate-900">{quote.productName || quote.item || 'Sales Quote'}</p>
                            <p className="text-xs text-slate-500">ID: {quote.quotationId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-emerald-700">{formatCurrency(amount)}</p>
                            <p className="text-xs text-slate-500">{share}% of total</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-500">No sales quotations found</p>
                  )}
                </div>
              )}
              {selectedSource === 'B2B Debit Notes' && (
                <div className="space-y-3">
                  {filteredB2bDebitNotes.length > 0 ? (
                    filteredB2bDebitNotes.map((note, idx) => {
                      const raw = note.totalAmount ?? note.amount ?? note.subtotal;
                      const amount = typeof raw === 'string' ? parseFloat(raw.replace(/,/g, '')) : Number(raw);
                      const totalDebitNotes = filteredB2bDebitNotes.reduce((sum, n) => {
                        const r = n.totalAmount ?? n.amount ?? n.subtotal;
                        const a = typeof r === 'string' ? parseFloat(r.replace(/,/g, '')) : Number(r);
                        return sum + (isNaN(a) ? 0 : a);
                      }, 0);
                      const share = totalDebitNotes > 0 ? ((amount / totalDebitNotes) * 100).toFixed(1) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                          <div>
                            <p className="font-medium text-slate-900">Debit Note - {note.orderId || note.debitNoteId || 'N/A'}</p>
                            <p className="text-xs text-slate-500">ID: {note.debitNoteId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-rose-700">-{formatCurrency(amount)}</p>
                            <p className="text-xs text-slate-500">{share}% of total</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-500">No debit notes found</p>
                  )}
                </div>
              )}
              {selectedSource === 'B2B Orders' && (
                <div className="space-y-3">
                  {filteredB2bOrders.length > 0 ? (
                    filteredB2bOrders.map((order, idx) => {
                      const amount = typeof order.amount === 'string' ? parseFloat(order.amount.replace(/,/g, '')) : order.amount;
                      const totalOrders = filteredB2bOrders.reduce((sum, o) => {
                        const a = typeof o.amount === 'string' ? parseFloat(o.amount.replace(/,/g, '')) : o.amount;
                        return sum + (isNaN(a) ? 0 : a);
                      }, 0);
                      const share = totalOrders > 0 ? ((amount / totalOrders) * 100).toFixed(1) : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                          <div>
                            <p className="font-medium text-slate-900">{order.productName || 'Order'}</p>
                            <p className="text-xs text-slate-500">ID: {order.orderId || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-rose-700">-{formatCurrency(amount)}</p>
                            <p className="text-xs text-slate-500">{share}% of total</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-slate-500">No vendor orders found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Export Report</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              Choose the format for your financial overview report:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-6 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={32} className="text-emerald-600" />
                <div className="text-center">
                  <p className="font-semibold text-slate-900">PDF</p>
                  <p className="text-xs text-slate-500">Printable format</p>
                </div>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-6 transition hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet size={32} className="text-emerald-600" />
                <div className="text-center">
                  <p className="font-semibold text-slate-900">Excel</p>
                  <p className="text-xs text-slate-500">Spreadsheet format</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Transaction Details</h3>
                <p className="text-sm text-slate-500">Complete transaction information</p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${selectedTransaction.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {selectedTransaction.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedTransaction.description}</p>
                      <p className="text-xs text-slate-500">{selectedTransaction.source}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${selectedTransaction.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {selectedTransaction.type === 'income' ? '+' : ''}{formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Transaction ID</p>
                    <p className="text-sm font-medium text-slate-900">{selectedTransaction.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Date</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(selectedTransaction.date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ${
                      selectedTransaction.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Type</p>
                    <p className="text-sm font-medium text-slate-900 capitalize">{selectedTransaction.type}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Additional Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source Category</span>
                    <span className="font-medium text-slate-900">{selectedTransaction.source}</span>
                  </div>
                  {selectedTransaction.source === 'Workspace Invoices' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Invoice Type</span>
                        <span className="font-medium text-slate-900">Workspace Invoice</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Category</span>
                        <span className="font-medium text-slate-900">Revenue</span>
                      </div>
                    </>
                  )}
                  {selectedTransaction.source === 'B2B Orders' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Order Type</span>
                        <span className="font-medium text-slate-900">Vendor Purchase</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Category</span>
                        <span className="font-medium text-slate-900">Expense</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 p-6">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
