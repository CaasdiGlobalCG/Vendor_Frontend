import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ACTION_TYPES, STATUS_OPTIONS, actionTypeMeta, baseParamsForType } from './workflowCatalog';

const TASK_TEMPLATE_OPTIONS = [
  { value: 'execution-work-order', label: 'Work order' },
  { value: 'execution-rfi', label: 'RFI' },
  { value: 'execution-inspection', label: 'Inspection' },
  { value: 'execution-daily-site-log', label: 'Daily site log' },
  { value: 'procurement-rfq', label: 'Procurement RFQ' }
];

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const labelClass = 'text-xs font-medium text-gray-600';

const WorkflowActionForm = ({ initialValue, onCancel, onSave }) => {
  const initialType = initialValue?.type || 'create-task';
  const normalizeInitialParams = (typeValue, paramsValue) => {
    if (!paramsValue) return baseParamsForType(typeValue);

    if (typeValue === 'conditional-branch') {
      return {
        conditionJson: JSON.stringify(paramsValue.condition || { operator: 'AND', operands: [] }, null, 2),
        ifActionsJson: JSON.stringify(paramsValue.ifActions || [], null, 2),
        elseActionsJson: JSON.stringify(paramsValue.elseActions || [], null, 2)
      };
    }

    if (typeValue === 'loop') {
      return {
        mode: paramsValue.mode || 'count',
        count: Number(paramsValue.count || 1),
        maxIterations: Number(paramsValue.maxIterations || 5),
        conditionJson: JSON.stringify(paramsValue.condition || { operator: 'AND', operands: [] }, null, 2),
        actionsJson: JSON.stringify(paramsValue.actions || [], null, 2)
      };
    }

    return paramsValue;
  };

  const [type, setType] = useState(initialType);
  const [params, setParams] = useState(normalizeInitialParams(initialType, initialValue?.params));
  const [parallelGroup, setParallelGroup] = useState(initialValue?.parallelGroup || '');
  const [error, setError] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(Boolean(initialValue?.parallelGroup));

  const title = useMemo(() => (initialValue ? 'Edit this step' : 'Pick what it should do'), [initialValue]);
  const typeMeta = actionTypeMeta(type);

  const updateParams = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const updateTemplateData = (key, value) => {
    setParams((prev) => ({
      ...prev,
      templateData: {
        ...(prev.templateData || {}),
        [key]: value
      }
    }));
  };

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setParams(baseParamsForType(nextType));
    setError('');
  };

  const validate = () => {
    switch (type) {
      case 'create-task':
        if (!params.templateType) return 'Pick which kind of task to create.';
        break;
      case 'update-status':
        if (!params.newStatus) return 'Pick the status to set.';
        break;
      case 'assign-user':
        if (!params.userId) return 'Enter who it should be assigned to.';
        break;
      case 'send-email':
        if (!params.recipient) return 'Enter who should receive the email.';
        if (!params.subject) return 'Enter an email subject.';
        break;
      case 'call-webhook':
        if (!params.url) return 'Enter the URL to call.';
        break;
      case 'invoke-subworkflow':
        if (!params.subworkflowId) return 'Enter the ID of the workflow to run.';
        break;
      case 'wait-approval':
        if (!params.expectedStatus) return 'Pick the decision it should wait for.';
        break;
      case 'conditional-branch':
        if (!params.conditionJson?.trim()) return 'Condition JSON is required.';
        if (!params.ifActionsJson?.trim()) return 'If branch actions JSON is required.';
        if (!params.elseActionsJson?.trim()) return 'Else branch actions JSON is required.';
        break;
      case 'loop':
        if (!params.mode) return 'Pick how the loop should repeat.';
        if (params.mode === 'count' && Number(params.count || 0) <= 0) return 'Repeat count must be at least 1.';
        if (!params.conditionJson?.trim()) return 'Loop condition JSON is required.';
        if (!params.actionsJson?.trim()) return 'Loop actions JSON is required.';
        break;
      default:
        break;
    }

    return '';
  };

  const handleSave = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    let normalizedParams = { ...params };

    if (type === 'conditional-branch') {
      try {
        normalizedParams = {
          condition: JSON.parse(params.conditionJson || '{}'),
          ifActions: JSON.parse(params.ifActionsJson || '[]'),
          elseActions: JSON.parse(params.elseActionsJson || '[]')
        };
      } catch (error) {
        setError('The branch JSON is invalid — check the formatting.');
        return;
      }
    }

    if (type === 'loop') {
      try {
        normalizedParams = {
          mode: params.mode || 'count',
          count: Number(params.count || 1),
          maxIterations: Number(params.maxIterations || 5),
          condition: JSON.parse(params.conditionJson || '{}'),
          actions: JSON.parse(params.actionsJson || '[]')
        };
      } catch (error) {
        setError('The loop JSON is invalid — check the formatting.');
        return;
      }
    }

    onSave({
      id: initialValue?.id || `ACT-${Date.now()}`,
      type,
      params: normalizedParams,
      ...(parallelGroup ? { parallelGroup } : {})
    });
  };

  const renderElementField = () => (
    <label className={labelClass}>
      Only for one specific element (optional)
      <input
        className={inputClass}
        value={params.nodeId || ''}
        onChange={(e) => updateParams('nodeId', e.target.value)}
        placeholder="e.g. execution-request_123"
      />
      <span className="block mt-1 text-[11px] font-normal text-gray-500">
        Leave blank to use the element that triggered this workflow.
      </span>
    </label>
  );

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {typeMeta && <span className="text-[11px] text-gray-500">{typeMeta.description}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {ACTION_TYPES.map((item) => {
          const Icon = item.icon;
          const selected = item.value === type;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleTypeChange(item.value)}
              className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors ${
                selected ? `${item.cardClass} ring-1 ring-current` : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className={`block text-[11px] mt-0.5 ${selected ? 'opacity-80' : 'text-gray-500'}`}>
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {type === 'create-task' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className={labelClass}>
            Kind of task
            <select
              className={inputClass}
              value={params.templateType || 'execution-work-order'}
              onChange={(e) => updateParams('templateType', e.target.value)}
            >
              {TASK_TEMPLATE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Task title
            <input
              className={inputClass}
              value={params.templateData?.title || ''}
              onChange={(e) => updateTemplateData('title', e.target.value)}
              placeholder="e.g. Follow-up work order"
            />
          </label>
          <label className={labelClass}>
            Priority
            <select
              className={inputClass}
              value={params.templateData?.priority || 'Medium'}
              onChange={(e) => updateTemplateData('priority', e.target.value)}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          <label className={labelClass}>
            Assign to (optional)
            <input
              className={inputClass}
              value={params.templateData?.assignee || ''}
              onChange={(e) => updateTemplateData('assignee', e.target.value)}
              placeholder="User ID or email"
            />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            Location (optional)
            <input
              className={inputClass}
              value={params.templateData?.location || ''}
              onChange={(e) => updateTemplateData('location', e.target.value)}
              placeholder="e.g. Site A"
            />
          </label>
        </div>
      )}

      {type === 'update-status' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {renderElementField()}
            <label className={labelClass}>
              Set the status to
              <select
                className={inputClass}
                value={params.newStatus || 'Approved'}
                onChange={(e) => updateParams('newStatus', e.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={`${labelClass} block`}>
            Add a note (optional)
            <input
              className={inputClass}
              value={params.message || ''}
              onChange={(e) => updateParams('message', e.target.value)}
              placeholder="e.g. Status updated automatically by workflow"
            />
          </label>
        </div>
      )}

      {type === 'assign-user' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {renderElementField()}
          <label className={labelClass}>
            Assign to
            <input
              className={inputClass}
              value={params.userId || ''}
              onChange={(e) => updateParams('userId', e.target.value)}
              placeholder="User ID or email"
            />
          </label>
        </div>
      )}

      {type === 'send-email' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={labelClass}>
              Email style
              <select
                className={inputClass}
                value={params.templateType || 'custom'}
                onChange={(e) => updateParams('templateType', e.target.value)}
              >
                <option value="custom">Custom</option>
                <option value="task-created">Task Created</option>
                <option value="status-updated">Status Updated</option>
                <option value="approval-request">Approval Request</option>
              </select>
            </label>
            <label className={labelClass}>
              Send to
              <input
                type="email"
                className={inputClass}
                value={params.recipient || ''}
                onChange={(e) => updateParams('recipient', e.target.value)}
                placeholder="manager@company.com"
              />
              <span className="block mt-1 text-[11px] font-normal text-gray-500">
                Use an exact email, or "from-event-data" with variables.recipientField.
              </span>
            </label>
          </div>
          <label className={`${labelClass} block`}>
            Subject
            <input
              className={inputClass}
              value={params.subject || ''}
              onChange={(e) => updateParams('subject', e.target.value)}
            />
          </label>
          <label className={`${labelClass} block`}>
            Message
            <textarea
              className={`${inputClass} min-h-[90px]`}
              value={params.body || ''}
              onChange={(e) => updateParams('body', e.target.value)}
            />
            <span className="block mt-1 text-[11px] font-normal text-gray-500">
              You can use placeholders like {'{{workflowName}}'}, {'{{taskName}}'}, {'{{taskStatus}}'}.
            </span>
          </label>
        </div>
      )}

      {type === 'call-webhook' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className={`${labelClass} md:col-span-2`}>
            URL to call
            <input
              className={inputClass}
              value={params.url || ''}
              onChange={(e) => updateParams('url', e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </label>
          <label className={labelClass}>
            Method
            <select
              className={inputClass}
              value={params.method || 'POST'}
              onChange={(e) => updateParams('method', e.target.value)}
            >
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
            </select>
          </label>
        </div>
      )}

      {type === 'invoke-subworkflow' && (
        <label className={`${labelClass} block`}>
          Workflow to run
          <input
            className={inputClass}
            value={params.subworkflowId || ''}
            onChange={(e) => updateParams('subworkflowId', e.target.value)}
            placeholder="WF-..."
          />
          <span className="block mt-1 text-[11px] font-normal text-gray-500">
            Paste the ID of another saved workflow in this workspace.
          </span>
        </label>
      )}

      {type === 'wait-approval' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={labelClass}>
              Wait until it is
              <select
                className={inputClass}
                value={params.expectedStatus || 'Approved'}
                onChange={(e) => updateParams('expectedStatus', e.target.value)}
              >
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </label>
            <label className={labelClass}>
              Approver (optional)
              <input
                className={inputClass}
                value={params.approver || ''}
                onChange={(e) => updateParams('approver', e.target.value)}
                placeholder="manager@company.com"
              />
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={Boolean(params.autoApprove)}
              onChange={(e) => updateParams('autoApprove', e.target.checked)}
            />
            Auto-approve (testing only)
          </label>
          <label className={`${labelClass} block`}>
            Note shown while waiting
            <textarea
              className={`${inputClass} min-h-[72px]`}
              value={params.message || ''}
              onChange={(e) => updateParams('message', e.target.value)}
            />
          </label>
        </div>
      )}

      {type === 'conditional-branch' && (
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500">
            Advanced: describe the condition and the actions for each branch as JSON.
          </p>
          <label className={`${labelClass} block`}>
            Condition (JSON)
            <textarea
              className={`${inputClass} min-h-[92px] font-mono`}
              value={params.conditionJson || ''}
              onChange={(e) => updateParams('conditionJson', e.target.value)}
            />
          </label>
          <label className={`${labelClass} block`}>
            If the condition is true, run these actions (JSON array)
            <textarea
              className={`${inputClass} min-h-[92px] font-mono`}
              value={params.ifActionsJson || ''}
              onChange={(e) => updateParams('ifActionsJson', e.target.value)}
            />
          </label>
          <label className={`${labelClass} block`}>
            Otherwise, run these actions (JSON array)
            <textarea
              className={`${inputClass} min-h-[92px] font-mono`}
              value={params.elseActionsJson || ''}
              onChange={(e) => updateParams('elseActionsJson', e.target.value)}
            />
          </label>
        </div>
      )}

      {type === 'loop' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className={labelClass}>
              Repeat
              <select
                className={inputClass}
                value={params.mode || 'count'}
                onChange={(e) => updateParams('mode', e.target.value)}
              >
                <option value="count">A fixed number of times</option>
                <option value="while">While a condition is true</option>
              </select>
            </label>
            <label className={labelClass}>
              Times
              <input
                type="number"
                min="1"
                max="10"
                className={inputClass}
                value={params.count || 1}
                onChange={(e) => updateParams('count', Number(e.target.value))}
              />
            </label>
            <label className={labelClass}>
              Stop after at most
              <input
                type="number"
                min="1"
                max="10"
                className={inputClass}
                value={params.maxIterations || 5}
                onChange={(e) => updateParams('maxIterations', Number(e.target.value))}
              />
            </label>
          </div>

          <p className="text-[11px] text-gray-500">Advanced: the condition and actions are described as JSON.</p>
          <label className={`${labelClass} block`}>
            While condition (JSON)
            <textarea
              className={`${inputClass} min-h-[92px] font-mono`}
              value={params.conditionJson || ''}
              onChange={(e) => updateParams('conditionJson', e.target.value)}
            />
          </label>

          <label className={`${labelClass} block`}>
            Actions to repeat (JSON array)
            <textarea
              className={`${inputClass} min-h-[92px] font-mono`}
              value={params.actionsJson || ''}
              onChange={(e) => updateParams('actionsJson', e.target.value)}
            />
          </label>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          Advanced — run in parallel
        </button>
        {showAdvanced && (
          <label className={`${labelClass} block mt-2`}>
            Parallel group name (optional)
            <input
              className={inputClass}
              value={parallelGroup}
              onChange={(e) => setParallelGroup(e.target.value)}
              placeholder="e.g. group-a"
            />
            <span className="block mt-1 text-[11px] font-normal text-gray-500">
              Actions sharing the same group name run at the same time instead of one after another.
            </span>
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {initialValue ? 'Save changes' : 'Add this step'}
        </button>
      </div>
    </div>
  );
};

export default WorkflowActionForm;
