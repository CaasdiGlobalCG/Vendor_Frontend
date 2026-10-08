import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Save, X, Plus, Trash2, Package, Upload, Sparkles, BookOpen, FileText, Loader2, CheckCircle, Info, Store } from 'lucide-react';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import config from '../../../../config/env';

/**
 * VendorCatalogCard — a real vendor-catalog element for the workspace:
 *   pick products from the vendor's B2B catalogue, attach datasheets,
 *   tag compliance certifications, and let the PM mark tags verified.
 *
 * data.catalogData = { items: [{ id, productId, productName, productImage,
 *   category, features, tags: [{ label, status }], datasheet: { name, s3Key,
 *   url }, verifiedBy, verifiedAt }] }
 *
 * tag.status: 'certified' (vendor claims) | 'pending' | 'verified' (PM checked)
 */

const COMPLIANCE_PRESETS = ['IS', 'BIS', 'CE', 'ISO 9001', 'ASTM', 'RoHS', 'FSSAI', 'FM Approved', 'UL'];

const TAG_STYLE = {
  certified: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  verified: 'bg-info/10 text-info border-info/20',
};
const TAG_LABEL = { certified: 'Certified', pending: 'Pending', verified: 'PM verified' };

const PM_ROLES = ['pm', 'cas', 'admin', 'project_manager', 'project-manager'];

const emptyItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  productId: null,
  productName: '',
  productImage: '',
  category: '',
  features: [],
  tags: [],
  datasheet: null,
  verifiedBy: null,
  verifiedAt: null,
  source: 'manual',
});

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

// Resolve product image — images may be {url} objects or plain strings
const productImage = (p) => {
  const img = (p.images || [])[0];
  return typeof img === 'string' ? img : img?.url || img?.s3Url || '';
};

// Product → catalog item: name, image, category, keyFeatures → features,
// certifications → tag chips (pending → vendor marks certified). A trimmed
// `details` snapshot rides along for the info modal.
const productToItem = (p) => {
  const info = p.productInfo || {};
  const get = (...keys) => keys.map(k => p[k] ?? info[k]).find(v => v !== undefined && v !== null && v !== '') || '';
  const feats = Array.isArray(p.keyFeatures)
    ? p.keyFeatures
    : String(get('keyFeatures', 'features') || '').split(/[,;\n]+/);
  const certs = String(get('certifications') || '').split(/[,;\n]+/)
    .map(s => s.trim()).filter(Boolean);
  return {
    ...emptyItem(),
    productId: p.productId || p.id || null,
    productName: get('productName', 'name', 'productTitle', 'title'),
    productImage: productImage(p),
    category: get('productCategory', 'category'),
    features: feats.map(s => s.trim()).filter(Boolean).slice(0, 6),
    tags: certs.map(label => ({ label, status: 'pending' })),
    source: 'catalog',
    details: {
      description: get('description'),
      availableSizes: get('availableSizes', 'sizes'),
      packagingDelivery: get('packagingDelivery', 'packaging'),
      usageAreas: get('usageAreas', 'usage'),
      targetCustomers: get('targetCustomers'),
      supportServices: get('supportServices'),
      certifications: get('certifications'),
      catalogDemo: get('catalogDemo'),
      status: p.status || '',
      customFields: p.customFields || info.customFields || {},
    },
  };
};

