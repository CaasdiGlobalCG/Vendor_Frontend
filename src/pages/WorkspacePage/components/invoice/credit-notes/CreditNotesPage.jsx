import React, { useState, useEffect, useContext } from 'react';
import { 
  Search, 
  ArrowLeft,
  Eye, 
  Download,
  FileText,
  DollarSign,
  CheckCircle,
  Calendar,
  TrendingUp,
  Plus
} from 'lucide-react';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import NewCreditNoteComponent from './NewCreditNoteComponent';
import CreditNotesPreviewPanel from './CreditNotesPreviewPanel';
import config from '../../../../../config/env';

const CreditNotesPage = () => {
  const { currentUser } = useContext(VendorContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewCreditNote, setShowNewCreditNote] = useState(false);
  const [creditNotesData, setCreditNotesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCreditNotes: 0,
    totalAmount: 0,
    approvedCreditNotes: 0,
    thisMonthCreditNotes: 0
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewCreditNoteId, setPreviewCreditNoteId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // API Base URL
  // Using relative paths - no API_BASE_URL needed

  // Debug logging
  console.log('🔍 CreditNotesPage - Current user:', currentUser);
  console.log('🔍 CreditNotesPage - Vendor ID:', currentUser?.vendorId);

  // Fetch credit notes from backend
  useEffect(() => {
    // Only fetch if we have a current user with vendorId
    if (!currentUser?.vendorId) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }

    const fetchCreditNotes = async () => {
      try {
        setLoading(true);
        console.log('📋 Fetching credit notes from backend...');
        
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
        
        const response = await fetch(`/api/workspace/credit-notes?vendorId=${vendorId}`, {
          headers: headers
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setCreditNotesData(result.data || []);
          console.log(`✅ Successfully loaded ${result.data?.length || 0} credit notes`);
          
          // Fetch stats - vendorId is automatically included in the auth token
          const statsResponse = await fetch(`/api/workspace/credit-notes/stats`, {
            headers: headers
          });
          if (statsResponse.ok) {
            const statsResult = await statsResponse.json();
            if (statsResult.success) {
              setStats(statsResult.data);
            }
          }
        } else {
          throw new Error(result.message || 'Failed to fetch credit notes');
        }
      } catch (error) {
        console.error('❌ Error fetching credit notes:', error);
        setError(error.message);
        // Fallback to empty array if API fails
        setCreditNotesData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditNotes();
  }, [currentUser?.vendorId]);

  const handleBackToCreditNotes = () => {
    setShowNewCreditNote(false);
    // Refresh credit notes list
    if (currentUser?.vendorId) {
      const fetchCreditNotes = async () => {
        try {
          const vendorId = currentUser.vendorId;
          const headers = {
            'Content-Type': 'application/json',
            'x-user-info': JSON.stringify({
              vendorId: vendorId,
              email: currentUser?.email,
              role: 'vendor',
              name: currentUser?.name
            })
          };
          
          const response = await fetch(`/api/workspace/credit-notes?vendorId=${vendorId}`, {
            headers: headers
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setCreditNotesData(result.data || []);
            }
          }
        } catch (error) {
          console.error('Error refreshing credit notes:', error);
        }
      };
      fetchCreditNotes();
    }
  };

  const handleCreditNoteCreated = () => {
    setShowNewCreditNote(false);
    // Refresh credit notes list
    handleBackToCreditNotes();
  };

  // If showing new credit note form, render that instead
  if (showNewCreditNote) {
    return (
      <NewCreditNoteComponent
        onBack={handleBackToCreditNotes}
        onCreditNoteCreated={handleCreditNoteCreated}
      />
    );
  }

  const filteredCreditNotes = creditNotesData.filter(note => {
    const searchLower = searchTerm.toLowerCase();
    return (note.customer || '').toLowerCase().includes(searchLower) ||
           (note.customCreditNoteId || note.creditNoteNumber || note.displayCreditNoteId || note.id || '').toLowerCase().includes(searchLower) ||
           (note.invoiceId || '').toLowerCase().includes(searchLower);
  });

  const getStatusConfig = (status) => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'approved':
      case 'approved by pm':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500',
          label: 'Approved',
        };
      case 'pending':
      case 'draft':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500',
          label: status || 'Draft',
        };
      case 'pending_vendor':
        return {
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200',
          dot: 'bg-orange-500',
          label: 'Credit Note Requested',
        };
      case 'acknowledged':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          dot: 'bg-blue-500',
          label: 'Acknowledged',
        };
      case 'vendor_processing':
        return {
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          border: 'border-indigo-200',
          dot: 'bg-indigo-500',
          label: 'Processing',
        };
      case 'vendor_issued':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500',
          label: 'Issued',
        };
      case 'rejected':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          dot: 'bg-red-500',
          label: 'Rejected',
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          border: 'border-gray-200',
          dot: 'bg-gray-400',
          label: status || 'Draft',
        };
    }
  };

  // Calculate total amount from real data
  const totalAmount = creditNotesData.reduce((sum, note) => {
    const amount = typeof note.total === 'number' ? note.total : 
                  typeof note.totalAmount === 'string' ? parseFloat(note.totalAmount.replace(/[₹,]/g, '')) : 
                  parseFloat(note.totalAmount) || 0;
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  return (
    <div className="min-h-full bg-gray-50">
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <CreditNotesPreviewPanel 
            creditNotes={creditNotesData} 
            selectedCreditNoteId={previewCreditNoteId} 
            onSelectCreditNote={cn => setPreviewCreditNoteId(cn.id || cn.creditNoteId)}
            onClose={() => setShowPreviewModal(false)}
          />
        </div>
      )}
      
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Credit Notes
                </h1>
                <p className="text-gray-600 mt-2">View credit notes related to your invoices</p>
              </div>
            </div>
            <button 
              onClick={() => setShowNewCreditNote(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Credit Note</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Credit Notes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCreditNotes || creditNotesData.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(stats.totalAmount || totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approvedCreditNotes || creditNotesData.filter(note => (note.status || '').toLowerCase() === 'approved').length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.thisMonthCreditNotes || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search credit notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Credit Notes Table */}
      <div className="px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Credit Note #
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tax Invoice #
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    Loading credit notes...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-red-500">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredCreditNotes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    No credit notes found
                  </td>
                </tr>
              ) : (
                filteredCreditNotes.map((note, index) => {
                  const statusConfig = getStatusConfig(note.status);
                  const creditNoteId = note.customCreditNoteId || note.creditNoteNumber || note.displayCreditNoteId || note.id || note.creditNoteId;
                  const totalAmount = typeof note.total === 'number' ? note.total : 
                                     typeof note.totalAmount === 'string' ? parseFloat(note.totalAmount.replace(/[₹,]/g, '')) : 
                                     parseFloat(note.totalAmount) || 0;
                  return (
                    <tr key={`${note.creditNoteId || note.id || index}`} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="font-semibold text-gray-900">
                            {creditNoteId}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{note.date || (note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-GB') : 'N/A')}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-mono text-gray-600 bg-gray-50 px-3 py-1 rounded max-w-xs truncate" title={note.invoiceId || ''}>
                          {note.invoiceId || '-'}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-900">
                          {note.customer || note.customerName || 'Unknown Customer'}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          <div className={`w-2 h-2 ${statusConfig.dot} rounded-full mr-2`}></div>
                          {statusConfig.label || note.status || 'Draft'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => {
                              setPreviewCreditNoteId(note.id || note.creditNoteId);
                              setShowPreviewModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200" 
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200" title="Download">
                            <Download className="w-4 h-4" />
                          </button>
                          {(note.status || '').toLowerCase() === 'pending_vendor' && (
                            <button
                              onClick={async () => {
                                try {
                                  setActionLoading(note.creditNoteId);
                                  const headers = {
                                    'Content-Type': 'application/json',
                                    'x-user-info': JSON.stringify({
                                      vendorId: currentUser.vendorId,
                                      email: currentUser?.email,
                                      role: 'vendor',
                                      name: currentUser?.name,
                                    }),
                                  };
                                  const response = await fetch(
                                    `/api/workspace/credit-notes/${note.creditNoteId}/status`,
                                    {
                                      method: 'PATCH',
                                      headers,
                                      body: JSON.stringify({ status: 'acknowledged' }),
                                    }
                                  );
                                  if (response.ok) {
                                    handleBackToCreditNotes();
                                  }
                                } catch (err) {
                                  console.error('Error acknowledging credit note request:', err);
                                } finally {
                                  setActionLoading(null);
                                }
                              }}
                              disabled={actionLoading === note.creditNoteId}
                              className="px-3 py-1 text-xs font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors duration-200 disabled:opacity-50"
                              title="Acknowledge credit note request"
                            >
                              {actionLoading === note.creditNoteId ? '...' : 'Acknowledge'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Empty State - Only show if no credit notes at all (not just filtered) */}
          {!loading && !error && creditNotesData.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No credit notes found</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first credit note</p>
              <button 
                onClick={() => setShowNewCreditNote(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Create New Credit Note
              </button>
            </div>
          )}
          
          {/* No search results */}
          {!loading && !error && creditNotesData.length > 0 && filteredCreditNotes.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No credit notes match your search</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredCreditNotes.length > 0 && (
          <div className="flex items-center justify-center mt-8">
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                1
              </button>
              <button className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50" disabled>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditNotesPage;