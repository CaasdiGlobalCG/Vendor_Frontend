import React, { useMemo, useState } from 'react';

const ACTION_TYPES = [
  { value: 'create-task', label: 'Create Task' },
  { value: 'update-status', label: 'Update Status' },
  { value: 'assign-user', label: 'Assign User' },
  { value: 'send-email', label: 'Send Email' },
  { value: 'call-webhook', label: 'Call Webhook' },
  { value: 'invoke-subworkflow', label: 'Invoke Sub-workflow' },
  { value: 'wait-approval', label: 'Wait For Approval (Gate)' },
  { value: 'conditional-branch', label: 'Conditional Branch' },
  { value: 'loop', label: 'Loop Actions' }
];

const baseParamsForType = (type) => {
  switch (type) {
    case 'create-task':
      return {
        templateType: 'execution-work-order',
        templateData: {
          title: '',
          location: '',
          assignee: '',
          priority: 'Medium'
        }
      };
    case 'update-status':
      return { nodeId: '', newStatus: 'Approved', message: '' };
    case 'assign-user':
      return { nodeId: '', userId: '' };
    case 'send-email':
      return {
        templateType: 'custom',
        recipient: '',
        subject: 'Workflow notification: {{workflowName}}',
        body: 'Task {{taskName}} is now {{taskStatus}}.'
      };
    case 'call-webhook':
      return { url: '', method: 'POST', headers: {}, body: {} };
    case 'invoke-subworkflow':
      return { subworkflowId: '' };
    case 'wait-approval':
      return {
        expectedStatus: 'Approved',
        approver: '',
        autoApprove: false,
        message: 'Workflow paused pending approval.'
      };
    case 'conditional-branch':
      return {
        conditionJson: JSON.stringify({
          operator: 'AND',
          operands: [{ field: 'status', operator: '=', value: 'Approved' }]
        }, null, 2),
        ifActionsJson: JSON.stringify([], null, 2),
        elseActionsJson: JSON.stringify([], null, 2)
      };
    case 'loop':
      return {
        mode: 'count',
        count: 2,
        maxIterations: 5,
        conditionJson: JSON.stringify({
          operator: 'AND',
          operands: [{ field: 'status', operator: '=', value: 'Approved' }]
        }, null, 2),
        actionsJson: JSON.stringify([], null, 2)
      };
    default:
      return {};
  }
};

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

  const title = useMemo(() => (initialValue ? 'Edit Action' : 'Add Action'), [initialValue]);

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
        if (!params.templateType) return 'Template type is required.';
        break;
      case 'update-status':
        if (!params.newStatus) return 'New status is required.';
        break;
      case 'assign-user':
        if (!params.userId) return 'User ID is required.';
        break;
      case 'send-email':
        if (!params.recipient) return 'Recipient email is required.';
        if (!params.subject) return 'Email subject is required.';
        break;
      case 'call-webhook':
        if (!params.url) return 'Webhook URL is required.';
        break;
      case 'invoke-subworkflow':
        if (!params.subworkflowId) return 'Sub-workflow ID is required.';
        break;
      case 'wait-approval':
        if (!params.expectedStatus) return 'Expected approval status is required.';
        break;
      case 'conditional-branch':
        if (!params.conditionJson?.trim()) return 'Condition JSON is required.';
        if (!params.ifActionsJson?.trim()) return 'If branch actions JSON is required.';
        if (!params.elseActionsJson?.trim()) return 'Else branch actions JSON is required.';
        break;
      case 'loop':
        if (!params.mode) return 'Loop mode is required.';
        if (params.mode === 'count' && Number(params.count || 0) <= 0) return 'Loop count must be greater than 0.';
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
        setError('Conditional branch JSON is invalid.');
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
        setError('Loop JSON is invalid.');
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-600">
          Action Type
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {ACTION_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-gray-600">
          Parallel Group (optional)
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={parallelGroup}
            onChange={(e) => setParallelGroup(e.target.value)}
            placeholder="group-a"
          />
        </label>
      </div>

      {type === 'create-task' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">
            Template Type
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.templateType || 'execution-work-order'}
              onChange={(e) => updateParams('templateType', e.target.value)}
            >
              <option value="execution-work-order">Execution Work Order</option>
              <option value="execution-rfi">Execution RFI</option>
              <option value="execution-inspection">Execution Inspection</option>
              <option value="execution-daily-site-log">Daily Site Log</option>
              <option value="procurement-rfq">Procurement RFQ</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.templateData?.title || ''}
              onChange={(e) => updateTemplateData('title', e.target.value)}
              placeholder="Generated by workflow"
            />
          </label>
        </div>
      )}

      {type === 'update-status' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">
            Node ID (optional)
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.nodeId || ''}
              onChange={(e) => updateParams('nodeId', e.target.value)}
              placeholder="execution-request_123"
            />
          </label>
          <label className="text-xs text-gray-600">
            New Status
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.newStatus || 'Approved'}
              onChange={(e) => updateParams('newStatus', e.target.value)}
            >
              <option>Issued</option>
              <option>Open</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Completed</option>
              <option>Submitted</option>
            </select>
          </label>
        </div>
      )}

      {type === 'assign-user' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">
            Node ID (optional)
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.nodeId || ''}
              onChange={(e) => updateParams('nodeId', e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-600">
            Assignee User ID
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.userId || ''}
              onChange={(e) => updateParams('userId', e.target.value)}
              placeholder="user-123"
            />
          </label>
        </div>
      )}

      {type === 'send-email' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">
              Template Type
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={params.templateType || 'custom'}
                onChange={(e) => updateParams('templateType', e.target.value)}
              >
                <option value="custom">Custom</option>
                <option value="task-created">Task Created</option>
                <option value="status-updated">Status Updated</option>
                <option value="approval-request">Approval Request</option>
              </select>
            </label>
            <label className="text-xs text-gray-600">
              Recipient Email
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={params.recipient || ''}
                onChange={(e) => updateParams('recipient', e.target.value)}
                placeholder="manager@company.com"
              />
              <span className="block mt-1 text-[11px] text-gray-500">
                Tip: use exact email, or set to from-event-data and provide variables.recipientField.
              </span>
            </label>
          </div>
          <label className="text-xs text-gray-600 block">
            Subject
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.subject || ''}
              onChange={(e) => updateParams('subject', e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-600 block">
            Body
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[90px]"
              value={params.body || ''}
              onChange={(e) => updateParams('body', e.target.value)}
            />
          </label>
        </div>
      )}

      {type === 'call-webhook' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600 md:col-span-2">
            URL
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={params.url || ''}
              onChange={(e) => updateParams('url', e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </label>
          <label className="text-xs text-gray-600">
            Method
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
        <label className="text-xs text-gray-600 block">
          Sub-workflow ID
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={params.subworkflowId || ''}
            onChange={(e) => updateParams('subworkflowId', e.target.value)}
            placeholder="WF-..."
          />
        </label>
      )}

      {type === 'wait-approval' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-gray-600">
              Expected Status
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={params.expectedStatus || 'Approved'}
                onChange={(e) => updateParams('expectedStatus', e.target.value)}
              >
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </label>
            <label className="text-xs text-gray-600">
              Approver (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            Auto-approve (for testing)
          </label>
          <label className="text-xs text-gray-600 block">
            Gate Message
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[72px]"
              value={params.message || ''}
              onChange={(e) => updateParams('message', e.target.value)}
            />
          </label>
        </div>
      )}

      {type === 'conditional-branch' && (
        <div className="space-y-3">
          <label className="text-xs text-gray-600 block">
            Condition JSON
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[92px] font-mono"
              value={params.conditionJson || ''}
              onChange={(e) => updateParams('conditionJson', e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-600 block">
            If Branch Actions (JSON array)
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[92px] font-mono"
              value={params.ifActionsJson || ''}
              onChange={(e) => updateParams('ifActionsJson', e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-600 block">
            Else Branch Actions (JSON array)
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[92px] font-mono"
              value={params.elseActionsJson || ''}
              onChange={(e) => updateParams('elseActionsJson', e.target.value)}
            />
          </label>
        </div>
      )}

      {type === 'loop' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-gray-600">
              Mode
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={params.mode || 'count'}
                onChange={(e) => updateParams('mode', e.target.value)}
              >
                <option value="count">Count</option>
                <option value="while">While Condition</option>
              </select>
            </label>
            <label className="text-xs text-gray-600">
              Count
              <input
                type="number"
                min="1"
                max="10"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={params.count || 1}
                onChange={(e) => updateParams('count', Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-gray-600">
              Max Iterations
              <input
                type="number"
                min="1"
                max="10"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={params.maxIterations || 5}
                onChange={(e) => updateParams('maxIterations', Number(e.target.value))}
              />
            </label>
          </div>

          <label className="text-xs text-gray-600 block">
            While Condition JSON
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[92px] font-mono"
              value={params.conditionJson || ''}
              onChange={(e) => updateParams('conditionJson', e.target.value)}
            />
          </label>

          <label className="text-xs text-gray-600 block">
            Loop Actions (JSON array)
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[92px] font-mono"
              value={params.actionsJson || ''}
              onChange={(e) => updateParams('actionsJson', e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-gray-800"
        >
          Save Action
        </button>
      </div>
    </div>
  );
};

export default WorkflowActionForm;
