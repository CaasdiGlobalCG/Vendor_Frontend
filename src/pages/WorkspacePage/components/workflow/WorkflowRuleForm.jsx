import React, { useMemo, useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { STATUS_OPTIONS, TRIGGER_TYPES, baseRuleForType, triggerTypeMeta } from './workflowCatalog';

const CONDITION_OPERATORS = [
  { value: '=', label: 'equals' },
  { value: '!=', label: 'does not equal' },
  { value: '>', label: 'is more than' },
  { value: '>=', label: 'is at least' },
  { value: '<', label: 'is less than' },
  { value: '<=', label: 'is at most' },
  { value: 'includes', label: 'contains' }
];

const DAY_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
];

const inputClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const labelClass = 'text-xs font-medium text-gray-600';

const WorkflowRuleForm = ({ initialValue, onCancel, onSave }) => {
  const initialType = initialValue?.type || 'status-change';
  const [type, setType] = useState(initialType);
  const [rule, setRule] = useState(initialValue?.rule || baseRuleForType(initialType));
  const [error, setError] = useState('');
  const [showCron, setShowCron] = useState(Boolean(initialValue?.rule?.cronExpression));

  const title = useMemo(() => (initialValue ? 'Edit this "when"' : 'Pick what starts it'), [initialValue]);
  const typeMeta = triggerTypeMeta(type);

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
      operands: [...(prev.operands || []), { field: '', operator: '=', value: '' }]
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
    if (type === 'status-change' && !rule.status) return 'Pick the status it should change to.';
    if (type === 'approval' && !rule.approvalStatus) return 'Pick which approval decision should start this.';
    if (type === 'time-based') {
      if (!rule.cronExpression && !rule.frequency) return 'Pick how often it should repeat.';
      if (!rule.cronExpression && !rule.time) return 'Pick the time of day it should run.';
    }
    if (type === 'conditional') {
      if (!Array.isArray(rule.operands) || rule.operands.length === 0) return 'Add at least one condition.';
      const invalid = rule.operands.some((operand) => !operand.field || !operand.operator);
      if (invalid) return 'Every condition needs a field and a comparison.';
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

  const renderElementField = () => (
    <label className={`${labelClass} block`}>
      Only for one specific element (optional)
      <input
        className={inputClass}
        value={rule.nodeId || ''}
        onChange={(e) => updateRule('nodeId', e.target.value)}
        placeholder="e.g. execution-request_123"
      />
      <span className="block mt-1 text-[11px] font-normal text-gray-500">
        Leave blank to run for every element on the canvas.
      </span>
    </label>
  );

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {typeMeta && <span className="text-[11px] text-gray-500">{typeMeta.description}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TRIGGER_TYPES.map((item) => {
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

      {(type === 'status-change' || type === 'task-completion' || type === 'approval') && renderElementField()}

      {type === 'status-change' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className={labelClass}>
            When the status becomes
            <select
              className={inputClass}
              value={rule.status || 'Approved'}
              onChange={(e) => updateRule('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Only if it was previously (optional)
            <select
              className={inputClass}
              value={rule.fromStatus || ''}
              onChange={(e) => updateRule('fromStatus', e.target.value)}
            >
              <option value="">Any previous status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {type === 'approval' && (
        <label className={`${labelClass} block`}>
          When the decision is
          <select
            className={inputClass}
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
            <label className={labelClass}>
              Repeat every
              <select
                className={inputClass}
                value={rule.frequency || 'daily'}
                onChange={(e) => updateRule('frequency', e.target.value)}
              >
                <option value="daily">Day</option>
                <option value="weekly">Week</option>
                <option value="monthly">Month</option>
              </select>
            </label>
            <label className={labelClass}>
              At
              <input
                type="time"
                className={inputClass}
                value={rule.time || '09:00'}
                onChange={(e) => updateRule('time', e.target.value)}
              />
            </label>
            {(rule.frequency || 'daily') === 'weekly' && (
              <label className={labelClass}>
                On
                <select
                  className={inputClass}
                  value={rule.dayOfWeek ?? 1}
                  onChange={(e) => updateRule('dayOfWeek', Number(e.target.value))}
                >
                  {DAY_OPTIONS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(rule.frequency || 'daily') === 'monthly' && (
              <label className={labelClass}>
                On day
                <input
                  type="number"
                  min="1"
                  max="31"
                  className={inputClass}
                  value={rule.dayOfMonth || 1}
                  onChange={(e) => updateRule('dayOfMonth', Number(e.target.value))}
                />
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCron((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCron ? 'rotate-180' : ''}`} />
            Advanced — custom cron schedule
          </button>
          {showCron && (
            <label className={`${labelClass} block`}>
              Cron expression
              <input
                className={`${inputClass} font-mono`}
                value={rule.cronExpression || ''}
                onChange={(e) => updateRule('cronExpression', e.target.value)}
                placeholder="0 9 * * *"
              />
              <span className="block mt-1 text-[11px] font-normal text-gray-500">
                If filled in, this overrides the simple schedule above.
              </span>
            </label>
          )}
        </div>
      )}

      {type === 'conditional' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelClass}>
              Match
              <select
                className="ml-2 rounded-lg border border-gray-300 px-2 py-1 text-sm font-normal"
                value={rule.operator || 'AND'}
                onChange={(e) => updateRule('operator', e.target.value)}
              >
                <option value="AND">all conditions</option>
                <option value="OR">any condition</option>
              </select>
            </label>
            <button
              type="button"
              onClick={addOperand}
              className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add condition
            </button>
          </div>

          {(rule.operands || []).map((operand, index) => (
            <div key={`operand-${index}`} className="grid grid-cols-12 gap-2 items-end">
              <label className={`col-span-4 ${labelClass}`}>
                Field
                <input
                  className={inputClass}
                  value={operand.field || ''}
                  onChange={(e) => updateOperand(index, 'field', e.target.value)}
                  placeholder="e.g. status or budget"
                />
              </label>
              <label className={`col-span-3 ${labelClass}`}>
                Condition
                <select
                  className={inputClass}
                  value={operand.operator || '='}
                  onChange={(e) => updateOperand(index, 'operator', e.target.value)}
                >
                  {CONDITION_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`col-span-4 ${labelClass}`}>
                Value
                <input
                  className={inputClass}
                  value={operand.value || ''}
                  onChange={(e) => updateOperand(index, 'value', e.target.value)}
                  placeholder="e.g. Approved or 10000"
                />
              </label>
              <button
                type="button"
                onClick={() => removeOperand(index)}
                className="col-span-1 h-10 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                title="Remove condition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {type === 'webhook' && (
        <div className="space-y-2">
          <label className={`${labelClass} block`}>
            Who is calling (optional)
            <input
              className={inputClass}
              value={rule.source || 'external'}
              onChange={(e) => updateRule('source', e.target.value)}
              placeholder="e.g. erp-system"
            />
          </label>
          <p className="text-[11px] text-gray-500">
            After you save this workflow, its webhook URL and secret appear under Advanced → Webhooks.
          </p>
        </div>
      )}

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
          className="px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
        >
          {initialValue ? 'Save changes' : 'Add this "when"'}
        </button>
      </div>
    </div>
  );
};

export default WorkflowRuleForm;
