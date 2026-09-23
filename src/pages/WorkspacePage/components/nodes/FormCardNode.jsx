import React, { useState } from 'react';
import { Square, Edit2, Save, Plus, Trash2, FileText } from 'lucide-react';

const FormCardNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: data.title || 'Form Card',
    fields: data.fields || [
      { id: 'field1', label: 'Field 1', type: 'text', required: false },
      { id: 'field2', label: 'Field 2', type: 'text', required: false }
    ],
    submitButton: data.submitButton || 'Submit',
    status: data.status || 'draft'
  });

  const handleSave = () => {
    data.onUpdate?.(formData);
    setIsEditing(false);
  };

  const handleAddField = () => {
    const newField = {
      id: `field${formData.fields.length + 1}`,
      label: `Field ${formData.fields.length + 1}`,
      type: 'text',
      required: false
    };
    setFormData({...formData, fields: [...formData.fields, newField]});
  };

  const handleRemoveField = (fieldId) => {
    setFormData({...formData, fields: formData.fields.filter(f => f.id !== fieldId)});
  };

  const handleFieldChange = (fieldId, key, value) => {
    setFormData({
      ...formData,
      fields: formData.fields.map(f => 
        f.id === fieldId ? {...f, [key]: value} : f
      )
    });
  };

  return (
    <div className={`bg-surface rounded-lg  border-2 ${selected ? 'border-info' : 'border-line'} p-4 min-w-[320px]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-info" />
          <span className="font-semibold text-ink">{formData.title}</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          formData.status === 'draft' ? 'bg-surface-hover text-dim' :
          formData.status === 'published' ? 'bg-success/10 text-success' :
          'bg-info/10 text-info'
        }`}>
          {formData.status?.toUpperCase() || 'DRAFT'}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Form Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              placeholder="Form title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Submit Button Text</label>
            <input
              type="text"
              value={formData.submitButton}
              onChange={(e) => setFormData({...formData, submitButton: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              placeholder="Submit"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink">Form Fields</label>
              <button
                onClick={handleAddField}
                className="flex items-center gap-1 px-2 py-1 bg-info/10 text-info rounded text-xs hover:bg-info/10"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.fields.map((field) => (
                <div key={field.id} className="flex items-center gap-2 p-2 bg-canvas rounded">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                    className="flex-1 px-2 py-1 border border-line rounded text-sm"
                    placeholder="Field label"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                    className="px-2 py-1 border border-line rounded text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                    <option value="textarea">Textarea</option>
                  </select>
                  <button
                    onClick={() => handleRemoveField(field.id)}
                    className="p-1 text-danger hover:bg-danger/10 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-info text-white rounded-md text-sm hover:bg-info"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 bg-surface-hover text-ink rounded-md text-sm hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-2">
            {formData.fields.map((field) => (
              <div key={field.id} className="flex flex-col">
                <label className="text-sm font-medium text-ink">
                  {field.label}
                  {field.required && <span className="text-danger ml-1">*</span>}
                </label>
                <input
                  type={field.type === 'textarea' ? 'text' : field.type}
                  disabled
                  className="w-full px-3 py-2 border border-line rounded-md text-sm bg-canvas"
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
          <button
            disabled
            className="w-full py-2 bg-info text-white rounded-md text-sm opacity-50 cursor-not-allowed"
          >
            {formData.submitButton}
          </button>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-info/10 text-info rounded-md text-sm hover:bg-info/10"
            >
              <Edit2 className="w-4 h-4" />
              Edit Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormCardNode;