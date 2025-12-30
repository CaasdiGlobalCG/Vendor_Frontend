import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, MoreHorizontal, Eye, Edit, Download, Trash2, FileText, Calendar, DollarSign, TrendingUp, ArrowLeft, Send, Package2 } from 'lucide-react';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import NewQuoteComponent from './NewQuoteComponent';
import QuotesPreviewPanel from './QuotesPreviewPanel';
import config from '../../../../../config/env';

const QuotesPage = ({ workspaceId, workspaceName, selectedTask, selectedSubtask, onRaisePOFromQuote }) => {
  const { currentUser } = useContext(VendorContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [quotesData, setQuotesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalQuotes: 0,
    totalValue: 0,
    approvedQuotes: 0
  });
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewQuoteId, setPreviewQuoteId] = useState(null);

  // Using relative paths - no API_BASE_URL needed

  // Debug logging
  console.log('🔍 QuotesPage - Current user:', currentUser);
  console.log('🔍 QuotesPage - Vendor ID:', currentUser?.vendorId);

  // Function to fetch quotes
  const fetchQuotes = async () => {
    // Only fetch if we have a current user with vendorId
    if (!currentUser?.vendorId) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }

    try {
      setLoading(true);
      console.log('📋 Fetching quotes from backend...');

      // Get vendorId from authentication context
      const vendorId = currentUser.vendorId;

      console.log('🔑 Using vendor ID from auth context:', vendorId);

      // Send user info in headers for authentication
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      // Build query params: always vendorId, and when context is provided, also workspace/task/subtask
      const params = new URLSearchParams();
      params.append('vendorId', vendorId);
      if (workspaceId) params.append('workspaceId', workspaceId);
      if (selectedTask?.id) params.append('taskId', selectedTask.id);
      if (selectedSubtask?.id) params.append('subtaskId', selectedSubtask.id);

      const response = await fetch(`/api/workspace/quotations?${params.toString()}`, {
        headers: headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setQuotesData(result.data || []);
        console.log(`✅ Successfully loaded ${result.data?.length || 0} quotes`);

        // Fetch stats
        const statsResponse = await fetch(`/api/workspace/quotations/stats?vendorId=${vendorId}`, {
          headers: headers
        });
        if (statsResponse.ok) {
          const statsResult = await statsResponse.json();
          if (statsResult.success) {
            setStats(statsResult.data);
          }
        }
      } else {
        throw new Error(result.message || 'Failed to fetch quotes');
      }
    } catch (error) {
      console.error('❌ Error fetching quotes:', error);
      setError(error.message);
      // Fallback to empty array if API fails
      setQuotesData([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when component mounts or vendorId changes
  useEffect(() => {
    fetchQuotes();
  }, [currentUser?.vendorId]);  // Only re-run when vendorId changes

  const filteredQuotes = quotesData.filter(quote => {
    const matchesSearch = quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || quote.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return {
          bg: 'bg-gradient-to-r from-slate-50 to-gray-50',
          text: 'text-slate-600',
          border: 'border-slate-200',
          dot: 'bg-slate-400'
        };
      case 'sent to pm for review':
        return {
          bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          dot: 'bg-blue-500'
        };
      case 'approved by pm':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500'
        };
      case 'invoiced':
        return {
          bg: 'bg-gradient-to-r from-purple-50 to-violet-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          dot: 'bg-purple-500'
        };
      case 'sent to finance':
        return {
          bg: 'bg-gradient-to-r from-orange-50 to-amber-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          dot: 'bg-orange-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
          text: 'text-gray-600',
          border: 'border-gray-200',
          dot: 'bg-gray-400'
        };
    }
  };

  const totalValue = stats.totalValue || quotesData.reduce((sum, quote) => {
    return sum + parseFloat(quote.totalAmount.replace('₹', '').replace(/,/g, ''));
  }, 0);

  // Loading state for authentication
  if (!currentUser?.vendorId) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user authentication...</p>
        </div>
      </div>
    );
  }

  // Loading state for data fetching
  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quotes...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-full bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Quotes</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-slate-600 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-slate-700 hover:to-gray-800 transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Handle quote creation/editing
  const handleQuoteCreated = (quoteData) => {
    console.log('Quote created:', quoteData);
    fetchQuotes(); // Refresh the quotes list immediately
    setShowNewQuote(false);
    setEditingQuote(null);
  };

  const handleBackToQuotes = () => {
    setShowNewQuote(false);
    setEditingQuote(null);
    fetchQuotes(); // Refresh the quotes list
  };

  const handleEditQuote = (quote) => {
    setEditingQuote(quote);
    setShowNewQuote(true);
  };

  const handleSendToPM = async (quote) => {
    try {
      const vendorId = currentUser.vendorId;
      const quotationId = quote.quotationId || quote.id;

      console.log('📤 Sending quote to PM:', quotationId);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`/api/workspace/quotations/${quotationId}/send-to-pm`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ vendorId })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Quote sent to PM successfully');
        // Refresh the quotes list to show updated status
        fetchQuotes();
        // You could also show a success toast notification here
        alert('Quote sent to PM for review successfully!');
      } else {
        throw new Error(result.message || 'Failed to send quote to PM');
      }
    } catch (error) {
      console.error('❌ Error sending quote to PM:', error);
      alert('Failed to send quote to PM: ' + error.message);
    }
  };

  // If showing new quote form, render that instead
  if (showNewQuote) {
    return (
      <NewQuoteComponent
        onBack={handleBackToQuotes}
        onQuoteCreated={handleQuoteCreated}
        initialData={editingQuote}
        duplicateMode={false}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        selectedTask={selectedTask}
        selectedSubtask={selectedSubtask}
      />
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50">
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <QuotesPreviewPanel
            quotes={quotesData}
            selectedQuoteId={previewQuoteId}
            onSelectQuote={q => setPreviewQuoteId(q.id || q.quotationId)}
            onClose={() => setShowPreviewModal(false)}
          />
        </div>
      )}
      {/* Beautiful Header with Stats */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/3 via-gray-600/3 to-stone-600/3"></div>
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-gray-700 to-stone-700 bg-clip-text text-transparent">
                Quotations Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage and track all your business quotations</p>
            </div>
            <button
              onClick={() => setShowNewQuote(true)}
              className="bg-gradient-to-r from-slate-700 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-slate-800 hover:to-gray-800 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">New Quotation</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Quotations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuotes || quotesData.length}</p>
                  <p className="text-xs text-green-600 mt-1">↗ +{stats.thisMonthQuotes || 12}% this month</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">↗ +{stats.thisMonthValue ? Math.round((stats.thisMonthValue / totalValue) * 100) : 8}% this month</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approvedQuotes || quotesData.filter(q => q.status.toLowerCase() === 'approved by pm').length}</p>
                  <p className="text-xs text-green-600 mt-1">↗ +15% this month</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-stone-500 to-slate-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search quotes or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm shadow-sm"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-transparent text-sm shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent to pm for review">Sent to PM for review</option>
              <option value="approved by pm">Approved by PM</option>
              <option value="invoiced">Invoiced</option>
              <option value="sent to finance">Sent to Finance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Beautiful Table */}
      <div className="px-8 pb-8">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50/90 to-slate-50/90 backdrop-blur-sm">
              <tr>
                <th className="text-left py-5 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Quote
                </th>
                <th className="text-left py-5 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left py-5 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right py-5 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center py-5 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-5 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/50">
              {filteredQuotes.map((quote, index) => {
                const statusConfig = getStatusConfig(quote.status);
                const isPoRequested = !!(quote.status && quote.status.toLowerCase().includes('requested po'));
                return (
                  <tr key={quote.id} className="hover:bg-gradient-to-r hover:from-slate-50/40 hover:to-gray-50/40 transition-all duration-300 group">
                    <td className="py-5 px-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl flex items-center justify-center shadow-sm">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-slate-700 transition-colors">{quote.customQuoteId || quote.quoteNumber || quote.displayQuoteId || quote.id}</div>
                          <div className="text-xs text-gray-500">Quotation #{index + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-slate-700 transition-colors">
                        {quote.customer}
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{quote.date}</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <div className="min-w-[100px] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent"
                        title={quote.totalAmount}>
                        {quote.totalAmount}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} shadow-sm`}>
                        <div className={`w-2 h-2 ${statusConfig.dot} rounded-full mr-2`}></div>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center justify-center space-x-1">
                        <button className="p-2 text-gray-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200 hover:scale-105" title="View" onClick={() => { setPreviewQuoteId(quote.id || quote.quotationId); setShowPreviewModal(true); }}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuote(quote)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200 hover:scale-105"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {/* Send to PM button - only show for draft quotes */}
                        {quote.status.toLowerCase() === 'draft' && (
                          <button
                            onClick={() => handleSendToPM(quote)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105"
                            title="Send to PM"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {/* Raise PO button - only show when PM has requested a PO */}
                        {isPoRequested && onRaisePOFromQuote && (
                          <button
                            onClick={() => onRaisePOFromQuote(quote)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all duration-200 hover:scale-105"
                            title="Raise Purchase Order"
                          >
                            <Package2 className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200 hover:scale-105" title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                        <div className="relative group/menu">
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-10 w-36 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-10">
                            <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-slate-50 rounded-t-xl transition-colors">
                              Duplicate
                            </button>
                            <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl flex items-center space-x-2 transition-colors">
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Beautiful Empty State */}
          {filteredQuotes.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filter criteria</p>
              <button className="bg-gradient-to-r from-slate-600 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-slate-700 hover:to-gray-800 transition-all duration-300 shadow-sm">
                Create New Quote
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Pagination */}
        {filteredQuotes.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-gray-200/50">
              Showing <span className="font-semibold text-gray-900">{filteredQuotes.length}</span> of <span className="font-semibold text-gray-900">{quotesData.length}</span> quotes
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white transition-all duration-200 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-4 py-2 text-sm bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                1
              </button>
              <button className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white transition-all duration-200 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>


    </div >
  );
};

export default QuotesPage;
