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
    <div className={`bg-white rounded-lg shadow-md border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} p-4 min-w-[320px]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-gray-800">{formData.title}</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${
          formData.status === 'draft' ? 'bg-gray-100 text-gray-600' :
          formData.status === 'published' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {formData.status?.toUpperCase() || 'DRAFT'}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Form title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submit Button Text</label>
            <input
              type="text"
              value={formData.submitButton}
              onChange={(e) => setFormData({...formData, submitButton: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Submit"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Form Fields</label>
              <button
                onClick={handleAddField}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
              >
                <Plus className="w-3 h-3" />
                Add Field
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.fields.map((field) => (
                <div key={field.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Field label"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                    <option value="textarea">Textarea</option>
                  </select>
                  <button
                    onClick={() => handleRemoveField(field.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
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
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
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
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type === 'textarea' ? 'text' : field.type}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50"
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
          <button
            disabled
            className="w-full py-2 bg-blue-600 text-white rounded-md text-sm opacity-50 cursor-not-allowed"
          >
            {formData.submitButton}
          </button>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100"
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