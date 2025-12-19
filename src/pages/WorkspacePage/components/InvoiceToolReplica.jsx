import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  Search, Plus, Bell, User, Home, Users, Package, FileText, Receipt, 
  RotateCcw, History, CreditCard, ShoppingCart, Package2, Truck, 
  Clock, Calendar, Filter, RefreshCw, Download, BarChart2, PieChart, 
  TrendingUp, AlertCircle, CheckCircle, Clock as ClockIcon, Calendar as CalendarIcon,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { format, subDays, addDays } from 'date-fns';
import { VendorContext } from '../../../context/VendorContext';
import { useNotifications } from '../../../hooks/useNotifications';
import config from '../../../config/env';
import CustomersPage from './invoice/customers/CustomersPage';
import ItemsPage from './invoice/shared/ItemsPage';
import QuotesPage from './invoice/quotes/QuotesPage';
import InvoicesPage from './invoice/invoices/InvoicesPage';
import SubscriptionsPage from './subscription/SubscriptionsPage';
import CreditNotesPage from './invoice/credit-notes/CreditNotesPage';
import PurchaseRequisitionsPage from './invoice/purchase-requisitions/PurchaseRequisitionsPage';
import PurchaseOrdersPage from './invoice/purchase-orders/PurchaseOrdersPage';

