import React from "react";
import { Download, FileDigit } from "lucide-react";
import * as XLSX from "xlsx-js-style";
const formatINR = (value) => `\u20B9${(Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQty = (value) => {
  const num = Number(value) || 0;
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};
const CustomBOQDocument = ({ boq }) => {
  if (!boq) {
    return /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dim p-3" }, "No BOQ data");
  }
  const items = Array.isArray(boq.items) ? boq.items : [];
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const noteLines = (boq.notes || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const handleExportExcel = (e) => {
    e?.stopPropagation?.();
    try {
      const COLS = 7;
      const LAST_COL = COLS - 1;
      const thinBorder = { style: "thin", color: { rgb: "CBD5E1" } };
      const allBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const numFmt = "#,##0.00";
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
      items.forEach((item, idx) => {
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
        cell(total, { ...totalStyle, font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } } })
      ]);
      if (noteLines.length) {
        rows.push([]);
        mergeRow(rows.length);
        rows.push([cell("Notes", notesHeadStyle)]);
        noteLines.forEach((line) => {
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
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-full bg-surface rounded-lg border border-line overflow-hidden flex flex-col",
      onClick: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-black text-white px-3 py-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 min-w-0" }, /* @__PURE__ */ React.createElement(FileDigit, { size: 14, className: "text-indigo-300 flex-shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold tracking-widest text-indigo-200 uppercase" }, "Bill of Quantities")), boq.purpose && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white font-medium whitespace-nowrap" }, boq.purpose)), /* @__PURE__ */ React.createElement("h3", { className: "font-bold text-sm truncate mt-1" }, boq.name || "Custom BOQ"), boq.description && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-slate-300 mt-0.5 line-clamp-2" }, boq.description)),
    /* @__PURE__ */ React.createElement("div", { className: "overflow-auto flex-1", style: { maxHeight: "520px" } }, /* @__PURE__ */ React.createElement("table", { className: "w-full border-collapse min-w-[560px]" }, /* @__PURE__ */ React.createElement("thead", { className: "sticky top-0 z-10" }, /* @__PURE__ */ React.createElement("tr", { className: "bg-canvas" }, /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-center font-semibold text-[11px] text-ink w-10" }, "#"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-left font-semibold text-[11px] text-ink" }, "Item Name"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-left font-semibold text-[11px] text-ink" }, "Description"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-center font-semibold text-[11px] text-ink w-16" }, "Unit"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-16" }, "Qty"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-24" }, "Rate (\u20B9)"), /* @__PURE__ */ React.createElement("th", { className: "border border-line px-2 py-1.5 text-right font-semibold text-[11px] text-ink w-28" }, "Amount (\u20B9)"))), /* @__PURE__ */ React.createElement("tbody", { className: "text-xs" }, items.map((item, idx) => /* @__PURE__ */ React.createElement("tr", { key: idx, className: `${idx % 2 === 1 ? "bg-canvas" : "bg-surface"} hover:bg-info/5` }, /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-center font-medium text-dim" }, item.itemNo), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 font-medium text-ink" }, item.name), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-ink" }, item.description), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-center text-ink" }, item.unit), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-right text-ink" }, formatQty(item.qty)), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-right text-ink" }, (Number(item.rate) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-1.5 text-right font-semibold text-ink" }, (Number(item.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })))), items.length === 0 && /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: 7, className: "border border-line px-2 py-4 text-center text-dim" }, "No items")), /* @__PURE__ */ React.createElement("tr", { className: "bg-success text-white" }, /* @__PURE__ */ React.createElement("td", { colSpan: 6, className: "border border-line px-2 py-2 text-right font-bold text-xs tracking-wide" }, "TOTAL"), /* @__PURE__ */ React.createElement("td", { className: "border border-line px-2 py-2 text-right font-bold text-sm whitespace-nowrap" }, formatINR(total)))))),
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
