import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, MoreHorizontal, Eye, Edit, Pause, Play, Trash2, Calendar, DollarSign, TrendingUp, Copy } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import NewSubscriptionComponent from './NewSubscriptionComponent';
import SubscriptionsPreviewPanel from './SubscriptionsPreviewPanel';
import config from '../../../../config/env';
import invoiceFetch from '../invoice/utils/invoiceFetch';

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
        
        const response = await invoiceFetch(`/api/workspace/subscriptions?vendorId=${vendorId}`, {
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
          const statsResponse = await invoiceFetch(`/api/workspace/subscriptions/stats?vendorId=${vendorId}`, {
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
          bg: 'bg-black',
          text: 'text-success',
          border: 'border-success/20',
          dot: 'bg-success'
        };
      case 'paused':
        return {
          bg: 'bg-black',
          text: 'text-warning',
          border: 'border-warning/20',
          dot: 'bg-warning'
        };
      case 'cancelled':
        return {
          bg: 'bg-black',
          text: 'text-danger',
          border: 'border-danger/20',
          dot: 'bg-danger'
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

  const totalMonthlyRevenue = stats.totalMonthlyRevenue || subscriptionsData
    .filter(s => s.status.toLowerCase() === 'active')
    .reduce((sum, s) => sum + (parseFloat(String(s.amount || '0').replace('₹', '').replace(/,/g, '')) || 0), 0);

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
          <p className="text-dim">Loading subscriptions...</p>
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
          <h3 className="text-lg font-semibold text-ink mb-2">Error Loading Subscriptions</h3>
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
    <div className="min-h-full bg-gradient-to-br from-surface-hover via-surface-hover to-surface-hover">
      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface">
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
        <div className="absolute inset-0 bg-surface"></div>
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold ">
                Subscriptions Dashboard
              </h1>
              <p className="text-dim mt-2">Manage recurring billing and subscriptions</p>
            </div>
            <button 
              onClick={() => setShowNewSubscription(true)}
              className="bg-surface text-white px-6 py-3 rounded-xl hover:from-surface hover:to-surface transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform "
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create Subscription</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Total Subscriptions</p>
                  <p className="text-2xl font-bold text-ink">{stats.totalSubscriptions || subscriptionsData.length}</p>
                </div>
                <div className="w-12 h-12 bg-info/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-info" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Active</p>
                  <p className="text-2xl font-bold text-ink">{stats.activeSubscriptions || subscriptionsData.filter(s => s.status.toLowerCase() === 'active').length}</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
            
            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-ink">₹{totalMonthlyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-lg p-6   transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-dim mb-1">Annual Revenue</p>
                  <p className="text-2xl font-bold text-ink">₹{(stats.totalAnnualRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="w-12 h-12 bg-surface-hover rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-ink" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform  text-dim w-5 h-5" />
              <input
                type="text"
                placeholder="Search subscriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface border border-line rounded-lg focus:ring-2 focus:ring-line focus:border-transparent text-sm"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-surface border border-line rounded-lg focus:ring-2 focus:ring-line focus:border-transparent text-sm"
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
        <div className="bg-surface border border-line rounded-lg overflow-hidden ">
          <table className="w-full">
            <thead className="bg-canvas border-b border-line">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">Subscription</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">Customer</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">Billing Cycle</th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">Amount</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">Next Billing</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">Status</th>
                <th className="text-center py-4 px-6 text-xs font-semibold text-dim uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-dim">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => {
                  const statusConfig = getStatusConfig(subscription.status);
                  return (
                    <tr key={subscription.id} className="hover:bg-canvas transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-ink">{subscription.customSubscriptionId || subscription.id}</div>
                        <div className="text-xs text-dim">{subscription.startDate}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-ink">{subscription.customer}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-medium text-ink">{subscription.billingCycle}</div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="text-lg font-bold text-ink">{subscription.amount}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="text-sm text-ink">{subscription.nextBillingDate}</div>
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
                            className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-xl transition-all duration-200 hover:scale-105" 
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditSubscription(subscription)}
                            className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-xl transition-all duration-200 hover:scale-105" 
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-dim hover:text-warning hover:bg-warning/10 rounded-xl transition-all duration-200 hover:scale-105" title="Pause">
                            <Pause className="w-4 h-4" />
                          </button>
                          <div className="relative group">
                            <button className="p-2 text-dim hover:text-dim hover:bg-canvas rounded-lg transition-colors duration-200">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            <div className="absolute right-0 top-10 w-36 bg-surface border border-line rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                              <button className="w-full text-left px-4 py-3 text-sm text-ink hover:bg-canvas rounded-t-lg transition-colors flex items-center space-x-2">
                                <Copy className="w-4 h-4" />
                                <span>Duplicate</span>
                              </button>
                              <button className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-danger/10 rounded-b-lg flex items-center space-x-2 transition-colors">
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