const InvoiceToolReplica = ({ onClose, workspaceId, workspaceName, selectedTask, selectedSubtask }) => {
  const { currentUser } = useContext(VendorContext);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef(null);
  const [dateRange, setDateRange] = useState([
    {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      key: 'selection'
    }
  ]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    salesData: [],
    recentPayments: [],
    topCustomers: [],
    recentActivity: [],
    upcomingPayments: []
  });
  const [poSourceQuote, setPoSourceQuote] = useState(null);
  const [invoiceSourcePo, setInvoiceSourcePo] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const vendorId = currentUser?.vendorId;
        if (!vendorId) return;

        const [statsRes, salesRes, paymentsRes, customersRes, activityRes, upcomingRes] = await Promise.all([
          fetch(`/api/dashboard/stats?vendorId=${vendorId}`),
          fetch(`/api/dashboard/sales?startDate=${format(dateRange[0].startDate, 'yyyy-MM-dd')}&endDate=${format(dateRange[0].endDate, 'yyyy-MM-dd')}&vendorId=${vendorId}`),
          fetch(`/api/dashboard/recent-payments?vendorId=${vendorId}`),
          fetch(`/api/dashboard/top-customers?vendorId=${vendorId}`),
          fetch(`/api/dashboard/recent-activity?vendorId=${vendorId}`),
          fetch(`/api/dashboard/upcoming-payments?vendorId=${vendorId}`)
        ]);

        const [stats, salesData, recentPayments, topCustomers, recentActivity, upcomingPayments] = await Promise.all([
          statsRes.json(),
          salesRes.json(),
          paymentsRes.json(),
          customersRes.json(),
          activityRes.json(),
          upcomingRes.json()
        ]);

        setDashboardData({
          stats: stats.data || {},
          salesData: salesData.data || [],
          recentPayments: recentPayments.data || [],
          topCustomers: topCustomers.data || [],
          recentActivity: recentActivity.data || [],
          upcomingPayments: upcomingPayments.data || []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [currentUser?.vendorId, dateRange]);

  const handleRefresh = () => {
    // Force refresh data
    setDashboardData(prev => ({ ...prev, _lastUpdated: Date.now() }));
  };

  const handleDateRangeChange = (ranges) => {
    setDateRange([ranges.selection]);
    setShowDatePicker(false);
  };

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationDropdown]);

  // Test function to simulate a notification (for debugging)
  const testNotification = () => {
    // This creates a test notification to verify the system is working
    const testMsg = {
      type: 'notification',
      notification: {
        id: `test-${Date.now()}`,
        title: 'Quote Approved by PM',
        message: 'Your quote #CG-2025001 has been approved by PM',
        timestamp: new Date().toISOString(),
        read: false,
        icon: '✓',
        color: 'green'
      }
    };
    
    // Simulate WebSocket message by manually triggering
    const event = new CustomEvent('test-notification', { detail: testMsg });
    window.dispatchEvent(event);
    console.log('📬 Test notification sent:', testMsg);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
  };

  const handleRaisePOFromQuote = (quote) => {
    if (!quote) return;
    setPoSourceQuote(quote);
    setActiveTab('purchase-orders');
  };

  const handleConvertPOToInvoice = (purchaseOrder) => {
    if (!purchaseOrder) return;
    setInvoiceSourcePo(purchaseOrder);
    setActiveTab('invoices');
  };

  const handleRowClick = (item, type) => {
    // Handle row click navigation
    console.log(`Navigating to ${type} details:`, item.id);
    // Add navigation logic here
  };

  const sidebarItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'quotes', label: 'Quotes', icon: FileText },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'subscriptions', label: 'Subscriptions', icon: RotateCcw },
    { id: 'history', label: 'History', icon: History },
    { id: 'credit-notes', label: 'Credit Notes', icon: CreditCard },
    { id: 'purchase-requisitions', label: 'Purchase Requisitions', icon: ShoppingCart },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: Package2 },
    { id: 'delivery-challans', label: 'Delivery Challans', icon: Truck }
  ];

  const salesData = [
    { month: 'Jan', value: 11000 },
    { month: 'Feb', value: 12000 },
    { month: 'Mar', value: 14000 },
    { month: 'Apr', value: 18000 },
    { month: 'May', value: 13000 },
    { month: 'Jun', value: 19000 },
    { month: 'Jul', value: 17000 },
    { month: 'Aug', value: 20000 },
    { month: 'Sep', value: 23000 },
    { month: 'Oct', value: 21000 },
    { month: 'Nov', value: 24000 },
    { month: 'Dec', value: 26000 }
  ];

  const recentPayments = [
    { date: '2024-06-01', customer: 'Acme Corp', amount: '₹15,000' },
    { date: '2024-05-28', customer: 'Beta Ltd', amount: '₹12,000' },
    { date: '2024-05-25', customer: 'Gamma Inc', amount: '₹9,000' },
    { date: '2024-05-20', customer: 'Delta LLC', amount: '₹7,000' },
    { date: '2024-05-18', customer: 'Epsilon Co', amount: '₹5,000' }
  ];

  const topCustomers = [
    { name: 'Acme Corp', amount: '₹45,000', orders: 12 },
    { name: 'Beta Ltd', amount: '₹32,000', orders: 8 },
    { name: 'Gamma Inc', amount: '₹28,000', orders: 6 },
    { name: 'Delta LLC', amount: '₹21,000', orders: 5 }
  ];

  const renderNotificationDropdown = () => (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded-full font-medium">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1">
        {notifications && notifications.length > 0 ? (
          notifications.slice(0, 10).map((notification, index) => (
            <div
              key={notification.id || index}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                !notification.read ? 'bg-teal-50' : ''
              }`}
              onClick={() => {
                if (!notification.read) {
                  markAsRead(notification.id);
                }
                if (notification.documentLink) {
                  // Navigate to document if needed
                }
              }}
            >
              <div className="flex gap-3">
                <div
                  className={`p-2 rounded-lg flex-shrink-0 ${
                    notification.color === 'blue'
                      ? 'bg-blue-50 text-blue-600'
                      : notification.color === 'green'
                      ? 'bg-green-50 text-green-600'
                      : notification.color === 'purple'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  {notification.icon || <Bell size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-gray-900 text-sm">{notification.title}</p>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-teal-600 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {notification.timestamp
                      ? new Date(notification.timestamp).toLocaleTimeString()
                      : 'Just now'}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications && notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 text-center">
          <button className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );

  const maxSalesValue = Math.max(...salesData.map(d => d.value));



  const renderDashboard = () => (
    <div className="p-6 bg-gray-50 min-h-full">
      {/* Header with Filters and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {currentUser?.name || 'User'}</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          {/* Date Range Picker */}
          <div className="relative">
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar size={16} />
              {`${format(dateRange[0].startDate, 'MMM d, yyyy')} - ${format(dateRange[0].endDate, 'MMM d, yyyy')}`}
              {showDatePicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showDatePicker && (
              <div className="absolute right-0 mt-1 z-10 bg-white rounded-lg shadow-xl border border-gray-200">
                <DateRange
                  editableDateInputs={true}
                  onChange={handleDateRangeChange}
                  moveRangeOnFirstSelection={false}
                  ranges={dateRange}
                  className="border-0"
                />
                <div className="p-3 border-t border-gray-200 flex justify-end">
                  <button 
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setShowDatePicker(false)}
                    className="ml-2 px-3 py-1 bg-teal-600 text-white text-sm rounded hover:bg-teal-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="appearance-none bg-white border border-gray-300 text-gray-700 pl-4 pr-8 py-2 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ChevronDown size={16} />
            </div>
          </div>
          
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('invoices')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-teal-200 transition-colors">
            <Receipt className="w-5 h-5 text-teal-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">New Invoice</span>
          <span className="text-xs text-gray-500">Create and send</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('quotes')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-200 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">Create Quote</span>
          <span className="text-xs text-gray-500">Send to customer</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('customers')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-200 transition-colors">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">Add Customer</span>
          <span className="text-xs text-gray-500">New client</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('items')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-amber-200 transition-colors">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">Add Item</span>
          <span className="text-xs text-gray-500">Product/Service</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{dashboardData.stats.totalRevenue?.toLocaleString('en-IN') || '0'}</p>
              <div className="flex items-center mt-2">
                <span className="text-green-500 text-sm font-medium flex items-center">
                  <ArrowUpRight size={16} className="mr-1" />
                  {dashboardData.stats.revenueChange || 0}%
                </span>
                <span className="text-xs text-gray-500 ml-2">vs last period</span>
              </div>
            </div>
            <div className="p-2 bg-teal-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Total Invoices */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalInvoices || '0'}</p>
              <div className="flex items-center mt-2">
                <span className={`${dashboardData.stats.invoicesChange >= 0 ? 'text-green-500' : 'text-red-500'} text-sm font-medium flex items-center`}>
                  {dashboardData.stats.invoicesChange >= 0 ? (
                    <ArrowUpRight size={16} className="mr-1" />
                  ) : (
                    <ArrowDownRight size={16} className="mr-1" />
                  )}
                  {Math.abs(dashboardData.stats.invoicesChange || 0)}%
                </span>
                <span className="text-xs text-gray-500 ml-2">vs last period</span>
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Outstanding Amount */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">₹{dashboardData.stats.outstandingAmount?.toLocaleString('en-IN') || '0'}</p>
              <div className="flex items-center mt-2">
                <span className="text-amber-500 text-sm font-medium flex items-center">
                  <AlertCircle size={14} className="mr-1" />
                  {dashboardData.stats.overdueInvoices || '0'} overdue
                </span>
              </div>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <ClockIcon className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Top Customer */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Top Customer</p>
              <p className="text-lg font-bold text-gray-900 truncate">
                {dashboardData.topCustomers[0]?.name || 'N/A'}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-900 font-medium">
                  ₹{dashboardData.topCustomers[0]?.amount?.toLocaleString('en-IN') || '0'}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  {dashboardData.topCustomers[0]?.invoices || '0'} invoices
                </span>
              </div>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
            <div className="flex items-center space-x-2">
              <select className="text-sm border-0 bg-gray-50 rounded-lg px-3 py-1 focus:ring-2 focus:ring-teal-500">
                <option>This Year</option>
                <option>Last Year</option>
                <option>Last 6 Months</option>
                <option>Custom Range</option>
              </select>
            </div>
          </div>
          <div className="h-64">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-end justify-between space-x-1">
                {dashboardData.salesData.map((data, index) => (
                  <div key={index} className="flex flex-col items-center flex-1 group">
                    <div 
                      className="w-full bg-gradient-to-t from-teal-500 to-teal-300 rounded-t-sm transition-all duration-300 hover:from-teal-600 hover:to-teal-400 relative group"
                      style={{ 
                        height: `${(data.amount / Math.max(...dashboardData.salesData.map(d => d.amount), 1)) * 200}px`,
                        minHeight: '4px'
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        ₹{data.amount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue by Category</h3>
            <button className="text-sm text-teal-600 hover:text-teal-700">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Services', value: 45, color: 'bg-teal-500' },
              { name: 'Products', value: 30, color: 'bg-blue-500' },
              { name: 'Subscriptions', value: 15, color: 'bg-purple-500' },
              { name: 'Consulting', value: 10, color: 'bg-amber-500' }
            ].map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-teal-600 hover:text-teal-700">View All</button>
          </div>
          <div className="divide-y divide-gray-100">
            {dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.map((activity, index) => (
                <div 
                  key={index} 
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(activity, activity.type)}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'invoice' ? 'bg-blue-50 text-blue-600' : 
                      activity.type === 'payment' ? 'bg-green-50 text-green-600' : 
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {activity.type === 'invoice' ? (
                        <FileText size={18} />
                      ) : activity.type === 'payment' ? (
                        <CheckCircle size={18} />
                      ) : (
                        <Bell size={18} />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                      {activity.amount && (
                        <p className="text-sm font-medium mt-1">
                          {activity.type === 'payment' ? '+' : ''}₹{activity.amount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                {isLoading ? 'Loading activities...' : 'No recent activities found'}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Payments</h3>
          </div>
          <div className="p-4">
            {dashboardData.upcomingPayments.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.upcomingPayments.map((payment, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(payment, 'payment')}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{payment.customer}</p>
                        <p className="text-xs text-gray-500 mt-1">Due {payment.dueDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">₹{payment.amount.toLocaleString('en-IN')}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          payment.status === 'due' ? 'bg-yellow-100 text-yellow-800' :
                          payment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                {isLoading ? 'Loading...' : 'No upcoming payments'}
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due this week</span>
                <span className="font-medium">₹{(dashboardData.stats.dueThisWeek || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Overdue</span>
                <span className="text-red-600 font-medium">₹{(dashboardData.stats.overdueAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-medium mt-4 pt-4 border-t border-gray-100">
                <span>Total Outstanding</span>
                <span className="text-lg">₹{(dashboardData.stats.outstandingAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );







  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderDashboard();
      case 'customers':
        return <CustomersPage />;
      case 'items':
        return <ItemsPage />;
      case 'quotes':
        return (
          <QuotesPage
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            onRaisePOFromQuote={handleRaisePOFromQuote}
          />
        );
      case 'invoices':
        return (
          <InvoicesPage
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            sourcePo={invoiceSourcePo}
            onSourceConsumed={() => setInvoiceSourcePo(null)}
          />
        );
      case 'subscriptions':
        return <SubscriptionsPage />;
      case 'credit-notes':
        return <CreditNotesPage />;
      case 'purchase-requisitions':
        return <PurchaseRequisitionsPage />;
      case 'purchase-orders':
        return (
          <PurchaseOrdersPage
            workspaceId={workspaceId}
            workspaceName={workspaceName}
            selectedTask={selectedTask}
            selectedSubtask={selectedSubtask}
            sourceQuote={poSourceQuote}
            onSourceConsumed={() => setPoSourceQuote(null)}
            onConvertToInvoice={handleConvertPOToInvoice}
          />
        );
      default:
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}</h2>
            <p className="text-gray-600">This section is under development.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-teal-800 text-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-teal-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm">CG</span>
            </div>
            <span className="text-lg font-semibold">Invoice</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-teal-700 text-white'
                        : 'text-teal-100 hover:bg-teal-700 hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mr-3" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1">
              {/* Back Button */}
              <button
                onClick={onClose}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Workspace"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search in Customers"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                className="p-2 text-gray-400 hover:text-gray-600"
                onClick={testNotification}
                title="Test Notification (Debug)"
              >
                <Plus className="w-5 h-5" />
              </button>
              <div className="relative" ref={notificationDropdownRef}>
                <button 
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotificationDropdown && renderNotificationDropdown()}
              </div>
              <button className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                D
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default InvoiceToolReplica;
