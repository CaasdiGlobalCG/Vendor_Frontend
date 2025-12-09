import React, { useState, useEffect } from 'react';
import { X, Download, Send, Edit2, ArrowLeft, Pause, Play, History } from 'lucide-react';
import config from '../../../../config/env';

const SubscriptionsPreviewPanel = ({ subscriptions, selectedSubscriptionId, onSelectSubscription, onClose }) => {
  const [selectedId, setSelectedId] = useState(selectedSubscriptionId);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const selectedSubscription = subscriptions.find(s => s.id === selectedId || s.subscriptionId === selectedId);

  // Fetch subscription history when subscription changes
  useEffect(() => {
    if (selectedSubscription) {
      fetchSubscriptionHistory();
    }
  }, [selectedSubscription?.id]);

  const fetchSubscriptionHistory = async () => {
    if (!selectedSubscription) return;

    try {
      setLoadingHistory(true);
      const response = await fetch(
        `/api/workspace/subscriptions/${selectedSubscription.id}/history`,
        {
          headers: {
            'x-user-info': JSON.stringify({
              role: 'vendor'
            })
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSubscriptionHistory(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePauseSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(
        `/api/workspace/subscriptions/${selectedSubscription.id}/pause`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-info': JSON.stringify({
              role: 'vendor'
            })
          }
        }
      );

      if (response.ok) {
        alert('Subscription paused successfully');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error pausing subscription:', error);
      alert('Failed to pause subscription');
    }
  };

  const handleResumeSubscription = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(
        `/api/workspace/subscriptions/${selectedSubscription.id}/resume`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-info': JSON.stringify({
              role: 'vendor'
            })
          }
        }
      );

      if (response.ok) {
        alert('Subscription resumed successfully');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error resuming subscription:', error);
      alert('Failed to resume subscription');
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedSubscription) return;

    try {
      const response = await fetch(
        `/api/workspace/subscriptions/${selectedSubscription.id}/generate-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-info': JSON.stringify({
              role: 'vendor'
            })
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(`Invoice generated: ${result.data.invoice.customInvoiceId}`);
        fetchSubscriptionHistory();
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    }
  };

  const handleSubscriptionSelect = (s) => {
    const subId = s.id || s.subscriptionId;
    setSelectedId(subId);
    onSelectSubscription?.(s);
  };

  return (
    <div className="flex h-full">
      {/* Header */}
      <div className="w-full border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedSubscription?.customSubscriptionId || 'Subscription Preview'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Subscriptions List */}
        <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
          <ul className="divide-y divide-gray-200">
            {subscriptions.map(s => (
              <li
                key={s.id || s.subscriptionId}
                className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-100 ${selectedId === (s.id || s.subscriptionId) ? 'bg-white font-semibold' : ''}`}
                onClick={() => handleSubscriptionSelect(s)}
              >
                <div className="font-medium">{s.customSubscriptionId || s.id}</div>
                <div className="text-xs text-gray-500">{s.customer}</div>
                <div className="text-xs text-gray-400">{s.billingCycle}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {selectedSubscription ? (
            <>
              {/* Actions Bar */}
              <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedSubscription.customer}</h3>
                  <p className="text-sm text-gray-600">Status: <span className={`font-semibold ${selectedSubscription.status === 'active' ? 'text-green-600' : selectedSubscription.status === 'paused' ? 'text-yellow-600' : 'text-red-600'}`}>{selectedSubscription.status}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSubscription.status === 'active' ? (
                    <button
                      onClick={handlePauseSubscription}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeSubscription}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      More
                    </button>
                    {showActionsMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                        <button 
                          onClick={handleGenerateInvoice}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors border-b border-gray-100"
                        >
                          <Download className="w-4 h-4" />
                          <span>Generate Invoice</span>
                        </button>
                        <button className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors">
                          <Send className="w-4 h-4" />
                          <span>Send to Customer</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 flex bg-gray-50">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-6 py-3 font-medium transition-colors ${activeTab === 'details' ? 'text-slate-700 border-b-2 border-slate-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'text-slate-700 border-b-2 border-slate-700' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <History className="w-4 h-4" />
                  History
                </button>
              </div>

              {/* Content based on active tab */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'details' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium mb-1">Billing Cycle</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSubscription.billingCycle}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium mb-1">Amount</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSubscription.amount}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium mb-1">Start Date</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSubscription.startDate}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium mb-1">Next Billing</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedSubscription.nextBillingDate}</p>
                      </div>
                    </div>

                    {selectedSubscription.notes && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-2">Notes</p>
                        <p className="text-gray-700">{selectedSubscription.notes}</p>
                      </div>
                    )}

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium mb-2">Subscription Information</p>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><strong>Status:</strong> {selectedSubscription.status}</p>
                        <p><strong>Created:</strong> {new Date(selectedSubscription.createdAt).toLocaleDateString('en-GB')}</p>
                        <p><strong>Invoices Generated:</strong> {selectedSubscription.invoicesGenerated || 0}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Renewal History
                    </h3>
                    
                    {loadingHistory ? (
                      <div className="text-center py-8 text-gray-500">Loading history...</div>
                    ) : subscriptionHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No renewal history yet</div>
                    ) : (
                      <div className="space-y-3">
                        {subscriptionHistory.map((item, index) => (
                          <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-gray-900">{item.customInvoiceId}</p>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                item.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>₹{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              <span>{new Date(item.date).toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Select a subscription to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPreviewPanel;
