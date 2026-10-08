import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Save, X, Plus, Trash2, Package, Upload, Download, Sparkles, CalendarDays, BookOpen, FileText, Loader2 } from 'lucide-react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import { getWorkspaceById, updateWorkspace } from '../../utils/workspaceApi';
import config from '../../../../config/env';
import * as XLSX from 'xlsx-js-style';

const DEFAULT_MATERIAL = {
  materialName: '',
  category: '',
  grade: '',
  manufacturer: '',
  standard: '',
  quantity: '',
  unit: '',
  specs: [],          // { key, value, actual, result } — result: pending|pass|fail|na
  notes: '',
  attachments: [],    // { id, name, size, s3Key, url, contentType, uploadedAt }
  neededBy: '',       // ISO date — creates a workspace calendar reminder on save
  neededByEventId: null,
  sourceProductId: null,
};

const emptyMaterial = () => ({ ...DEFAULT_MATERIAL, specs: [], attachments: [] });

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

const getToken = async () => {
  try {
    const { Auth } = await import('aws-amplify');
    const session = await Auth.currentSession();
    return session.getIdToken().getJwtToken();
  } catch {
    return localStorage.getItem('authToken') || localStorage.getItem('token') || '';
  }
};

// Auto-evaluate a spec row: parse "≥ n", "≤ n", ">= n", "<= n", or "n–m"
// ranges in the required value and compare a numeric actual. Returns
// 'pass' | 'fail' | null (null → caller keeps the manual result).
const evalSpecResult = (required, actual) => {
  const num = parseFloat(actual);
  if (!actual || isNaN(num)) return null;
  const req = String(required || '').trim();
  let m = req.match(/^[≥>]=?\s*([\d.]+)/);
  if (m) return num >= parseFloat(m[1]) ? 'pass' : 'fail';
  m = req.match(/^[≤<]=?\s*([\d.]+)/);
  if (m) return num <= parseFloat(m[1]) ? 'pass' : 'fail';
  m = req.match(/^([\d.]+)\s*[–-]\s*([\d.]+)/);
  if (m) {
    const lo = parseFloat(m[1]), hi = parseFloat(m[2]);
    return num >= lo && num <= hi ? 'pass' : 'fail';
  }
  return null;
};

// Map a vendor-catalogue product into a material record. Products in
// DynamoDB use productName/productCategory, with arbitrary productData
// fields spread on top — read both spellings.
const productToMaterial = (p) => {
  const info = p.productInfo || {};
  const get = (...keys) => keys.map(k => p[k] ?? info[k]).find(v => v !== undefined && v !== null && v !== '') || '';
  const mat = emptyMaterial();
  const specRows = [];
  // keyFeatures may be a comma/newline-separated list or array
  const feats = Array.isArray(p.keyFeatures)
    ? p.keyFeatures
    : String(get('keyFeatures', 'features') || '').split(/[,;\n]+/);
  feats.map(s => s.trim()).filter(Boolean).forEach(f => specRows.push({ key: f, value: '', actual: '', result: 'pending' }));
  const sizes = get('availableSizes', 'sizes');
  if (sizes) specRows.push({ key: 'Available sizes', value: sizes, actual: '', result: 'pending' });
  const pack = get('packagingDelivery', 'packaging');
  if (pack) specRows.push({ key: 'Packaging / delivery', value: pack, actual: '', result: 'pending' });
  const usage = get('usageAreas', 'usage');
  if (usage) specRows.push({ key: 'Usage areas', value: usage, actual: '', result: 'pending' });
  // Product custom fields ({label: value}) become spec rows
  Object.entries(p.customFields || info.customFields || {}).forEach(([k, v]) => {
    if (k && v) specRows.push({ key: k, value: String(v), actual: '', result: 'pending' });
  });
  return {
    ...mat,
    materialName: get('productName', 'name', 'productTitle', 'title'),
    category: get('productCategory', 'category'),
    standard: get('certifications'),
    specs: specRows,
    notes: [get('description'), get('supportServices')].filter(Boolean).join('\n\n'),
    sourceProductId: p.productId || p.id || null,
  };
};

