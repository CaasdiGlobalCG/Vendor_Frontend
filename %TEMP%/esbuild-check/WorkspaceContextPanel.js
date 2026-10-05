import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Square,
  Table,
  Image as ImageIcon,
  Minus,
  MousePointer,
  BarChart3,
  FileText,
  AlignLeft,
  Grid3X3,
  Columns,
  Rows,
  Plus,
  GitBranch,
  Settings,
  Trash2,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  ClipboardCheck,
  Package,
  Calculator,
  Grid,
  List,
  Upload,
  CheckCircle2,
  CheckSquare,
  HelpCircle,
  FileCheck,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  CreditCard,
  ClipboardList,
  ShieldCheck,
  CloudSun,
  FileDigit
} from "lucide-react";
import TaskTab from "./TaskTab";
import LayersTab from "./LayersTab";
import AssetsTab from "./AssetsTab";
const WorkspaceContextPanel = ({
  isOpen,
  activeTab,
  onClose,
  elementOptions = {},
  // Task props
  tasks,
  selectedTask,
  selectedSubtask,
  onTaskClick,
  onSubtaskClick,
  onShowAddTaskModal,
  onQuickAddTask,
  onRenameTask,
  onUpdateTask,
  memberOptions,
  workspace,
  userRole,
  onLeaveWorkspace,
  // Canvas elements for Layers
  canvasElements = [],
  onZoomToElement,
  onDeleteElement,
  // Workflow props
  onWorkflowBuilderClick,
  // Templates props
  onTemplateSelect,
  // Text element props
  selectedTextElement,
  onUpdateTextElement,
  // Agent props
  onLaunchAgent,
  // Turnkey visibility — true only when a Turnkey CAS member is in the workspace
  hasTurnkeyMember = false
}) => {
  const [elementsSearch, setElementsSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const handleDragStart = (e, elementData) => {
    const cleanElement = {
      ...elementData,
      id: elementData.id || `${elementData.type || "element"}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: elementData.name || elementData.label || "Element",
      type: elementData.type || "card",
      preview: elementData.preview || elementData.name || elementData.label || "Element block"
    };
    const jsonStr = JSON.stringify(cleanElement);
    e.dataTransfer.setData("application/json", jsonStr);
    e.dataTransfer.setData("text/plain", cleanElement.name);
    e.dataTransfer.effectAllowed = "copy";
    const dragImage = new Image();
    dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%232563eb" width="60" height="60" rx="8"/%3E%3Ctext x="30" y="30" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E+%3C/text%3E%3C/svg%3E';
    try {
      e.dataTransfer.setDragImage(dragImage, 30, 30);
    } catch (err) {
    }
  };
  const handleDoubleClick = (elementData) => {
    const cleanElement = {
      ...elementData,
      id: elementData.id || `${elementData.type || "element"}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: elementData.name || elementData.label || "Element",
      type: elementData.type || "card",
      preview: elementData.preview || elementData.name || elementData.label || "Element block"
    };
    const event = new CustomEvent("elementDoubleClick", { detail: cleanElement });
    document.dispatchEvent(event);
  };
  const layoutChips = [
    { type: "info-card", label: "Info Card", icon: Square, nodeType: "infoCard", preview: "Display key information with title and content" },
    { type: "table", label: "Table", icon: Table },
    { type: "image-block", label: "Image", icon: ImageIcon },
    { type: "divider", label: "Divider", icon: Minus }
  ];
  const inputChips = [
    { type: "button", label: "Button", icon: MousePointer },
    { type: "chart", label: "Chart", icon: BarChart3 },
    { type: "textarea", label: "TextArea", icon: FileText },
    { type: "input", label: "Input", icon: AlignLeft }
  ];
  const categories = useMemo(() => {
    const baseCategories = [
      {
        id: "invoices-quotes",
        name: "Invoices & Quotes",
        desc: "Quotations, invoices, and purchase orders",
        icon: FileText,
        color: "bg-surface-hover text-ink border-line"
      },
      {
        id: "forms",
        name: "Forms & Inputs",
        desc: "Inputs, textareas, buttons, dropdowns",
        icon: Grid,
        color: "bg-warning/10 text-warning border-warning/20"
      },
      {
        id: "tables",
        name: "Tables & Grids",
        desc: "Data tables, pivot tables, calendars",
        icon: Table,
        color: "bg-surface-hover text-ink border-line"
      },
      {
        id: "charts",
        name: "Analytics & Charts",
        desc: "Bar, line, pie, area, and scatter charts",
        icon: BarChart3,
        color: "bg-info/10 text-info border-info/20"
      },
      {
        id: "flowcharts",
        name: "Flowcharts & Logic",
        desc: "Process flow, decision trees, stage gates",
        icon: GitBranch,
        color: "bg-info/10 text-info border-info/20"
      },
      {
        id: "task-card",
        name: "Task Cards",
        desc: "Action items, milestone cards, status",
        icon: ClipboardCheck,
        color: "bg-surface-hover text-ink border-line"
      },
      {
        id: "materials",
        name: "Materials & BOQ",
        desc: "Bill of Quantities, specs, materials",
        icon: Package,
        color: "bg-warning/10 text-warning border-warning/20"
      },
      {
        id: "cad-files",
        name: "CAD Files",
        desc: "Upload & scan .dwg .dxf .step .iges .stl .obj",
        icon: FileDigit,
        color: "bg-slate-50 text-slate-700 border-slate-200"
      },
      {
        id: "cost-calculators",
        name: "Cost Calculators",
        desc: "Flooring, painting, concrete, electrical",
        icon: Calculator,
        color: "bg-surface-hover text-ink border-line"
      },
      {
        id: "boq-generator",
        name: "BOQ Generator",
        desc: "Custom BOQ and ready-made BOQ templates",
        icon: FileDigit,
        color: "bg-indigo-100 text-indigo-800 border-indigo-200"
      },
      {
        id: "smart",
        name: "Smart Elements",
        desc: "AI notes, calendar events, approval boards",
        icon: Sparkles,
        color: "bg-surface-hover text-ink border-line"
      }
    ];
    return hasTurnkeyMember ? [
      {
        id: "turnkey",
        name: "Turnkey",
        desc: "Turnkey workflow and execution tracking",
        icon: Settings,
        color: "bg-red-50 text-red-700 border-red-200"
      },
      ...baseCategories
    ] : baseCategories;
  }, [hasTurnkeyMember]);
  const categoryElementsMap = useMemo(() => {
    const pickList = (opt, fallback) => {
      if (Array.isArray(opt) && opt.length > 0)
        return opt;
      if (opt && Array.isArray(opt.elements) && opt.elements.length > 0)
        return opt.elements;
      return fallback;
    };
    const invQuotesList = pickList(elementOptions["invoices-quotes"], [
      { id: "new-quotation", name: "Quotation Document", type: "quotation", nodeType: "quotation", preview: "Line items, unit rates, taxes, and terms", categoryId: "quotations" },
      { id: "new-invoice", name: "Tax Invoice", type: "invoice", nodeType: "invoice", preview: "Billable invoice with payment status and milestone details", categoryId: "invoices" },
      { id: "credit-note", name: "Credit Note", type: "credit-note", nodeType: "creditNote", preview: "Adjustment for returns, discounts or invoice revisions", categoryId: "credit-notes" },
      { id: "purchase-order", name: "Purchase Order (PO)", type: "purchase-order", nodeType: "purchaseOrder", preview: "Formal procurement order issued to supplier", categoryId: "purchase-orders" }
    ]);
    const formsList = pickList(elementOptions.forms, [
      { id: "textarea", name: "Text Area", type: "textarea", preview: "Multi-line text box for descriptions and notes" },
      { id: "textbox", name: "Text Input", type: "input", preview: "Single-line text entry field" },
      { id: "form-card", name: "Form Card", type: "form-card", nodeType: "formCard", preview: "Structured form with multiple input fields" },
      { id: "button", name: "Action Button", type: "button", preview: "Clickable call-to-action button" },
      { id: "dropdown", name: "Select Dropdown", type: "select", preview: "Select a single option from a dropdown list" },
      { id: "radio", name: "Radio Choice", type: "radio", preview: "Single-choice radio button options" },
      { id: "checkbox", name: "Checkbox Group", type: "checkbox", preview: "Multiple selection checkboxes" }
    ]);
    const tablesList = pickList(elementOptions.tables, [
      { id: "basic-table", name: "Basic Data Table", type: "table", tableType: "basic", preview: "Simple structured rows and columns" },
      { id: "data-table", name: "Advanced Data Table", type: "table", tableType: "data", preview: "Sortable, filterable project data grid" },
      { id: "pivot-table", name: "Pivot Summary Table", type: "table", tableType: "pivot", preview: "Multi-dimensional data aggregation" },
      { id: "calendar", name: "Schedule Calendar", type: "calendar", preview: "Milestone, delivery, and inspection date picker" }
    ]);
    const chartsList = pickList(elementOptions.charts, [
      { id: "bar-chart", name: "Vertical Bar Chart", type: "chart", chartType: "bar", preview: "Compare metric values across categories" },
      { id: "line-chart", name: "Progress Line Chart", type: "chart", chartType: "line", preview: "Track progress and expenditure trends over time" },
      { id: "pie-chart", name: "Cost Breakdown Pie Chart", type: "chart", chartType: "pie", preview: "Proportional budget and stage distribution" },
      { id: "area-chart", name: "Filled Area Chart", type: "chart", chartType: "area", preview: "Cumulative timeline progress visualization" },
      { id: "scatter-plot", name: "Scatter Plot", type: "chart", chartType: "scatter", preview: "Quality and cost correlation analysis" }
    ]);
    const flowchartsList = [
      { id: "flow-process", name: "Process Flow Block", type: "flowchart", preview: "Sequential stage-by-stage workflow block" },
      { id: "flow-decision", name: "Decision Branch", type: "flowchart", preview: "Conditional Yes / No approval fork" },
      { id: "flow-stage", name: "Milestone Gate", type: "flowchart", preview: "Gatekeeper inspection and validation checkpoint" }
    ];
    const taskCardsList = [
      { id: "task-card-item", name: "Task Card", type: "task-card", preview: "Deliverable task with assignee, priority and due date" },
      { id: "task-card-prog", name: "Progress Card", type: "task-card-progress", preview: "Milestone card with percentage completion tracker" }
    ];
    const materialsList = [
      { id: "boq-table", name: "BOQ Pricing Table", type: "table", preview: "Itemized material quantity and rate schedule" },
      { id: "material-spec", name: "Material Spec Card", type: "card", preview: "Grade, manufacturer, and technical specs" },
      { id: "spec-sheet", name: "Vendor Catalog Block", type: "document-block", preview: "Datasheet attachment with compliance tags" }
    ];
    const calculatorsList = [
      { id: "calc-bricks", name: "Bricks Calculator", type: "cost-calculator", preview: "Estimate bricks, cement bags & sand for a brick wall" },
      { id: "calc-concrete", name: "Concrete Calculator", type: "cost-calculator", preview: "Estimate cement, sand, and aggregate requirements" },
      { id: "calc-blocks", name: "Concrete Blocks Calculator", type: "cost-calculator", preview: "AAC/concrete block count with mortar estimate" },
      { id: "calc-flooring", name: "Flooring Calculator", type: "cost-calculator", preview: "Tile count, boxes, cement & sand for flooring" },
      { id: "calc-vinyl", name: "Vinyl Flooring Calculator", type: "cost-calculator", preview: "Vinyl planks/sheets required for a floor area" },
      { id: "calc-soil", name: "Soil Excavation Calculator", type: "cost-calculator", preview: "Excavation volume and soil disposal estimate" },
      { id: "calc-steel", name: "Steel Estimation Calculator", type: "cost-calculator", preview: "Rebar weight and steel quantity for RCC work" },
      { id: "calc-paint", name: "Painting Estimator", type: "cost-calculator", preview: "Calculate wall square footage and primer/paint coats" },
      { id: "calc-electrical", name: "Electrical Wiring Estimator", type: "cost-calculator", preview: "Conduit length and load point calculator" },
      { id: "boq-generator", name: "BOQ Generator", type: "boq-generator", preview: "Generate professional Bill of Quantities with cost breakdown" },
      { id: "calc-freight", name: "Freight Cost Calculator", type: "logistics-freight-cost", preview: "Calculate freight costs with fuel surcharge and tolls" }
    ];
    const boqGeneratorList = [
      { id: "boq-tpl-blank", name: "Blank BOQ", type: "boq-generator", preview: "Start a Bill of Quantities from scratch" },
      { id: "boq-tpl-civil", name: "Civil Works BOQ", type: "boq-generator", preview: "Template \u2014 earthwork, RCC, masonry & finishing items" },
      { id: "boq-tpl-interior", name: "Interior Fit-Out BOQ", type: "boq-generator", preview: "Template \u2014 partitions, flooring, ceiling & joinery" },
      { id: "boq-tpl-electrical", name: "Electrical BOQ", type: "boq-generator", preview: "Template \u2014 wiring, panels, fixtures & load points" },
      { id: "boq-tpl-plumbing", name: "Plumbing & Sanitary BOQ", type: "boq-generator", preview: "Template \u2014 piping, fittings & sanitary fixtures" },
      { id: "boq-tpl-hvac", name: "HVAC BOQ", type: "boq-generator", preview: "Template \u2014 ducting, AHUs, diffusers & insulation" }
    ];
    const rawSmart = pickList(elementOptions.smart, [
      { id: "smart-note", name: "Smart AI Note", type: "smart-note", nodeType: "smartNote", preview: "AI-assisted sticky note with auto-suggestions" },
      { id: "calendar-event", name: "Calendar Milestone", type: "calendar-event", nodeType: "calendarNode", preview: "Schedule site meetings and inspection checkpoints" },
      { id: "approval-board", name: "Approval Sign-off Board", type: "approval-board", nodeType: "approvalBoard", preview: "Multi-party approval verification card" },
      { id: "ai-helper", name: "AI Workflow Assistant", type: "ai-helper", nodeType: "aiHelper", preview: "Generate workflows, checklists, and scope with AI" }
    ]);
    const cadFilesList = pickList(elementOptions["cad-files"], [
      { id: "cad-files-basic", name: "CAD Files", type: "cad-files", preview: "Upload CAD drawings \u2014 each file is scanned and shown as a card", cadFilesData: { files: [] } },
      { id: "cdr-files-basic", name: "CDR Files", type: "cdr-files", preview: "Upload CorelDRAW .cdr files \u2014 each file shows as a card with SVG preview", cdrFilesData: { files: [] } },
      { id: "floor-plan-basic", name: "Floor Plan 3D", type: "floor-plan", preview: "Upload a floor plan (.dwg .dxf .png .pdf) \u2014 extrude it into a 3D model with specs", floorPlanData: { files: [] } }
    ]);
    const map = {
      "invoices-quotes": invQuotesList,
      "forms": formsList,
      "tables": tablesList,
      "charts": chartsList,
      "flowcharts": flowchartsList,
      "task-card": taskCardsList,
      "materials": materialsList,
      "cad-files": cadFilesList,
      "cost-calculators": calculatorsList,
      "boq-generator": boqGeneratorList,
      "smart": rawSmart
    };
    if (hasTurnkeyMember) {
      map["turnkey"] = pickList(elementOptions.turnkey, [
        { id: "turnkey-workflow", name: "Turnkey Workflow", type: "turnkey-workflow", category: "turnkey", nodeType: "turnkeyNode", preview: "Complete workflow visualization with tasks, resources, and status tracking" }
      ]);
    }
    return map;
  }, [elementOptions, hasTurnkeyMember]);
  const searchResults = useMemo(() => {
    if (!elementsSearch.trim())
      return null;
    const q = elementsSearch.toLowerCase();
    const results = [];
    Object.entries(categoryElementsMap).forEach(([catId, items]) => {
      const catMeta = categories.find((c) => c.id === catId);
      items.forEach((item) => {
        if (item.name?.toLowerCase().includes(q) || item.preview?.toLowerCase().includes(q) || catMeta?.name.toLowerCase().includes(q)) {
          results.push({ ...item, categoryName: catMeta?.name, categoryId: catId });
        }
      });
    });
    return results;
  }, [elementsSearch, categoryElementsMap, categories]);
  if (!isOpen)
    return null;
  const currentCategoryMeta = categories.find((c) => c.id === selectedCategory);
  const currentCategoryElements = selectedCategory ? Array.isArray(categoryElementsMap[selectedCategory]) ? categoryElementsMap[selectedCategory] : [] : [];
  const templateOptions = [
    {
      id: "quotations-invoices",
      name: "Manage Quotations/Invoices",
      icon: FileText,
      description: "Create and manage quotations and invoices for your projects",
      color: "bg-info/10 text-info"
    },
    {
      id: "payments",
      name: "Manage Payments",
      icon: CreditCard,
      description: "Track and manage payment transactions and history",
      color: "bg-success/10 text-success"
    },
    {
      id: "boq",
      name: "Manage BOQ",
      icon: Calculator,
      description: "Bill of Quantities management and cost estimation",
      color: "bg-surface-hover text-ink"
    },
    {
      id: "cost-calculators",
      name: "Cost Calculators",
      icon: Calculator,
      description: "Open construction cost calculators and add results to canvas",
      color: "bg-info/10 text-info"
    },
    {
      id: "procurement-rfq",
      name: "Procurement RFQ Form",
      icon: ClipboardList,
      description: "Create a detailed RFQ and send it directly to procurement",
      color: "bg-warning/10 text-warning"
    },
    {
      id: "execution-work-order",
      name: "Site Work Order",
      icon: ClipboardCheck,
      description: "Issue executable work scope with assignee, location, and due date",
      color: "bg-info/10 text-info"
    },
    {
      id: "execution-rfi",
      name: "RFI / Clarification",
      icon: HelpCircle,
      description: "Raise technical queries linked to drawings and execution blockers",
      color: "bg-info/10 text-info"
    },
    {
      id: "execution-inspection",
      name: "Inspection Request",
      icon: ShieldCheck,
      description: "Create QA/QC checkpoints for execution stages and approvals",
      color: "bg-surface-hover text-ink"
    },
    {
      id: "execution-daily-site-log",
      name: "Daily Site Log",
      icon: CloudSun,
      description: "Capture daily work done, labor, equipment, blockers, and weather",
      color: "bg-warning/10 text-warning"
    }
  ];
  const agents = [
    {
      id: "atlas",
      name: "Atlas",
      role: "Canvas Builder",
      desc: "Describe a workflow in plain language \u2014 Atlas lays out connected elements (quotations, approvals, invoices\u2026) on the canvas for you to review.",
      icon: Sparkles,
      color: "violet"
    }
  ];
  const layoutPatterns = [
    { type: "rows", name: "Row Stack", desc: "Vertical sequential blocks", icon: Rows },
    { type: "columns", name: "Columns (Split)", desc: "Side-by-side comparison", icon: Columns },
    { type: "grid", name: "2 \xD7 2 Grid", desc: "Balanced card layout", icon: Grid3X3 },
    { type: "frame", name: "Container Frame", desc: "Group bounded area", icon: Square }
  ];
  return /* @__PURE__ */ React.createElement("aside", { className: "ws-panel", "data-workspace-panel": true }, activeTab === "elements" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, selectedCategory ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setSelectedCategory(null),
      className: "p-1 -ml-1 text-dim hover:text-ink hover:bg-surface-hover rounded-md transition-colors",
      title: "Back to all categories"
    },
    /* @__PURE__ */ React.createElement(ArrowLeft, { className: "w-4 h-4" })
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, currentCategoryMeta?.name || "Category"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, currentCategoryElements.length, " elements available"))) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Elements"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "Drag any block onto the canvas or click to place.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "ws-panel-body" }, /* @__PURE__ */ React.createElement("div", { className: "relative mb-3" }, /* @__PURE__ */ React.createElement(Search, { className: "w-3.5 h-3.5 text-dim absolute left-2.5 top-1/2 -translate-y-1/2 " }), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: elementsSearch,
      onChange: (e) => setElementsSearch(e.target.value),
      placeholder: "Search blocks across categories...",
      className: "w-full pl-8 pr-7 py-1.5 text-xs bg-canvas border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-info focus:bg-surface transition-colors"
    }
  ), elementsSearch && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setElementsSearch(""),
      className: "absolute right-2 top-1/2 -translate-y-1/2  text-dim hover:text-dim"
    },
    /* @__PURE__ */ React.createElement(X, { className: "w-3.5 h-3.5" })
  )), searchResults ? /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-dim font-medium mb-1" }, "Found ", searchResults.length, " element", searchResults.length === 1 ? "" : "s", ":"), searchResults.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 text-xs text-dim" }, 'No elements found matching "', elementsSearch, '"') : searchResults.map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.id,
      draggable: true,
      onDragStart: (e) => handleDragStart(e, item),
      onClick: () => handleDoubleClick(item),
      className: "p-3 bg-surface border border-line hover:border-info  hover:bg-info rounded-xl cursor-grab active:cursor-grabbing transition-all group relative",
      title: "Drag to canvas or click to add"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-ink group-hover:text-info truncate" }, item.name), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-dim font-medium" }, item.categoryName)), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-dim line-clamp-2 leading-relaxed m-0" }, item.preview)), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          handleDoubleClick(item);
        },
        className: "opacity-0 group-hover:opacity-100 px-2 py-1 bg-info hover:bg-info text-white rounded text-[10px] font-semibold transition-opacity flex-shrink-0",
        title: "Place on canvas"
      },
      "+ Add"
    ))
  ))) : selectedCategory ? (
    /* B. If Drilled into a Specific Category */
    /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between pb-1 border-b border-line mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] font-semibold text-ink uppercase tracking-wide" }, "Elements in ", currentCategoryMeta?.name), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-dim" }, "Drag to canvas")), selectedCategory === "boq-generator" && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onTemplateSelect?.("boq"),
        className: "w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-black hover:bg-slate-800 rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement(Plus, { className: "w-3.5 h-3.5" }),
      "Custom BOQ"
    ), currentCategoryElements.map((item) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: item.id,
        draggable: true,
        onDragStart: (e) => handleDragStart(e, item),
        onClick: () => handleDoubleClick(item),
        className: "p-3 bg-surface border border-line hover:border-info  hover:bg-info rounded-xl cursor-grab active:cursor-grabbing transition-all group relative",
        title: "Drag to canvas or click to add"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-semibold text-ink group-hover:text-info mb-1 truncate" }, item.name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-dim line-clamp-2 leading-relaxed m-0" }, item.preview)), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            handleDoubleClick(item);
          },
          className: "opacity-0 group-hover:opacity-100 px-2 py-1 bg-info hover:bg-info text-white rounded text-[10px] font-semibold transition-opacity flex-shrink-0",
          title: "Place on canvas"
        },
        "+ Add"
      ))
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setSelectedCategory(null),
        className: "w-full mt-3 py-2 text-xs text-dim hover:text-ink bg-canvas hover:bg-surface-hover border border-line rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(ArrowLeft, { className: "w-3.5 h-3.5" }),
      /* @__PURE__ */ React.createElement("span", null, "View All Categories")
    ))
  ) : (
    /* C. Default Overview View with Quick Chips + Categories */
    /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ws-section-label" }, "Layout"), /* @__PURE__ */ React.createElement("div", { className: "ws-chip-grid" }, layoutChips.map((chip) => {
      const Icon = chip.icon;
      const elementData = {
        type: chip.type,
        name: chip.label,
        label: chip.label,
        id: `${chip.type}-${Date.now()}`
      };
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: chip.type,
          className: "ws-chip",
          draggable: true,
          onDragStart: (e) => handleDragStart(e, elementData),
          onClick: () => handleDoubleClick(elementData),
          title: "Drag to canvas or click to place"
        },
        /* @__PURE__ */ React.createElement(Icon, null),
        /* @__PURE__ */ React.createElement("span", null, chip.label)
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "ws-section-label" }, "Inputs"), /* @__PURE__ */ React.createElement("div", { className: "ws-chip-grid" }, inputChips.map((chip) => {
      const Icon = chip.icon;
      const elementData = {
        type: chip.type,
        name: chip.label,
        label: chip.label,
        id: `${chip.type}-${Date.now()}`
      };
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: chip.type,
          className: "ws-chip",
          draggable: true,
          onDragStart: (e) => handleDragStart(e, elementData),
          onClick: () => handleDoubleClick(elementData),
          title: "Drag to canvas or click to place"
        },
        /* @__PURE__ */ React.createElement(Icon, null),
        /* @__PURE__ */ React.createElement("span", null, chip.label)
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "ws-section-label" }, "Categories"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, categories.map((cat) => {
      const CatIcon = cat.icon;
      const count = (categoryElementsMap[cat.id] || []).length;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: cat.id,
          onClick: () => setSelectedCategory(cat.id),
          className: "flex items-center justify-between p-2.5 bg-surface hover:bg-info border border-line hover:border-info/30 rounded-lg cursor-pointer transition-all text-xs group",
          title: `Click to open ${cat.name} elements`
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: `p-1.5 rounded-md border flex-shrink-0 ${cat.color}` }, /* @__PURE__ */ React.createElement(CatIcon, { className: "w-3.5 h-3.5" })), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink group-hover:text-info truncate" }, cat.name)),
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 flex-shrink-0 text-dim group-hover:text-info" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10.5px]" }, count, " items"), /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-3.5 h-3.5" }))
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "ws-hint-box" }, "Click any category to browse all available elements and drag them directly onto your canvas."))
  ))), activeTab === "text" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Text"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "Click anywhere on the canvas to type.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "ws-panel-body" }, /* @__PURE__ */ React.createElement("div", { className: "ws-hint-box" }, "Click the ", /* @__PURE__ */ React.createElement("strong", null, "Text"), " tool in the dock to toggle text mode. With the I-beam cursor active, click anywhere on the canvas and start typing \u2014 text is placed as a caption, not a card. Click the Text tool again (or press Escape) to stop. Select any placed text to adjust font, size, color, and alignment from the inspector."))), activeTab === "templates" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Templates"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "Choose a template to get started.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "ws-panel-body" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, templateOptions.map((tpl) => {
    const TplIcon = tpl.icon;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: tpl.id,
        onClick: () => onTemplateSelect && onTemplateSelect(tpl.id),
        className: "w-full p-3 bg-surface border border-line hover:border-info/30 hover:bg-info rounded-lg transition-all flex items-start gap-3 text-left group",
        title: tpl.name
      },
      /* @__PURE__ */ React.createElement("div", { className: `p-2 rounded-md flex-shrink-0 ${tpl.color}` }, /* @__PURE__ */ React.createElement(TplIcon, { className: "w-4 h-4" })),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-ink m-0 group-hover:text-info" }, tpl.name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-dim m-0 mt-0.5 leading-relaxed" }, tpl.description)),
      /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-3.5 h-3.5 text-dim group-hover:text-info flex-shrink-0 mt-1" })
    );
  })), /* @__PURE__ */ React.createElement("div", { className: "ws-hint-box" }, "More templates coming soon."))), activeTab === "workflow" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Workflow Builder"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "Chain and configure approval steps.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "ws-panel-body" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onWorkflowBuilderClick,
      className: "w-full flex items-center justify-center gap-2 p-2.5 bg-info hover:bg-info text-white rounded-lg text-xs font-semibold  transition-all mb-4"
    },
    /* @__PURE__ */ React.createElement(GitBranch, { className: "w-4 h-4" }),
    /* @__PURE__ */ React.createElement("span", null, "Launch Workflow Builder")
  ), /* @__PURE__ */ React.createElement("div", { className: "ws-section-label" }, "Workflow Steps"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-canvas border border-line rounded-lg text-xs text-dim flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "w-5 h-5 rounded-full bg-info/10 text-info font-bold flex items-center justify-center text-[10px]" }, "1"), /* @__PURE__ */ React.createElement("span", null, "Vendor Submission")), /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-canvas border border-line rounded-lg text-xs text-dim flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "w-5 h-5 rounded-full bg-warning/10 text-warning font-bold flex items-center justify-center text-[10px]" }, "2"), /* @__PURE__ */ React.createElement("span", null, "PM Technical Review")), /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-canvas border border-line rounded-lg text-xs text-dim flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "w-5 h-5 rounded-full bg-surface-hover text-ink font-bold flex items-center justify-center text-[10px]" }, "3"), /* @__PURE__ */ React.createElement("span", null, "Client Final Approval"))))), activeTab === "layouts" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Layouts"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "Pre-configured structural wireframes.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "ws-panel-body" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2.5" }, layoutPatterns.map((pat) => {
    const Icon = pat.icon;
    const layoutData = { type: pat.type, name: pat.name, label: pat.name };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: pat.type,
        draggable: true,
        onDragStart: (e) => handleDragStart(e, layoutData),
        onClick: () => handleDoubleClick(layoutData),
        className: "p-3 bg-surface border border-line hover:border-info/30 hover:bg-info rounded-lg cursor-grab active:cursor-grabbing transition-all flex items-start gap-3"
      },
      /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-canvas rounded-md text-dim" }, /* @__PURE__ */ React.createElement(Icon, { className: "w-4 h-4" })),
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-ink m-0" }, pat.name), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-dim m-0 mt-0.5" }, pat.desc))
    );
  })))), activeTab === "tasks" && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Tasks"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "Manage project scope and subtasks.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto" }, /* @__PURE__ */ React.createElement(
    TaskTab,
    {
      tasks,
      selectedTask,
      selectedSubtask,
      onTaskClick,
      onSubtaskClick,
      onShowAddTaskModal,
      onQuickAddTask,
      onRenameTask,
      onUpdateTask,
      memberOptions,
      workspace,
      userRole,
      onLeaveWorkspace
    }
  ))), activeTab === "layers" && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Layers"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "All elements placed on the canvas.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-3" }, canvasElements && canvasElements.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, canvasElements.map((el) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: el.id,
      onClick: () => onZoomToElement && onZoomToElement(el.id),
      className: "flex items-center justify-between p-2 bg-surface border border-line hover:border-info/30 rounded-lg text-xs cursor-pointer hover:bg-info transition-colors group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 truncate" }, /* @__PURE__ */ React.createElement(Square, { className: "w-3.5 h-3.5 text-dim" }), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink truncate" }, el.data?.title || el.data?.name || el.data?.label || el.type || "Element")),
    onDeleteElement && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          onDeleteElement(el.id);
        },
        className: "opacity-0 group-hover:opacity-100 p-1 hover:bg-danger/10 text-dim hover:text-danger rounded transition-opacity",
        title: "Delete element"
      },
      /* @__PURE__ */ React.createElement(Trash2, { className: "w-3.5 h-3.5" })
    )
  ))) : selectedTask ? /* @__PURE__ */ React.createElement(
    LayersTab,
    {
      selectedTask,
      selectedSubtask,
      onSubtaskClick
    }
  ) : /* @__PURE__ */ React.createElement("div", { className: "text-center py-12 text-xs text-dim" }, "Nothing on the canvas yet.", /* @__PURE__ */ React.createElement("br", null), "Drag a block from Elements to begin."))), activeTab === "assets" && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Assets"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "Shared files, drawings, and documents.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto" }, /* @__PURE__ */ React.createElement(
    AssetsTab,
    {
      selectedSubtask,
      workspaceId: workspace?.workspaceId
    }
  ))), activeTab === "agent" && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "ws-panel-head" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "ws-panel-title" }, "Agents"), /* @__PURE__ */ React.createElement("p", { className: "ws-panel-desc" }, "AI assistants for this workspace.")), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "ws-icon-btn", title: "Close panel" }, /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" }))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-3 space-y-2" }, agents.map((agent) => {
    const AgentIcon = agent.icon;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: agent.id,
        onClick: () => onLaunchAgent?.(agent.id),
        className: "w-full text-left group border border-line rounded-xl p-3 hover:border-line hover:bg-cta transition-colors"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-surface-hover rounded-lg group-hover:bg-surface-hover transition-colors" }, /* @__PURE__ */ React.createElement(AgentIcon, { className: "w-4 h-4 text-ink" })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-ink" }, agent.name), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] text-ink font-medium" }, agent.role)), /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-4 h-4 text-dim group-hover:text-ink transition-colors" })),
      /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim leading-relaxed mt-2 hidden group-hover:block" }, agent.desc)
    );
  }))));
};
var WorkspaceContextPanel_default = WorkspaceContextPanel;
export {
  WorkspaceContextPanel_default as default
};
