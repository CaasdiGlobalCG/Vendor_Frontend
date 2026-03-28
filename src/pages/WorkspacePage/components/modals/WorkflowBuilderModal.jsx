import React, { useEffect, useMemo, useState } from 'react';
import { GitBranch, Loader2, PlayCircle, Plus, Save, Trash2, X } from 'lucide-react';
import WorkflowRuleForm from '../workflow/WorkflowRuleForm';
import WorkflowActionForm from '../workflow/WorkflowActionForm';
import WorkflowFlowDiagram from '../workflow/WorkflowFlowDiagram';
import { workflowClient } from '../../services/workflowClient';

const emptyWorkflow = {
  name: '',
  description: '',
  isEnabled: true,
  logicOperator: 'AND',
  triggers: [],
  actions: []
};

const WorkflowBuilderModal = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  currentUser
}) => {
  const [tab, setTab] = useState('definition');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [form, setForm] = useState(emptyWorkflow);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState(null);
  const [editingActionIndex, setEditingActionIndex] = useState(null);
  const [executionLog, setExecutionLog] = useState([]);
  const [executionStats, setExecutionStats] = useState(null);
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [workspaceWebhookList, setWorkspaceWebhookList] = useState([]);
  const [outboundWebhooks, setOutboundWebhooks] = useState([]);
  const [webhookTestPayload, setWebhookTestPayload] = useState('{"source":"builder-test","status":"Approved"}');
  const [testPayload, setTestPayload] = useState('{"nodeId":"sample-node","status":"Approved"}');
  const [message, setMessage] = useState({ type: '', text: '' });

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.workflowId === selectedWorkflowId) || null,
    [workflows, selectedWorkflowId]
  );

  useEffect(() => {
    if (!isOpen || !workspaceId) return;
    loadWorkflows();
  }, [isOpen, workspaceId]);

  useEffect(() => {
    if (!selectedWorkflow) {
      setForm(emptyWorkflow);
      return;
    }

    setForm({
      name: selectedWorkflow.name || '',
      description: selectedWorkflow.description || '',
      isEnabled: selectedWorkflow.isEnabled !== false,
      logicOperator: selectedWorkflow.logicOperator || 'AND',
      triggers: selectedWorkflow.triggers || [],
      actions: selectedWorkflow.actions || []
    });
  }, [selectedWorkflow]);

  useEffect(() => {
    if (!isOpen || tab !== 'execution' || !selectedWorkflowId) return;
    loadExecutionData(selectedWorkflowId);
  }, [isOpen, tab, selectedWorkflowId]);

  useEffect(() => {
    if (!isOpen || !workspaceId) return;
    loadWorkspaceWebhookMeta();
  }, [isOpen, workspaceId]);

  useEffect(() => {
    if (!isOpen || !selectedWorkflowId) {
      setWebhookConfig(null);
      return;
    }
    loadWebhookConfig(selectedWorkflowId);
  }, [isOpen, selectedWorkflowId]);

  const loadWorkflows = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await workflowClient.listByWorkspace(workspaceId);
      const list = response.workflows || [];
      setWorkflows(list);
      if (!selectedWorkflowId && list.length > 0) {
        setSelectedWorkflowId(list[0].workflowId);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load workflows.' });
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionData = async (workflowId) => {
    try {
      const [history, stats] = await Promise.all([
        workflowClient.getExecutionLog(workflowId, 50),
        workflowClient.getStats(workflowId)
      ]);

      setExecutionLog(history.executionLog || []);
      setExecutionStats(stats.stats || null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load execution details.' });
    }
  };

  const loadWebhookConfig = async (workflowId) => {
    try {
      const response = await workflowClient.getWebhookConfig(workflowId);
      setWebhookConfig(response.config || null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load webhook config.' });
    }
  };

  const loadWorkspaceWebhookMeta = async () => {
    try {
      const [configs, outbound] = await Promise.all([
        workflowClient.listWorkspaceWebhookConfigs(workspaceId),
        workflowClient.listWorkspaceOutboundWebhooks(workspaceId)
      ]);
      setWorkspaceWebhookList(configs.webhooks || []);
      setOutboundWebhooks(outbound.outbound || []);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to load webhook metadata.' });
    }
  };

  const resetToNew = () => {
    setSelectedWorkflowId(null);
    setForm(emptyWorkflow);
    setExecutionLog([]);
    setExecutionStats(null);
    setMessage({ type: '', text: '' });
    setTab('definition');
  };

  const handleSave = async () => {
    if (!workspaceId) {
      setMessage({ type: 'error', text: 'Missing workspace ID.' });
      return;
    }

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Workflow name is required.' });
      return;
    }

    if (form.triggers.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one trigger.' });
      return;
    }

    if (form.actions.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one action.' });
      return;
    }

    const payload = {
      workspaceId,
      name: form.name,
      description: form.description,
      isEnabled: form.isEnabled,
      logicOperator: form.logicOperator,
      triggers: form.triggers,
      actions: form.actions,
      createdBy: currentUser?.email || currentUser?.name || 'workflow-user'
    };

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      if (selectedWorkflowId) {
        await workflowClient.update(selectedWorkflowId, payload);
        setMessage({ type: 'success', text: 'Workflow updated successfully.' });
      } else {
        const response = await workflowClient.create(payload);
        setSelectedWorkflowId(response.workflow?.workflowId || null);
        setMessage({ type: 'success', text: 'Workflow created successfully.' });
      }
      await loadWorkflows();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save workflow.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkflowId) return;
    const confirmed = window.confirm('Delete this workflow? This cannot be undone.');
    if (!confirmed) return;

    try {
      await workflowClient.remove(selectedWorkflowId);
      setMessage({ type: 'success', text: 'Workflow deleted.' });
      resetToNew();
      await loadWorkflows();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete workflow.' });
    }
  };

  const addOrUpdateRule = (rule) => {
    setForm((prev) => {
      const nextTriggers = [...prev.triggers];
      if (editingRuleIndex === null) {
        nextTriggers.push(rule);
      } else {
        nextTriggers[editingRuleIndex] = rule;
      }
      return { ...prev, triggers: nextTriggers };
    });
    setShowRuleForm(false);
    setEditingRuleIndex(null);
  };

  const addOrUpdateAction = (action) => {
    setForm((prev) => {
      const nextActions = [...prev.actions];
      if (editingActionIndex === null) {
        nextActions.push(action);
      } else {
        nextActions[editingActionIndex] = action;
      }
      return { ...prev, actions: nextActions };
    });
    setShowActionForm(false);
    setEditingActionIndex(null);
  };

  const removeRule = (index) => {
    setForm((prev) => ({
      ...prev,
      triggers: prev.triggers.filter((_, i) => i !== index)
    }));
  };

  const removeAction = (index) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const moveAction = (index, direction) => {
    setForm((prev) => {
      const next = [...prev.actions];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, actions: next };
    });
  };

  const runTest = async () => {
    if (!selectedWorkflowId) {
      setMessage({ type: 'error', text: 'Select or save a workflow before testing.' });
      return;
    }

    try {
      const parsed = JSON.parse(testPayload || '{}');
      const result = await workflowClient.test(selectedWorkflowId, parsed);
      setMessage({
        type: result.shouldTrigger ? 'success' : 'info',
        text: result.shouldTrigger
          ? 'Test result: trigger matched and workflow would execute.'
          : 'Test result: no trigger match for provided event data.'
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to run test.' });
    }
  };

  const rotateSecret = async () => {
    if (!selectedWorkflowId) return;
    try {
      const response = await workflowClient.rotateWebhookSecret(selectedWorkflowId);
      setWebhookConfig(response.config || null);
      setMessage({ type: 'success', text: 'Webhook secret rotated successfully.' });
      await loadWorkspaceWebhookMeta();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to rotate webhook secret.' });
    }
  };

  const testWebhookFromBuilder = async () => {
    if (!selectedWorkflowId) return;

    try {
      const payload = JSON.parse(webhookTestPayload || '{}');
      await workflowClient.testWebhookTrigger(selectedWorkflowId, payload);
      setMessage({ type: 'success', text: 'Webhook test request executed successfully.' });
      if (tab === 'execution') {
        await loadExecutionData(selectedWorkflowId);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Webhook test failed.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl h-[85vh] rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Workflow Builder</h2>
              <p className="text-sm text-gray-600">
                {workspaceName ? `Workspace: ${workspaceName}` : 'Workspace automation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-12">
          <aside className="col-span-3 border-r border-gray-200 bg-gray-50/60 p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Workflows</h3>
              <button
                onClick={resetToNew}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-gray-600 flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : workflows.length === 0 ? (
              <p className="text-sm text-gray-500">No workflows yet.</p>
            ) : (
              <div className="space-y-1.5">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.workflowId}
                    onClick={() => setSelectedWorkflowId(workflow.workflowId)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                      workflow.workflowId === selectedWorkflowId
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">{workflow.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{workflow.isEnabled ? 'Enabled' : 'Disabled'}</p>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <main className="col-span-9 p-4 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
                <button
                  onClick={() => setTab('definition')}
                  className={`px-3 py-1.5 rounded-md text-sm ${tab === 'definition' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  Definition
                </button>
                <button
                  onClick={() => setTab('execution')}
                  className={`px-3 py-1.5 rounded-md text-sm ${tab === 'execution' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  disabled={!selectedWorkflowId}
                >
                  Execution Log
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedWorkflowId && (
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                </button>
              </div>
            </div>

            {message.text && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  message.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : message.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}
              >
                {message.text}
              </div>
            )}

            {tab === 'definition' ? (
              <>
                <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-xs text-gray-600">
                      Workflow Name
                      <input
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="RFQ Approved → Create Work Order"
                      />
                    </label>
                    <label className="text-xs text-gray-600">
                      Logic Operator
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        value={form.logicOperator}
                        onChange={(e) => setForm((prev) => ({ ...prev, logicOperator: e.target.value }))}
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    </label>
                  </div>

                  <label className="text-xs text-gray-600 block">
                    Description
                    <textarea
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[74px]"
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isEnabled}
                      onChange={(e) => setForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                    />
                    Workflow is enabled
                  </label>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Trigger Rules ({form.triggers.length})</h4>
                    <button
                      onClick={() => {
                        setEditingRuleIndex(null);
                        setShowRuleForm(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Trigger
                    </button>
                  </div>

                  {showRuleForm && (
                    <WorkflowRuleForm
                      initialValue={editingRuleIndex === null ? null : form.triggers[editingRuleIndex]}
                      onCancel={() => {
                        setShowRuleForm(false);
                        setEditingRuleIndex(null);
                      }}
                      onSave={addOrUpdateRule}
                    />
                  )}

                  {form.triggers.length === 0 ? (
                    <p className="text-sm text-gray-500">No trigger rules added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {form.triggers.map((trigger, index) => (
                        <div key={trigger.id || `trigger-${index}`} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{trigger.type}</p>
                              <p className="text-xs text-gray-600 mt-0.5 break-all">{JSON.stringify(trigger.rule)}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-1 rounded-md text-xs border border-gray-300 hover:bg-white"
                                onClick={() => {
                                  setEditingRuleIndex(index);
                                  setShowRuleForm(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="px-2 py-1 rounded-md text-xs border border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => removeRule(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Actions ({form.actions.length})</h4>
                    <button
                      onClick={() => {
                        setEditingActionIndex(null);
                        setShowActionForm(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Action
                    </button>
                  </div>

                  {showActionForm && (
                    <WorkflowActionForm
                      initialValue={editingActionIndex === null ? null : form.actions[editingActionIndex]}
                      onCancel={() => {
                        setShowActionForm(false);
                        setEditingActionIndex(null);
                      }}
                      onSave={addOrUpdateAction}
                    />
                  )}

                  {form.actions.length === 0 ? (
                    <p className="text-sm text-gray-500">No actions added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {form.actions.map((action, index) => (
                        <div key={action.id || `action-${index}`} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{index + 1}. {action.type}</p>
                              <p className="text-xs text-gray-600 mt-0.5 break-all">{JSON.stringify(action.params)}</p>
                              {action.parallelGroup && (
                                <p className="text-xs text-indigo-600 mt-1">Parallel group: {action.parallelGroup}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                className="px-2 py-1 rounded-md text-xs border border-gray-300 hover:bg-white"
                                onClick={() => moveAction(index, 'up')}
                              >
                                Up
                              </button>
                              <button
                                className="px-2 py-1 rounded-md text-xs border border-gray-300 hover:bg-white"
                                onClick={() => moveAction(index, 'down')}
                              >
                                Down
                              </button>
                              <button
                                className="px-2 py-1 rounded-md text-xs border border-gray-300 hover:bg-white"
                                onClick={() => {
                                  setEditingActionIndex(index);
                                  setShowActionForm(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="px-2 py-1 rounded-md text-xs border border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => removeAction(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Visual Flow Diagram</h4>
                    <p className="text-xs text-gray-500">Triggers → Logic → Actions (fan-out supported)</p>
                  </div>

                  <WorkflowFlowDiagram
                    triggers={form.triggers}
                    logicOperator={form.logicOperator}
                    actions={form.actions}
                  />
                </section>

                {selectedWorkflowId && (
                  <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gray-900">Webhook Trigger Configuration</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={rotateSecret}
                          className="px-2.5 py-1.5 rounded-md text-xs border border-amber-200 text-amber-700 hover:bg-amber-50"
                        >
                          Rotate Secret
                        </button>
                        <button
                          onClick={() => loadWebhookConfig(selectedWorkflowId)}
                          className="px-2.5 py-1.5 rounded-md text-xs border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500">Inbound Trigger URL</p>
                        <p className="text-xs text-gray-900 mt-1 break-all">{webhookConfig?.triggerUrl || 'Not available'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500">Webhook Secret</p>
                        <p className="text-xs text-gray-900 mt-1 break-all">{webhookConfig?.secret || 'Not generated yet'}</p>
                      </div>
                    </div>

                    <label className="text-xs text-gray-600 block">
                      Test Payload (JSON)
                      <textarea
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] font-mono"
                        value={webhookTestPayload}
                        onChange={(e) => setWebhookTestPayload(e.target.value)}
                      />
                    </label>

                    <div className="flex justify-end">
                      <button
                        onClick={testWebhookFromBuilder}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        <PlayCircle className="h-4 w-4" /> Test Webhook
                      </button>
                    </div>
                  </section>
                )}

                <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Workspace Webhook Inventory</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-800 mb-2">Inbound Workflow Webhooks</p>
                      {workspaceWebhookList.length === 0 ? (
                        <p className="text-xs text-gray-500">No webhook configs yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                          {workspaceWebhookList.map((item) => (
                            <div key={item.workflowId} className="text-xs border border-gray-200 rounded-md p-2 bg-white">
                              <p className="font-medium text-gray-900 truncate">{item.name}</p>
                              <p className="text-gray-600">{item.hasWebhookSecret ? 'Secret configured' : 'Secret missing'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-800 mb-2">Outbound Webhook Actions</p>
                      {outboundWebhooks.length === 0 ? (
                        <p className="text-xs text-gray-500">No outbound webhook actions configured.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                          {outboundWebhooks.map((item) => (
                            <div key={`${item.workflowId}-${item.actionId}`} className="text-xs border border-gray-200 rounded-md p-2 bg-white">
                              <p className="font-medium text-gray-900 truncate">{item.workflowName}</p>
                              <p className="text-gray-600 truncate">{item.method} {item.url}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">Execution Stats</h4>
                    <button
                      onClick={runTest}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      <PlayCircle className="h-3.5 w-3.5" /> Run Test
                    </button>
                  </div>

                  {executionStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500">Total Executions</p>
                        <p className="text-lg font-semibold text-gray-900">{executionStats.totalExecutions || 0}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500">Failures</p>
                        <p className="text-lg font-semibold text-red-700">{executionStats.totalFailures || 0}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500">Success Rate</p>
                        <p className="text-lg font-semibold text-emerald-700">{executionStats.successRate || 'N/A'}</p>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500">Enabled</p>
                        <p className="text-lg font-semibold text-gray-900">{executionStats.isEnabled ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No execution statistics available yet.</p>
                  )}

                  <label className="text-xs text-gray-600 block">
                    Test Event Payload (JSON)
                    <textarea
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[90px] font-mono"
                      value={testPayload}
                      onChange={(e) => setTestPayload(e.target.value)}
                    />
                  </label>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Execution Log</h4>
                  {executionLog.length === 0 ? (
                    <p className="text-sm text-gray-500">No execution history found.</p>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                      {executionLog.map((entry) => (
                        <div key={entry.executionId} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">{entry.executionId}</p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                entry.status === 'completed'
                                  ? 'border-green-200 text-green-700 bg-green-50'
                                  : entry.status === 'failed'
                                    ? 'border-red-200 text-red-700 bg-red-50'
                                    : 'border-blue-200 text-blue-700 bg-blue-50'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{entry.timestamp}</p>
                          <p className="text-xs text-gray-600 mt-1">Actions: {entry.actions?.length || 0}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilderModal;
