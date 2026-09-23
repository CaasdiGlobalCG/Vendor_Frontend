import React, { useState, useEffect } from 'react';
import { X, Download, Send, Edit2, ArrowLeft, Pause, Play, History } from 'lucide-react';
import config from '../../../../config/env';
import invoiceFetch from '../invoice/utils/invoiceFetch';

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
      const response = await invoiceFetch(
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
      const response = await invoiceFetch(
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
      const response = await invoiceFetch(
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
      const response = await invoiceFetch(
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
      <div className="w-full border-b border-line">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-dim" />
            </button>
            <h2 className="text-lg font-semibold text-ink">
              {selectedSubscription?.customSubscriptionId || 'Subscription Preview'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-dim" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Subscriptions List */}
        <div className="w-64 border-r border-line overflow-y-auto bg-canvas">
          <ul className="divide-y divide-line">
            {subscriptions.map(s => (
              <li
                key={s.id || s.subscriptionId}
                className={`p-4 cursor-pointer border-b border-line hover:bg-surface-hover ${selectedId === (s.id || s.subscriptionId) ? 'bg-surface font-semibold' : ''}`}
                onClick={() => handleSubscriptionSelect(s)}
              >
                <div className="font-medium">{s.customSubscriptionId || s.id}</div>
                <div className="text-xs text-dim">{s.customer}</div>
                <div className="text-xs text-dim">{s.billingCycle}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {selectedSubscription ? (
            <>
              {/* Actions Bar */}
              <div className="border-b border-line p-4 flex items-center justify-between bg-surface">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{selectedSubscription.customer}</h3>
                  <p className="text-sm text-dim">Status: <span className={`font-semibold ${selectedSubscription.status === 'active' ? 'text-success' : selectedSubscription.status === 'paused' ? 'text-warning' : 'text-danger'}`}>{selectedSubscription.status}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSubscription.status === 'active' ? (
                    <button
                      onClick={handlePauseSubscription}
                      className="px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning transition-colors flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={handleResumeSubscription}
                      className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Resume
                    </button>
                  )}
                  <div className="relative">
                    <button
                      onClick={() => setShowActionsMenu(!showActionsMenu)}
                      className="px-4 py-2 bg-cta text-cta-foreground rounded-lg hover:bg-cta transition-colors"
                    >
                      More
                    </button>
                    {showActionsMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-surface border border-line rounded-lg shadow-lg z-20">
                        <button 
                          onClick={handleGenerateInvoice}
                          className="w-full text-left px-4 py-3 hover:bg-canvas flex items-center space-x-2 text-ink hover:text-ink transition-colors border-b border-line"
                        >
                          <Download className="w-4 h-4" />
                          <span>Generate Invoice</span>
                        </button>
                        <button className="w-full text-left px-4 py-3 hover:bg-canvas flex items-center space-x-2 text-ink hover:text-ink transition-colors">
                          <Send className="w-4 h-4" />
                          <span>Send to Customer</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-line flex bg-canvas">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-6 py-3 font-medium transition-colors ${activeTab === 'details' ? 'text-ink border-b-2 border-line' : 'text-dim hover:text-ink'}`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'text-ink border-b-2 border-line' : 'text-dim hover:text-ink'}`}
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
                      <div className="bg-canvas p-4 rounded-lg">
                        <p className="text-xs text-dim font-medium mb-1">Billing Cycle</p>
                        <p className="text-lg font-semibold text-ink">{selectedSubscription.billingCycle}</p>
                      </div>
                      <div className="bg-canvas p-4 rounded-lg">
                        <p className="text-xs text-dim font-medium mb-1">Amount</p>
                        <p className="text-lg font-semibold text-ink">{selectedSubscription.amount}</p>
                      </div>
                      <div className="bg-canvas p-4 rounded-lg">
                        <p className="text-xs text-dim font-medium mb-1">Start Date</p>
                        <p className="text-lg font-semibold text-ink">{selectedSubscription.startDate}</p>
                      </div>
                      <div className="bg-canvas p-4 rounded-lg">
                        <p className="text-xs text-dim font-medium mb-1">Next Billing</p>
                        <p className="text-lg font-semibold text-ink">{selectedSubscription.nextBillingDate}</p>
                      </div>
                    </div>

                    {selectedSubscription.notes && (
                      <div className="bg-info/10 p-4 rounded-lg border border-info/20">
                        <p className="text-xs text-info font-medium mb-2">Notes</p>
                        <p className="text-ink">{selectedSubscription.notes}</p>
                      </div>
                    )}

                    <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                      <p className="text-xs text-success font-medium mb-2">Subscription Information</p>
                      <div className="space-y-2 text-sm text-ink">
                        <p><strong>Status:</strong> {selectedSubscription.status}</p>
                        <p><strong>Created:</strong> {new Date(selectedSubscription.createdAt).toLocaleDateString('en-GB')}</p>
                        <p><strong>Invoices Generated:</strong> {selectedSubscription.invoicesGenerated || 0}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Renewal History
                    </h3>
                    
                    {loadingHistory ? (
                      <div className="text-center py-8 text-dim">Loading history...</div>
                    ) : subscriptionHistory.length === 0 ? (
                      <div className="text-center py-8 text-dim">No renewal history yet</div>
                    ) : (
                      <div className="space-y-3">
                        {subscriptionHistory.map((item, index) => (
                          <div key={index} className="bg-canvas p-4 rounded-lg border border-line hover:border-line transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-ink">{item.customInvoiceId}</p>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.status === 'draft' ? 'bg-surface-hover text-ink' :
                                item.status === 'sent' ? 'bg-info/10 text-info' :
                                'bg-success/10 text-success'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-dim">
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
            <div className="flex-1 flex items-center justify-center text-dim">
              <p>Select a subscription to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsPreviewPanel;
