import React, { useEffect, useMemo, useState } from 'react';
import { X, Send, ClipboardCheck } from 'lucide-react';

const TEMPLATE_CONFIG = {
  'execution-work-order': {
    label: 'Site Work Order',
    code: 'WO',
    status: 'Issued'
  },
  'execution-rfi': {
    label: 'RFI / Technical Clarification',
    code: 'RFI',
    status: 'Open'
  },
  'execution-inspection': {
    label: 'Inspection Request',
    code: 'INSP',
    status: 'Requested'
  },
  'execution-daily-site-log': {
    label: 'Daily Site Log',
    code: 'DSL',
    status: 'Submitted'
  }
};

const buildInitialState = (templateType, currentUser) => ({
  title: '',
  trade: '',
  location: '',
  assignee: '',
  priority: 'medium',
  dueDate: '',
  description: '',
  quantity: '',
  unit: '',
  dependencies: '',
  question: '',
  drawingReference: '',
  requiredResponseBy: '',
  checklistType: '',
  inspectionDate: '',
  workCompletedToday: '',
  laborSkilled: '',
  laborUnskilled: '',
  equipmentUsed: '',
  blockers: '',
  weatherConditions: '',
  notes: '',
  raisedBy: currentUser?.name || currentUser?.email || 'Unknown User',
  templateType
});

const ExecutionRequestModal = ({
  isOpen,
  onClose,
  templateType,
  workspace,
  currentUser,
  onSubmitted
}) => {
  const [formData, setFormData] = useState(buildInitialState(templateType, currentUser));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const config = useMemo(() => TEMPLATE_CONFIG[templateType] || TEMPLATE_CONFIG['execution-work-order'], [templateType]);

  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitialState(templateType, currentUser));
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, templateType, currentUser]);

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.title.trim()) nextErrors.title = 'Title is required';
    if (!formData.location.trim()) nextErrors.location = 'Location is required';
    if (!formData.assignee.trim()) nextErrors.assignee = 'Assignee is required';

    if (templateType === 'execution-rfi' && !formData.question.trim()) {
      nextErrors.question = 'Technical question is required for RFI';
    }

    if (templateType === 'execution-inspection' && !formData.checklistType.trim()) {
      nextErrors.checklistType = 'Checklist type is required for inspection';
    }

    if (templateType === 'execution-daily-site-log') {
      if (!formData.workCompletedToday.trim()) {
        nextErrors.workCompletedToday = 'Work completed today is required';
      }
      if (!formData.weatherConditions.trim()) {
        nextErrors.weatherConditions = 'Weather conditions are required';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const now = new Date();
      const requestId = `${config.code}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const payload = {
        executionRequest: {
          ...formData,
          requestId,
          status: config.status,
          createdAt: now.toISOString(),
          workspaceId: workspace?.workspaceId || null,
          workspaceName: workspace?.name || workspace?.title || 'Workspace'
        }
      };

      if (onSubmitted) {
        await onSubmitted(payload);
      }

      onClose();
    } catch (error) {
      console.error('Failed to submit execution request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              {config.label}
            </h3>
            <p className="text-xs text-gray-600 mt-1">Create execution-ready request and add it to canvas</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Title *</label>
              <input className={inputClass} value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Trade / Discipline</label>
              <input className={inputClass} value={formData.trade} onChange={(e) => updateField('trade', e.target.value)} placeholder="Civil / MEP / Finishing" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Priority</label>
              <select className={inputClass} value={formData.priority} onChange={(e) => updateField('priority', e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Location *</label>
              <input className={inputClass} value={formData.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Tower A - Level 3" />
              {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Assignee *</label>
              <input className={inputClass} value={formData.assignee} onChange={(e) => updateField('assignee', e.target.value)} placeholder="Contractor / Engineer" />
              {errors.assignee && <p className="text-xs text-red-600 mt-1">{errors.assignee}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Due Date</label>
              <input type="date" className={inputClass} value={formData.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Quantity</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className={inputClass} value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value)} placeholder="0" />
                <input className={inputClass} value={formData.unit} onChange={(e) => updateField('unit', e.target.value)} placeholder="sqm / nos" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Dependencies</label>
              <input className={inputClass} value={formData.dependencies} onChange={(e) => updateField('dependencies', e.target.value)} placeholder="Blocked by approval / material delivery" />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <textarea rows={3} className={inputClass} value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
            </div>
          </div>

          {templateType === 'execution-rfi' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
              <p className="text-sm font-medium text-indigo-900">RFI Details</p>
              <div>
                <label className="text-sm font-medium text-gray-700">Technical Question *</label>
                <textarea rows={3} className={inputClass} value={formData.question} onChange={(e) => updateField('question', e.target.value)} />
                {errors.question && <p className="text-xs text-red-600 mt-1">{errors.question}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Drawing / BOQ Reference</label>
                  <input className={inputClass} value={formData.drawingReference} onChange={(e) => updateField('drawingReference', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Required Response By</label>
                  <input type="date" className={inputClass} value={formData.requiredResponseBy} onChange={(e) => updateField('requiredResponseBy', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {templateType === 'execution-inspection' && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
              <p className="text-sm font-medium text-teal-900">Inspection Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Checklist Type *</label>
                  <input className={inputClass} value={formData.checklistType} onChange={(e) => updateField('checklistType', e.target.value)} placeholder="Pre-pour / Finishing QC" />
                  {errors.checklistType && <p className="text-xs text-red-600 mt-1">{errors.checklistType}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Inspection Date</label>
                  <input type="date" className={inputClass} value={formData.inspectionDate} onChange={(e) => updateField('inspectionDate', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {templateType === 'execution-daily-site-log' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-medium text-amber-900">Daily Site Log Details</p>

              <div>
                <label className="text-sm font-medium text-gray-700">Work Completed Today *</label>
                <textarea rows={3} className={inputClass} value={formData.workCompletedToday} onChange={(e) => updateField('workCompletedToday', e.target.value)} placeholder="Concrete pour completed at Tower B, slab shuttering done at Level 4" />
                {errors.workCompletedToday && <p className="text-xs text-red-600 mt-1">{errors.workCompletedToday}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Skilled Labor Count</label>
                  <input type="number" min="0" className={inputClass} value={formData.laborSkilled} onChange={(e) => updateField('laborSkilled', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unskilled Labor Count</label>
                  <input type="number" min="0" className={inputClass} value={formData.laborUnskilled} onChange={(e) => updateField('laborUnskilled', e.target.value)} placeholder="0" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Equipment Used</label>
                <textarea rows={2} className={inputClass} value={formData.equipmentUsed} onChange={(e) => updateField('equipmentUsed', e.target.value)} placeholder="Tower crane TC-1, boom placer, vibrators" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Issues / Blockers</label>
                <textarea rows={2} className={inputClass} value={formData.blockers} onChange={(e) => updateField('blockers', e.target.value)} placeholder="Material delay, pending drawing approval" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Weather Conditions *</label>
                <input className={inputClass} value={formData.weatherConditions} onChange={(e) => updateField('weatherConditions', e.target.value)} placeholder="Clear / Cloudy / Rainy with wind" />
                {errors.weatherConditions && <p className="text-xs text-red-600 mt-1">{errors.weatherConditions}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea rows={2} className={inputClass} value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Creating...' : 'Create Execution Element'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionRequestModal;
