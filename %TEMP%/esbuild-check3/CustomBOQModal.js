import React, { useMemo, useState } from "react";
import { X, ArrowLeft, ArrowRight, Plus, Trash2, FileDigit, FileText } from "lucide-react";
const BOQ_PURPOSES = [
  "Labours",
  "Painting",
  "Services",
  "Materials",
  "Electrical",
  "Plumbing",
  "Civil Works",
  "Carpentry",
  "HVAC",
  "Other"
];
const BOQ_UNITS = [
  "Nos",
  "Sq.ft",
  "Sq.m",
  "R.ft",
  "Cft",
  "Cum",
  "Kg",
  "Ton",
  "Ltr",
  "Bag",
  "Mtr",
  "Day",
  "Month",
  "Set",
  "LS"
];
const STEPS = ["BOQ Details", "BOQ For", "Line Items", "Notes"];
const formatINR = (value) => `\u20B9${(Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const makeItem = () => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  description: "",
  unit: "Nos",
  qty: "",
  rate: ""
});
const itemAmount = (item) => (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
const inputCls = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-dim focus:border-info focus:ring-1 focus:ring-info/30";
const CustomBOQModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [boqName, setBoqName] = useState("");
  const [boqDescription, setBoqDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [customPurpose, setCustomPurpose] = useState("");
  const [items, setItems] = useState([makeItem()]);
  const [notes, setNotes] = useState("");
  const resolvedPurpose = purpose === "Other" ? customPurpose.trim() : purpose;
  const grandTotal = useMemo(
    () => items.reduce((sum, item) => sum + itemAmount(item), 0),
    [items]
  );
  const canProceed = () => {
    if (step === 0)
      return boqName.trim().length > 0;
    if (step === 1)
      return resolvedPurpose.length > 0;
    if (step === 2)
      return items.some((item) => item.name.trim().length > 0);
    return true;
  };
  const updateItem = (id, field, value) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };
  const addItem = () => setItems((prev) => [...prev, makeItem()]);
  const removeItem = (id) => {
    setItems((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev);
  };
  const resetAndClose = () => {
    setStep(0);
    setBoqName("");
    setBoqDescription("");
    setPurpose("");
    setCustomPurpose("");
    setItems([makeItem()]);
    setNotes("");
    onClose?.();
  };
  const handleGenerate = () => {
    const name = boqName.trim() || "Custom BOQ";
    const filledItems = items.filter((item) => item.name.trim().length > 0);
    const boqItems = filledItems.map((item, idx) => ({
      itemNo: idx + 1,
      name: item.name.trim(),
      description: item.description.trim(),
      unit: item.unit,
      qty: parseFloat(item.qty) || 0,
      rate: parseFloat(item.rate) || 0,
      amount: itemAmount(item)
    }));
    const customBOQData = {
      name,
      description: boqDescription.trim(),
      purpose: resolvedPurpose,
      items: boqItems,
      notes: notes.trim(),
      total: grandTotal,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    document.dispatchEvent(
      new CustomEvent("elementDoubleClick", {
        detail: {
          type: "custom-boq",
          name,
          preview: `${boqItems.length} item${boqItems.length === 1 ? "" : "s"} \xB7 ${formatINR(grandTotal)}`,
          customBOQData
        }
      })
    );
    resetAndClose();
  };
  if (!isOpen)
    return null;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
      onClick: resetAndClose
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-surface rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center px-4 py-3 border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded-lg bg-indigo-100 text-indigo-800" }, /* @__PURE__ */ React.createElement(FileDigit, { className: "w-4 h-4" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-semibold text-ink" }, "Custom BOQ"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-dim" }, "Step ", step + 1, " of ", STEPS.length, " \u2014 ", STEPS[step]))), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: resetAndClose,
          className: "p-1 hover:bg-surface-hover rounded-lg transition-colors text-dim hover:text-ink",
          title: "Close"
        },
        /* @__PURE__ */ React.createElement(X, { size: 18 })
      )),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 px-4 pt-3" }, STEPS.map((label, idx) => /* @__PURE__ */ React.createElement(React.Fragment, { key: label }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `flex items-center gap-1.5 text-[11px] font-medium ${idx === step ? "text-ink" : idx < step ? "text-success" : "text-dim"}`
        },
        /* @__PURE__ */ React.createElement(
          "span",
          {
            className: `w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${idx === step ? "bg-info text-white" : idx < step ? "bg-success/15 text-success" : "bg-surface-hover text-dim"}`
          },
          idx + 1
        ),
        /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, label)
      ), idx < STEPS.length - 1 && /* @__PURE__ */ React.createElement("div", { className: "flex-1 h-px bg-line" })))),
      /* @__PURE__ */ React.createElement("div", { className: "p-4 overflow-y-auto flex-1" }, step === 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-1 block text-[11px] font-semibold text-ink" }, "BOQ Name ", /* @__PURE__ */ React.createElement("span", { className: "text-danger" }, "*")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: boqName,
          onChange: (e) => setBoqName(e.target.value),
          placeholder: "e.g. Villa Renovation \u2013 Phase 1 BOQ",
          className: inputCls,
          autoFocus: true
        }
      )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-1 block text-[11px] font-semibold text-ink" }, "Description"), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          rows: 3,
          value: boqDescription,
          onChange: (e) => setBoqDescription(e.target.value),
          placeholder: "Brief description of this Bill of Quantities \u2014 scope, project reference, client\u2026",
          className: `${inputCls} resize-none`
        }
      ))), step === 1 && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-2 block text-[11px] font-semibold text-ink" }, "What are you building this BOQ for? ", /* @__PURE__ */ React.createElement("span", { className: "text-danger" }, "*")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, BOQ_PURPOSES.map((option) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: option,
          type: "button",
          onClick: () => setPurpose(option),
          className: `px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${purpose === option ? "border-info bg-info text-white" : "border-line bg-surface text-ink hover:border-info/40"}`
        },
        option
      )))), purpose === "Other" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-1 block text-[11px] font-semibold text-ink" }, "Specify ", /* @__PURE__ */ React.createElement("span", { className: "text-danger" }, "*")), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: customPurpose,
          onChange: (e) => setCustomPurpose(e.target.value),
          placeholder: "e.g. Fire Safety Systems",
          className: inputCls,
          autoFocus: true
        }
      ))), step === 2 && /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-dim" }, "Amount is auto-calculated as Qty \xD7 Rate. Item numbers are assigned automatically."), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: addItem,
          className: "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-info text-white rounded-lg hover:bg-info/90 transition-colors"
        },
        /* @__PURE__ */ React.createElement(Plus, { className: "w-3.5 h-3.5" }),
        "Add Item"
      )), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto border border-line rounded-lg" }, /* @__PURE__ */ React.createElement("table", { className: "min-w-full text-xs" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "bg-canvas text-dim" }, /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium w-10" }, "#"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium min-w-[140px]" }, "Item Name"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium min-w-[160px]" }, "Description"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium w-24" }, "Unit"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium w-20" }, "Qty"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-left font-medium w-24" }, "Rate (\u20B9)"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 text-right font-medium w-28" }, "Amount"), /* @__PURE__ */ React.createElement("th", { className: "px-2 py-2 w-8" }))), /* @__PURE__ */ React.createElement("tbody", null, items.map((item, idx) => /* @__PURE__ */ React.createElement("tr", { key: item.id, className: "border-t border-line" }, /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1.5 text-dim font-medium" }, idx + 1), /* @__PURE__ */ React.createElement("td", { className: "px-1 py-1" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: item.name,
          onChange: (e) => updateItem(item.id, "name", e.target.value),
          placeholder: "Item name",
          className: "w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
        }
      )), /* @__PURE__ */ React.createElement("td", { className: "px-1 py-1" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: item.description,
          onChange: (e) => updateItem(item.id, "description", e.target.value),
          placeholder: "Specification / description",
          className: "w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
        }
      )), /* @__PURE__ */ React.createElement("td", { className: "px-1 py-1" }, /* @__PURE__ */ React.createElement(
        "select",
        {
          value: item.unit,
          onChange: (e) => updateItem(item.id, "unit", e.target.value),
          className: "w-full rounded border border-line bg-surface px-1.5 py-1.5 text-xs outline-none focus:border-info"
        },
        BOQ_UNITS.map((unit) => /* @__PURE__ */ React.createElement("option", { key: unit, value: unit }, unit))
      )), /* @__PURE__ */ React.createElement("td", { className: "px-1 py-1" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: "0",
          value: item.qty,
          onChange: (e) => updateItem(item.id, "qty", e.target.value),
          placeholder: "0",
          className: "w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
        }
      )), /* @__PURE__ */ React.createElement("td", { className: "px-1 py-1" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          min: "0",
          value: item.rate,
          onChange: (e) => updateItem(item.id, "rate", e.target.value),
          placeholder: "0.00",
          className: "w-full rounded border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-info"
        }
      )), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-1.5 text-right font-medium text-ink whitespace-nowrap" }, formatINR(itemAmount(item))), /* @__PURE__ */ React.createElement("td", { className: "px-1 py-1 text-center" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => removeItem(item.id),
          className: "p-1 text-dim hover:text-danger rounded transition-colors",
          title: "Remove item"
        },
        /* @__PURE__ */ React.createElement(Trash2, { className: "w-3.5 h-3.5" })
      ))))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", { className: "border-t border-line bg-canvas" }, /* @__PURE__ */ React.createElement("td", { colSpan: 6, className: "px-2 py-2 text-right text-xs font-semibold text-ink" }, "Grand Total"), /* @__PURE__ */ React.createElement("td", { className: "px-2 py-2 text-right text-xs font-bold text-ink whitespace-nowrap" }, formatINR(grandTotal)), /* @__PURE__ */ React.createElement("td", null)))))), step === 3 && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "mb-1 block text-[11px] font-semibold text-ink" }, "Notes to present in the BOQ"), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          rows: 5,
          value: notes,
          onChange: (e) => setNotes(e.target.value),
          placeholder: "Terms & conditions, taxes, validity, exclusions, payment schedule\u2026",
          className: `${inputCls} resize-none`
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-line bg-canvas p-3 text-xs space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "BOQ Name"), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink" }, boqName.trim() || "Custom BOQ")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "BOQ For"), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink" }, resolvedPurpose)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "Line Items"), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink" }, items.filter((i) => i.name.trim()).length)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between border-t border-line pt-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, "Grand Total"), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-ink" }, formatINR(grandTotal)))))),
      /* @__PURE__ */ React.createElement("div", { className: "px-4 py-3 border-t border-line flex items-center justify-between bg-canvas" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setStep((s) => Math.max(0, s - 1)),
          disabled: step === 0,
          className: "flex items-center gap-1 px-3 py-2 text-xs font-medium text-ink border border-line rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        },
        /* @__PURE__ */ React.createElement(ArrowLeft, { className: "w-3.5 h-3.5" }),
        "Back"
      ), step < STEPS.length - 1 ? /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => canProceed() && setStep((s) => s + 1),
          disabled: !canProceed(),
          className: "flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-black text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        },
        "Next",
        /* @__PURE__ */ React.createElement(ArrowRight, { className: "w-3.5 h-3.5" })
      ) : /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: handleGenerate,
          className: "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-black text-white rounded-lg hover:bg-slate-800 transition-colors"
        },
        /* @__PURE__ */ React.createElement(FileText, { className: "w-3.5 h-3.5" }),
        "Generate BOQ"
      ))
    )
  );
};
var CustomBOQModal_default = CustomBOQModal;
export {
  CustomBOQModal_default as default
};
