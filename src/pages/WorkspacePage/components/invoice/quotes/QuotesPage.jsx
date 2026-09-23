import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, MoreHorizontal, Eye, Edit, Download, Trash2, FileText, Calendar, DollarSign, TrendingUp, ArrowLeft, Send, Package2 } from 'lucide-react';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import NewQuoteComponent from './NewQuoteComponent';
import QuotesPreviewPanel from './QuotesPreviewPanel';
import config from '../../../../../config/env';
import invoiceFetch from '../utils/invoiceFetch';

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

      const response = await invoiceFetch(`/api/workspace/quotations?${params.toString()}`, {
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
        const statsResponse = await invoiceFetch(`/api/workspace/quotations/stats?vendorId=${vendorId}`, {
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
          bg: 'bg-gradient-to-r from-surface-hover to-surface-hover',
          text: 'text-dim',
          border: 'border-line',
          dot: 'bg-cta'
        };
      case 'sent to pm for review':
        return {
          bg: 'bg-black',
          text: 'text-info',
          border: 'border-info/20',
          dot: 'bg-info'
        };
      case 'approved by pm':
        return {
          bg: 'bg-black',
          text: 'text-success',
          border: 'border-success/20',
          dot: 'bg-success'
        };
      case 'invoiced':
        return {
          bg: 'bg-black',
          text: 'text-ink',
          border: 'border-line',
          dot: 'bg-cta'
        };
      case 'sent to finance':
        return {
          bg: 'bg-black',
          text: 'text-warning',
          border: 'border-warning/20',
          dot: 'bg-warning'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-surface-hover to-surface-hover',
          text: 'text-dim',
          border: 'border-line',
          dot: 'bg-cta'
        };
    }
  };

  const totalValue = stats.totalValue || quotesData.reduce((sum, quote) => {
    return sum + parseFloat(quote.totalAmount.replace('₹', '').replace(/,/g, ''));
  }, 0);

  // Loading state for authentication
  if (!currentUser?.vendorId) {
    return (
      <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line mx-auto mb-4"></div>
          <p className="text-dim">Loading user authentication...</p>
        </div>
      </div>
    );
  }

  // Loading state for data fetching
  if (loading) {
    return (
      <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line mx-auto mb-4"></div>
          <p className="text-dim">Loading quotes...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-danger text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-ink mb-2">Error Loading Quotes</h3>
          <p className="text-dim mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-surface text-white px-6 py-3 rounded-xl hover:from-surface hover:to-surface transition-all duration-300"
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

      const response = await invoiceFetch(`/api/workspace/quotations/${quotationId}/send-to-pm`, {
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

  const handleDownloadQuote = (quote) => {
    if (quote.pdfUrl) {
      window.open(quote.pdfUrl, '_blank', 'noopener,noreferrer');
    } else {
      // No stored PDF - open the preview panel where the quote can be viewed/downloaded
      setPreviewQuoteId(quote.id || quote.quotationId);
      setShowPreviewModal(true);
    }
  };

  const handleDeleteQuote = async (quote) => {
    const quotationId = quote.quotationId || quote.id;
    const label = quote.customQuoteId || quote.quoteNumber || quote.displayQuoteId || quotationId;

    if (!window.confirm(`Delete quotation ${label}? This action cannot be undone.`)) {
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: currentUser.vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await invoiceFetch(`/api/workspace/quotations/${quotationId}`, {
        method: 'DELETE',
        headers: headers,
        body: JSON.stringify({ vendorId: currentUser.vendorId })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Quote deleted successfully');
        fetchQuotes();
      } else {
        throw new Error(result.message || 'Failed to delete quote');
      }
    } catch (error) {
      console.error('❌ Error deleting quote:', error);
      alert('Failed to delete quote: ' + error.message);
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
    <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover">
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface">
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
        <div className="absolute inset-0 bg-surface"></div>
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold ">
                Quotations Dashboard
              </h1>
              <p className="text-dim mt-2">Manage and track all your business quotations</p>
            </div>
            <button
              onClick={() => setShowNewQuote(true)}
              className="bg-surface text-white px-6 py-3 rounded-xl hover:from-surface hover:to-surface transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform "
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">New Quotation</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm border border-line rounded-2xl p-6   transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Quotations</p>
                  <p className="text-2xl font-bold text-ink">{stats.totalQuotes || quotesData.length}</p>
                  <p className="text-xs text-success mt-1">↗ +{stats.thisMonthQuotes || 12}% this month</p>
                </div>
                <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-line rounded-2xl p-6   transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-ink">₹{totalValue.toLocaleString()}</p>
                  <p className="text-xs text-success mt-1">↗ +{stats.thisMonthValue ? Math.round((stats.thisMonthValue / totalValue) * 100) : 8}% this month</p>
                </div>
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-line rounded-2xl p-6   transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Approved</p>
                  <p className="text-2xl font-bold text-ink">{stats.approvedQuotes || quotesData.filter(q => q.status.toLowerCase() === 'approved by pm').length}</p>
                  <p className="text-xs text-success mt-1">↗ +15% this month</p>
                </div>
                <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 transform  text-dim w-5 h-5" />
              <input
                type="text"
                placeholder="Search quotes or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-line rounded-xl focus:ring-2 focus:ring-line focus:border-transparent text-sm "
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-line rounded-xl focus:ring-2 focus:ring-line focus:border-transparent text-sm "
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
        <div className="bg-white/90 backdrop-blur-sm border border-line rounded-2xl ">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-surface-hover to-surface-hover backdrop-blur-sm">
              <tr>
                <th className="text-left py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Quote
                </th>
                <th className="text-left py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center py-5 px-6 text-xs font-semibold text-dim uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredQuotes.map((quote, index) => {
                const statusConfig = getStatusConfig(quote.status);
                const isPoRequested = !!(quote.status && quote.status.toLowerCase().includes('requested po'));
                const isLastRow = index === filteredQuotes.length - 1;
                return (
                  <tr key={quote.id} className="hover:bg-gradient-to-r hover:from-surface-hover hover:to-surface-hover transition-all duration-300 group">
                    <td className="py-5 px-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center ">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-ink group-hover:text-ink transition-colors">{quote.customQuoteId || quote.quoteNumber || quote.displayQuoteId || quote.id}</div>
                          <div className="text-xs text-dim">Quotation #{index + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="text-sm font-medium text-ink group-hover:text-ink transition-colors">
                        {quote.customer}
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center space-x-2 text-sm text-dim">
                        <Calendar className="w-4 h-4 text-dim" />
                        <span>{quote.date}</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-right">
                      <div className="min-w-[100px] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold "
                        title={quote.totalAmount}>
                        {quote.totalAmount}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} `}>
                        <div className={`w-2 h-2 ${statusConfig.dot} rounded-full mr-2`}></div>
                        {quote.status}
                      </span>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center justify-center space-x-1">
                        <button className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-xl transition-all duration-200 hover:scale-105" title="View" onClick={() => { setPreviewQuoteId(quote.id || quote.quotationId); setShowPreviewModal(true); }}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuote(quote)}
                          className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-xl transition-all duration-200 hover:scale-105"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {/* Send to PM button - only show for draft quotes */}
                        {quote.status.toLowerCase() === 'draft' && (
                          <button
                            onClick={() => handleSendToPM(quote)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-info bg-info/10 border border-info/20 rounded-lg hover:bg-info/10 transition-all duration-200"
                            title="Send to PM"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send to PM</span>
                          </button>
                        )}
                        {/* Raise PO button - only show when PM has requested a PO */}
                        {isPoRequested && onRaisePOFromQuote && (
                          <button
                            onClick={() => onRaisePOFromQuote(quote)}
                            className="p-2 text-dim hover:text-ink hover:bg-surface-hover rounded-xl transition-all duration-200 hover:scale-105"
                            title="Raise Purchase Order"
                          >
                            <Package2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadQuote(quote)}
                          className="p-2 text-dim hover:text-success hover:bg-success/10 rounded-xl transition-all duration-200 hover:scale-105"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <div className="relative group/menu">
                          <button className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-xl transition-all duration-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <div className={`absolute right-0 ${isLastRow ? 'bottom-10' : 'top-10'} w-36 bg-white/95 backdrop-blur-sm border border-line rounded-xl shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-20`}>
                            <button className={`w-full text-left px-4 py-3 text-sm text-ink hover:bg-canvas rounded-t-xl transition-colors ${quote.status.toLowerCase() !== 'draft' ? 'rounded-b-xl' : ''}`}>
                              Duplicate
                            </button>
                            {/* Delete is only available for drafts - locked once sent to PM */}
                            {quote.status.toLowerCase() === 'draft' && (
                              <button
                                onClick={() => handleDeleteQuote(quote)}
                                className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-danger/10 rounded-b-xl flex items-center space-x-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            )}
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
              <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-6 ">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">No quotes found</h3>
              <p className="text-dim mb-6">Try adjusting your search or filter criteria</p>
              <button className="bg-surface text-white px-6 py-3 rounded-xl hover:from-surface hover:to-surface transition-all duration-300 ">
                Create New Quote
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Pagination */}
        {filteredQuotes.length > 0 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-dim bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-line">
              Showing <span className="font-semibold text-ink">{filteredQuotes.length}</span> of <span className="font-semibold text-ink">{quotesData.length}</span> quotes
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm text-dim hover:text-ink bg-white/80 backdrop-blur-sm rounded-xl border border-line hover:bg-surface transition-all duration-200 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-4 py-2 text-sm bg-surface text-white rounded-xl transition-all duration-200">
                1
              </button>
              <button className="px-4 py-2 text-sm text-dim hover:text-ink bg-white/80 backdrop-blur-sm rounded-xl border border-line hover:bg-surface transition-all duration-200 disabled:opacity-50" disabled>
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
