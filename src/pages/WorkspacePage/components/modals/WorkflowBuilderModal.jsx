import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  GitBranch,
  Loader2,
  PlayCircle,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
import WorkflowRuleForm from '../workflow/WorkflowRuleForm';
import WorkflowActionForm from '../workflow/WorkflowActionForm';
import WorkflowFlowDiagram from '../workflow/WorkflowFlowDiagram';
import {
  actionTypeMeta,
  buildWorkflowTemplates,
  describeAction,
  describeTrigger,
  triggerTypeMeta
} from '../workflow/workflowCatalog';
import { workflowClient } from '../../services/workflowClient';

const emptyWorkflow = {
  name: '',
  description: '',
  isEnabled: true,
  logicOperator: 'AND',
  triggers: [],
  actions: []
};

const StepBadge = ({ children }) => (
  <span className="h-6 w-6 rounded-full bg-cta text-cta-foreground text-xs font-semibold flex items-center justify-center shrink-0">
    {children}
  </span>
);

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
  const [editorMode, setEditorMode] = useState('pick');
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const templates = useMemo(buildWorkflowTemplates, []);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.workflowId === selectedWorkflowId) || null,
    [workflows, selectedWorkflowId]
  );

  const summary = useMemo(() => {
    const joiner = form.logicOperator === 'OR' ? ' or ' : ' and ';
    const when = form.triggers.length
      ? form.triggers.map(describeTrigger).join(joiner)
      : 'pick what starts it below';
    const then = form.actions.length
      ? form.actions.map(describeAction).join(', then ')
      : 'add what it should do below';
    return { when, then };
  }, [form]);

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
        setEditorMode('edit');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not load workflows.' });
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
      setMessage({ type: 'error', text: error.message || 'Could not load run history.' });
    }
  };

  const loadWebhookConfig = async (workflowId) => {
    try {
      const response = await workflowClient.getWebhookConfig(workflowId);
      setWebhookConfig(response.config || null);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not load webhook config.' });
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
      setMessage({ type: 'error', text: error.message || 'Could not load webhook metadata.' });
    }
  };

  const resetToNew = () => {
    setSelectedWorkflowId(null);
    setForm(emptyWorkflow);
    setExecutionLog([]);
    setExecutionStats(null);
    setMessage({ type: '', text: '' });
    setTab('definition');
    setEditorMode('pick');
  };

  const selectWorkflow = (workflowId) => {
    setSelectedWorkflowId(workflowId);
    setEditorMode('edit');
    setMessage({ type: '', text: '' });
  };

  const applyTemplate = (template) => {
    setSelectedWorkflowId(null);
    setForm({ ...emptyWorkflow, ...template.form });
    setEditorMode('edit');
    setTab('definition');
    setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (!workspaceId) {
      setMessage({ type: 'error', text: 'Missing workspace ID.' });
      return;
    }

    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Give your workflow a name first.' });
      return;
    }

    if (form.triggers.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one "when" — pick what starts this workflow.' });
      return;
    }

    if (form.actions.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one step — pick what it should do.' });
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
        setMessage({ type: 'success', text: 'Workflow saved.' });
      } else {
        const response = await workflowClient.create(payload);
        setSelectedWorkflowId(response.workflow?.workflowId || null);
        setMessage({ type: 'success', text: 'Workflow created — it will now run on its own.' });
      }
      await loadWorkflows();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not save the workflow.' });
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
      setMessage({ type: 'error', text: error.message || 'Could not delete the workflow.' });
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
      setMessage({ type: 'error', text: 'Save the workflow first, then test it.' });
      return;
    }

    try {
      const parsed = JSON.parse(testPayload || '{}');
      const result = await workflowClient.test(selectedWorkflowId, parsed);
      setMessage({
        type: result.shouldTrigger ? 'success' : 'info',
        text: result.shouldTrigger
          ? 'Test passed — the "when" matched, so this workflow would run.'
          : 'No match — the sample data did not satisfy the "when" conditions.'
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not run the test.' });
    }
  };

  const rotateSecret = async () => {
    if (!selectedWorkflowId) return;
    try {
      const response = await workflowClient.rotateWebhookSecret(selectedWorkflowId);
      setWebhookConfig(response.config || null);
      setMessage({ type: 'success', text: 'Webhook secret rotated.' });
      await loadWorkspaceWebhookMeta();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not rotate the webhook secret.' });
    }
  };

  const testWebhookFromBuilder = async () => {
    if (!selectedWorkflowId) return;

    try {
      const payload = JSON.parse(webhookTestPayload || '{}');
      await workflowClient.testWebhookTrigger(selectedWorkflowId, payload);
      setMessage({ type: 'success', text: 'Webhook test sent successfully.' });
      if (tab === 'execution') {
        await loadExecutionData(selectedWorkflowId);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Webhook test failed.' });
    }
  };

  if (!isOpen) return null;

  const renderTemplatePicker = () => (
    <div className="space-y-5">
      <div className="rounded-xl border border-info/10 bg-info px-4 py-3">
        <p className="text-sm font-medium text-ink">Workflows are simple automations:</p>
        <p className="text-sm text-dim mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-info text-white text-xs font-semibold">WHEN</span>
          something happens
          <ArrowRight className="h-3.5 w-3.5 text-dim" />
          <span className="px-2 py-0.5 rounded-full bg-cta text-cta-foreground text-xs font-semibold">THEN</span>
          it does something for you — automatically.
        </p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-ink">Start with a ready-made recipe</h3>
        <p className="text-sm text-dim mt-0.5">One click fills everything in — you can tweak it after.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.key}
              onClick={() => applyTemplate(template)}
              className="text-left rounded-xl border border-line bg-surface p-4 hover:border-info/30  transition"
            >
              <div className="flex items-center gap-2.5">
                <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${template.chipClass}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-ink">{template.name}</p>
              </div>
              <p className="text-xs text-dim mt-2">{template.tagline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-info/10 text-info border border-info/20">
                  WHEN {describeTrigger(template.form.triggers[0])}
                </span>
                <ArrowRight className="h-3 w-3 text-dim" />
                <span className="px-2 py-0.5 rounded-full bg-surface-hover text-ink border border-line">
                  THEN {describeAction(template.form.actions[0])}
                </span>
              </div>
            </button>
          );
        })}

        <button
          onClick={() => {
            setForm(emptyWorkflow);
            setSelectedWorkflowId(null);
            setEditorMode('edit');
          }}
          className="text-left rounded-xl border border-dashed border-line bg-canvas p-4 hover:border-line hover:bg-canvas transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-lg flex items-center justify-center bg-surface-hover text-dim">
              <Plus className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-ink">Start from scratch</p>
          </div>
          <p className="text-xs text-dim mt-2">
            Build a custom workflow step by step — pick what starts it, then what it does.
          </p>
        </button>
      </div>
    </div>
  );

  const renderDefinitionTab = () => (
    <>
      <div className="rounded-xl border border-info/10 bg-info px-4 py-3 flex flex-wrap items-center gap-2 text-sm text-ink">
        <span className="px-2 py-0.5 rounded-full bg-info text-white text-xs font-semibold">WHEN</span>
        <span className={form.triggers.length ? '' : 'text-dim italic'}>{summary.when}</span>
        <ArrowRight className="h-4 w-4 text-dim" />
        <span className="px-2 py-0.5 rounded-full bg-cta text-cta-foreground text-xs font-semibold">THEN</span>
        <span className={form.actions.length ? '' : 'text-dim italic'}>{summary.then}</span>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <StepBadge>1</StepBadge>
          <div>
            <h4 className="text-sm font-semibold text-ink">Name it</h4>
            <p className="text-xs text-dim">Something you'll recognize later.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isEnabled: !prev.isEnabled }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.isEnabled ? 'bg-cta' : 'bg-surface-hover'}`}
              title={form.isEnabled ? 'Turn off' : 'Turn on'}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${
                  form.isEnabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
            <span className="text-xs text-dim">{form.isEnabled ? 'On' : 'Off'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs font-medium text-dim">
            Workflow name
            <input
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder='e.g. "RFQ approved → create work order"'
            />
          </label>
          <label className="text-xs font-medium text-dim">
            Notes (optional)
            <input
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What does this workflow do?"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <StepBadge>2</StepBadge>
          <div>
            <h4 className="text-sm font-semibold text-ink">When this happens</h4>
            <p className="text-xs text-dim">The event that starts this workflow.</p>
          </div>
          <button
            onClick={() => {
              setEditingRuleIndex(null);
              setShowRuleForm(true);
            }}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-info text-white hover:bg-info"
          >
            <Plus className="h-3.5 w-3.5" /> Add a "when"
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
          <p className="text-sm text-dim">Nothing yet — add what should start this workflow.</p>
        ) : (
          <div className="space-y-2">
            {form.triggers.map((trigger, index) => {
              const meta = triggerTypeMeta(trigger.type);
              const Icon = meta?.icon || GitBranch;
              return (
                <div key={trigger.id || `trigger-${index}`} className="rounded-lg border border-info/20 bg-info p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-8 w-8 rounded-lg bg-surface border border-info/20 text-info flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{describeTrigger(trigger)}</p>
                        <p className="text-xs text-dim">{meta?.shortLabel || trigger.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        className="px-2 py-1 rounded-md text-xs border border-line bg-surface hover:bg-canvas"
                        onClick={() => {
                          setEditingRuleIndex(index);
                          setShowRuleForm(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-1 rounded-md text-xs border border-danger/20 text-danger bg-surface hover:bg-danger/10"
                        onClick={() => removeRule(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {form.triggers.length > 1 && (
          <div className="flex items-center gap-2.5 pt-1 text-sm text-ink">
            <span className="text-xs text-dim">Run when</span>
            <div className="inline-flex rounded-lg border border-line p-0.5 bg-canvas">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, logicOperator: 'AND' }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  form.logicOperator === 'AND' ? 'bg-cta text-cta-foreground' : 'text-dim hover:bg-surface-hover'
                }`}
              >
                all of them happen
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, logicOperator: 'OR' }))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  form.logicOperator === 'OR' ? 'bg-cta text-cta-foreground' : 'text-dim hover:bg-surface-hover'
                }`}
              >
                any of them happens
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <StepBadge>3</StepBadge>
          <div>
            <h4 className="text-sm font-semibold text-ink">Then do this</h4>
            <p className="text-xs text-dim">What the workflow does for you, in order.</p>
          </div>
          <button
            onClick={() => {
              setEditingActionIndex(null);
              setShowActionForm(true);
            }}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-cta text-cta-foreground hover:bg-cta"
          >
            <Plus className="h-3.5 w-3.5" /> Add a step
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
          <p className="text-sm text-dim">Nothing yet — add what it should do.</p>
        ) : (
          <div className="space-y-2">
            {form.actions.map((action, index) => {
              const meta = actionTypeMeta(action.type);
              const Icon = meta?.icon || GitBranch;
              return (
                <div key={action.id || `action-${index}`} className="rounded-lg border border-line bg-cta p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-8 w-8 rounded-lg bg-surface border border-line text-ink flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {index + 1}. {describeAction(action)}
                        </p>
                        <p className="text-xs text-dim">
                          {meta?.label || action.type}
                          {action.parallelGroup ? ` · runs in parallel (${action.parallelGroup})` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      <button
                        className="px-2 py-1 rounded-md text-xs border border-line bg-surface hover:bg-canvas"
                        onClick={() => moveAction(index, 'up')}
                      >
                        Up
                      </button>
                      <button
                        className="px-2 py-1 rounded-md text-xs border border-line bg-surface hover:bg-canvas"
                        onClick={() => moveAction(index, 'down')}
                      >
                        Down
                      </button>
                      <button
                        className="px-2 py-1 rounded-md text-xs border border-line bg-surface hover:bg-canvas"
                        onClick={() => {
                          setEditingActionIndex(index);
                          setShowActionForm(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-2 py-1 rounded-md text-xs border border-danger/20 text-danger bg-surface hover:bg-danger/10"
                        onClick={() => removeAction(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink">Preview</h4>
          <p className="text-xs text-dim">How it flows: when → check → do → done</p>
        </div>

        <WorkflowFlowDiagram
          triggers={form.triggers}
          logicOperator={form.logicOperator}
          actions={form.actions}
        />
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <h4 className="text-sm font-semibold text-ink">Advanced — webhooks & integrations</h4>
            <p className="text-xs text-dim mt-0.5">
              Connect other apps with webhook URLs and secrets. Most workflows don't need this.
            </p>
          </div>
          <ChevronDown className={`h-4 w-4 text-dim transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {showAdvanced && (
          <div className="space-y-4 pt-1">
            {selectedWorkflowId && (
              <div className="rounded-lg border border-line p-3 space-y-3 bg-canvas">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-semibold text-ink">Let other apps start this workflow</h5>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={rotateSecret}
                      className="px-2.5 py-1.5 rounded-md text-xs border border-warning/20 text-warning hover:bg-warning/10"
                    >
                      Rotate Secret
                    </button>
                    <button
                      onClick={() => loadWebhookConfig(selectedWorkflowId)}
                      className="px-2.5 py-1.5 rounded-md text-xs border border-line text-ink hover:bg-canvas"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-line p-3 bg-surface">
                    <p className="text-xs text-dim">Inbound trigger URL</p>
                    <p className="text-xs text-ink mt-1 break-all">{webhookConfig?.triggerUrl || 'Not available'}</p>
                  </div>
                  <div className="rounded-lg border border-line p-3 bg-surface">
                    <p className="text-xs text-dim">Webhook secret</p>
                    <p className="text-xs text-ink mt-1 break-all">{webhookConfig?.secret || 'Not generated yet'}</p>
                  </div>
                </div>

                <label className="text-xs text-dim block">
                  Test payload (JSON)
                  <textarea
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm min-h-[80px] font-mono bg-surface"
                    value={webhookTestPayload}
                    onChange={(e) => setWebhookTestPayload(e.target.value)}
                  />
                </label>

                <div className="flex justify-end">
                  <button
                    onClick={testWebhookFromBuilder}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm bg-info text-white hover:bg-info"
                  >
                    <PlayCircle className="h-4 w-4" /> Test Webhook
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-lg border border-line p-3 bg-canvas">
                <p className="text-xs font-semibold text-ink mb-2">Inbound workflow webhooks</p>
                {workspaceWebhookList.length === 0 ? (
                  <p className="text-xs text-dim">No webhook configs yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                    {workspaceWebhookList.map((item) => (
                      <div key={item.workflowId} className="text-xs border border-line rounded-md p-2 bg-surface">
                        <p className="font-medium text-ink truncate">{item.name}</p>
                        <p className="text-dim">{item.hasWebhookSecret ? 'Secret configured' : 'Secret missing'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-line p-3 bg-canvas">
                <p className="text-xs font-semibold text-ink mb-2">Outbound webhook actions</p>
                {outboundWebhooks.length === 0 ? (
                  <p className="text-xs text-dim">No outbound webhook actions configured.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                    {outboundWebhooks.map((item) => (
                      <div key={`${item.workflowId}-${item.actionId}`} className="text-xs border border-line rounded-md p-2 bg-surface">
                        <p className="font-medium text-ink truncate">{item.workflowName}</p>
                        <p className="text-dim truncate">{item.method} {item.url}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );

  const renderExecutionTab = () => (
    <>
      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-ink">How it's doing</h4>
          <button
            onClick={runTest}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-hover text-ink border border-line"
          >
            <PlayCircle className="h-3.5 w-3.5" /> Run a test
          </button>
        </div>

        {executionStats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-line p-3 bg-canvas">
              <p className="text-xs text-dim">Times it ran</p>
              <p className="text-lg font-semibold text-ink">{executionStats.totalExecutions || 0}</p>
            </div>
            <div className="rounded-lg border border-line p-3 bg-canvas">
              <p className="text-xs text-dim">Times it failed</p>
              <p className="text-lg font-semibold text-danger">{executionStats.totalFailures || 0}</p>
            </div>
            <div className="rounded-lg border border-line p-3 bg-canvas">
              <p className="text-xs text-dim">Success rate</p>
              <p className="text-lg font-semibold text-ink">{executionStats.successRate || 'N/A'}</p>
            </div>
            <div className="rounded-lg border border-line p-3 bg-canvas">
              <p className="text-xs text-dim">Status</p>
              <p className="text-lg font-semibold text-ink">{executionStats.isEnabled ? 'On' : 'Off'}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-dim">It hasn't run yet — stats will show up here once it does.</p>
        )}

        <label className="text-xs font-medium text-dim block">
          Sample data to test with (JSON)
          <textarea
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm min-h-[90px] font-mono"
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
          />
          <span className="block mt-1 text-[11px] font-normal text-dim">
            Simulates an event to check whether the "when" conditions match, without running the actions.
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 space-y-3">
        <h4 className="text-sm font-semibold text-ink">What happened</h4>
        {executionLog.length === 0 ? (
          <p className="text-sm text-dim">No runs yet.</p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {executionLog.map((entry) => {
              let when = entry.timestamp;
              const parsed = new Date(entry.timestamp);
              if (!Number.isNaN(parsed.getTime())) when = parsed.toLocaleString();
              return (
                <div key={entry.executionId} className="rounded-lg border border-line p-3 bg-canvas">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{when}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        entry.status === 'completed'
                          ? 'border-success/20 text-success bg-success/10'
                          : entry.status === 'failed'
                            ? 'border-danger/20 text-danger bg-danger/10'
                            : 'border-info/20 text-info bg-info/10'
                      }`}
                    >
                      {entry.status === 'completed' ? 'ran fine' : entry.status === 'failed' ? 'failed' : entry.status}
                    </span>
                  </div>
                  <p className="text-xs text-dim mt-1">{entry.actions?.length || 0} step(s) ran · {entry.executionId}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-6xl h-[85vh] rounded-2xl bg-surface shadow-2xl border border-line overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-canvas">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-info/10 text-info flex items-center justify-center">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Workflow Builder</h2>
              <p className="text-sm text-dim">
                Automate steps in {workspaceName || 'this workspace'} — no technical skills needed.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg text-dim hover:text-ink hover:bg-surface-hover flex items-center justify-center"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-12">
          <aside className="col-span-3 border-r border-line bg-canvas p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-ink">Your workflows</h3>
              <button
                onClick={resetToNew}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-info text-white hover:bg-info"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-dim flex items-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : workflows.length === 0 ? (
              <p className="text-sm text-dim">No workflows yet — create your first automation.</p>
            ) : (
              <div className="space-y-1.5">
                {workflows.map((workflow) => {
                  const firstTrigger = workflow.triggers?.[0];
                  const actionCount = workflow.actions?.length || 0;
                  const isSelected = workflow.workflowId === selectedWorkflowId;
                  return (
                    <button
                      key={workflow.workflowId}
                      onClick={() => selectWorkflow(workflow.workflowId)}
                      className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                        isSelected && editorMode === 'edit'
                          ? 'border-info/30 bg-info/10'
                          : 'border-line bg-surface hover:bg-canvas'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${workflow.isEnabled ? 'bg-cta' : 'bg-surface-hover'}`} />
                        <p className="text-sm font-medium text-ink truncate">{workflow.name}</p>
                      </div>
                      <p className="text-xs text-dim mt-1 truncate">
                        {firstTrigger ? describeTrigger(firstTrigger) : 'No trigger'} · {actionCount} step{actionCount === 1 ? '' : 's'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <main className="col-span-9 p-4 overflow-y-auto space-y-4">
            {editorMode === 'pick' ? (
              renderTemplatePicker()
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="inline-flex rounded-lg border border-line p-1 bg-surface">
                    <button
                      onClick={() => setTab('definition')}
                      className={`px-3 py-1.5 rounded-md text-sm ${tab === 'definition' ? 'bg-cta text-cta-foreground' : 'text-ink hover:bg-surface-hover'}`}
                    >
                      Setup
                    </button>
                    <button
                      onClick={() => setTab('execution')}
                      className={`px-3 py-1.5 rounded-md text-sm ${tab === 'execution' ? 'bg-cta text-cta-foreground' : 'text-ink hover:bg-surface-hover'}`}
                      disabled={!selectedWorkflowId}
                      title={!selectedWorkflowId ? 'Save the workflow first to see its activity' : undefined}
                    >
                      Activity
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {!selectedWorkflowId && (
                      <button
                        onClick={() => setEditorMode('pick')}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-line text-dim hover:bg-canvas text-sm"
                      >
                        <Sparkles className="h-4 w-4" /> Recipes
                      </button>
                    )}
                    {selectedWorkflowId && (
                      <button
                        onClick={handleDelete}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 text-sm"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-info text-white hover:bg-info text-sm disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                    </button>
                  </div>
                </div>

                {message.text && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      message.type === 'error'
                        ? 'border-danger/20 bg-danger/10 text-danger'
                        : message.type === 'success'
                          ? 'border-success/20 bg-success/10 text-success'
                          : 'border-info/20 bg-info/10 text-info'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {tab === 'definition' ? renderDefinitionTab() : renderExecutionTab()}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilderModal;
