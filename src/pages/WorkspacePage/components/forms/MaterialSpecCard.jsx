import React, { useState } from 'react';
import { Edit2, Save, X, Plus, Trash2, Package } from 'lucide-react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';

const DEFAULT_SPEC = {
  materialName: '',
  category: '',
  grade: '',
  manufacturer: '',
  standard: '',
  quantity: '',
  unit: '',
  specs: [],
  notes: ''
};

const MaterialSpecCard = ({ data, nodeId, workspaceId, setNodes }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [specData, setSpecData] = useState({ ...DEFAULT_SPEC, ...(data?.specData || {}) });

  const updateField = (name, value) => {
    setSpecData(prev => ({ ...prev, [name]: value }));
  };

  const updateSpecRow = (index, field, value) => {
    setSpecData(prev => ({
      ...prev,
      specs: prev.specs.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    }));
  };

  const addSpecRow = () => {
    setSpecData(prev => ({ ...prev, specs: [...prev.specs, { key: '', value: '' }] }));
  };

  const removeSpecRow = (index) => {
    setSpecData(prev => ({ ...prev, specs: prev.specs.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setIsEditing(false);
    try {
      await persistNodeDataPatch(
        nodeId,
        { specData, lastModifiedAt: new Date().toISOString() },
        setNodes,
        workspaceId
      );
    } catch (err) {
      console.error('Failed to save material spec:', err);
    }
  };

  const inputCls = 'w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'block text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5';

  const specRows = (specData.specs || []).filter(r => r.key || r.value);
  const hasSummary = specData.materialName || specData.grade || specData.manufacturer || specData.standard;

  if (isEditing) {
    return (
      <div className="nodrag w-full bg-white rounded-lg border border-gray-200 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-orange-500" /> Edit Material Spec
          </span>
          <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-gray-100 rounded" title="Close">
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        <input type="text" placeholder="Material name (e.g. Portland Cement)" value={specData.materialName}
          onChange={(e) => updateField('materialName', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
          className={inputCls} autoFocus />

        <div className="grid grid-cols-2 gap-2">
          <input type="text" placeholder="Category (e.g. Cement)" value={specData.category}
            onChange={(e) => updateField('category', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
            className={inputCls} />
          <input type="text" placeholder="Grade (e.g. OPC 53)" value={specData.grade}
            onChange={(e) => updateField('grade', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
            className={inputCls} />
          <input type="text" placeholder="Manufacturer" value={specData.manufacturer}
            onChange={(e) => updateField('manufacturer', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
            className={inputCls} />
          <input type="text" placeholder="Standard (e.g. IS 12269)" value={specData.standard}
            onChange={(e) => updateField('standard', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
            className={inputCls} />
          <input type="text" placeholder="Quantity" value={specData.quantity}
            onChange={(e) => updateField('quantity', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
            className={inputCls} />
          <input type="text" placeholder="Unit (e.g. bags)" value={specData.unit}
            onChange={(e) => updateField('unit', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
            className={inputCls} />
        </div>

        <div>
          <span className={labelCls}>Technical Specs</span>
          <div className="space-y-1">
            {specData.specs.map((row, i) => (
              <div key={i} className="flex items-center gap-1">
                <input type="text" placeholder="Property" value={row.key}
                  onChange={(e) => updateSpecRow(i, 'key', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
                  className={`${inputCls} flex-1`} />
                <input type="text" placeholder="Value" value={row.value}
                  onChange={(e) => updateSpecRow(i, 'value', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
                  className={`${inputCls} flex-1`} />
                <button onClick={() => removeSpecRow(i)} className="p-1 text-gray-400 hover:text-red-500" title="Remove">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={addSpecRow}
              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
              <Plus className="w-3 h-3" /> Add spec
            </button>
          </div>
        </div>

        <textarea placeholder="Notes / remarks" value={specData.notes} rows={2}
          onChange={(e) => updateField('notes', e.target.value)} onKeyDown={(e) => e.stopPropagation()}
          className={`${inputCls} resize-none`} />

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1">
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-3 py-2.5 bg-orange-50 border-b border-orange-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {specData.materialName || 'Material Spec'}
            </p>
            {specData.category && (
              <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide truncate">
                {specData.category}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="p-1.5 hover:bg-orange-100 rounded-md flex-shrink-0"
          title="Edit spec"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Details grid */}
      <div className="p-3 space-y-2.5">
        {hasSummary ? (
          <div className="grid grid-cols-2 gap-2">
            {specData.grade && (
              <div className="border border-gray-100 rounded-md px-2 py-1.5 bg-gray-50">
                <p className={labelCls}>Grade</p>
                <p className="text-xs font-semibold text-gray-800">{specData.grade}</p>
              </div>
            )}
            {specData.manufacturer && (
              <div className="border border-gray-100 rounded-md px-2 py-1.5 bg-gray-50">
                <p className={labelCls}>Manufacturer</p>
                <p className="text-xs font-semibold text-gray-800">{specData.manufacturer}</p>
              </div>
            )}
            {specData.standard && (
              <div className="border border-gray-100 rounded-md px-2 py-1.5 bg-gray-50">
                <p className={labelCls}>Standard</p>
                <p className="text-xs font-semibold text-gray-800">{specData.standard}</p>
              </div>
            )}
            {(specData.quantity || specData.unit) && (
              <div className="border border-gray-100 rounded-md px-2 py-1.5 bg-gray-50">
                <p className={labelCls}>Quantity</p>
                <p className="text-xs font-semibold text-gray-800">
                  {specData.quantity || '-'}{specData.unit ? ` ${specData.unit}` : ''}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            No details yet — click the edit icon to add grade, manufacturer and technical specs.
          </p>
        )}

        {/* Technical specs table */}
        {specRows.length > 0 && (
          <div className="border border-gray-200 rounded-md overflow-hidden">
            {specRows.map((row, i) => (
              <div key={i} className={`flex text-xs ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <span className="flex-1 px-2 py-1.5 text-gray-500 border-r border-gray-100">{row.key}</span>
                <span className="flex-1 px-2 py-1.5 font-medium text-gray-800">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {specData.notes && (
          <div className="rounded-md bg-blue-50 border border-blue-100 px-2 py-1.5">
            <p className={labelCls}>Notes</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{specData.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialSpecCard;
