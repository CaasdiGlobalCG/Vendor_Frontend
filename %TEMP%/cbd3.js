import React, { useMemo, useState } from "react";
import { Download, FileDigit, Percent, Send, Clock, ShieldCheck, Loader2, Plus, Trash2 } from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { persistNodeDataPatch } from "../../utils/nodePersistence";
import { notifyWorkspaceEvent } from "../../utils/workspaceApi";
const formatINR = (value) => `\u20B9${(Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQty = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
const STATUS_META = {
  pending_finance: { label: "Awaiting finance commission", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  commission_added: { label: "Commission added \u2014 pending PM", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  sent_to_client: { label: "Shared with client", badge: "bg-green-100 text-green-800 border-green-200" }
};
const CustomBOQDocument = ({ boq, role = "vendor", nodeId, setNodes, workspaceId }) => {
  const [itemCommissions, setItemCommissions] = useState({});
  const [editItems, setEditItems] = useState(null);
  const [saving, setSaving] = useState(false);
  const items = useMemo(() => Array.isArray(boq?.items) ? boq.items : [], [boq?.items]);
  const status = boq?.status || "pending_finance";
  const commission = boq?.commission || null;
  const vendorTotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [items]
  );
  const previewCommission = useMemo(() => {
    let commissionTotal = 0;
    let clientTotal2 = 0;
    items.forEach((item) => {
      const pct = parseFloat(itemCommissions[item.itemNo]) || 0;
      const clientRate = (Number(item.rate) || 0) * (1 + pct / 100);
      const clientAmount = clientRate * (Number(item.qty) || 0);
      commissionTotal += clientAmount - (Number(item.amount) || 0);
      clientTotal2 += clientAmount;
    });
    if (commissionTotal <= 0)
      return null;
    return { commissionTotal, clientTotal: clientTotal2 };
  }, [itemCommissions, items]);
  const editableItems = editItems ?? items;
  const editTotal = useMemo(
    () => editableItems.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0),
    [editableItems]
  );
  const updateEditItem = (idx, field, value) => {
    setEditItems(
      (prev) => (prev ?? items).map((it, i) => i === idx ? { ...it, [field]: value } : it)
    );
  };
  const addEditItem = () => {
    setEditItems((prev) => [
      ...prev ?? items,
      { itemNo: (prev ?? items).length + 1, name: "", description: "", unit: "", qty: 1, rate: 0, amount: 0 }
    ]);
  };
  const removeEditItem = (idx) => {
    setEditItems(
      (prev) => (prev ?? items).filter((_, i) => i !== idx).map((it, i) => ({ ...it, itemNo: i + 1 }))
    );
  };
  const clientItems = useMemo(() => {
    if (!commission?.items?.length)
      return null;
    const byItemNo = new Map(commission.items.map((ci) => [ci.itemNo, ci]));
    return items.map((item) => {
      const ci = byItemNo.get(item.itemNo);
      if (!ci)
        return item;
      return { ...item, rate: ci.clientRate, amount: ci.clientAmount };
    });
  }, [items, commission]);
  const clientTotal = commission?.clientTotal ?? vendorTotal;
  const canFinanceEdit = role === "finance" && status === "pending_finance";
  const canPmSend = role === "pm" && status === "commission_added";
  const canVendorEdit = role === "vendor" && status === "pending_finance";
  const showCommissionPanel = (role === "finance" || role === "pm") && commission;
  const shownItems = role === "client" && clientItems ? clientItems : canVendorEdit ? editableItems : items;
  const shownTotal = role === "client" ? clientTotal : canVendorEdit ? editTotal : vendorTotal;
  const persistBoq = async (updatedBoq) => {
    if (!nodeId || !workspaceId)
      return;
    setSaving(true);
    try {
      await persistNodeDataPatch(
        nodeId,
        // sentForApprovalAt forces the durable HTTP write path for this
        // workflow-state change (customBOQData alone would go WS-only).
        { customBOQData: updatedBoq, sentForApprovalAt: (/* @__PURE__ */ new Date()).toISOString() },
        setNodes,
        workspaceId,
        // BOQ workflow patches aren't part of the approval-modal flow — never skip
        { bypassApprovalFlow: true }
      );
    } catch (err) {
      console.error("\u274C Failed to update BOQ status:", err);
    } finally {
      setSaving(false);
    }
  };
  const handleApplyCommission = async () => {
    const commissionItems = items.map((item) => {
      const pct = parseFloat(itemCommissions[item.itemNo]) || 0;
      const rate = Number(item.rate) || 0;
      const qty = Number(item.qty) || 0;
      const commissionAmount = rate * pct / 100;
      const clientRate = rate + commissionAmount;
      return {
        itemNo: item.itemNo,
        rate,
        percent: pct,
        commissionAmount,
        clientRate,
        clientAmount: clientRate * qty
      };
    });
    const commissionSum = commissionItems.reduce(
      (s, ci) => s + (ci.clientAmount - (items.find((i) => i.itemNo === ci.itemNo)?.amount || 0)),
      0
    );
    if (commissionSum <= 0)
      return;
    await persistBoq({
      ...boq,
      status: "commission_added",
      commission: {
        type: "itemwise",
        // effective blended % — display convenience only
        percent: vendorTotal > 0 ? commissionSum / vendorTotal * 100 : 0,
        items: commissionItems,
        commissionTotal: commissionSum,
        clientTotal: vendorTotal + commissionSum,
        addedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    notifyWorkspaceEvent({
      workspaceId,
      roles: ["pm"],
      type: "boq_commission_added",
      title: "BOQ commission added",
      message: `Commission applied to "${boq?.name || "BOQ"}" \u2014 ready for PM review.`,
      data: { nodeId, boqName: boq?.name },
      priority: "medium",
      actionRequired: true
    });
  };
  const handleSaveItems = async () => {
    const normalized = editableItems.map((it, idx) => {
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      return {
        itemNo: idx + 1,
        name: it.name || "",
        description: it.description || "",
        unit: it.unit || "",
        qty,
        rate,
        amount: qty * rate
      };
    });
    const total = normalized.reduce((s, i) => s + i.amount, 0);
    await persistBoq({ ...boq, items: normalized, total, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    setEditItems(null);
  };
  const handleSendToClient = async () => {
    await persistBoq({
      ...boq,
      status: "sent_to_client",
      sentToClientAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    notifyWorkspaceEvent({
      workspaceId,
      roles: ["client"],
      type: "boq_shared",
      title: "BOQ shared",
      message: `A Bill of Quantities "${boq?.name || "BOQ"}" has been shared with you.`,
      data: { nodeId, boqName: boq?.name },
      priority: "medium"
    });
  };
  if (!boq) {
    return /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dim p-3" }, "No BOQ data");
  }
  const handleExportExcel = (e) => {
    e?.stopPropagation?.();
    try {
      const COLS = 7;
      const LAST_COL = COLS - 1;
      const thinBorder = { style: "thin", color: { rgb: "CBD5E1" } };
      const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const numFmt = "#,##0.00";
      const exportItems = role === "client" ? shownItems : items;
      const exportTotal = role === "client" ? shownTotal : vendorTotal;
      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E293B" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
      const subtitleStyle = {
        font: { bold: true, sz: 12, color: { rgb: "1E293B" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
      const metaStyle = {
        font: { sz: 10, color: { rgb: "475569" }, italic: true },
        alignment: { horizontal: "center", vertical: "center" }
      };
      const headerStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "334155" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: allBorders
      };
      const totalStyle = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "16A34A" } },
        alignment: { horizontal: "right", vertical: "center" },
        border: allBorders
      };
      const notesHeadStyle = {
        font: { bold: true, sz: 11, color: { rgb: "1E293B" } },
        fill: { fgColor: { rgb: "F1F5F9" } },
        border: allBorders
      };
      const noteLineStyle = {
        font: { sz: 10, color: { rgb: "334155" } },
        alignment: { vertical: "top", wrapText: true }
      };
      const disclaimerStyle = {
        font: { sz: 9, italic: true, color: { rgb: "94A3B8" } },
        alignment: { horizontal: "left", vertical: "center" }
      };
      const cell = (v, s, extra = {}) => {
        const c = { v, t: typeof v === "number" ? "n" : "s", s };
        if (typeof v === "number")
          c.z = numFmt;
        return { ...c, ...extra };
      };
      const rows = [];
      const merges = [];
      const mergeRow = (r) => merges.push({ s: { r, c: 0 }, e: { r, c: LAST_COL } });
      const noteLines2 = (boq.notes || "").split("\n").map((line) => line.trim()).filter(Boolean);
      mergeRow(0);
      rows.push([cell("BILL OF QUANTITIES", titleStyle)]);
      mergeRow(1);
      rows.push([cell(boq.name || "Custom BOQ", subtitleStyle)]);
      if (boq.purpose) {
        mergeRow(rows.length);
        rows.push([cell(`BOQ for: ${boq.purpose}`, metaStyle)]);
      }
      if (boq.description) {
        mergeRow(rows.length);
        rows.push([cell(boq.description, { ...metaStyle, alignment: { horizontal: "center", vertical: "top", wrapText: true } })]);
      }
      mergeRow(rows.length);
      rows.push([cell(`Generated: ${new Date(boq.createdAt || Date.now()).toLocaleDateString("en-IN")}`, metaStyle)]);
      rows.push([]);
      rows.push(
        ["Item No", "Item Name", "Description", "Unit", "Qty", "Rate (INR)", "Amount (INR)"].map((h) => cell(h, headerStyle))
      );
      exportItems.forEach((item, idx) => {
        const fill = idx % 2 === 1 ? { fgColor: { rgb: "F8FAFC" } } : void 0;
        const txt = { font: { sz: 10, color: { rgb: "1E293B" } }, border: allBorders, fill };
        rows.push([
          cell(item.itemNo, { ...txt, alignment: { horizontal: "center", vertical: "top" } }),
          cell(item.name, { ...txt, font: { sz: 10, bold: true, color: { rgb: "1E293B" } }, alignment: { vertical: "top", wrapText: true } }),
          cell(item.description, { ...txt, alignment: { vertical: "top", wrapText: true } }),
          cell(item.unit, { ...txt, alignment: { horizontal: "center", vertical: "top" } }),
          cell(Number(item.qty) || 0, { ...txt, alignment: { horizontal: "right", vertical: "top" } }),
          cell(Number(item.rate) || 0, { ...txt, alignment: { horizontal: "right", vertical: "top" } }),
          cell(Number(item.amount) || 0, { ...txt, font: { sz: 10, bold: true, color: { rgb: "1E293B" } }, alignment: { horizontal: "right", vertical: "top" } })
        ]);
      });
      rows.push([
        cell("", totalStyle),
        cell("TOTAL", { ...totalStyle, alignment: { horizontal: "right", vertical: "center" } }),
        cell("", totalStyle),
        cell("", totalStyle),
        cell("", totalStyle),
        cell("", totalStyle),
        cell(exportTotal, { ...totalStyle, font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } } })
      ]);
      if (noteLines2.length) {
        rows.push([]);
        mergeRow(rows.length);
        rows.push([cell("Notes", notesHeadStyle)]);
        noteLines2.forEach((line) => {
          mergeRow(rows.length);
          rows.push([cell(`\u2022 ${line}`, noteLineStyle)]);
        });
      }
      rows.push([]);
      mergeRow(rows.length);
      rows.push([cell("Disclaimer: Rates are indicative for estimation only. Verify locally before finalizing.", disclaimerStyle)]);
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!merges"] = merges;
      worksheet["!cols"] = [{ wch: 8 }, { wch: 26 }, { wch: 55 }, { wch: 9 }, { wch: 9 }, { wch: 14 }, { wch: 16 }];
      worksheet["!rows"] = rows.map((_, idx) => idx === 0 ? { hpt: 28 } : idx === 1 ? { hpt: 20 } : void 0);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "BOQ");
      XLSX.writeFile(workbook, `${(boq.name || "custom_boq").replace(/[^a-z0-9]+/gi, "_")}.xlsx`);
    } catch (err) {
      console.error("\u274C BOQ Excel export failed:", err);
    }
  };
  const statusMeta = STATUS_META[status];
  const noteLines = (boq.notes || "").split("\n").map((line) => line.trim()).filter(Boolean);
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-full bg-surface rounded-lg border border-line overflow-hidden flex flex-col",
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-black text-white px-3 py-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 min-w-0" }, /* @__PURE__ */ React.createElement(FileDigit, { size: 14, className: "text-indigo-300 flex-shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold tracking-widest text-indigo-200 uppercase" }, "Bill of Quantities")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, statusMeta && role !== "client" && role !== "vendor" && /* @__PURE__ */ React.createElement("span", { className: `text-[9px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${statusMeta.badge}` }, statusMeta.label), boq.purpose && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white font-medium whitespace-nowrap" }, boq.purpose))), /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-sm truncate mt-1" }, boq.name || "Custom BOQ"), boq.description && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-300 mt-0.5 line-clamp-2" }, boq.description)),
    /* @__PURE__ */ React.createElement("div", { className: "w-full" }, /* @__PURE__ */ React.createElement("table", { className: "w-full border-collapse min-w-[560px]" }, /* @__PURE__ */ React.createElement("thead", { className: "z-10" }, /* @__PURE__ */ React.createElement("tr", { className: "bg-canvas" }, /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-center font-semibold text-[11px] text-ink w-10" }, "#"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-left font-semibold text-[11px] text-ink" }, "Item Name"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-left font-semibold text-[11px] text-ink" }, "Description"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-center font-semibold text-[11px] text-ink w-16" }, "Unit"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-16" }, "Qty"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-24" }, "Rate (\u20B9)"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-28" }, "Amount (\u20B9)"))), /* @__PURE__ */ React.createElement("tbody", { className: "text-xs" }, canVendorEdit ? (
      // Vendor edit mode (pre-commission) — every cell editable inline
      editableItems.map((item, idx) => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        const cellInput = "w-full bg-transparent px-1 py-0.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-info rounded";
        return /* @__PURE__ */ React.createElement("tr", { key: idx, className: `${idx % 2 === 1 ? "bg-canvas" : "bg-surface"}` }, /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1 text-center font-medium text-dim align-top" }, idx + 1), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-1 py-1" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            value: item.name || "",
            onChange: (e) => updateEditItem(idx, "name", e.target.value),
            placeholder: "Item name",
            className: `${cellInput} font-medium text-ink`
          }
        )), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-1 py-1" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            value: item.description || "",
            onChange: (e) => updateEditItem(idx, "description", e.target.value),
            placeholder: "Description",
            className: `${cellInput} text-ink`
          }
        )), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-1 py-1 w-16" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            value: item.unit || "",
            onChange: (e) => updateEditItem(idx, "unit", e.target.value),
            placeholder: "Unit",
            className: `${cellInput} text-center text-ink`
          }
        )), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-1 py-1 w-16" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "number",
            min: "0",
            value: item.qty ?? "",
            onChange: (e) => updateEditItem(idx, "qty", e.target.value),
            className: `${cellInput} text-right text-ink`
          }
        )), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-1 py-1 w-24" }, /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "number",
            min: "0",
            step: "0.01",
            value: item.rate ?? "",
            onChange: (e) => updateEditItem(idx, "rate", e.target.value),
            className: `${cellInput} text-right text-ink`
          }
        )), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1 text-right font-semibold text-ink whitespace-nowrap" }, (qty * rate).toLocaleString("en-IN", { minimumFractionDigits: 2 })), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-1 py-1 w-8 text-center" }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: () => removeEditItem(idx),
            className: "text-danger/70 hover:text-danger",
            title: "Remove item"
          },
          /* @__PURE__ */ React.createElement(Trash2, { size: 12 })
        )));
      })
    ) : shownItems.map((item, idx) => /* @__PURE__ */ React.createElement("tr", { key: idx, className: `${idx % 2 === 1 ? "bg-canvas" : "bg-surface"} hover:bg-info/5` }, /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-center font-medium text-dim" }, item.itemNo), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 font-medium text-ink" }, item.name), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-ink" }, item.description), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-center text-ink" }, item.unit), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-right text-ink" }, formatQty(item.qty)), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-right text-ink" }, (Number(item.rate) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-right font-semibold text-ink" }, (Number(item.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })))), shownItems.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: canVendorEdit ? 8 : 7, className: "border border-line px-2 py-4 text-center text-dim" }, "No items")), /* @__PURE__ */ React.createElement("tr", { className: "bg-success text-white" }, /* @__PURE__ */ React.createElement("td", { colSpan: canVendorEdit ? 7 : 6, className: "border border-line px-2 py-2 text-right font-bold text-xs tracking-wide" }, "TOTAL"), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-2 text-right font-bold text-sm whitespace-nowrap" }, formatINR(shownTotal)))))),
    canVendorEdit && /* @__PURE__ */ React.createElement("div", { className: "border-t border-line px-3 py-2 bg-canvas flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addEditItem,
        className: "flex items-center gap-1 text-[11px] font-semibold text-info hover:text-info/80"
      },
      /* @__PURE__ */ React.createElement(Plus, { size: 12 }),
      " Add item"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleSaveItems,
        disabled: saving || editItems === null,
        className: "px-3 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      },
      saving ? /* @__PURE__ */ React.createElement(Loader2, { size: 11, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(ShieldCheck, { size: 11 }),
      "Save items"
    )),
    showCommissionPanel && /* @__PURE__ */ React.createElement("div", { className: "border-t border-line px-3 py-2 bg-blue-50/60" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 text-[11px] font-semibold text-blue-900 mb-1" }, /* @__PURE__ */ React.createElement(ShieldCheck, { size: 12 }), "Commission (internal \u2014 not visible to vendor or client)"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, commission.type === "itemwise" ? "Item-wise commission" : commission.type === "percent" ? `${commission.percent}% commission` : "Flat commission"), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink" }, "+", formatINR(commission.commissionTotal))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs mt-0.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "Client total"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-ink" }, formatINR(commission.clientTotal)))),
    canFinanceEdit && /* @__PURE__ */ React.createElement("div", { className: "border-t border-line px-3 py-2.5 bg-amber-50/60" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 mb-1.5" }, /* @__PURE__ */ React.createElement(Percent, { size: 12 }), "Add Item-wise Commission"), /* @__PURE__ */ React.createElement("div", { className: "rounded border border-amber-200 bg-white overflow-hidden" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-[11px]" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-amber-100/60 text-amber-900" }, /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-left font-semibold" }, "Item"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-right font-semibold" }, "Rate (\u20B9)"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-center font-semibold w-24" }, "Comm %"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-1 text-right font-semibold" }, "Client Rate (\u20B9)"))), /* @__PURE__ */ React.createElement("tbody", null, items.map((item, idx) => {
      const pct = parseFloat(itemCommissions[item.itemNo]) || 0;
      const clientRate = (Number(item.rate) || 0) * (1 + pct / 100);
      return /* @__PURE__ */ React.createElement("tr", { key: item.itemNo ?? idx, className: "border-t border-amber-100" }, /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-ink font-medium truncate max-w-[120px]" }, item.itemNo, ". ", item.name), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right text-ink whitespace-nowrap" }, (Number(item.rate) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: "0",
          max: "100",
          step: "0.5",
          value: itemCommissions[item.itemNo] ?? "",
          onChange: (e) => setItemCommissions((prev) => ({
            ...prev,
            [item.itemNo]: e.target.value
          })),
          placeholder: "0",
          className: "w-full rounded border border-line bg-surface pl-1.5 pr-5 py-1 text-[11px] text-right outline-none focus:border-info"
        }
      ), /* @__PURE__ */ React.createElement("span", { className: "absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-dim" }, "%"))), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1 text-right font-medium text-ink whitespace-nowrap" }, pct > 0 ? clientRate.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "\u2014"));
    })))), /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-dim" }, previewCommission ? /* @__PURE__ */ React.createElement(React.Fragment, null, "+", formatINR(previewCommission.commissionTotal), " commission", /* @__PURE__ */ React.createElement("span", { className: "mx-1" }, "\xB7"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-ink" }, "Client total: ", formatINR(previewCommission.clientTotal))) : "Enter a % on any item to preview"), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleApplyCommission,
        disabled: saving || !previewCommission,
        className: "px-3 py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      },
      saving ? /* @__PURE__ */ React.createElement(Loader2, { size: 11, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(ShieldCheck, { size: 11 }),
      "Apply"
    ))),
    role === "pm" && /* @__PURE__ */ React.createElement("div", { className: "border-t border-line px-3 py-2.5 bg-canvas" }, status === "pending_finance" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 text-[11px] text-dim" }, /* @__PURE__ */ React.createElement(Clock, { size: 12 }), "Waiting for finance to add commission"), canPmSend && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleSendToClient,
        disabled: saving,
        className: "w-full px-3 py-1.5 rounded text-xs font-semibold bg-success hover:bg-success/90 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
      },
      saving ? /* @__PURE__ */ React.createElement(Loader2, { size: 11, className: "animate-spin" }) : /* @__PURE__ */ React.createElement(Send, { size: 11 }),
      "Send BOQ to Client"
    ), status === "sent_to_client" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 text-[11px] text-success font-medium" }, /* @__PURE__ */ React.createElement(Send, { size: 12 }), "Sent to client", boq.sentToClientAt ? ` on ${new Date(boq.sentToClientAt).toLocaleDateString("en-IN")}` : "")),
    noteLines.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "border-t border-line px-3 py-2 bg-surface" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] font-semibold text-ink mb-1" }, "Notes"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-0.5" }, noteLines.map((line, idx) => /* @__PURE__ */ React.createElement("li", { key: idx, className: "text-[11px] text-ink leading-relaxed flex gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim flex-shrink-0" }, "\u2022"), /* @__PURE__ */ React.createElement("span", null, line))))),
    /* @__PURE__ */ React.createElement("div", { className: "bg-surface-hover px-3 py-1.5 flex items-center justify-between border-t border-line" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-dim italic" }, "Rates are indicative \u2014 verify before finalizing."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleExportExcel,
        className: "px-2.5 py-1 rounded text-xs font-semibold bg-success hover:bg-success/90 text-white flex items-center gap-1 transition-colors",
        title: "Download BOQ as Excel"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 11 }),
      " XLS"
    ))
  );
};
var CustomBOQDocument_default = CustomBOQDocument;
export {
  CustomBOQDocument_default as default
};
