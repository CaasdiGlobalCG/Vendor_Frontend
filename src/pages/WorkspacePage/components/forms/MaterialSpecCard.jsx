import React, { useState } from 'react';
import { Edit2, Save, X, Plus, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';

const DEFAULT_MATERIAL = {
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

const emptyMaterial = () => ({ ...DEFAULT_MATERIAL, specs: [] });

// Predefined material categories with their typical spec fields and IS standards
const MATERIAL_CATEGORIES = [
  {
    id: 'bricks', label: 'Bricks', unit: 'nos', namePlaceholder: 'e.g. Red Clay Bricks',
    fields: [
      ['Type', 'e.g. Red Clay / Fly Ash / AAC'],
      ['Size (mm)', 'e.g. 230 × 110 × 70'],
      ['Compressive Strength (MPa)', 'e.g. ≥ 3.5'],
      ['Water Absorption (%)', 'e.g. ≤ 20'],
      ['Efflorescence', 'e.g. Nil / Slight'],
    ],
    defaultStandard: 'IS 1077 / IS 12894'
  },
  {
    id: 'cement', label: 'Cement', unit: 'bags', namePlaceholder: 'e.g. Portland Cement',
    fields: [
      ['Type', 'e.g. OPC / PPC / PSC'],
      ['Grade', 'e.g. 43 / 53'],
      ['Fineness (m²/kg)', 'e.g. ≥ 225'],
      ['Initial Setting Time (min)', 'e.g. ≥ 30'],
      ['Final Setting Time (min)', 'e.g. ≤ 600'],
    ],
    defaultStandard: 'IS 12269 / IS 1489'
  },
  {
    id: 'steel', label: 'Steel / TMT Rebar', unit: 'kg', namePlaceholder: 'e.g. TMT Rebar Fe500',
    fields: [
      ['Grade', 'e.g. Fe500 / Fe550D'],
      ['Diameter (mm)', 'e.g. 8 / 10 / 12 / 16 / 20'],
      ['Yield Strength (MPa)', 'e.g. ≥ 500'],
      ['Elongation (%)', 'e.g. ≥ 14.5'],
      ['Bond Strength', 'e.g. Ribbed / Corrugated'],
    ],
    defaultStandard: 'IS 1786'
  },
  {
    id: 'concrete-blocks', label: 'Concrete Blocks', unit: 'nos', namePlaceholder: 'e.g. AAC Blocks',
    fields: [
      ['Type', 'e.g. Solid / Hollow / AAC'],
      ['Size (mm)', 'e.g. 400 × 200 × 200'],
      ['Compressive Strength (MPa)', 'e.g. ≥ 4'],
      ['Density (kg/m³)', 'e.g. 550–650'],
    ],
    defaultStandard: 'IS 2185 / IS 6441'
  },
  {
    id: 'sand', label: 'Sand', unit: 'm³', namePlaceholder: 'e.g. M-Sand',
    fields: [
      ['Type', 'e.g. River Sand / M-Sand'],
      ['Zone', 'e.g. Zone II'],
      ['Silt Content (%)', 'e.g. ≤ 6'],
      ['Specific Gravity', 'e.g. 2.6'],
    ],
    defaultStandard: 'IS 383'
  },
  {
    id: 'aggregate', label: 'Aggregate', unit: 'm³', namePlaceholder: 'e.g. Crushed Stone Aggregate',
    fields: [
      ['Size (mm)', 'e.g. 10 / 20 / 40'],
      ['Type', 'e.g. Crushed / Rounded'],
      ['Flakiness Index (%)', 'e.g. ≤ 30'],
      ['Impact Value (%)', 'e.g. ≤ 30'],
    ],
    defaultStandard: 'IS 383'
  },
  {
    id: 'rmc', label: 'Ready-Mix Concrete', unit: 'm³', namePlaceholder: 'e.g. RMC M25',
    fields: [
      ['Grade', 'e.g. M20 / M25 / M30'],
      ['Slump (mm)', 'e.g. 75–100'],
      ['Cement Content (kg/m³)', 'e.g. 320'],
      ['Max Aggregate Size (mm)', 'e.g. 20'],
    ],
    defaultStandard: 'IS 4926'
  },
  {
    id: 'tiles', label: 'Tiles', unit: 'boxes', namePlaceholder: 'e.g. Vitrified Floor Tiles',
    fields: [
      ['Type', 'e.g. Ceramic / Vitrified / Porcelain'],
      ['Size (mm)', 'e.g. 600 × 600'],
      ['Finish', 'e.g. Glossy / Matte / Anti-skid'],
      ['Water Absorption (%)', 'e.g. ≤ 0.5'],
      ['Tiles per Box', 'e.g. 4'],
    ],
    defaultStandard: 'IS 15622'
  },
  {
    id: 'paint', label: 'Paint', unit: 'litres', namePlaceholder: 'e.g. Interior Emulsion',
    fields: [
      ['Type', 'e.g. Emulsion / Enamel / Distemper'],
      ['Finish', 'e.g. Matte / Satin / Gloss'],
      ['Coverage (m²/L/coat)', 'e.g. 10'],
      ['VOC Content (g/L)', 'e.g. ≤ 50'],
    ],
    defaultStandard: 'IS 15489'
  },
  {
    id: 'plywood', label: 'Plywood / Boards', unit: 'sheets', namePlaceholder: 'e.g. BWP Plywood 18mm',
    fields: [
      ['Grade', 'e.g. MR / BWR / BWP'],
      ['Thickness (mm)', 'e.g. 6 / 12 / 18'],
      ['Sheet Size (ft)', 'e.g. 8 × 4'],
      ['Core Material', 'e.g. Hardwood / Softwood'],
    ],
    defaultStandard: 'IS 303 / IS 710'
  },
  {
    id: 'other', label: 'Other', unit: '', namePlaceholder: 'Material name',
    fields: [], defaultStandard: ''
  },
];

const inputCls = 'w-full px-2 py-1.5 border border-line rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-info';
const labelCls = 'block text-[10px] font-semibold uppercase tracking-wide text-dim mb-0.5';

// Migrate legacy single-material specData into the materials[] shape
const normalizeSpecData = (saved) => {
  if (saved?.materials?.length) return { materials: saved.materials };
  const hasContent = saved && (
    saved.materialName || saved.category || saved.grade || saved.manufacturer ||
    saved.standard || saved.quantity || saved.notes || (saved.specs || []).length
  );
  return { materials: hasContent ? [{ ...emptyMaterial(), ...saved }] : [] };
};

const MaterialSpecCard = ({ data, nodeId, workspaceId, setNodes }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [specData, setSpecData] = useState(() => normalizeSpecData(data?.specData));
  const [expandedIndex, setExpandedIndex] = useState(0);

  const materials = specData.materials || [];

  const updateMaterial = (index, name, value) => {
    setSpecData(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => (i === index ? { ...m, [name]: value } : m))
    }));
  };

  const updateSpecRow = (index, rowIndex, field, value) => {
    setSpecData(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => i === index
        ? { ...m, specs: m.specs.map((row, j) => (j === rowIndex ? { ...row, [field]: value } : row)) }
        : m)
    }));
  };

  const addSpecRow = (index) => {
    setSpecData(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => i === index
        ? { ...m, specs: [...m.specs, { key: '', value: '' }] }
        : m)
    }));
  };

  const removeSpecRow = (index, rowIndex) => {
    setSpecData(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => i === index
        ? { ...m, specs: m.specs.filter((_, j) => j !== rowIndex) }
        : m)
    }));
  };

  const addMaterial = (cat) => {
    const mat = emptyMaterial();
    const seeded = cat
      ? {
          ...mat,
          category: cat.label,
          unit: cat.unit,
          standard: cat.defaultStandard,
          specs: cat.fields.map(([key]) => ({ key, value: '' })),
        }
      : mat;
    setSpecData(prev => ({ ...prev, materials: [...prev.materials, seeded] }));
    setExpandedIndex(materials.length);
  };

  const removeMaterial = (index) => {
    setSpecData(prev => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }));
    setExpandedIndex(prev => (prev >= index ? Math.max(0, prev - 1) : prev));
  };

  // Apply a category to a material: sets label/unit/standard and seeds spec
  // rows with that material's typical fields (existing values are preserved).
  const selectCategory = (index, cat) => {
    setSpecData(prev => ({
      ...prev,
      materials: prev.materials.map((m, i) => {
        if (i !== index) return m;
        const existingKeys = new Set(m.specs.map(r => r.key));
        const seededRows = cat.fields
          .filter(([key]) => !existingKeys.has(key))
          .map(([key]) => ({ key, value: '' }));
        return {
          ...m,
          category: cat.label,
          unit: m.unit || cat.unit,
          standard: m.standard || cat.defaultStandard,
          specs: [...m.specs, ...seededRows],
        };
      })
    }));
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

  const materialTitle = (m, i) =>
    m.materialName || m.category || `Material ${i + 1}`;

  // ---------- EDIT MODE ----------
  if (isEditing) {
    return (
      <div
        className="nodrag w-full bg-surface rounded-lg border border-line p-3 space-y-3 max-h-[560px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-warning" /> Edit Material Specs
          </span>
          <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-surface-hover rounded" title="Close">
            <X className="w-3.5 h-3.5 text-dim" />
          </button>
        </div>

        {/* Category picker for a new material */}
        <div>
          <span className={labelCls}>Add Material by Category</span>
          <div className="flex flex-wrap gap-1">
            {MATERIAL_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => addMaterial(cat)}
                className="px-2 py-1 rounded-full text-[10px] font-medium bg-warning/10 border border-warning/20 text-warning hover:bg-warning/10 hover:border-warning/30 transition-colors"
              >
                + {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Material sections */}
        {materials.map((mat, i) => {
          const cat = MATERIAL_CATEGORIES.find(c => c.label === mat.category);
          const isOpen = expandedIndex === i;
          return (
            <div key={i} className="border border-line rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedIndex(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between px-2.5 py-2 bg-canvas hover:bg-surface-hover text-left"
              >
                <span className="text-xs font-semibold text-ink truncate">
                  {i + 1}. {materialTitle(mat, i)}
                  {mat.category && (
                    <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wide text-warning">
                      {mat.category}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); removeMaterial(i); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeMaterial(i); } }}
                    className="p-1 text-dim hover:text-danger rounded"
                    title="Remove material"
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                  {isOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-dim" />
                    : <ChevronDown className="w-3.5 h-3.5 text-dim" />}
                </span>
              </button>

              {isOpen && (
                <div className="p-2.5 space-y-2">
                  {/* Change category */}
                  <div className="flex flex-wrap gap-1">
                    {MATERIAL_CATEGORIES.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCategory(i, c)}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium border transition-colors ${
                          mat.category === c.label
                            ? 'bg-warning border-warning text-white'
                            : 'bg-surface border-line text-dim hover:border-warning hover:text-warning'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <input type="text" placeholder={`Material name (${cat?.namePlaceholder || 'e.g. Portland Cement'})`}
                    value={mat.materialName}
                    onChange={(e) => updateMaterial(i, 'materialName', e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={inputCls} />

                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Grade (e.g. OPC 53)" value={mat.grade}
                      onChange={(e) => updateMaterial(i, 'grade', e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                    <input type="text" placeholder="Manufacturer" value={mat.manufacturer}
                      onChange={(e) => updateMaterial(i, 'manufacturer', e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                    <input type="text" placeholder="Standard (e.g. IS 12269)" value={mat.standard}
                      onChange={(e) => updateMaterial(i, 'standard', e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                    <div className="flex gap-1">
                      <input type="text" placeholder="Qty" value={mat.quantity}
                        onChange={(e) => updateMaterial(i, 'quantity', e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()} className={`${inputCls} w-1/2`} />
                      <input type="text" placeholder="Unit" value={mat.unit}
                        onChange={(e) => updateMaterial(i, 'unit', e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()} className={`${inputCls} w-1/2`} />
                    </div>
                  </div>

                  <div>
                    <span className={labelCls}>Technical Specs</span>
                    <div className="space-y-1">
                      {mat.specs.map((row, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <input type="text" placeholder="Property" value={row.key}
                            onChange={(e) => updateSpecRow(i, j, 'key', e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className={`${inputCls} flex-1`} />
                          <input type="text" placeholder="Value" value={row.value}
                            onChange={(e) => updateSpecRow(i, j, 'value', e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className={`${inputCls} flex-1`} />
                          <button onClick={() => removeSpecRow(i, j)} className="p-1 text-dim hover:text-danger" title="Remove">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addSpecRow(i)}
                        className="flex items-center gap-1 text-[11px] font-medium text-info hover:text-info">
                        <Plus className="w-3 h-3" /> Add spec
                      </button>
                    </div>
                  </div>

                  <textarea placeholder="Notes / remarks" value={mat.notes} rows={2}
                    onChange={(e) => updateMaterial(i, 'notes', e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={`${inputCls} resize-none`} />
                </div>
              )}
            </div>
          );
        })}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-xs border border-line rounded-md hover:bg-canvas">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-info text-white rounded-md hover:bg-info flex items-center gap-1">
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    );
  }

  // ---------- VIEW MODE ----------
  return (
    <div className="w-full bg-surface rounded-lg border border-line overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-3 py-2.5 bg-warning/10 border-b border-warning/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">
              Material Spec{materials.length > 1 ? `s (${materials.length})` : ''}
            </p>
            {materials.length > 0 && (
              <p className="text-[10px] text-warning font-medium uppercase tracking-wide truncate">
                {[...new Set(materials.map(m => m.category).filter(Boolean))].join(' · ')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="p-1.5 hover:bg-warning/10 rounded-md flex-shrink-0"
          title="Edit specs"
        >
          <Edit2 className="w-3.5 h-3.5 text-dim" />
        </button>
      </div>

      {/* Materials */}
      <div className="p-3 space-y-3 max-h-[520px] overflow-y-auto">
        {materials.length === 0 ? (
          <div>
            <p className="text-xs text-dim mb-2">
              Pick a material category to fill in its spec sheet:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MATERIAL_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    addMaterial(cat);
                    setIsEditing(true);
                  }}
                  className="px-2 py-1 rounded-full text-[11px] font-medium bg-warning/10 border border-warning/20 text-warning hover:bg-warning/10 hover:border-warning/30 transition-colors"
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {materials.map((mat, i) => {
              const specRows = (mat.specs || []).filter(r => r.key || r.value);
              const hasSummary = mat.grade || mat.manufacturer || mat.standard;
              return (
                <div key={i} className={i > 0 ? 'pt-3 border-t border-line' : ''}>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <p className="text-xs font-semibold text-ink truncate">
                      {materialTitle(mat, i)}
                    </p>
                    {mat.category && (
                      <span className="text-[9px] font-medium uppercase tracking-wide text-warning flex-shrink-0">
                        {mat.category}
                      </span>
                    )}
                  </div>

                  {hasSummary && (
                    <div className="grid grid-cols-2 gap-2">
                      {mat.grade && (
                        <div className="border border-line rounded-md px-2 py-1.5 bg-canvas">
                          <p className={labelCls}>Grade</p>
                          <p className="text-xs font-semibold text-ink">{mat.grade}</p>
                        </div>
                      )}
                      {mat.manufacturer && (
                        <div className="border border-line rounded-md px-2 py-1.5 bg-canvas">
                          <p className={labelCls}>Manufacturer</p>
                          <p className="text-xs font-semibold text-ink">{mat.manufacturer}</p>
                        </div>
                      )}
                      {mat.standard && (
                        <div className="border border-line rounded-md px-2 py-1.5 bg-canvas">
                          <p className={labelCls}>Standard</p>
                          <p className="text-xs font-semibold text-ink">{mat.standard}</p>
                        </div>
                      )}
                      {(mat.quantity || mat.unit) && (
                        <div className="border border-line rounded-md px-2 py-1.5 bg-canvas">
                          <p className={labelCls}>Quantity</p>
                          <p className="text-xs font-semibold text-ink">
                            {mat.quantity || '-'}{mat.unit ? ` ${mat.unit}` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {specRows.length > 0 && (
                    <div className="border border-line rounded-md overflow-hidden mt-2">
                      {specRows.map((row, j) => (
                        <div key={j} className={`flex text-xs ${j % 2 === 0 ? 'bg-surface' : 'bg-canvas'}`}>
                          <span className="flex-1 px-2 py-1.5 text-dim border-r border-line">{row.key}</span>
                          <span className="flex-1 px-2 py-1.5 font-medium text-ink">{row.value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {mat.notes && (
                    <div className="rounded-md bg-info/10 border border-info/10 px-2 py-1.5 mt-2">
                      <p className={labelCls}>Notes</p>
                      <p className="text-xs text-ink whitespace-pre-wrap">{mat.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-warning bg-warning/10 border border-dashed border-warning/30 rounded-md hover:bg-warning/10 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add another material
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default MaterialSpecCard;
