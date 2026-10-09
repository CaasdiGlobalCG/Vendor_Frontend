import React, { useMemo, useState } from 'react';
import { Download, FileDigit, Percent, Send, Clock, ShieldCheck, Loader2, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import { notifyWorkspaceEvent } from '../../utils/workspaceApi';
import { UNIT_DIMS, computeItemQty, computeGrossQty, computeDeduction, measurementLabel } from '../CivilBOQModal';

const formatINR = (value) =>
  `₹${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatQty = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const STATUS_META = {
  pending_finance: { label: 'Awaiting finance commission', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  commission_added: { label: 'Commission added — pending PM', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  sent_to_client: { label: 'Shared with client', badge: 'bg-green-100 text-green-800 border-green-200' },
  negotiation_requested: { label: 'Client negotiating', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  sent_to_finance: { label: 'Forwarded to finance', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  vendor_review: { label: 'Awaiting vendor revision', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  vendor_revised: { label: 'Vendor revised — re-commission', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  vendor_rejected: { label: 'Vendor rejected negotiation', badge: 'bg-red-100 text-red-800 border-red-200' },
  client_approved: { label: 'Client approved', badge: 'bg-green-100 text-green-800 border-green-200' },
};

// What the client proposed this negotiation round — target total, per-item
// proposed rates next to current rates, and the note.
//
// IMPORTANT: the client negotiates on CLIENT-facing prices (commission baked
// in). The vendor must never see commission-inclusive numbers — `vendorView`
// divides proposed rates back down by that item's commission % so the vendor
// sees the proposal expressed on their own rate scale. PM/finance see the raw
// client-scale figures (both sides are internal to them).
const ProposalSummary = ({ current, items, commission, formatINR, vendorView = false }) => {
  const proposed = current?.proposedRates || {};
  const pctByItem = new Map((commission?.items || []).map((ci) => [ci.itemNo, ci.percent || 0]));
  const blendedPct = Number(commission?.percent) || 0;
  // client-scale → vendor-scale
  const toVendorRate = (itemNo, clientRate) => {
    const pct = pctByItem.get(itemNo) ?? blendedPct;
    return clientRate / (1 + pct / 100);
  };
  const rows = items.filter((i) => proposed[i.itemNo] !== undefined);
  const shownTotal = vendorView && current?.proposedTotal !== undefined
    ? current.proposedTotal / (1 + blendedPct / 100)
    : current?.proposedTotal;
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-2 text-[11px] space-y-1">
      {shownTotal !== undefined && (
        <p className="text-ink">
          {vendorView ? 'Target total (approx, on your rates)' : 'Target total'}:{' '}
          <span className="font-bold">{formatINR(shownTotal)}</span>
        </p>
      )}
      {rows.length > 0 && (
        <div className="space-y-0.5">
          {rows.map((i) => {
            const proposedRate = vendorView ? toVendorRate(i.itemNo, proposed[i.itemNo]) : proposed[i.itemNo];
            return (
              <p key={i.itemNo} className="flex justify-between gap-2 text-dim">
                <span className="truncate">{i.itemNo}. {i.name}</span>
                <span className="whitespace-nowrap">
                  {formatINR(i.rate)} → <span className="text-ink font-medium">{formatINR(proposedRate)}</span>
                </span>
              </p>
            );
          })}
        </div>
      )}
      {current?.note && <p className="text-dim italic">"{current.note}"</p>}
    </div>
  );
};

/**
 * CustomBOQDocument — role-aware Bill of Quantities rendered in a canvas node.
 *
 * Lifecycle (customBOQData.status):
 *   pending_finance  — vendor generated; finance adds commission
 *   commission_added — finance applied commission; PM reviews + sends
 *   sent_to_client   — client sees the BOQ with commission baked into rates
 *
 * Roles: 'vendor' | 'finance' | 'pm' | 'client'
 * - vendor  : sees own rates only — commission is never rendered
 * - finance : sees base rates + commission editor
 * - pm      : sees vendor rates, commission and client-facing rates; can send
 * - client  : sees client-facing rates only (commission merged in)
 */
const CustomBOQDocument = ({ boq, role = 'vendor', nodeId, setNodes, workspaceId }) => {
  // Finance: per-item commission % keyed by itemNo
  const [itemCommissions, setItemCommissions] = useState({});
  // Vendor: editable items buffer while the BOQ is still pending finance
  const [editItems, setEditItems] = useState(null);
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => (Array.isArray(boq?.items) ? boq.items : []), [boq?.items]);
  const status = boq?.status || 'pending_finance';
  const commission = boq?.commission || null;
  const negotiation = boq?.negotiation || null;
  const negRound = negotiation?.round || 0;

  // Negotiation UI state
  const [negotiating, setNegotiating] = useState(false);   // client form open
  const [proposedRates, setProposedRates] = useState({});  // {itemNo: rate}
  const [proposedTotal, setProposedTotal] = useState('');
  const [negNote, setNegNote] = useState('');
  const [rejecting, setRejecting] = useState(false);       // vendor reject form
  const [rejectReason, setRejectReason] = useState('');
  const [revising, setRevising] = useState(false);         // vendor edit mode

  // Sectioned variants (civil, interior, electrical): items carry a `section`
  // label and measurement-derived qty — every `isCivil` path covers all of them
  const isCivil = ['civil', 'interior', 'electrical', 'plumbing', 'hvac'].includes(boq?.variant);
  const sectionOrder = useMemo(() => {
    if (!isCivil) return [];
    const declared = (boq.sections || []).map((s) => s.name);
    const seen = new Set(declared);
    items.forEach((i) => {
      if (i.section && !seen.has(i.section)) {
        declared.push(i.section);
        seen.add(i.section);
      }
    });
    return declared;
  }, [isCivil, boq.sections, items]);

  // Group an item list by section — declared order first, then any sections
  // not in `sections` (e.g. vendor-added custom sections) in encounter order,
  // unsectioned items last
  const groupBySection = (list) => {
    const order = [...sectionOrder];
    const seen = new Set(order);
    list.forEach((i) => {
      if (i.section && !seen.has(i.section)) {
        order.push(i.section);
        seen.add(i.section);
      }
    });
    const groups = order.map((name) => ({ name, items: [] }));
    const byName = new Map(groups.map((g) => [g.name, g.items]));
    const ungrouped = [];
    list.forEach((item) => {
      const g = item.section ? byName.get(item.section) : null;
      (g || ungrouped).push(item);
    });
    const out = groups.filter((g) => g.items.length);
    if (ungrouped.length) out.push({ name: null, items: ungrouped });
    return out;
  };

  // Civil qty: computed from measurements for dimensional units
  const effectiveQty = (item) =>
    isCivil && UNIT_DIMS[item.unit]?.length ? computeItemQty(item) : Number(item.qty) || 0;

  const vendorTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items]
  );

  // Finance preview: item-wise commission totals (commissionTotal, clientTotal)
  const previewCommission = useMemo(() => {
    let commissionTotal = 0;
    let clientTotal = 0;
    items.forEach((item) => {
      const pct = parseFloat(itemCommissions[item.itemNo]) || 0;
      const clientRate = (Number(item.rate) || 0) * (1 + pct / 100);
      const clientAmount = clientRate * (Number(item.qty) || 0);
      commissionTotal += clientAmount - (Number(item.amount) || 0);
      clientTotal += clientAmount;
    });
    if (commissionTotal <= 0) return null;
    return { commissionTotal, clientTotal };
  }, [itemCommissions, items]);

  const [newSectionName, setNewSectionName] = useState('');

  // Vendor editing helpers (only while status === 'pending_finance')
  const editableItems = editItems ?? items;
  const editTotal = useMemo(
    () => editableItems.reduce((s, i) => s + effectiveQty(i) * (Number(i.rate) || 0), 0),
    [editableItems, isCivil]
  );
  const updateEditItem = (idx, field, value) => {
    setEditItems((prev) =>
      (prev ?? items).map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  };
  const addEditItem = (section = null) => {
    setEditItems((prev) => [
      ...(prev ?? items),
      {
        itemNo: (prev ?? items).length + 1,
        section: section,
        name: '',
        description: '',
        unit: isCivil ? 'Cum' : '',
        nos: '',
        length: '',
        breadth: '',
        depth: '',
        qty: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };
  const removeEditItem = (idx) => {
    setEditItems((prev) =>
      (prev ?? items)
        .filter((_, i) => i !== idx)
        .map((it, i) => ({ ...it, itemNo: i + 1 }))
    );
  };

  // What the client sees — commission merged into rate/amount per line item
  const clientItems = useMemo(() => {
    if (!commission?.items?.length) return null;
    const byItemNo = new Map(commission.items.map((ci) => [ci.itemNo, ci]));
    return items.map((item) => {
      const ci = byItemNo.get(item.itemNo);
      if (!ci) return item;
      return { ...item, rate: ci.clientRate, amount: ci.clientAmount };
    });
  }, [items, commission]);

  const clientTotal = commission?.clientTotal ?? vendorTotal;
  const commissionByItemNo = useMemo(
    () => new Map((commission?.items || []).map((ci) => [ci.itemNo, ci])),
    [commission]
  );

  const canFinanceEdit = role === 'finance' && ['pending_finance', 'vendor_revised'].includes(status);
  const canPmSend = role === 'pm' && status === 'commission_added';
  // Vendor may edit line items until finance locks them by adding commission —
  // or when revising during a negotiation round (status 'vendor_review')
  const canVendorEdit = role === 'vendor' && (status === 'pending_finance' || revising);

  // Negotiation chain: client → PM → finance → vendor → back up
  const clientCanAct = role === 'client' && ['sent_to_client', 'vendor_rejected'].includes(status);
  const clientWaiting = role === 'client' && ['negotiation_requested', 'sent_to_finance', 'vendor_review'].includes(status);
  const pmForward = role === 'pm' && status === 'negotiation_requested';
  const finForward = role === 'finance' && status === 'sent_to_finance';
  const vendorActs = role === 'vendor' && status === 'vendor_review';
  const lastRejection = (negotiation?.history || []).filter(h => h.action === 'reject').pop();
  const showCommissionPanel = (role === 'finance' || role === 'pm') && commission;
  // Once commission is applied, pm/finance/client all see the table in
  // client-facing pricing — vendor keeps the base-rate view.
  const clientPriced = ['client', 'pm', 'finance'].includes(role) && clientItems;
  const shownItems = clientPriced ? clientItems : (canVendorEdit ? editableItems : items);
  const shownTotal = clientPriced ? clientTotal : (canVendorEdit ? editTotal : vendorTotal);
  const isInternalPriced = ['pm', 'finance'].includes(role) && commission;

  // GST treatment declared at creation (customBOQData.gst: { mode, percent })
  // Inclusive → the % is known, so the GST component can be back-calculated:
  // component = total × pct / (100 + pct).
  // Exclusive → GST is added on top of the item total: total × pct / 100.
  const gst = boq?.gst;
  const gstPct = parseFloat(gst?.percent) || 0;
  const gstInclusive = gst?.mode === 'inclusive' && gstPct > 0;
  const gstExclusive = gst?.mode === 'exclusive' && gstPct > 0;
  const gstComponent = gstInclusive ? (shownTotal * gstPct) / (100 + gstPct) : null;
  const gstOnTotal = gstExclusive ? (shownTotal * gstPct) / 100 : 0;
  const displayTotal = gstExclusive ? shownTotal + gstOnTotal : shownTotal;
  const gstLabel = gstInclusive ? `Rates inclusive of GST @ ${gstPct}%` : null;

  const persistBoq = async (updatedBoq) => {
    if (!nodeId || !workspaceId) return;
    setSaving(true);
    try {
      await persistNodeDataPatch(
        nodeId,
        // sentForApprovalAt forces the durable HTTP write path for this
        // workflow-state change (customBOQData alone would go WS-only).
        { customBOQData: updatedBoq, sentForApprovalAt: new Date().toISOString() },
        setNodes,
        workspaceId,
        // BOQ workflow patches aren't part of the approval-modal flow — never skip
        { bypassApprovalFlow: true }
      );
    } catch (err) {
      console.error('❌ Failed to update BOQ status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCommission = async () => {
    // Item-wise: each row carries its own commission %
    const commissionItems = items.map((item) => {
      const pct = parseFloat(itemCommissions[item.itemNo]) || 0;
      const rate = Number(item.rate) || 0;
      const qty = Number(item.qty) || 0;
      const commissionAmount = (rate * pct) / 100;
      const clientRate = rate + commissionAmount;
      return {
        itemNo: item.itemNo,
        rate,
        percent: pct,
        commissionAmount,
        clientRate,
        clientAmount: clientRate * qty,
      };
    });
    const commissionSum = commissionItems.reduce(
      (s, ci) => s + (ci.clientAmount - (items.find((i) => i.itemNo === ci.itemNo)?.amount || 0)),
      0
    );
    if (commissionSum <= 0) return;

    await persistBoq({
      ...boq,
      status: 'commission_added',
      commission: {
        type: 'itemwise',
        // effective blended % — display convenience only
        percent: vendorTotal > 0 ? (commissionSum / vendorTotal) * 100 : 0,
        items: commissionItems,
        commissionTotal: commissionSum,
        clientTotal: vendorTotal + commissionSum,
        addedAt: new Date().toISOString(),
      },
    });

    notifyWorkspaceEvent({
      workspaceId,
      roles: ['pm'],
      type: 'boq_commission_added',
      title: 'BOQ commission added',
      message: `Commission applied to "${boq?.name || 'BOQ'}" — ready for PM review.`,
      data: { nodeId, boqName: boq?.name },
      priority: 'medium',
      actionRequired: true,
    });
  };

  // Vendor persists edited line items (pre-commission only)
  const handleSaveItems = async () => {
    // Persist any sections added during this edit session alongside items
    const sectionSeen = new Set((boq.sections || []).map((s) => s.name));
    const sections = [...(boq.sections || [])];
    editableItems.forEach((it) => {
      if (it.section && !sectionSeen.has(it.section)) {
        sectionSeen.add(it.section);
        sections.push({ id: `sec-${sections.length + 1}`, name: it.section });
      }
    });
    const normalized = editableItems.map((it, idx) => {
      const qty = effectiveQty(it);
      const rate = Number(it.rate) || 0;
      return {
        itemNo: idx + 1,
        section: it.section || undefined,
        name: it.name || '',
        description: it.description || '',
        unit: it.unit || '',
        nos: parseFloat(it.nos) || null,
        length: parseFloat(it.length) || null,
        breadth: parseFloat(it.breadth) || null,
        depth: parseFloat(it.depth) || null,
        // IS 1200 deduction fields — carried through so net qty stays correct
        deduction: it.deduction || undefined,
        grossQty: isCivil ? computeGrossQty(it) : undefined,
        deductionQty: isCivil ? computeDeduction(it) : undefined,
        measurement: isCivil ? measurementLabel(it) : undefined,
        qty,
        rate,
        amount: qty * rate,
      };
    });
    const total = normalized.reduce((s, i) => s + i.amount, 0);
    await persistBoq({
      ...boq,
      items: normalized,
      ...(isCivil ? { sections } : {}),
      total,
      ...(revising
        ? {
            status: 'vendor_revised',
            negotiation: pushHistory({
              round: negRound,
              action: 'revise',
              by: 'vendor',
              revisedTotal: total,
              at: new Date().toISOString(),
            }),
          }
        : {}),
      updatedAt: new Date().toISOString(),
    });
    setEditItems(null);
    if (revising) {
      setRevising(false);
      notifyWorkspaceEvent({
        workspaceId,
        roles: ['finance'],
        type: 'boq_vendor_revised',
        title: 'Vendor revised BOQ',
        message: `Vendor submitted a revised "${boq?.name || 'BOQ'}" — re-apply commission.`,
        data: { nodeId, boqName: boq?.name, round: negRound },
        priority: 'high',
        actionRequired: true,
      });
    }
  };

  const handleSendToClient = async () => {
    await persistBoq({
      ...boq,
      status: 'sent_to_client',
      sentToClientAt: new Date().toISOString(),
    });

    notifyWorkspaceEvent({
      workspaceId,
      roles: ['client'],
      type: 'boq_shared',
      title: 'BOQ shared',
      message: `A Bill of Quantities "${boq?.name || 'BOQ'}" has been shared with you.`,
      data: { nodeId, boqName: boq?.name },
      priority: 'medium',
    });
  };

  // ---------- Negotiation loop (client → pm → finance → vendor → back) ----------

  const pushHistory = (entry) => ({
    round: negRound + (entry.action === 'negotiate' ? 1 : 0),
    current: entry.action === 'negotiate'
      ? { proposedTotal: entry.proposedTotal, proposedRates: entry.proposedRates, note: entry.note, at: entry.at }
      : negotiation?.current || null,
    history: [...(negotiation?.history || []), entry],
  });

  // Client: approve the released BOQ outright
  const handleClientApprove = async () => {
    await persistBoq({
      ...boq,
      status: 'client_approved',
      negotiation: negotiation
        ? { ...negotiation, status: 'resolved', current: null }
        : { status: 'resolved', history: [] },
      clientApprovedAt: new Date().toISOString(),
    });
    notifyWorkspaceEvent({
      workspaceId,
      roles: ['pm', 'finance', 'vendor'],
      type: 'boq_client_approved',
      title: 'BOQ approved by client',
      message: `Client approved "${boq?.name || 'BOQ'}" — no further changes needed.`,
      data: { nodeId, boqName: boq?.name },
      priority: 'high',
    });
  };

  // Client: propose a target total + per-item rates → PM
  const handleClientNegotiate = async () => {
    const rates = Object.fromEntries(
      Object.entries(proposedRates)
        .map(([k, v]) => [k, parseFloat(v)])
        .filter(([, v]) => !Number.isNaN(v) && v >= 0)
    );
    const total = parseFloat(proposedTotal);
    if (!rates[0] && Number.isNaN(total) && !negNote.trim()) return;
    const entry = {
      round: negRound + 1,
      action: 'negotiate',
      by: 'client',
      proposedTotal: Number.isNaN(total) ? undefined : total,
      proposedRates: rates,
      note: negNote.trim(),
      at: new Date().toISOString(),
    };
    await persistBoq({
      ...boq,
      status: 'negotiation_requested',
      negotiation: pushHistory(entry),
    });
    setNegotiating(false);
    notifyWorkspaceEvent({
      workspaceId,
      roles: ['pm'],
      type: 'boq_negotiation',
      title: 'BOQ negotiation requested',
      message: `Client wants to negotiate "${boq?.name || 'BOQ'}"${entry.proposedTotal ? ` — target ${formatINR(entry.proposedTotal)}` : ''}.`,
      data: { nodeId, boqName: boq?.name, round: entry.round },
      priority: 'high',
      actionRequired: true,
    });
  };

  // PM → finance
  const handlePmForward = async () => {
    const entry = { round: negRound, action: 'forward_pm', by: 'pm', at: new Date().toISOString() };
    await persistBoq({ ...boq, status: 'sent_to_finance', negotiation: pushHistory(entry) });
    notifyWorkspaceEvent({
      workspaceId,
      roles: ['finance'],
      type: 'boq_negotiation',
      title: 'BOQ negotiation — needs vendor revision',
      message: `PM forwarded a client negotiation for "${boq?.name || 'BOQ'}".`,
      data: { nodeId, boqName: boq?.name, round: negRound },
      priority: 'high',
      actionRequired: true,
    });
  };

  // Finance → vendor
  const handleFinanceRequest = async () => {
    const entry = { round: negRound, action: 'forward_finance', by: 'finance', at: new Date().toISOString() };
    await persistBoq({ ...boq, status: 'vendor_review', negotiation: pushHistory(entry) });
    notifyWorkspaceEvent({
      workspaceId,
      roles: ['vendor'],
      type: 'boq_negotiation',
      title: 'Client negotiated — revision requested',
      message: `Finance requested a revision of "${boq?.name || 'BOQ'}" after client negotiation.`,
      data: { nodeId, boqName: boq?.name, round: negRound },
      priority: 'high',
      actionRequired: true,
    });
  };

  // Vendor: reject the negotiation — loop resets to sent_to_client
  const handleVendorReject = async () => {
    const entry = {
      round: negRound,
      action: 'reject',
      by: 'vendor',
      note: rejectReason.trim(),
      at: new Date().toISOString(),
    };
    await persistBoq({
      ...boq,
      status: 'vendor_rejected',
      negotiation: pushHistory(entry),
    });
    setRejecting(false);
    setRejectReason('');
    notifyWorkspaceEvent({
      workspaceId,
      roles: ['pm', 'finance'],
      type: 'boq_negotiation_rejected',
      title: 'Vendor declined negotiation',
      message: `Vendor rejected the negotiation for "${boq?.name || 'BOQ'}"${entry.note ? `: ${entry.note}` : '.'}`,
      data: { nodeId, boqName: boq?.name, round: negRound },
      priority: 'high',
    });
  };

  if (!boq) {
    return <div className="text-xs text-dim p-3">No BOQ data</div>;
  }

  const handleExportExcel = (e) => {
    e?.stopPropagation?.();
    try {
      const COLS = isCivil ? 8 : 7;
      const LAST_COL = COLS - 1;
      const thinBorder = { style: 'thin', color: { rgb: 'CBD5E1' } };
      const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const numFmt = '#,##0.00';
      const exportItems = clientPriced ? shownItems : items;
      const exportTotal = clientPriced ? shownTotal : vendorTotal;

      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E293B' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const subtitleStyle = {
        font: { bold: true, sz: 12, color: { rgb: '1E293B' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const metaStyle = {
        font: { sz: 10, color: { rgb: '475569' }, italic: true },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '334155' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: allBorders,
      };
      const totalStyle = {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '16A34A' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: allBorders,
      };
      const notesHeadStyle = {
        font: { bold: true, sz: 11, color: { rgb: '1E293B' } },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        border: allBorders,
      };
      const noteLineStyle = {
        font: { sz: 10, color: { rgb: '334155' } },
        alignment: { vertical: 'top', wrapText: true },
      };
      const disclaimerStyle = {
        font: { sz: 9, italic: true, color: { rgb: '94A3B8' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      };

      const cell = (v, s, extra = {}) => {
        const c = { v, t: typeof v === 'number' ? 'n' : 's', s };
        if (typeof v === 'number') c.z = numFmt;
        return { ...c, ...extra };
      };

      const rows = [];
      const merges = [];
      const mergeRow = (r) => merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } });
      const noteLines = (boq.notes || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      mergeRow(0);
      rows.push([cell('BILL OF QUANTITIES', titleStyle)]);
      mergeRow(1);
      rows.push([cell(boq.name || 'Custom BOQ', subtitleStyle)]);
      if (boq.purpose) {
        mergeRow(rows.length);
        rows.push([cell(`BOQ for: ${boq.purpose}`, metaStyle)]);
      }
      if (boq.description) {
        mergeRow(rows.length);
        rows.push([cell(boq.description, { ...metaStyle, alignment: { horizontal: 'center', vertical: 'top', wrapText: true } })]);
      }
      mergeRow(rows.length);
      rows.push([cell(`Generated: ${new Date(boq.createdAt || Date.now()).toLocaleDateString('en-IN')}`, metaStyle)]);
      rows.push([]); // spacer

      rows.push(
        (isCivil
          ? ['Item No', 'Item Name', 'Description', 'Unit', 'Measurement', 'Qty', 'Rate/Item (INR)', 'Amount (INR)']
          : ['Item No', 'Item Name', 'Description', 'Unit', 'Qty', 'Rate/Item (INR)', 'Amount (INR)']
        ).map((h) => cell(h, headerStyle))
      );

      const itemRow = (item, idx) => {
        const fill = idx % 2 === 1 ? { fgColor: { rgb: 'F8FAFC' } } : undefined;
        const txt = { font: { sz: 10, color: { rgb: '1E293B' } }, border: allBorders, fill };
        const cells = [
          cell(item.itemNo, { ...txt, alignment: { horizontal: 'center', vertical: 'top' } }),
          cell(item.name, { ...txt, font: { sz: 10, bold: true, color: { rgb: '1E293B' } }, alignment: { vertical: 'top', wrapText: true } }),
          cell(item.description, { ...txt, alignment: { vertical: 'top', wrapText: true } }),
          cell(item.unit, { ...txt, alignment: { horizontal: 'center', vertical: 'top' } }),
        ];
        if (isCivil) {
          cells.push(
            cell(item.measurement || '', { ...txt, alignment: { horizontal: 'center', vertical: 'top' } })
          );
        }
        cells.push(
          cell(Number(item.qty) || 0, { ...txt, alignment: { horizontal: 'right', vertical: 'top' } }),
          cell(Number(item.rate) || 0, { ...txt, alignment: { horizontal: 'right', vertical: 'top' } }),
          cell(Number(item.amount) || 0, { ...txt, font: { sz: 10, bold: true, color: { rgb: '1E293B' } }, alignment: { horizontal: 'right', vertical: 'top' } })
        );
        return cells;
      };

      if (isCivil) {
        const sectionHead = {
          font: { bold: true, sz: 10, color: { rgb: '1E293B' } },
          fill: { fgColor: { rgb: 'E2E8F0' } },
          border: allBorders,
        };
        const subtotalStyle = {
          font: { bold: true, sz: 10, color: { rgb: '334155' } },
          fill: { fgColor: { rgb: 'F8FAFC' } },
          alignment: { horizontal: 'right', vertical: 'center' },
          border: allBorders,
        };
        groupBySection(exportItems).forEach((group) => {
          mergeRow(rows.length);
          rows.push([cell((group.name || 'Items').toUpperCase(), sectionHead)]);
          group.items.forEach((item, idx) => rows.push(itemRow(item, idx)));
          const subtotal = group.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
          rows.push([
            ...Array.from({ length: COLS - 1 }, () => cell('', subtotalStyle)),
            cell(subtotal, { ...subtotalStyle, font: { bold: true, sz: 11, color: { rgb: '1E293B' } } }),
          ]);
        });
      } else {
        exportItems.forEach((item, idx) => rows.push(itemRow(item, idx)));
      }

      // Exclusive rates → GST is added on top of the item total to form the
      // grand total; inclusive rates keep the total and show the component.
      const exportGstExclusive = gst?.mode === 'exclusive' && gstPct > 0;
      const exportGstAmount = exportGstExclusive ? (exportTotal * gstPct) / 100 : 0;
      const exportGrandTotal = exportGstExclusive ? exportTotal + exportGstAmount : exportTotal;

      if (exportGstExclusive) {
        mergeRow(rows.length);
        rows.push([cell(`Subtotal (exclusive of GST): ${formatINR(exportTotal)}`, noteLineStyle)]);
        mergeRow(rows.length);
        rows.push([cell(`GST @ ${gstPct}%: ${formatINR(exportGstAmount)}`, noteLineStyle)]);
      }

      rows.push([
        cell('', totalStyle),
        cell(exportGstExclusive ? 'TOTAL (incl. GST)' : 'TOTAL', { ...totalStyle, alignment: { horizontal: 'right', vertical: 'center' } }),
        cell('', totalStyle), cell('', totalStyle), cell('', totalStyle), cell('', totalStyle),
        cell(exportGrandTotal, { ...totalStyle, font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } } }),
      ]);

      // GST treatment line under the total (inclusive only — exclusive is
      // already expressed by the subtotal/GST rows above)
      if (gst?.mode === 'inclusive' && gstPct > 0) {
        const component = (exportTotal * gstPct) / (100 + gstPct);
        mergeRow(rows.length);
        rows.push([
          cell(
            `Rates inclusive of GST @ ${gstPct}%` +
              (role === 'client' ? '' : ` — GST component: ${formatINR(component)}`),
            noteLineStyle
          ),
        ]);
      }

      if (noteLines.length) {
        rows.push([]); // spacer
        mergeRow(rows.length);
        rows.push([cell('Notes', notesHeadStyle)]);
        noteLines.forEach((line) => {
          mergeRow(rows.length);
          rows.push([cell(`• ${line}`, noteLineStyle)]);
        });
      }

      rows.push([]);
      mergeRow(rows.length);
      rows.push([cell('Disclaimer: Rates are indicative for estimation only. Verify locally before finalizing.', disclaimerStyle)]);

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet['!merges'] = merges;
      worksheet['!cols'] = isCivil
        ? [{ wch: 8 }, { wch: 24 }, { wch: 44 }, { wch: 9 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 16 }]
        : [{ wch: 8 }, { wch: 26 }, { wch: 55 }, { wch: 9 }, { wch: 9 }, { wch: 14 }, { wch: 16 }];
      worksheet['!rows'] = rows.map((_, idx) => (idx === 0 ? { hpt: 28 } : idx === 1 ? { hpt: 20 } : undefined));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'BOQ');
      XLSX.writeFile(workbook, `${(boq.name || 'custom_boq').replace(/[^a-z0-9]+/gi, '_')}.xlsx`);
    } catch (err) {
      console.error('❌ BOQ Excel export failed:', err);
    }
  };

  const statusMeta = STATUS_META[status];
  const noteLines = (boq.notes || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div
      className="w-full bg-surface rounded-lg border border-line overflow-hidden flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Document Header */}
      <div className="bg-black text-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileDigit size={14} className="text-indigo-300 flex-shrink-0" />
            <span className="text-[10px] font-semibold tracking-widest text-indigo-200 uppercase">
              Bill of Quantities
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Workflow status badge is internal (finance/pm only) — never shown to vendor or client */}
            {statusMeta && role !== 'client' && role !== 'vendor' && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusMeta.badge}`}>
                {statusMeta.label}
              </span>
            )}
            {boq.purpose && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white font-medium whitespace-nowrap">
                {boq.purpose}
              </span>
            )}
          </div>
        </div>
        <h3 className="font-bold text-sm truncate mt-1">{boq.name || 'Custom BOQ'}</h3>
        {boq.description && (
          <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{boq.description}</p>
        )}
      </div>

      {/* Items Table — full content always visible; node grows vertically.
          Civil variant adds a Measurement column and section groupings. */}
      <div className="w-full">
        <table className="w-full border-collapse min-w-[560px]">
          <thead className="z-10">
            <tr className="bg-canvas">
              <th className="border border-line px-2 py-1.5 text-center font-semibold text-[11px] text-ink w-10">#</th>
              <th className="border border-line px-2 py-1.5 text-left font-semibold text-[11px] text-ink">Item Name</th>
              <th className="border border-line px-2 py-1.5 text-left font-semibold text-[11px] text-ink">Description</th>
              <th className="border border-line px-2 py-1.5 text-center font-semibold text-[11px] text-ink w-16">Unit</th>
              {isCivil && (
                <th className="border border-line px-2 py-1.5 text-center font-semibold text-[11px] text-ink w-28">
                  Measurement
                </th>
              )}
              <th className="border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-16">Qty</th>
              <th className="border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-24">Rate/Item (₹)</th>
              <th className="border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-28">Amount (₹)</th>
              {canVendorEdit && <th className="border border-line w-8" />}
            </tr>
          </thead>
          <tbody className="text-xs">
            {(() => {
              const cellInput =
                'w-full bg-transparent px-1 py-0.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-info rounded';
              const list = canVendorEdit ? editableItems : shownItems;
              const colCount = (isCivil ? 8 : 7) + (canVendorEdit ? 1 : 0);

              const renderReadRow = (item, idx) => (
                <tr key={item.itemNo ?? idx} className={`${idx % 2 === 1 ? 'bg-canvas' : 'bg-surface'} hover:bg-info/5`}>
                  <td className="border border-line px-2 py-1.5 text-center font-medium text-dim">{item.itemNo}</td>
                  <td className="border border-line px-2 py-1.5 font-medium text-ink">{item.name}</td>
                  <td className="border border-line px-2 py-1.5 text-ink">{item.description}</td>
                  <td className="border border-line px-2 py-1.5 text-center text-ink">{item.unit}</td>
                  {isCivil && (
                    <td className="border border-line px-2 py-1.5 text-center text-dim text-[10px] whitespace-nowrap">
                      {item.measurement || '—'}
                    </td>
                  )}
                  <td className="border border-line px-2 py-1.5 text-right text-ink">{formatQty(item.qty)}</td>
                  <td className="border border-line px-2 py-1.5 text-right text-ink">
                    {(Number(item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    {/* pm/finance: shown rate is commission-inclusive — keep the
                        vendor base visible as a small reference line */}
                    {isInternalPriced && commissionByItemNo.get(item.itemNo) && (
                      <div className="text-[9px] text-dim font-normal">
                        base {(Number(commissionByItemNo.get(item.itemNo).rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </td>
                  <td className="border border-line px-2 py-1.5 text-right font-semibold text-ink">
                    {(Number(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    {isInternalPriced && commissionByItemNo.get(item.itemNo) && (
                      <div className="text-[9px] text-dim font-normal">
                        base {(Number(commissionByItemNo.get(item.itemNo).rate || 0) * (Number(item.qty) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </td>
                </tr>
              );

              const renderEditRow = (item) => {
                const idx = editableItems.indexOf(item);
                const qty = effectiveQty(item);
                const rate = Number(item.rate) || 0;
                const dims = isCivil ? UNIT_DIMS[item.unit] || [] : null;
                return (
                  <tr key={item.itemNo ?? idx} className={`${idx % 2 === 1 ? 'bg-canvas' : 'bg-surface'}`}>
                    <td className="border border-line px-2 py-1 text-center font-medium text-dim align-top">
                      {idx + 1}
                    </td>
                    <td className="border border-line px-1 py-1">
                      <input
                        value={item.name || ''}
                        onChange={(e) => updateEditItem(idx, 'name', e.target.value)}
                        placeholder="Item name"
                        className={`${cellInput} font-medium text-ink`}
                      />
                    </td>
                    <td className="border border-line px-1 py-1">
                      <input
                        value={item.description || ''}
                        onChange={(e) => updateEditItem(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className={`${cellInput} text-ink`}
                      />
                    </td>
                    <td className="border border-line px-1 py-1 w-16">
                      {isCivil ? (
                        <select
                          value={item.unit || 'Cum'}
                          onChange={(e) => updateEditItem(idx, 'unit', e.target.value)}
                          className={`${cellInput} text-center text-ink`}
                        >
                          {Object.keys(UNIT_DIMS).map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={item.unit || ''}
                          onChange={(e) => updateEditItem(idx, 'unit', e.target.value)}
                          placeholder="Unit"
                          className={`${cellInput} text-center text-ink`}
                        />
                      )}
                    </td>
                    {isCivil && (
                      <td className="border border-line px-1 py-1 w-28">
                        {dims && dims.length ? (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="number"
                              min="0"
                              value={item.nos ?? ''}
                              onChange={(e) => updateEditItem(idx, 'nos', e.target.value)}
                              placeholder="Nos"
                              title="Nos"
                              className={`${cellInput} text-center text-ink min-w-[28px]`}
                            />
                            {dims.map((d) => (
                              <input
                                key={d}
                                type="number"
                                min="0"
                                value={item[d] ?? ''}
                                onChange={(e) => updateEditItem(idx, d, e.target.value)}
                                placeholder={d === 'length' ? 'L' : d === 'breadth' ? 'B' : 'D'}
                                title={d}
                                className={`${cellInput} text-center text-ink min-w-[28px]`}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="block text-center text-[10px] text-dim">direct qty</span>
                        )}
                      </td>
                    )}
                    <td className="border border-line px-1 py-1 w-16">
                      {isCivil && dims && dims.length ? (
                        <span className="block text-right text-xs text-ink px-1 py-0.5">
                          {qty ? qty.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : '—'}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={item.qty ?? ''}
                          onChange={(e) => updateEditItem(idx, 'qty', e.target.value)}
                          className={`${cellInput} text-right text-ink`}
                        />
                      )}
                    </td>
                    <td className="border border-line px-1 py-1 w-24">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate ?? ''}
                        onChange={(e) => updateEditItem(idx, 'rate', e.target.value)}
                        className={`${cellInput} text-right text-ink`}
                      />
                    </td>
                    <td className="border border-line px-2 py-1 text-right font-semibold text-ink whitespace-nowrap">
                      {(qty * rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="border border-line px-1 py-1 w-8 text-center">
                      <button
                        type="button"
                        onClick={() => removeEditItem(idx)}
                        className="text-danger/70 hover:text-danger"
                        title="Remove item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              };

              if (!isCivil) {
                return list.map((item, idx) => (canVendorEdit ? renderEditRow(item) : renderReadRow(item, idx)));
              }

              // Civil: section headers + rows + per-section subtotals
              return groupBySection(list).map((group) => {
                const subtotal = group.items.reduce(
                  (s, i) => s + (canVendorEdit ? effectiveQty(i) * (Number(i.rate) || 0) : Number(i.amount) || 0),
                  0
                );
                return (
                  <React.Fragment key={group.name || 'ungrouped'}>
                    {group.name && (
                      <tr className="bg-slate-100/80 border-t border-line">
                        <td
                          colSpan={colCount - 1}
                          className="border border-line px-2 py-1.5 text-[11px] font-bold text-ink uppercase tracking-wide"
                        >
                          {group.name}
                        </td>
                        <td colSpan={canVendorEdit ? 1 : 1} className="border border-line px-2 py-1.5 text-right">
                          {canVendorEdit && (
                            <button
                              type="button"
                              onClick={() => addEditItem(group.name)}
                              className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-info hover:text-info/80 whitespace-nowrap"
                            >
                              <Plus size={10} /> Add
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                    {group.items.map((item, idx) => (canVendorEdit ? renderEditRow(item) : renderReadRow(item, idx)))}
                    {group.name && (
                      <tr className="bg-canvas border-t border-line">
                        <td
                          colSpan={colCount - 1}
                          className="border border-line px-2 py-1.5 text-right text-[10px] font-semibold text-dim uppercase tracking-wide"
                        >
                          Subtotal — {group.name}
                        </td>
                        <td className="border border-line px-2 py-1.5 text-right text-xs font-bold text-ink whitespace-nowrap">
                          {formatINR(subtotal)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              });
            })()}
            {shownItems.length === 0 && (
              <tr>
                <td colSpan={(isCivil ? 8 : 7) + (canVendorEdit ? 1 : 0)} className="border border-line px-2 py-4 text-center text-dim">
                  No items
                </td>
              </tr>
            )}
            {gstExclusive && (
              <>
                <tr className="bg-canvas">
                  <td colSpan={(isCivil ? 8 : 7) + (canVendorEdit ? 1 : 0) - 1} className="border border-line px-2 py-1.5 text-right text-xs text-dim">
                    Subtotal (exclusive of GST)
                  </td>
                  <td className="border border-line px-2 py-1.5 text-right text-xs font-medium text-ink whitespace-nowrap">
                    {formatINR(shownTotal)}
                  </td>
                </tr>
                <tr className="bg-canvas">
                  <td colSpan={(isCivil ? 8 : 7) + (canVendorEdit ? 1 : 0) - 1} className="border border-line px-2 py-1.5 text-right text-xs text-dim">
                    GST @ {gstPct}%
                  </td>
                  <td className="border border-line px-2 py-1.5 text-right text-xs font-medium text-ink whitespace-nowrap">
                    {formatINR(gstOnTotal)}
                  </td>
                </tr>
              </>
            )}
            <tr className="bg-success text-white">
              <td colSpan={(isCivil ? 8 : 7) + (canVendorEdit ? 1 : 0) - 1} className="border border-line px-2 py-2 text-right font-bold text-xs tracking-wide">
                TOTAL{gstExclusive ? ' (incl. GST)' : ''}
              </td>
              <td className="border border-line px-2 py-2 text-right font-bold text-sm whitespace-nowrap">
                {formatINR(displayTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* GST treatment line — declared when the BOQ was created */}
      {gstLabel && (
        <div className="px-3 py-1.5 border-t border-line bg-canvas text-[11px] text-dim">
          {gstLabel}
          {gstInclusive && gstComponent != null && role !== 'client' && (
            <span> — GST component of total: {formatINR(gstComponent)}</span>
          )}
        </div>
      )}

      {/* Vendor edit toolbar — add rows / sections / save (pre-commission only) */}
      {canVendorEdit && (
        <div className="border-t border-line px-3 py-2 bg-canvas flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => addEditItem(isCivil ? (sectionOrder[sectionOrder.length - 1] || 'Miscellaneous') : null)}
              className="flex items-center gap-1 text-[11px] font-semibold text-info hover:text-info/80"
            >
              <Plus size={12} /> {isCivil ? 'Add item (Miscellaneous)' : 'Add item'}
            </button>
            {isCivil && (
              <div className="flex items-center gap-1">
                <input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="New section name"
                  className="w-32 rounded border border-line bg-surface px-1.5 py-1 text-[11px] outline-none focus:border-info"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = newSectionName.trim();
                    if (!name) return;
                    addEditItem(name);
                    setNewSectionName('');
                  }}
                  disabled={!newSectionName.trim()}
                  className="text-[11px] font-semibold text-info hover:text-info/80 disabled:opacity-40"
                >
                  + Add section
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveItems}
            disabled={saving || editItems === null}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
            Save items
          </button>
        </div>
      )}

      {/* Commission panel — finance + pm only, never rendered for vendor/client */}
      {showCommissionPanel && (
        <div className="border-t border-line px-3 py-2 bg-blue-50/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-900 mb-1">
            <ShieldCheck size={12} />
            Commission (internal — not visible to vendor or client)
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-dim">
              {commission.type === 'itemwise'
                ? 'Item-wise commission'
                : commission.type === 'percent'
                  ? `${commission.percent}% commission`
                  : 'Flat commission'}
            </span>
            <span className="font-medium text-ink">
              +{formatINR(commission.commissionTotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs mt-0.5">
            <span className="text-dim">Client total</span>
            <span className="font-bold text-ink">{formatINR(commission.clientTotal)}</span>
          </div>
        </div>
      )}

      {/* Finance action — item-wise commission */}
      {canFinanceEdit && (
        <div className="border-t border-line px-3 py-2.5 bg-amber-50/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 mb-1.5">
            <Percent size={12} />
            Add Item-wise Commission
          </div>
          <div className="rounded border border-amber-200 bg-white overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-amber-100/60 text-amber-900">
                  <th className="px-2 py-1 text-left font-semibold">Item</th>
                  <th className="px-2 py-1 text-right font-semibold">Rate/Item (₹)</th>
                  <th className="px-2 py-1 text-center font-semibold w-24">Comm %</th>
                  <th className="px-2 py-1 text-right font-semibold">Client Rate (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(isCivil ? groupBySection(items) : [{ name: null, items }]).map((group) => (
                  <React.Fragment key={group.name || 'all'}>
                    {group.name && (
                      <tr className="border-t border-amber-100 bg-amber-100/40">
                        <td colSpan={4} className="px-2 py-1 text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                          {group.name}
                        </td>
                      </tr>
                    )}
                    {group.items.map((item, idx) => {
                      const pct = parseFloat(itemCommissions[item.itemNo]) || 0;
                      const clientRate = (Number(item.rate) || 0) * (1 + pct / 100);
                      return (
                        <tr key={item.itemNo ?? idx} className="border-t border-amber-100">
                          <td className="px-2 py-1 text-ink font-medium truncate max-w-[120px]">
                            {item.itemNo}. {item.name}
                          </td>
                          <td className="px-2 py-1 text-right text-ink whitespace-nowrap">
                            {(Number(item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-1">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={itemCommissions[item.itemNo] ?? ''}
                                onChange={(e) =>
                                  setItemCommissions((prev) => ({
                                    ...prev,
                                    [item.itemNo]: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="w-full rounded border border-line bg-surface pl-1.5 pr-5 py-1 text-[11px] text-right outline-none focus:border-info"
                              />
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-dim">%</span>
                            </div>
                          </td>
                          <td className="px-2 py-1 text-right font-medium text-ink whitespace-nowrap">
                            {pct > 0 ? clientRate.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="text-[11px] text-dim">
              {previewCommission ? (
                <>
                  +{formatINR(previewCommission.commissionTotal)} commission
                  <span className="mx-1">·</span>
                  <span className="font-semibold text-ink">
                    Client total: {formatINR(previewCommission.clientTotal)}
                  </span>
                </>
              ) : (
                'Enter a % on any item to preview'
              )}
            </div>
            <button
              type="button"
              onClick={handleApplyCommission}
              disabled={saving || !previewCommission}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
              Apply
            </button>
          </div>
        </div>
      )}

      {/* PM action — send to client once commission is in */}
      {role === 'pm' && (
        <div className="border-t border-line px-3 py-2.5 bg-canvas">
          {status === 'pending_finance' && (
            <div className="flex items-center gap-1.5 text-[11px] text-dim">
              <Clock size={12} />
              Waiting for finance to add commission
            </div>
          )}
          {canPmSend && (
            <button
              type="button"
              onClick={handleSendToClient}
              disabled={saving}
              className="w-full px-3 py-1.5 rounded text-xs font-semibold bg-success hover:bg-success/90 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              Send BOQ to Client
            </button>
          )}
          {status === 'sent_to_client' && (
            <div className="flex items-center gap-1.5 text-[11px] text-success font-medium">
              <Send size={12} />
              Sent to client{boq.sentToClientAt ? ` on ${new Date(boq.sentToClientAt).toLocaleDateString('en-IN')}` : ''}
            </div>
          )}
          {pmForward && negotiation?.current && (
            <div className="mt-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-800 mb-1.5">
                <Clock size={12} />
                Client negotiation — round {negRound}
              </div>
              {/* PM sees client-scale figures — the proposal is on client-facing rates */}
              <ProposalSummary current={negotiation.current} items={clientItems || items} commission={commission} formatINR={formatINR} />
              <button
                type="button"
                onClick={handlePmForward}
                disabled={saving}
                className="mt-2 w-full px-3 py-1.5 rounded text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                Forward to Finance
              </button>
            </div>
          )}
          {['sent_to_finance', 'vendor_review', 'vendor_revised'].includes(status) && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-dim">
              <Clock size={12} />
              Negotiation in progress — with {
                status === 'sent_to_finance' ? 'finance' :
                status === 'vendor_review' ? 'vendor' : 'finance (re-commission)'
              }
            </div>
          )}
        </div>
      )}

      {/* Finance — forward the client negotiation to the vendor */}
      {finForward && negotiation?.current && (
        <div className="border-t border-line px-3 py-2.5 bg-purple-50/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-900 mb-1.5">
            <Percent size={12} />
            Client negotiation — round {negRound}
          </div>
          {/* Finance sees client-scale figures — both sides are internal */}
          <ProposalSummary current={negotiation.current} items={clientItems || items} commission={commission} formatINR={formatINR} />
          <button
            type="button"
            onClick={handleFinanceRequest}
            disabled={saving}
            className="mt-2 w-full px-3 py-1.5 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Request Vendor Revision
          </button>
        </div>
      )}

      {/* Vendor — client proposal visible; revise or reject */}
      {vendorActs && !revising && (
        <div className="border-t border-line px-3 py-2.5 bg-orange-50/60">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-900 mb-1.5">
            <Clock size={12} />
            Client requested a revision — round {negRound}
          </div>
          {negotiation?.current && (
            /* Client proposed on commission-inclusive pricing — convert back
               to vendor-rate scale so the markup is never exposed */
            <ProposalSummary current={negotiation.current} items={items} commission={commission} formatINR={formatINR} vendorView />
          )}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => { setEditItems(items); setRevising(true); }}
              className="flex-1 px-3 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white transition-colors"
            >
              Revise BOQ
            </button>
            <button
              type="button"
              onClick={() => setRejecting((r) => !r)}
              className="flex-1 px-3 py-1.5 rounded text-xs font-semibold border border-danger/30 text-danger hover:bg-danger/5 transition-colors"
            >
              Reject
            </button>
          </div>
          {rejecting && (
            <div className="mt-2 space-y-1.5">
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (optional) — shown to PM & client"
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-[11px] outline-none focus:border-info"
              />
              <button
                type="button"
                onClick={handleVendorReject}
                disabled={saving}
                className="w-full px-3 py-1.5 rounded text-xs font-semibold bg-danger hover:bg-danger/90 text-white transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : null}
                Confirm rejection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Client — approve or negotiate the released BOQ */}
      {role === 'client' && (
        <div className="border-t border-line px-3 py-2.5 bg-canvas">
          {status === 'client_approved' && (
            <div className="flex items-center gap-1.5 text-[11px] text-success font-medium">
              <ShieldCheck size={12} />
              You approved this BOQ{boq.clientApprovedAt ? ` on ${new Date(boq.clientApprovedAt).toLocaleDateString('en-IN')}` : ''}
            </div>
          )}
          {status === 'vendor_rejected' && lastRejection && (
            <div className="mb-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-[11px] text-ink">
              Vendor declined the revision request{lastRejection.note ? `: "${lastRejection.note}"` : ''}.
              Approve the current BOQ or negotiate again.
            </div>
          )}
          {clientWaiting && (
            <div className="flex items-center gap-1.5 text-[11px] text-dim">
              <Clock size={12} />
              Your negotiation is under review — {
                status === 'negotiation_requested' ? 'with the PM' :
                status === 'sent_to_finance' ? 'with finance' : 'with the vendor'
              }.
            </div>
          )}
          {clientCanAct && !negotiating && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClientApprove}
                disabled={saving}
                className="flex-1 px-3 py-1.5 rounded text-xs font-semibold bg-success hover:bg-success/90 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                Approve BOQ
              </button>
              <button
                type="button"
                onClick={() => setNegotiating(true)}
                className="flex-1 px-3 py-1.5 rounded text-xs font-semibold border border-info/30 text-info hover:bg-info/5 transition-colors"
              >
                Negotiate
              </button>
            </div>
          )}

          {/* Negotiate form — target total + per-item proposed rates + note */}
          {clientCanAct && negotiating && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
                <Percent size={12} /> Propose a revision
              </div>
              <div className="rounded-lg border border-line bg-surface overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-canvas text-dim">
                      <th className="px-2 py-1 text-left font-semibold">Item</th>
                      <th className="px-2 py-1 text-right font-semibold">Current</th>
                      <th className="px-2 py-1 text-right font-semibold w-24">Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownItems.map((item) => (
                      <tr key={item.itemNo} className="border-t border-line">
                        <td className="px-2 py-1 text-ink font-medium truncate max-w-[140px]">
                          {item.itemNo}. {item.name}
                        </td>
                        <td className="px-2 py-1 text-right text-dim whitespace-nowrap">
                          {(Number(item.rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={proposedRates[item.itemNo] ?? ''}
                            onChange={(e) =>
                              setProposedRates((p) => ({ ...p, [item.itemNo]: e.target.value }))
                            }
                            placeholder="Rate"
                            className="w-full rounded border border-line bg-surface px-1.5 py-1 text-[11px] text-right outline-none focus:border-info"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <input
                type="number"
                min="0"
                value={proposedTotal}
                onChange={(e) => setProposedTotal(e.target.value)}
                placeholder={`Target total (current ${formatINR(displayTotal)})`}
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-[11px] outline-none focus:border-info"
              />
              <textarea
                rows={2}
                value={negNote}
                onChange={(e) => setNegNote(e.target.value)}
                placeholder="Note to PM (optional)"
                className="w-full rounded border border-line bg-surface px-2 py-1.5 text-[11px] outline-none focus:border-info resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClientNegotiate}
                  disabled={saving}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-semibold bg-black hover:bg-slate-800 text-white transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                  Send to PM
                </button>
                <button
                  type="button"
                  onClick={() => setNegotiating(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-line hover:bg-surface-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes — presented inside the BOQ document */}
      {noteLines.length > 0 && (
        <div className="border-t border-line px-3 py-2 bg-surface">
          <div className="text-[11px] font-semibold text-ink mb-1">Notes</div>
          <ul className="space-y-0.5">
            {noteLines.map((line, idx) => (
              <li key={idx} className="text-[11px] text-ink leading-relaxed flex gap-1.5">
                <span className="text-dim flex-shrink-0">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="bg-surface-hover px-3 py-1.5 flex items-center justify-between border-t border-line">
        <span className="text-[10px] text-dim italic">
          Rates are indicative — verify before finalizing.
        </span>
        <button
          onClick={handleExportExcel}
          className="px-2.5 py-1 rounded text-xs font-semibold bg-success hover:bg-success/90 text-white flex items-center gap-1 transition-colors"
          title="Download BOQ as Excel"
        >
          <Download size={11} /> XLS
        </button>
      </div>
    </div>
  );
};

export default CustomBOQDocument;
