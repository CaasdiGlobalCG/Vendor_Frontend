import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, MoreHorizontal, Eye, Edit, Pause, Play, Trash2, Calendar, DollarSign, TrendingUp, Copy } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import NewSubscriptionComponent from './NewSubscriptionComponent';
import SubscriptionsPreviewPanel from './SubscriptionsPreviewPanel';
import config from '../../../../config/env';

const SubscriptionsPage = () => {
  const { currentUser } = useContext(VendorContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [subscriptionsData, setSubscriptionsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalMonthlyRevenue: 0,
    totalAnnualRevenue: 0
  });
  const [showNewSubscription, setShowNewSubscription] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSubscriptionId, setPreviewSubscriptionId] = useState(null);

  // Using relative paths - no API_BASE_URL needed

  console.log('🔍 SubscriptionsPage - Current user:', currentUser);
  console.log('🔍 SubscriptionsPage - Vendor ID:', currentUser?.vendorId);

  // Fetch subscriptions from backend
  useEffect(() => {
    if (!currentUser?.vendorId) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }

    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        console.log('📋 Fetching subscriptions from backend...');
        
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
        
        const response = await fetch(`/api/workspace/subscriptions?vendorId=${vendorId}`, {
          headers: headers
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setSubscriptionsData(result.data || []);
          console.log(`✅ Successfully loaded ${result.data?.length || 0} subscriptions`);
          
          // Fetch stats
          const statsResponse = await fetch(`/api/workspace/subscriptions/stats?vendorId=${vendorId}`, {
            headers: headers
          });
          if (statsResponse.ok) {
            const statsResult = await statsResponse.json();
            if (statsResult.success) {
              setStats(statsResult.data);
            }
          }
        } else {
          throw new Error(result.message || 'Failed to fetch subscriptions');
        }
      } catch (error) {
        console.error('❌ Error fetching subscriptions:', error);
        setError(error.message);
        setSubscriptionsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [currentUser?.vendorId]);

  const filteredSubscriptions = subscriptionsData.filter(sub => {
    const matchesSearch = sub.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || sub.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
          text: 'text-green-700',
          border: 'border-green-200',
          dot: 'bg-green-500'
        };
      case 'paused':
        return {
          bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          dot: 'bg-yellow-500'
        };
      case 'cancelled':
        return {
          bg: 'bg-gradient-to-r from-red-50 to-pink-50',
          text: 'text-red-700',
          border: 'border-red-200',
          dot: 'bg-red-500'
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

  const totalMonthlyRevenue = stats.totalMonthlyRevenue || subscriptionsData
    .filter(s => s.status.toLowerCase() === 'active')
    .reduce((sum, s) => sum + (parseFloat(s.amount?.replace('₹', '').replace(/,/g, '')) || 0), 0);

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
          <p className="text-gray-600">Loading subscriptions...</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Subscriptions</h3>
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

  const handleSubscriptionCreated = (subscriptionData) => {
    console.log('Subscription created:', subscriptionData);
    setShowNewSubscription(false);
    setEditingSubscription(null);
    // Refresh subscriptions list
    window.location.reload();
  };

  const handleBackToSubscriptions = () => {
    setShowNewSubscription(false);
    setEditingSubscription(null);
  };

  const handleEditSubscription = (subscription) => {
    setEditingSubscription(subscription);
    setShowNewSubscription(true);
  };

  // If showing new subscription form, render that instead
  if (showNewSubscription) {
    return (
      <NewSubscriptionComponent
        onBack={handleBackToSubscriptions}
        onSubscriptionCreated={handleSubscriptionCreated}
        initialData={editingSubscription}
      />
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50">
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <SubscriptionsPreviewPanel 
            subscriptions={subscriptionsData} 
            selectedSubscriptionId={previewSubscriptionId} 
            onSelectSubscription={s => setPreviewSubscriptionId(s.id || s.subscriptionId)}
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
                Subscriptions Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage recurring billing and subscriptions</p>
            </div>
            <button 
              onClick={() => setShowNewSubscription(true)}
              className="bg-gradient-to-r from-slate-700 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-slate-800 hover:to-gray-800 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Subscription</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Subscriptions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSubscriptions || subscriptionsData.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions || subscriptionsData.filter(s => s.status.toLowerCase() === 'active').length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalMonthlyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Annual Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(stats.totalAnnualRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="px-8 py-8">
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Subscription</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Billing Cycle</th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Next Billing</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => {
                  const statusConfig = getStatusConfig(subscription.status);
                  return (
                    <tr key={subscription.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900">{subscription.customSubscriptionId || subscription.id}</div>
                        <div className="text-xs text-gray-500">{subscription.startDate}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-700">{subscription.customer}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-gray-700">{subscription.billingCycle}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-lg font-bold text-gray-900">{subscription.amount}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="text-sm text-gray-700">{subscription.nextBillingDate}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                          <div className={`w-2 h-2 ${statusConfig.dot} rounded-full mr-2`}></div>
                          {subscription.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-1">
                          <button 
                            onClick={() => { setPreviewSubscriptionId(subscription.id); setShowPreviewModal(true); }}
                            className="p-2 text-gray-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all duration-200 hover:scale-105" 
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditSubscription(subscription)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200 hover:scale-105" 
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-all duration-200 hover:scale-105" title="Pause">
                            <Pause className="w-4 h-4" />
                          </button>
                          <div className="relative group">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-10 w-36 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                              <button className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors flex items-center space-x-2">
                                <Copy className="w-4 h-4" />
                                <span>Duplicate</span>
                              </button>
                              <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg flex items-center space-x-2 transition-colors">
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPage;