const VendorCatalogCard = ({ data, nodeId, workspaceId, setNodes, role }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [catalogData, setCatalogData] = useState(() => data?.catalogData || { items: [] });
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [customTag, setCustomTag] = useState('');
  const [infoIndex, setInfoIndex] = useState(null);
  const fileInputRef = useRef(null);
  const pendingUploadIndex = useRef(null);
  const autoFetchedRef = useRef(false);

  const isPM = PM_ROLES.includes(role);
  const items = catalogData.items || [];

  const updateItem = (index, name, value) => {
    setCatalogData(prev => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, [name]: value } : it)),
    }));
  };

  const addItem = (item) => {
    setCatalogData(prev => ({ ...prev, items: [...prev.items, item] }));
    setActiveIndex(items.length);
  };

  const removeItem = (index) => {
    // Removing a catalogue-sourced product remembers it in hiddenProductIds
    // so the auto-fetch doesn't bring it back on the next load.
    const productId = items[index]?.productId;
    setCatalogData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      hiddenProductIds: productId
        ? [...new Set([...(prev.hiddenProductIds || []), productId])]
        : (prev.hiddenProductIds || []),
    }));
    setActiveIndex(prev => (prev >= index ? Math.max(0, prev - 1) : prev));
  };

  const toggleTag = (index, label) => {
    const it = items[index];
    const exists = it.tags.some(t => t.label === label);
    updateItem(index, 'tags', exists
      ? it.tags.filter(t => t.label !== label)
      : [...it.tags, { label, status: 'pending' }]);
  };

  const setTagStatus = (index, label, status) => {
    updateItem(index, 'tags', items[index].tags.map(t => t.label === label ? { ...t, status } : t));
  };

  const addCustomTag = (index) => {
    const label = customTag.trim();
    if (!label) return;
    if (!items[index].tags.some(t => t.label === label)) {
      updateItem(index, 'tags', [...items[index].tags, { label, status: 'pending' }]);
    }
    setCustomTag('');
  };

  // ---------- Catalogue fetch (shared by picker + auto-load) ----------
  const fetchVendorProducts = async () => {
    const token = await getToken();
    const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/products`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => ({}));
    return json?.data || json?.products || (Array.isArray(json) ? json : []);
  };

  const openCatalog = async () => {
    setShowCatalog(true);
    if (catalogProducts.length || catalogLoading) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const list = await fetchVendorProducts();
      setCatalogProducts(list);
      if (!list.length) setCatalogError('No products in your catalogue yet.');
    } catch {
      setCatalogError('Could not load catalogue.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const pickProduct = (product) => {
    addItem(productToItem(product));
    setShowCatalog(false);
  };

  // ---------- Datasheet upload ----------
  const triggerUpload = (index) => {
    pendingUploadIndex.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const index = pendingUploadIndex.current;
    if (!file || index === null) return;
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      formData.append('nodeId', nodeId);
      if (data.subtaskId) formData.append('subtaskId', data.subtaskId);
      if (data.taskId) formData.append('taskId', data.taskId);
      const res = await fetch('/api/workspace-files/upload', { method: 'POST', body: formData });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.file) {
        updateItem(index, 'datasheet', {
          name: json.file.fileName, s3Key: json.file.s3Key,
          url: json.file.s3Url, uploadedAt: json.file.uploadedAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Datasheet upload failed:', err);
    } finally {
      setUploadingIndex(null);
    }
  };

  const openDatasheet = async (sheet) => {
    try {
      if (sheet.url && !sheet.url.startsWith('blob:')) { window.open(sheet.url, '_blank'); return; }
      const res = await fetch('/api/workspace-files/view-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: sheet.s3Key }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.viewUrl) window.open(json.viewUrl, '_blank');
    } catch (err) {
      console.error('Could not open datasheet:', err);
    }
  };

  // ---------- PM verify (view mode) ----------
  const verifyTag = async (index, label) => {
    const next = items[index].tags.map(t =>
      t.label === label && t.status !== 'verified' ? { ...t, status: 'verified' } : t);
    const nextData = {
      ...catalogData,
      items: catalogData.items.map((it, i) => i === index ? { ...it, tags: next } : it),
    };
    setCatalogData(nextData);
    try {
      await persistNodeDataPatch(nodeId, { catalogData: nextData }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist tag verification:', err);
    }
  };

  const handleSave = async () => {
    setIsEditing(false);
    try {
      await persistNodeDataPatch(nodeId, { catalogData, lastModifiedAt: new Date().toISOString() }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to save vendor catalog:', err);
    }
  };

  // Sync external updates (collab/refresh) while not editing
  React.useEffect(() => {
    if (!isEditing && data?.catalogData) setCatalogData(data.catalogData);
  }, [data?.catalogData, isEditing]);

  // Auto-fetch the vendor's products on load — the card IS the products
  // table. Merges in new products; items the vendor already edited keep
  // their tags/datasheet/verification; removed products stay hidden.
  React.useEffect(() => {
    if (autoFetchedRef.current || role !== 'vendor' || !workspaceId) return;
    autoFetchedRef.current = true;
    (async () => {
      try {
        const list = await fetchVendorProducts();
        if (!list.length) return;
        setCatalogData(prev => {
          const hidden = new Set(prev.hiddenProductIds || []);
          const byProductId = new Map(
            list.map(p => [p.productId || p.id, p]).filter(([pid]) => pid)
          );
          let changed = false;
          // Refresh product-sourced fields on existing items (details were
          // added later — older items lack them); keep user-set state
          // (tags, datasheet, verifiedBy) untouched.
          const refreshed = prev.items.map(it => {
            const p = it.productId && byProductId.get(it.productId);
            if (!p) return it;
            changed = true;
            const fresh = productToItem(p);
            return {
              ...it,
              productName: it.productName || fresh.productName,
              productImage: it.productImage || fresh.productImage,
              category: it.category || fresh.category,
              features: it.features.length ? it.features : fresh.features,
              details: fresh.details,
            };
          });
          const existing = new Set(prev.items.map(it => it.productId).filter(Boolean));
          const additions = list
            .map(productToItem)
            .filter(it => it.productId && !hidden.has(it.productId) && !existing.has(it.productId));
          if (additions.length) changed = true;
          if (!changed) return prev;
          const next = { ...prev, items: [...refreshed, ...additions] };
          persistNodeDataPatch(nodeId, { catalogData: next }, setNodes, workspaceId)
            .catch(err => console.error('Failed to persist auto-fetched products:', err));
          return next;
        });
      } catch (err) {
        console.error('Vendor catalog auto-fetch failed:', err);
      }
    })();
  }, [role, workspaceId, nodeId, setNodes]);

  const activeItem = items[activeIndex];
  const verifiedCount = items.reduce((n, it) => n + it.tags.filter(t => t.status === 'verified').length, 0);
  const totalTags = items.reduce((n, it) => n + it.tags.length, 0);

  // ---------- EDIT MODAL ----------
  const editModal = isEditing ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={() => setIsEditing(false)} />

      <div className="relative w-full max-w-3xl bg-surface rounded-2xl border border-line shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-canvas">
          <span className="text-sm font-semibold text-ink flex items-center gap-2">
            <Store className="w-4 h-4 text-info" /> Vendor Catalog
          </span>
          <button onClick={() => setIsEditing(false)} className="p-1.5 hover:bg-surface-hover rounded-lg text-dim hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-[230px_1fr] min-h-0">
          {/* LEFT — item list + add */}
          <div className="border-r border-line bg-canvas flex flex-col min-h-0">
            <div className="px-3 pt-3 pb-2 border-b border-line space-y-1.5">
              <span className={labelCls}>Items ({items.length})</span>
              <button type="button" onClick={openCatalog}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium bg-info/10 border border-info/20 text-info hover:bg-info/20 transition-colors">
                <BookOpen className="w-3.5 h-3.5" /> From my catalogue
              </button>
              <button type="button" onClick={() => addItem(emptyItem())}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium bg-surface border border-line text-ink hover:bg-surface-hover transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add manually
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
                      <button key={p.productId || p.id || pi} type="button" onClick={() => pickProduct(p)}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-surface-hover text-[11px] text-ink border-b border-line last:border-0">
                        {pname}
                      </button>
                    );
                  })}
                </div>
              )}

              {items.length === 0 && !showCatalog && (
                <p className="px-2 py-3 text-[11px] text-dim text-center">
                  No items — pick a product or add manually.
                </p>
              )}
              {items.map((it, i) => (
                <div key={it.id} role="button" tabIndex={0}
                  onClick={() => setActiveIndex(i)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setActiveIndex(i); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    activeIndex === i ? 'bg-info/10 border border-info/30' : 'hover:bg-surface-hover border border-transparent'
                  }`}>
                  {it.productImage
                    ? <img src={it.productImage} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                    : <span className="w-7 h-7 rounded bg-info/10 text-info flex items-center justify-center flex-shrink-0"><Package className="w-3.5 h-3.5" /></span>}
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-medium text-ink truncate">{it.productName || `Item ${i + 1}`}</span>
                    {it.category && <span className="block text-[9px] uppercase tracking-wide text-dim">{it.category}</span>}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeItem(i); }}
                    className="p-1 text-dim hover:text-danger rounded flex-shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — active item fields */}
          <div className="overflow-y-auto p-4 space-y-3">
            {!activeItem ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-dim">Select an item on the left, or add one.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  {activeItem.productImage && (
                    <img src={activeItem.productImage} alt="" className="w-10 h-10 rounded-lg object-cover border border-line flex-shrink-0" />
                  )}
                  <input type="text" placeholder="Product / item name"
                    value={activeItem.productName}
                    onChange={(e) => updateItem(activeIndex, 'productName', e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className={`${inputCls} flex-1`} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Category</label>
                    <input type="text" placeholder="e.g. Safety gloves" value={activeItem.category}
                      onChange={(e) => updateItem(activeIndex, 'category', e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Features (comma-separated)</label>
                    <input type="text" placeholder="e.g. Nitrile coated, Cut level 5"
                      value={(activeItem.features || []).join(', ')}
                      onChange={(e) => updateItem(activeIndex, 'features', e.target.value.split(/[,;]+/).map(s => s.trim()).filter(Boolean))}
                      onKeyDown={(e) => e.stopPropagation()} className={inputCls} />
                  </div>
                </div>

                {/* Compliance tags */}
                <div>
                  <span className={labelCls}>Compliance tags</span>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMPLIANCE_PRESETS.map(label => {
                      const active = activeItem.tags.some(t => t.label === label);
                      return (
                        <button key={label} type="button" onClick={() => toggleTag(activeIndex, label)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                            active ? 'bg-success/10 text-success border-success/30' : 'bg-surface border-line text-dim hover:border-info hover:text-info'
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-1">
                    <input type="text" placeholder="Custom tag…" value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') addCustomTag(activeIndex); }}
                      className={`${inputCls} flex-1`} />
                    <button type="button" onClick={() => addCustomTag(activeIndex)}
                      className="px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-line hover:bg-surface-hover">Add</button>
                  </div>

                  {(activeItem.tags || []).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {activeItem.tags.map(t => (
                        <div key={t.label} className="flex items-center gap-2 px-2 py-1 rounded bg-canvas border border-line text-[11px]">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${TAG_STYLE[t.status]}`}>{t.label}</span>
                          <span className="text-dim flex-1">{TAG_LABEL[t.status]}</span>
                          <select value={t.status} onChange={(e) => setTagStatus(activeIndex, t.label, e.target.value)}
                            className="text-[10px] bg-surface border border-line rounded px-1 py-0.5">
                            <option value="pending">Pending</option>
                            <option value="certified">Certified</option>
                            <option value="verified">Verified</option>
                          </select>
                          <button type="button" onClick={() => toggleTag(activeIndex, t.label)}
                            className="text-dim hover:text-danger"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Datasheet */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={labelCls}>Datasheet</span>
                    <button type="button" onClick={() => triggerUpload(activeIndex)}
                      disabled={uploadingIndex === activeIndex}
                      className="flex items-center gap-1 text-[10px] font-medium text-info disabled:opacity-50">
                      {uploadingIndex === activeIndex
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Upload className="w-3 h-3" />}
                      Upload
                    </button>
                  </div>
                  {activeItem.datasheet ? (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-canvas border border-line text-[11px]">
                      <FileText className="w-3 h-3 text-dim flex-shrink-0" />
                      <span className="flex-1 truncate text-ink">{activeItem.datasheet.name}</span>
                      <button type="button" onClick={() => openDatasheet(activeItem.datasheet)}
                        className="text-info hover:underline">View</button>
                      <button type="button" onClick={() => updateItem(activeIndex, 'datasheet', null)}
                        className="text-dim hover:text-danger"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-dim italic">Attach the product datasheet (PDF/DOC/XLSX).</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

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

      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
        onChange={handleFileChosen} />
    </div>,
    document.body
  ) : null;

  // ---------- PRODUCT INFO MODAL ----------
  const infoItem = infoIndex !== null ? items[infoIndex] : null;
  const infoModal = infoItem ? createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/35" onClick={() => setInfoIndex(null)} />
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-line shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-line bg-canvas">
          {infoItem.productImage
            ? <img src={infoItem.productImage} alt="" className="w-12 h-12 rounded-lg object-cover border border-line flex-shrink-0" />
            : <span className="w-12 h-12 rounded-lg bg-info/10 text-info flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5" /></span>}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{infoItem.productName}</p>
            {infoItem.category && <p className="text-[10px] uppercase tracking-wide text-dim">{infoItem.category}</p>}
            {infoItem.details?.status && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-hover text-dim uppercase">{infoItem.details.status}</span>
            )}
          </div>
          <button onClick={() => setInfoIndex(null)} className="p-1.5 hover:bg-surface-hover rounded-lg text-dim hover:text-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {infoItem.datasheet && (
            <button type="button" onClick={() => openDatasheet(infoItem.datasheet)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-info/20 bg-info/5 text-xs font-medium text-info hover:bg-info/10">
              <FileText className="w-3.5 h-3.5" /> {infoItem.datasheet.name}
            </button>
          )}

          {[
            ['Description', infoItem.details?.description],
            ['Available sizes', infoItem.details?.availableSizes],
            ['Packaging / delivery', infoItem.details?.packagingDelivery],
            ['Usage areas', infoItem.details?.usageAreas],
            ['Target customers', infoItem.details?.targetCustomers],
            ['Certifications', infoItem.details?.certifications],
            ['Support services', infoItem.details?.supportServices],
            ['Catalogue demo', infoItem.details?.catalogDemo],
          ].filter(([, v]) => v).map(([label, v]) => (
            <div key={label}>
              <p className={labelCls}>{label}</p>
              <p className="text-xs text-ink whitespace-pre-wrap">{v}</p>
            </div>
          ))}

          {(infoItem.features || []).length > 0 && (
            <div>
              <p className={labelCls}>Key features</p>
              <ul className="text-xs text-ink space-y-0.5">
                {infoItem.features.map((f, i) => <li key={i}>• {f}</li>)}
              </ul>
            </div>
          )}

          {Object.keys(infoItem.details?.customFields || {}).length > 0 && (
            <div>
              <p className={labelCls}>Custom fields</p>
              <div className="border border-line rounded-md overflow-hidden">
                {Object.entries(infoItem.details.customFields).map(([k, v], i) => (
                  <div key={k} className={`flex text-xs ${i % 2 ? 'bg-canvas' : 'bg-surface'}`}>
                    <span className="w-2/5 px-2 py-1.5 text-dim border-r border-line">{k}</span>
                    <span className="flex-1 px-2 py-1.5 text-ink">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(infoItem.tags || []).length > 0 && (
            <div>
              <p className={labelCls}>Compliance</p>
              <div className="flex flex-wrap gap-1">
                {infoItem.tags.map(t => (
                  <span key={t.label} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${TAG_STYLE[t.status]}`}>
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!infoItem.details && !infoItem.datasheet && !(infoItem.features || []).length && !(infoItem.tags || []).length && (
            <p className="text-[11px] text-dim italic text-center py-2">
              No product details stored — this item was added manually or before catalogue sync.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ---------- VIEW MODE ----------
  return (
    <div className="w-full bg-surface rounded-lg border border-line overflow-hidden">
      {editModal}
      {infoModal}

      {/* Header */}
      <div className="flex items-start justify-between px-3 py-2.5 bg-info/5 border-b border-info/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-info/10 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">
              Vendor Catalog{items.length ? ` (${items.length})` : ''}
            </p>
            {totalTags > 0 && (
              <p className="text-[10px] text-info font-medium">
                {verifiedCount}/{totalTags} compliance tags verified
              </p>
            )}
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="p-1.5 hover:bg-info/10 rounded-md flex-shrink-0" title="Edit catalog">
          <Edit2 className="w-3.5 h-3.5 text-dim" />
        </button>
      </div>

      {/* Items */}
      <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-dim">
            Your catalogue products load here automatically. No products found — add them in Portfolio → B2B Catalog.
          </p>
        ) : (
          items.map((it, i) => (
            <div key={it.id} className={i > 0 ? 'pt-3 border-t border-line' : ''}>
              <div className="flex items-center gap-2 mb-1.5">
                {it.productImage
                  ? <img src={it.productImage} alt="" className="w-8 h-8 rounded-lg object-cover border border-line flex-shrink-0" />
                  : <span className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center flex-shrink-0"><Package className="w-4 h-4" /></span>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{it.productName || `Item ${i + 1}`}</p>
                  {it.category && <p className="text-[9px] uppercase tracking-wide text-dim">{it.category}</p>}
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setInfoIndex(i); }}
                  className="p-1 rounded text-dim hover:text-info hover:bg-info/10 flex-shrink-0"
                  title="Product details">
                  <Info className="w-3.5 h-3.5" />
                </button>
                {it.datasheet && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); openDatasheet(it.datasheet); }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-info hover:bg-info/10 flex-shrink-0"
                    title={it.datasheet.name}>
                    <FileText className="w-3 h-3" /> Datasheet
                  </button>
                )}
              </div>

              {(it.features || []).length > 0 && (
                <p className="text-[10px] text-dim mb-1.5">{it.features.slice(0, 3).join(' · ')}{it.features.length > 3 ? ' …' : ''}</p>
              )}

              {(it.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {it.tags.map(t => (
                    <span key={t.label} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${TAG_STYLE[t.status]}`}>
                      {t.status === 'verified' && <CheckCircle className="w-2.5 h-2.5" />}
                      {t.label}
                      {isPM && t.status !== 'verified' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); verifyTag(i, t.label); }}
                          title="Mark verified"
                          className="ml-0.5 underline decoration-dotted hover:text-info"
                        >
                          verify
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorCatalogCard;
