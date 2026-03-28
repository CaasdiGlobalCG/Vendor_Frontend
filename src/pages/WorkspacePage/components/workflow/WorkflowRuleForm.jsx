import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const TRIGGER_TYPES = [
  { value: 'status-change', label: 'Status Change' },
  { value: 'task-completion', label: 'Task Completion' },
  { value: 'approval', label: 'Approval / Rejection' },
  { value: 'time-based', label: 'Time Based' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'webhook', label: 'Webhook Trigger' }
];

const NEW_OPERAND = { field: '', operator: '=', value: '' };

const baseRuleForType = (type) => {
  switch (type) {
    case 'status-change':
      return { nodeId: '', status: 'Approved', fromStatus: '' };
    case 'task-completion':
      return { nodeId: '' };
    case 'approval':
      return { nodeId: '', approvalStatus: 'Approved' };
    case 'time-based':
      return { frequency: 'daily', time: '09:00', dayOfWeek: 1, dayOfMonth: 1, cronExpression: '' };
    case 'conditional':
      return { operator: 'AND', operands: [{ ...NEW_OPERAND }] };
    case 'webhook':
      return { source: 'external' };
    default:
      return {};
  }
};

const WorkflowRuleForm = ({ initialValue, onCancel, onSave }) => {
  const initialType = initialValue?.type || 'status-change';
  const [type, setType] = useState(initialType);
  const [rule, setRule] = useState(initialValue?.rule || baseRuleForType(initialType));
  const [error, setError] = useState('');

  const title = useMemo(() => (initialValue ? 'Edit Trigger Rule' : 'Add Trigger Rule'), [initialValue]);

  const updateRule = (key, value) => {
    setRule((prev) => ({ ...prev, [key]: value }));
  };

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setRule(baseRuleForType(nextType));
    setError('');
  };

  const addOperand = () => {
    setRule((prev) => ({
      ...prev,
      operands: [...(prev.operands || []), { ...NEW_OPERAND }]
    }));
  };

  const updateOperand = (index, key, value) => {
    setRule((prev) => ({
      ...prev,
      operands: (prev.operands || []).map((item, i) => (i === index ? { ...item, [key]: value } : item))
    }));
  };

  const removeOperand = (index) => {
    setRule((prev) => ({
      ...prev,
      operands: (prev.operands || []).filter((_, i) => i !== index)
    }));
  };

  const validate = () => {
    if (type === 'status-change' && !rule.status) return 'Target status is required.';
    if (type === 'approval' && !rule.approvalStatus) return 'Approval status is required.';
    if (type === 'time-based') {
      if (!rule.cronExpression && !rule.frequency) return 'Frequency or cron expression is required.';
      if (!rule.cronExpression && !rule.time) return 'Time is required for frequency-based rules.';
    }
    if (type === 'conditional') {
      if (!Array.isArray(rule.operands) || rule.operands.length === 0) return 'Add at least one condition operand.';
      const invalid = rule.operands.some((operand) => !operand.field || !operand.operator);
      if (invalid) return 'Each operand needs field and operator.';
    }
    return '';
  };

  const handleSave = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    onSave({
      id: initialValue?.id || `TR-${Date.now()}`,
      type,
      rule
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-xs text-gray-600">
          Trigger Type
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {TRIGGER_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {(type === 'status-change' || type === 'task-completion' || type === 'approval') && (
          <label className="text-xs text-gray-600">
            Node ID (optional)
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={rule.nodeId || ''}
              onChange={(e) => updateRule('nodeId', e.target.value)}
              placeholder="execution-request_123"
            />
          </label>
        )}
      </div>

      {type === 'status-change' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">
            To Status
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={rule.status || 'Approved'}
              onChange={(e) => updateRule('status', e.target.value)}
            >
              <option>Issued</option>
              <option>Open</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Completed</option>
              <option>Submitted</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            From Status (optional)
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={rule.fromStatus || ''}
              onChange={(e) => updateRule('fromStatus', e.target.value)}
              placeholder="Open"
            />
          </label>
        </div>
      )}

      {type === 'approval' && (
        <label className="text-xs text-gray-600 block">
          Approval Status
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={rule.approvalStatus || 'Approved'}
            onChange={(e) => updateRule('approvalStatus', e.target.value)}
          >
            <option>Approved</option>
            <option>Rejected</option>
            <option>Pending</option>
          </select>
        </label>
      )}

      {type === 'time-based' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs text-gray-600">
              Frequency
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={rule.frequency || 'daily'}
                onChange={(e) => updateRule('frequency', e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            <label className="text-xs text-gray-600">
              Time
              <input
                type="time"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={rule.time || '09:00'}
                onChange={(e) => updateRule('time', e.target.value)}
              />
            </label>
            <label className="text-xs text-gray-600">
              Cron Expression (optional)
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={rule.cronExpression || ''}
                onChange={(e) => updateRule('cronExpression', e.target.value)}
                placeholder="0 9 * * *"
              />
            </label>
          </div>
        </div>
      )}

      {type === 'conditional' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">
              Operator
              <select
                className="ml-2 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                value={rule.operator || 'AND'}
                onChange={(e) => updateRule('operator', e.target.value)}
              >
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            </label>
            <button
              type="button"
              onClick={addOperand}
              className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add Condition
            </button>
          </div>

          {(rule.operands || []).map((operand, index) => (
            <div key={`operand-${index}`} className="grid grid-cols-12 gap-2 items-end">
              <label className="col-span-4 text-xs text-gray-600">
                Field
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                  value={operand.field || ''}
                  onChange={(e) => updateOperand(index, 'field', e.target.value)}
                  placeholder="data.budget"
                />
              </label>
              <label className="col-span-3 text-xs text-gray-600">
                Operator
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                  value={operand.operator || '='}
                  onChange={(e) => updateOperand(index, 'operator', e.target.value)}
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                  <option value="includes">includes</option>
                </select>
              </label>
              <label className="col-span-4 text-xs text-gray-600">
                Value
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                  value={operand.value || ''}
                  onChange={(e) => updateOperand(index, 'value', e.target.value)}
                  placeholder="10000"
                />
              </label>
              <button
                type="button"
                onClick={() => removeOperand(index)}
                className="col-span-1 h-10 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {type === 'webhook' && (
        <label className="text-xs text-gray-600 block">
          Source
          <input
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={rule.source || 'external'}
            onChange={(e) => updateRule('source', e.target.value)}
            placeholder="external"
          />
        </label>
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
          Save Rule
        </button>
      </div>
    </div>
  );
};

export default WorkflowRuleForm;