// Styled xlsx export of the whole spec card
const exportSpecSheet = (materials, label) => {
  const headStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F2937' } }, alignment: { vertical: 'center' } };
  const secStyle = { font: { bold: true, sz: 12 }, fill: { fgColor: { rgb: 'FEF3C7' } } };
  const passStyle = { font: { color: { rgb: '16A34A' }, bold: true } };
  const failStyle = { font: { color: { rgb: 'DC2626' }, bold: true } };

  const rows = [['Material Specification Sheet'], [`Exported ${new Date().toLocaleString('en-IN')}`], []];

  materials.forEach((m, i) => {
    rows.push([{ v: `${i + 1}. ${m.materialName || m.category || 'Material'}`, s: secStyle }]);
    rows.push(
      [{ v: 'Field', s: headStyle }, { v: 'Value', s: headStyle }, { v: '', s: headStyle }, { v: '', s: headStyle }],
      ['Category', m.category || '—'],
      ['Grade', m.grade || '—'],
      ['Manufacturer', m.manufacturer || '—'],
      ['Standard', m.standard || '—'],
      ['Quantity', `${m.quantity || '—'} ${m.unit || ''}`.trim()],
      ['Needed by', m.neededBy || '—'],
    );
    const specRows = (m.specs || []).filter(r => r.key || r.value);
    if (specRows.length) {
      rows.push([{ v: 'Spec', s: headStyle }, { v: 'Required', s: headStyle }, { v: 'Actual', s: headStyle }, { v: 'Result', s: headStyle }]);
      specRows.forEach(r => rows.push([
        r.key,
        r.value || '—',
        r.actual || '—',
        r.result === 'pass' ? { v: 'PASS', s: passStyle }
          : r.result === 'fail' ? { v: 'FAIL', s: failStyle }
          : (r.result || 'pending').toUpperCase(),
      ]));
    }
    if ((m.attachments || []).length) {
      rows.push(['Attachments', m.attachments.map(a => a.name).join(', ')]);
    }
    if (m.notes) rows.push(['Notes', m.notes]);
    rows.push([]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 34 }, { wch: 30 }, { wch: 16 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Material Specs');
  XLSX.writeFile(wb, `${(label || 'material_specs').replace(/[^a-z0-9]+/gi, '_')}.xlsx`);
};

const RESULT_BADGE = {
  pass: 'bg-success/10 text-success border-success/20',
  fail: 'bg-danger/10 text-danger border-danger/20',
  na: 'bg-surface-hover text-dim border-line',
  pending: 'bg-warning/10 text-warning border-warning/20',
};

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
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [aiFillingIndex, setAiFillingIndex] = useState(null);
  const [aiErrorMsg, setAiErrorMsg] = useState(null);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const fileInputRef = useRef(null);
  const pendingAttachIndex = useRef(null);

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
      materials: prev.materials.map((m, i) => {
        if (i !== index) return m;
        return {
          ...m,
          specs: m.specs.map((row, j) => {
            if (j !== rowIndex) return row;
            const next = { ...row, [field]: value };
            // Auto grade the QC result when the actual is numeric and the
            // required value is a ≥/≤/range pattern
            if (field === 'actual' || field === 'value') {
              const auto = evalSpecResult(next.value, next.actual);
              if (auto) next.result = auto;
            }
            return next;
          }),
        };
      })
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

  // ---------- Catalogue picker ----------
  const openCatalog = async () => {
    setShowCatalog(true);
    if (catalogProducts.length || catalogLoading) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const token = await getToken();
      const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => ({}));
      const list = json?.data || json?.products || (Array.isArray(json) ? json : []);
      setCatalogProducts(list);
      if (!list.length) setCatalogError('No products in your catalogue yet.');
    } catch (err) {
      setCatalogError('Could not load catalogue.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const pickProduct = (product) => {
    const mat = productToMaterial(product);
    setSpecData(prev => ({ ...prev, materials: [...prev.materials, mat] }));
    setExpandedIndex(materials.length);
    setShowCatalog(false);
  };

  // ---------- AI autofill ----------
  const aiFillSpecs = async (index) => {
    const mat = materials[index];
    const name = mat?.materialName?.trim() || mat?.category;
    if (!name) return;
    setAiFillingIndex(index);
    try {
      const token = await getToken();
      const res = await fetch('/api/workspace/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          action: 'materialSpec',
          prompt: `Material: ${name}${mat.category ? `, category: ${mat.category}` : ''}${mat.standard ? `, standard: ${mat.standard}` : ''}`,
          workspaceId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const spec = json?.data;
      if (!res.ok || !json.success || !spec) {
        setAiErrorMsg(json.message || 'AI spec fill failed — is the backend running the latest build?');
        return;
      }
      setAiErrorMsg(null);
      setSpecData(prev => ({
        ...prev,
        materials: prev.materials.map((m, i) => {
          if (i !== index) return m;
          const existing = new Set(m.specs.map(r => r.key));
          const aiRows = (spec.specs || [])
            .filter(r => r.key && !existing.has(r.key))
            .map(r => ({ key: r.key, value: r.value || '', actual: '', result: 'pending' }));
          return {
            ...m,
            materialName: m.materialName || spec.name || '',
            category: m.category || spec.category || '',
            grade: m.grade || spec.grade || '',
            standard: m.standard || spec.standard || '',
            unit: m.unit || spec.unit || '',
            specs: [...m.specs, ...aiRows],
          };
        }),
      }));
    } catch (err) {
      console.error('AI spec fill failed:', err);
      setAiErrorMsg('AI spec fill failed — check your connection and try again.');
    } finally {
      setAiFillingIndex(null);
    }
  };

  // ---------- Attachments ----------
  const triggerAttach = (index) => {
    pendingAttachIndex.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const index = pendingAttachIndex.current;
    if (!file || index === null) return;
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      if (data.subtaskId) formData.append('subtaskId', data.subtaskId);
      if (data.taskId) formData.append('taskId', data.taskId);
      if (data.vendorId) formData.append('vendorId', data.vendorId);
      const res = await fetch('/api/workspace-files/upload', { method: 'POST', body: formData });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.file) {
        const f = json.file;
        const att = {
          id: f.fileId, name: f.fileName, size: f.fileSize,
          s3Key: f.s3Key, url: f.s3Url, contentType: f.fileType,
          uploadedAt: f.uploadedAt || new Date().toISOString(),
        };
        updateMaterial(index, 'attachments', [...(materials[index].attachments || []), att]);
      }
    } catch (err) {
      console.error('Attachment upload failed:', err);
    } finally {
      setUploadingIndex(null);
    }
  };

  const removeAttachment = (index, attId) => {
    updateMaterial(index, 'attachments', (materials[index].attachments || []).filter(a => a.id !== attId));
  };

  const openAttachment = async (att) => {
    try {
      if (att.url && !att.url.startsWith('blob:')) { window.open(att.url, '_blank'); return; }
      const res = await fetch('/api/workspace-files/view-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: att.s3Key }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.viewUrl) window.open(json.viewUrl, '_blank');
    } catch (err) {
      console.error('Could not open attachment:', err);
    }
  };

  // ---------- Needed-by reminders ----------
  // On save, create a shared workspace calendar reminder for every material
  // that has a needed-by date and no reminder yet.
  const createNeededByReminders = async (mats) => {
    if (!workspaceId) return mats;
    const toCreate = mats.filter(m => m.neededBy && !m.neededByEventId);
    if (!toCreate.length) return mats;
    try {
      const ws = await getWorkspaceById(workspaceId);
      const events = ws?.calendarEvents || ws?.workspace?.calendarEvents || [];
      const newEvents = toCreate.map(m => ({
        id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind: 'reminder',
        title: `Material needed: ${m.materialName || m.category || 'Material'}`,
        date: String(m.neededBy).slice(0, 10),
        notes: `Material spec requirement${m.quantity ? ` — qty ${m.quantity} ${m.unit || ''}` : ''}`,
        color: '#f59e0b',
        done: false,
        visibility: 'shared',
        createdAt: new Date().toISOString(),
      }));
      await updateWorkspace(workspaceId, { calendarEvents: [...events, ...newEvents] });
      window.dispatchEvent(new CustomEvent('vd:calendar-updated', { detail: { workspaceId } }));
      let ei = 0;
      return mats.map(m =>
        m.neededBy && !m.neededByEventId
          ? { ...m, neededByEventId: newEvents[ei++].id }
          : m
      );
    } catch (err) {
      console.error('Failed to create needed-by reminders:', err);
      return mats;
    }
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
      // Create workspace calendar reminders for any newly-dated materials
      const withReminders = await createNeededByReminders(specData.materials || []);
      const next = { ...specData, materials: withReminders };
      setSpecData(next);
      await persistNodeDataPatch(
        nodeId,
        { specData: next, lastModifiedAt: new Date().toISOString() },
        setNodes,
        workspaceId
      );
    } catch (err) {
      console.error('Failed to save material spec:', err);
    }
  };

  const materialTitle = (m, i) =>
    m.materialName || m.category || `Material ${i + 1}`;

  // ---------- EDIT MODE — modal (portal), card stays a compact summary ----------
  const activeMat = materials[expandedIndex];
  const activeCat = MATERIAL_CATEGORIES.find(c => c.label === activeMat?.category);

  const editModal = isEditing ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={() => setIsEditing(false)} />

      <div className="relative w-full max-w-3xl bg-surface rounded-2xl border border-line shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-canvas">
          <span className="text-sm font-semibold text-ink flex items-center gap-2">
            <Package className="w-4 h-4 text-warning" /> Material Specifications
          </span>
          <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-surface-hover rounded-lg text-dim hover:text-ink" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {aiErrorMsg && (
          <p className="mx-5 mt-3 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger flex items-center justify-between gap-2">
            {aiErrorMsg}
            <button onClick={() => setAiErrorMsg(null)} className="flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
          </p>
        )}

        {/* Body: material list | active material fields */}
        <div className="flex-1 grid grid-cols-[230px_1fr] min-h-0">
          {/* LEFT — material list + add controls */}
          <div className="border-r border-line bg-canvas flex flex-col min-h-0">
            <div className="px-3 pt-3 pb-2 border-b border-line">
              <span className={labelCls}>Materials ({materials.length})</span>
              <select
                value=""
                onChange={(e) => {
                  const cat = MATERIAL_CATEGORIES.find(c => c.id === e.target.value);
                  if (cat) addMaterial(cat);
                }}
                className="w-full mt-1.5 px-2 py-1.5 border border-line rounded-md text-xs bg-surface focus:outline-none focus:ring-1 focus:ring-warning"
              >
                <option value="" disabled>+ Add by category…</option>
                {MATERIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <button
                type="button"
                onClick={openCatalog}
                className="w-full mt-1.5 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium bg-info/10 border border-info/20 text-info hover:bg-info/20 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" /> From my catalogue
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {showCatalog && (
                <div className="border border-line rounded-lg max-h-32 overflow-y-auto bg-surface mb-1">
                  {catalogLoading && (
                    <p className="px-2.5 py-2 text-[11px] text-dim flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </p>
                  )}
                  {catalogError && !catalogLoading && (
                    <p className="px-2.5 py-2 text-[11px] text-dim">{catalogError}</p>
                  )}
                  {!catalogLoading && !catalogError && catalogProducts.map((p, pi) => {
                    const pname = p.productName || p.name || p.productTitle || p.title || 'Unnamed product';
                    return (
                      <button
                        key={p.productId || p.id || pi}
                        type="button"
                        onClick={() => pickProduct(p)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-surface-hover text-[11px] text-ink border-b border-line last:border-0"
                      >
                        {pname}
                      </button>
                    );
                  })}
                </div>
              )}

              {materials.length === 0 && (
                <p className="px-2 py-3 text-[11px] text-dim text-center">
                  No materials yet — pick a category or a catalogue product.
                </p>
              )}
              {materials.map((mat, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedIndex(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setExpandedIndex(i); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    expandedIndex === i ? 'bg-warning/10 border border-warning/30' : 'hover:bg-surface-hover border border-transparent'
                  }`}
                >
                  <span className="w-4 h-4 rounded bg-warning/15 text-warning text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-ink truncate">{materialTitle(mat, i)}</span>
                    {mat.category && <span className="block text-[9px] uppercase tracking-wide text-dim">{mat.category}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeMaterial(i); }}
                    className="p-1 text-dim hover:text-danger rounded flex-shrink-0"
                    title="Remove material"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — active material fields */}
          <div className="overflow-y-auto p-4 space-y-3">
            {!activeMat ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-dim">Select a material on the left, or add one.</p>
              </div>
            ) : (() => {
              const i = expandedIndex;
              const mat = activeMat;
              const cat = activeCat;
              return (
                <>
                  <div className="flex gap-2">
                    <input type="text" placeholder={`Material name (${cat?.namePlaceholder || 'e.g. Portland Cement'})`}
                      value={mat.materialName}
                      onChange={(e) => updateMaterial(i, 'materialName', e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className={`${inputCls} flex-1`} />
                    <button
                      type="button"
                      onClick={() => aiFillSpecs(i)}
                      disabled={aiFillingIndex === i || !(mat.materialName || mat.category)}
                      title="AI fills the standard spec sheet for this material"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-white bg-black hover:opacity-90 disabled:opacity-40 transition-opacity flex-shrink-0"
                    >
                      {aiFillingIndex === i
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Sparkles className="w-3 h-3" />}
                      Fill specs
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Category</label>
                      <select
                        value={MATERIAL_CATEGORIES.find(c => c.label === mat.category)?.id || ''}
                        onChange={(e) => {
                          const c = MATERIAL_CATEGORIES.find(x => x.id === e.target.value);
                          if (c) selectCategory(i, c);
                        }}
                        className={`${inputCls} bg-surface`}
                      >
                        <option value="" disabled>Choose…</option>
                        {MATERIAL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Grade</label>
                      <input type="text" placeholder="e.g. OPC 53 / Fe500" value={mat.grade}
                        onChange={(e) => updateMaterial(i, 'grade', e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Manufacturer</label>
                      <input type="text" placeholder="e.g. JSW Steel" value={mat.manufacturer}
                        onChange={(e) => updateMaterial(i, 'manufacturer', e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Standard</label>
                      <input type="text" placeholder="e.g. IS 12269" value={mat.standard}
                        onChange={(e) => updateMaterial(i, 'standard', e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Qty · Unit</label>
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
                      <label className={labelCls}><CalendarDays className="inline w-2.5 h-2.5 mr-0.5 -mt-0.5" />Needed by</label>
                      <input type="date" value={mat.neededBy || ''}
                        onChange={(e) => updateMaterial(i, 'neededBy', e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className={inputCls} />
                    </div>
                  </div>

                  {/* Specs table */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={labelCls}>Technical Specs</span>
                    </div>
                    <div className="border border-line rounded-lg overflow-hidden">
                      <div className="grid grid-cols-[1fr_5.5rem_5.5rem_4.5rem_1.75rem] gap-0 bg-canvas border-b border-line text-[9px] font-semibold uppercase tracking-wide text-dim">
                        <span className="px-2 py-1.5">Property</span>
                        <span className="px-2 py-1.5">Required</span>
                        <span className="px-2 py-1.5">Actual</span>
                        <span className="px-1 py-1.5">Result</span>
                        <span />
                      </div>
                      <div className="max-h-44 overflow-y-auto divide-y divide-line">
                        {mat.specs.map((row, j) => (
                          <div key={j} className="grid grid-cols-[1fr_5.5rem_5.5rem_4.5rem_1.75rem] items-center">
                            <input type="text" placeholder="Property" value={row.key}
                              onChange={(e) => updateSpecRow(i, j, 'key', e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="px-2 py-1.5 text-xs bg-transparent border-0 focus:outline-none focus:bg-canvas" />
                            <input type="text" placeholder="Req." value={row.value}
                              onChange={(e) => updateSpecRow(i, j, 'value', e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="px-2 py-1.5 text-xs bg-transparent border-0 border-l border-line focus:outline-none focus:bg-canvas" />
                            <input type="text" placeholder="Actual" value={row.actual || ''}
                              onChange={(e) => updateSpecRow(i, j, 'actual', e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="px-2 py-1.5 text-xs bg-transparent border-0 border-l border-line focus:outline-none focus:bg-canvas" />
                            <select
                              value={row.result || 'pending'}
                              onChange={(e) => updateSpecRow(i, j, 'result', e.target.value)}
                              className={`mx-0.5 text-[10px] font-medium rounded border px-0.5 py-1 bg-surface ${RESULT_BADGE[row.result || 'pending']}`}
                            >
                              <option value="pending">…</option>
                              <option value="pass">Pass</option>
                              <option value="fail">Fail</option>
                              <option value="na">N/A</option>
                            </select>
                            <button onClick={() => removeSpecRow(i, j)} className="p-1 text-dim hover:text-danger" title="Remove">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addSpecRow(i)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-info hover:bg-info/5 border-t border-line">
                        <Plus className="w-3 h-3" /> Add spec
                      </button>
                    </div>
                  </div>

                  {/* Attachments + notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={labelCls}>Attachments</span>
                        <button
                          type="button"
                          onClick={() => triggerAttach(i)}
                          disabled={uploadingIndex === i}
                          className="flex items-center gap-1 text-[10px] font-medium text-info hover:text-info disabled:opacity-50"
                        >
                          {uploadingIndex === i
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Upload className="w-3 h-3" />}
                          Upload
                        </button>
                      </div>
                      <div className="space-y-1 min-h-[2rem]">
                        {(mat.attachments || []).length === 0 && (
                          <p className="text-[10px] text-dim italic">Certs, datasheets…</p>
                        )}
                        {mat.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-canvas border border-line text-[11px]">
                            <FileText className="w-3 h-3 text-dim flex-shrink-0" />
                            <span className="flex-1 truncate text-ink">{att.name}</span>
                            <button type="button" onClick={() => openAttachment(att)}
                              className="text-info hover:underline flex-shrink-0">View</button>
                            <button type="button" onClick={() => removeAttachment(i, att.id)}
                              className="text-dim hover:text-danger flex-shrink-0"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className={labelCls}>Notes</span>
                      <textarea placeholder="Remarks, delivery terms…" value={mat.notes} rows={3}
                        onChange={(e) => updateMaterial(i, 'notes', e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className={`${inputCls} resize-none mt-1`} />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-line bg-canvas">
          <button onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-xs font-medium border border-line rounded-lg hover:bg-surface-hover">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-4 py-2 text-xs font-medium bg-info text-white rounded-lg hover:opacity-90 flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
        onChange={handleFileChosen}
      />
    </div>,
    document.body
  ) : null;

  // ---------- VIEW MODE ----------
  return (
    <div className="w-full bg-surface rounded-lg border border-line overflow-hidden">
      {editModal}
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
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {materials.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                exportSpecSheet(materials, data?.label || 'material_specs');
              }}
              className="p-1.5 hover:bg-warning/10 rounded-md"
              title="Export spec sheet as Excel"
            >
              <Download className="w-3.5 h-3.5 text-dim" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            className="p-1.5 hover:bg-warning/10 rounded-md"
            title="Edit specs"
          >
            <Edit2 className="w-3.5 h-3.5 text-dim" />
          </button>
        </div>
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

                  {mat.neededBy && (
                    <p className="mt-1.5 text-[10px] font-medium text-info flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> Needed by {mat.neededBy}
                      {mat.neededByEventId && <span className="text-dim">· reminder set</span>}
                    </p>
                  )}

                  {specRows.length > 0 && (
                    <div className="border border-line rounded-md overflow-hidden mt-2">
                      {specRows.map((row, j) => {
                        const hasQC = row.actual !== undefined && row.actual !== '';
                        return (
                          <div key={j} className={`flex items-center text-xs ${j % 2 === 0 ? 'bg-surface' : 'bg-canvas'}`}>
                            <span className="flex-1 px-2 py-1.5 text-dim border-r border-line">{row.key}</span>
                            <span className="w-16 px-2 py-1.5 font-medium text-ink border-r border-line" title="Required">{row.value || '—'}</span>
                            <span className="w-16 px-2 py-1.5 text-ink border-r border-line" title="Actual">{row.actual || '—'}</span>
                            <span className={`w-12 text-center text-[9px] font-bold uppercase border rounded mx-1 my-0.5 py-0.5 ${RESULT_BADGE[row.result || 'pending']}`}>
                              {hasQC || row.result !== 'pending' ? (row.result || 'pending') : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(mat.attachments || []).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {mat.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openAttachment(att); }}
                          className="w-full flex items-center gap-1.5 px-2 py-1 rounded bg-canvas border border-line text-[11px] text-ink hover:border-info transition-colors"
                        >
                          <FileText className="w-3 h-3 text-dim flex-shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </button>
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
