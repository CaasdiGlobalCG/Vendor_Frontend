import React, { useState } from 'react';
import { Square, Edit2, Save, Info, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const InfoCardNode = ({ data, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: data.title || 'Info Card',
    content: data.content || '',
    cardType: data.cardType || 'info', // info, warning, success, error
    priority: data.priority || 'medium', // low, medium, high
    status: data.status || 'active',
    dueDate: data.dueDate || ''
  });

  const handleSave = () => {
    data.onUpdate?.(formData);
    setIsEditing(false);
  };

  const getCardStyle = () => {
    switch (formData.cardType) {
      case 'warning':
        return 'bg-warning/10 border-warning/20';
      case 'success':
        return 'bg-success/10 border-success/20';
      case 'error':
        return 'bg-danger/10 border-danger/20';
      default:
        return 'bg-info/10 border-info/20';
    }
  };

  const getIcon = () => {
    switch (formData.cardType) {
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-danger" />;
      default:
        return <Info className="w-5 h-5 text-info" />;
    }
  };

  const getPriorityBadge = () => {
    switch (formData.priority) {
      case 'high':
        return 'bg-danger/10 text-danger';
      case 'medium':
        return 'bg-warning/10 text-warning';
      case 'low':
        return 'bg-success/10 text-success';
      default:
        return 'bg-surface-hover text-ink';
    }
  };

  return (
    <div className={`rounded-lg  border-2 ${selected ? 'border-info' : 'border-line'} ${getCardStyle()} p-4 min-w-[280px]`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-semibold text-ink">{formData.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadge()}`}>
            {formData.priority?.toUpperCase() || 'MEDIUM'}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            formData.status === 'active' ? 'bg-info/10 text-info' :
            formData.status === 'completed' ? 'bg-success/10 text-success' :
            'bg-surface-hover text-ink'
          }`}>
            {formData.status?.toUpperCase() || 'ACTIVE'}
          </span>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              placeholder="Card title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
              rows="3"
              placeholder="Card content..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Card Type</label>
              <select
                value={formData.cardType}
                onChange={(e) => setFormData({...formData, cardType: e.target.value})}
                className="w-full px-3 py-2 border border-line rounded-md text-sm"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full px-3 py-2 border border-line rounded-md text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Due Date</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              className="w-full px-3 py-2 border border-line rounded-md text-sm"
            />
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
          <p className="text-sm text-ink whitespace-pre-wrap">{formData.content || 'No content'}</p>
          {formData.dueDate && (
            <div className="flex items-center gap-1 text-sm text-dim">
              <Clock className="w-4 h-4" />
              <span>Due: {new Date(formData.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-surface border border-line rounded-md text-sm hover:bg-canvas"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoCardNode;