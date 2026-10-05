import React, { useRef, useState } from "react";
import { Grid, Table, BarChart3, Square, List, X, GitBranch, Package, Upload, FileText, Image, FileSpreadsheet, Plus, File, Settings, Workflow, FileDigit, FileCheck, Clock, AlertCircle, ClipboardList, FileSpreadsheet as FileSpreadsheetIcon, Sparkles, Calendar, CheckCircle, StickyNote, ClipboardCheck, Minus, ArrowDown, Box, LayoutGrid, CheckSquare, TrendingUp, Calculator, Layers } from "lucide-react";
import { useUpload } from "./forms/UploadManager";
import ManageBOQModal from "./ManageBOQModal";
import CustomBOQModal from "./CustomBOQModal";
const getFileIcon = (fileName) => {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension)) {
    return Image;
  } else if (["xlsx", "xls", "csv", "ods"].includes(extension)) {
    return FileSpreadsheet;
  } else if (["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(extension)) {
    return FileText;
  } else {
    return File;
  }
};
const getFileTypeColor = (fileName) => {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension)) {
    return "bg-success/10 border-success/30 text-success";
  } else if (["xlsx", "xls", "csv", "ods"].includes(extension)) {
    return "bg-surface-hover border-line text-ink";
  } else if (["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(extension)) {
    return "bg-info/10 border-info/30 text-info";
  } else {
    return "bg-surface-hover border-line text-ink";
  }
};
const formatFileSize = (bytes) => {
  if (bytes === 0)
    return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
const DraggableFileCard = ({ file }) => {
  const { removeFile } = useUpload();
  const FileIcon = getFileIcon(file.name);
  const colorClass = getFileTypeColor(file.name);
  const isImage = file.type?.startsWith("image/");
  const handleDragStart = (event) => {
    const fileElement = {
      id: `file_${file.id}`,
      name: file.name,
      type: "file",
      preview: `Uploaded file: ${file.name}`,
      fileData: {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        uploadedAt: file.uploadedAt
      }
    };
    const fileJson = JSON.stringify(fileElement);
    event.dataTransfer.setData("application/json", fileJson);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", file.name);
    const dragImage = new Image();
    dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%233b82f6" width="60" height="60" rx="8"/%3E%3Ctext x="30" y="30" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E\u{1F4C4}%3C/text%3E%3C/svg%3E';
    event.dataTransfer.setDragImage(dragImage, 30, 30);
    console.log("\u{1F4C1} File drag started:", fileElement);
  };
  const handleDoubleClick = () => {
    const fileElement = {
      id: `file_${file.id}`,
      name: file.name,
      type: "file",
      preview: `Uploaded file: ${file.name}`,
      fileData: {
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        uploadedAt: file.uploadedAt
      }
    };
    const event = new CustomEvent("elementDoubleClick", { detail: fileElement });
    document.dispatchEvent(event);
    console.log("\u{1F4C1} File double-click event dispatched:", fileElement);
  };
  if (isImage) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        draggable: true,
        onDragStart: handleDragStart,
        onDoubleClick: handleDoubleClick,
        className: "-mx-2 relative cursor-move  transition-all duration-200 overflow-hidden group",
        title: "Drag to canvas or double-click to add"
      },
      /* @__PURE__ */ React.createElement(
        "img",
        {
          src: file.url,
          alt: file.name,
          className: "w-full h-32 object-cover",
          onError: (e) => {
            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="%236b7280"%3EImage Error%3C/text%3E%3C/svg%3E';
          }
        }
      ),
      /* @__PURE__ */ React.createElement("div", { className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-white truncate", title: file.name }, file.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim" }, formatFileSize(file.size))),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            removeFile(file.id);
          },
          className: "absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-danger hover:text-danger transition-opacity bg-surface rounded-full p-1 ",
          title: "Remove file"
        },
        /* @__PURE__ */ React.createElement(X, { className: "w-3 h-3" })
      )
    );
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      draggable: true,
      onDragStart: handleDragStart,
      onDoubleClick: handleDoubleClick,
      className: `p-2 rounded-lg border-2 ${colorClass} group relative cursor-move  transition-all duration-200`,
      title: "Drag to canvas or double-click to add"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-start space-x-2" }, /* @__PURE__ */ React.createElement(FileIcon, { className: "w-4 h-4 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium truncate", title: file.name }, file.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-75" }, formatFileSize(file.size)))),
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          removeFile(file.id);
        },
        className: "absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-danger hover:text-danger transition-opacity bg-surface rounded-full p-0.5",
        title: "Remove file"
      },
      /* @__PURE__ */ React.createElement(X, { className: "w-2.5 h-2.5" })
    )
  );
};
const UploadsSection = () => {
  const { uploadedFiles, addFiles } = useUpload();
  const fileInputRef = useRef(null);
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      addFiles(files);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleFileSelect,
      className: "w-full flex items-center justify-center space-x-1.5 p-2 bg-black text-white rounded-lg hover:from-black hover:to-black transition-all duration-200 "
    },
    /* @__PURE__ */ React.createElement(Upload, { className: "w-3.5 h-3.5" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium" }, "Upload Files")
  ), /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: fileInputRef,
      type: "file",
      multiple: true,
      className: "hidden",
      onChange: handleFileInputChange,
      accept: "*/*"
    }
  ), uploadedFiles.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 overflow-hidden" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim font-medium" }, "Uploaded Files (", uploadedFiles.length, ")"), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5 max-h-80 overflow-y-auto overflow-x-hidden" }, uploadedFiles.map((file) => /* @__PURE__ */ React.createElement(DraggableFileCard, { key: file.id, file })))), uploadedFiles.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center py-3 text-dim" }, /* @__PURE__ */ React.createElement(Upload, { className: "w-6 h-6 mx-auto mb-1 opacity-50" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs" }, "No files uploaded yet")));
};
const InvoiceQuoteCard = ({ item, onDocumentClick }) => {
  const handleDragStart = (event) => {
    console.log("\u{1F680} INVOICE/QUOTE DRAG START EVENT FIRED!", event);
    const elementJson = JSON.stringify({
      ...item,
      type: item.type === "invoice" ? "invoice" : "quotation",
      preview: `${item.type === "invoice" ? "Invoice" : "Quotation"}: ${item.name}`
    });
    event.dataTransfer.setData("application/json", elementJson);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", item.name);
    const dragImage = new Image();
    dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%233b82f6" width="60" height="60" rx="8"/%3E%3Ctext x="30" y="30" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E\u{1F4CB}%3C/text%3E%3C/svg%3E';
    event.dataTransfer.setDragImage(dragImage, 30, 30);
    console.log("\u{1F4C4} Invoice/Quote drag started:", item.name);
  };
  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("\u{1F4C4} Document clicked:", item);
    if (onDocumentClick) {
      onDocumentClick(item);
    }
  };
  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "paid":
        return /* @__PURE__ */ React.createElement(FileCheck, { className: "w-4 h-4" });
      case "pending":
        return /* @__PURE__ */ React.createElement(Clock, { className: "w-4 h-4" });
      case "overdue":
        return /* @__PURE__ */ React.createElement(AlertCircle, { className: "w-4 h-4" });
      default:
        return /* @__PURE__ */ React.createElement(FileText, { className: "w-4 h-4" });
    }
  };
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-success/10 text-success";
      case "pending":
      case "draft":
        return "bg-warning/10 text-warning";
      case "overdue":
        return "bg-danger/10 text-danger";
      default:
        return "bg-surface-hover text-ink";
    }
  };
  const getDocumentTypeColor = (type) => {
    switch (type) {
      case "invoice":
        return "bg-black";
      case "quotation":
        return "bg-black";
      case "credit-note":
        return "bg-black";
      case "purchase-order":
        return "bg-black";
      default:
        return "bg-surface";
    }
  };
  const getDocumentTypeAbbreviation = (type) => {
    switch (type) {
      case "invoice":
        return "INV";
      case "quotation":
        return "QTE";
      case "credit-note":
        return "CRN";
      case "purchase-order":
        return "PO";
      default:
        return "DOC";
    }
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      draggable: true,
      onDragStart: handleDragStart,
      onClick: handleClick,
      className: "group -mx-2 relative cursor-pointer  transition-all duration-200 overflow-hidden",
      title: "Click to view details or drag to canvas"
    },
    /* @__PURE__ */ React.createElement("div", { className: `w-full h-40 rounded-lg flex flex-col p-4 text-white relative overflow-hidden ${getDocumentTypeColor(item.type)}` }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 opacity-10" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-0 w-32 h-32 bg-surface rounded-full -translate-x-8 " }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-0 right-0 w-40 h-40 bg-surface rounded-full translate-x-12 " })), /* @__PURE__ */ React.createElement("div", { className: "relative z-10 flex-1 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold opacity-90" }, getDocumentTypeAbbreviation(item.type)), /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded bg-white/20" }, /* @__PURE__ */ React.createElement(FileText, { className: "w-3 h-3" }))), /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold line-clamp-2 mb-2" }, item.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs opacity-90 line-clamp-1 mb-3" }, item.preview)), /* @__PURE__ */ React.createElement("div", { className: "relative z-10 space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "opacity-80" }, item.date), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-sm" }, item.amount)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: `text-[10px] px-2 py-1 rounded-full font-semibold inline-flex items-center space-x-1 ${getStatusColor(item.status)}` }, getStatusIcon(item.status), /* @__PURE__ */ React.createElement("span", null, item.status))))),
    /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all pointer-events-none" })
  );
};
const createSerializableElement = (element) => {
  const cleanElement = {
    id: element.id,
    name: element.name,
    type: element.type,
    preview: element.preview,
    nodeType: element.nodeType,
    data: element.data ? { ...element.data } : null
    // Add any other necessary properties that don't contain circular references
  };
  if (element.type === "smart-note" || element.nodeType === "smartNote") {
    cleanElement.nodeType = "smartNote";
    cleanElement.data = {
      label: element.data?.label || element.name || "Smart Note",
      // Add any other Smart Note specific data
      ...element.data || {}
    };
  }
  if (element.type === "credit-note" || element.nodeType === "creditNote") {
    cleanElement.nodeType = "creditNote";
    cleanElement.data = {
      creditNoteNumber: element.data?.creditNoteNumber || "",
      customerName: element.data?.customerName || "",
      originalInvoice: element.data?.originalInvoice || "",
      creditAmount: element.data?.creditAmount || "",
      reason: element.data?.reason || "",
      notes: element.data?.notes || "",
      status: element.data?.status || "draft",
      ...element.data || {}
    };
  }
  if (element.type === "invoice" || element.nodeType === "invoice") {
    cleanElement.nodeType = "invoice";
    cleanElement.data = {
      invoiceNumber: element.data?.invoiceNumber || "",
      customerName: element.data?.customerName || "",
      invoiceDate: element.data?.invoiceDate || "",
      dueDate: element.data?.dueDate || "",
      subtotal: element.data?.subtotal || "",
      tax: element.data?.tax || "",
      total: element.data?.total || "",
      status: element.data?.status || "draft",
      items: element.data?.items || [],
      ...element.data || {}
    };
  }
  if (element.type === "quotation" || element.nodeType === "quotation") {
    cleanElement.nodeType = "quotation";
    cleanElement.data = {
      quotationNumber: element.data?.quotationNumber || "",
      customerName: element.data?.customerName || "",
      validUntil: element.data?.validUntil || "",
      subtotal: element.data?.subtotal || "",
      tax: element.data?.tax || "",
      total: element.data?.total || "",
      status: element.data?.status || "draft",
      items: element.data?.items || [],
      ...element.data || {}
    };
  }
  if (element.type === "purchase-order" || element.nodeType === "purchaseOrder") {
    cleanElement.nodeType = "purchaseOrder";
    cleanElement.data = {
      poNumber: element.data?.poNumber || "",
      vendorName: element.data?.vendorName || "",
      orderDate: element.data?.orderDate || "",
      expectedDelivery: element.data?.expectedDelivery || "",
      subtotal: element.data?.subtotal || "",
      tax: element.data?.tax || "",
      total: element.data?.total || "",
      status: element.data?.status || "draft",
      items: element.data?.items || [],
      ...element.data || {}
    };
  }
  if (element.type === "info-card" || element.nodeType === "infoCard") {
    cleanElement.nodeType = "infoCard";
    cleanElement.data = {
      title: element.data?.title || "Info Card",
      content: element.data?.content || "",
      cardType: element.data?.cardType || "info",
      priority: element.data?.priority || "medium",
      status: element.data?.status || "active",
      dueDate: element.data?.dueDate || "",
      ...element.data || {}
    };
  }
  if (element.type === "form-card" || element.nodeType === "formCard") {
    cleanElement.nodeType = "formCard";
    cleanElement.data = {
      title: element.data?.title || "Form Card",
      fields: element.data?.fields || [
        { id: "field1", label: "Field 1", type: "text", required: false },
        { id: "field2", label: "Field 2", type: "text", required: false }
      ],
      submitButton: element.data?.submitButton || "Submit",
      status: element.data?.status || "draft",
      ...element.data || {}
    };
  }
  return cleanElement;
};
const DraggableElement = ({ element }) => {
  const handleDragStart = (event) => {
    console.log("\u{1F680} DRAG START EVENT FIRED!", event);
    const cleanElement = createSerializableElement(element);
    const elementJson = JSON.stringify(cleanElement);
    event.dataTransfer.setData("application/json", elementJson);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", element.name);
    const dragImage = new Image();
    dragImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60"%3E%3Crect fill="%233b82f6" width="60" height="60" rx="8"/%3E%3Ctext x="30" y="30" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3E+%3C/text%3E%3C/svg%3E';
    event.dataTransfer.setDragImage(dragImage, 30, 30);
    console.log("\u{1F680} Drag started for element:", element.name);
    console.log("\u{1F4E6} Clean element data being transferred:", cleanElement);
    console.log("\u2705 DataTransfer types:", event.dataTransfer.types);
  };
  const handleDoubleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("\u{1F5B1}\uFE0F Double-click detected for element:", element.name);
    const elementDropEvent = new CustomEvent("elementDoubleClick", {
      detail: element
    });
    document.dispatchEvent(elementDropEvent);
    console.log("\u{1F4E1} Element double-click event dispatched:", element);
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      draggable: true,
      onDragStart: handleDragStart,
      onDoubleClick: handleDoubleClick,
      className: "group p-5 bg-surface rounded-xl border border-line hover:border-info transition-all duration-300 cursor-move relative flex flex-col space-y-3 hover:bg-gradient-to-br hover:from-black hover:to-surface",
      title: "Drag to canvas or double-click to add"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-14 h-14 bg-gradient-to-br from-surface-hover to-surface rounded-xl border border-line flex items-center justify-center flex-shrink-0 group-hover:border-info/30 transition-all duration-300" }, element.type === "textarea" && /* @__PURE__ */ React.createElement("div", { className: "w-6 h-4 border border-line rounded" }), element.type === "textbox" && /* @__PURE__ */ React.createElement("div", { className: "w-6 h-3 border border-line rounded" }), element.type === "button" && /* @__PURE__ */ React.createElement("div", { className: "w-6 h-3 bg-cta rounded" }), element.type === "input" && /* @__PURE__ */ React.createElement("div", { className: "w-6 h-0.5 bg-cta" }), element.type === "select" && /* @__PURE__ */ React.createElement("div", { className: "w-6 h-3 border border-line rounded flex items-center justify-end px-1" }, /* @__PURE__ */ React.createElement("div", { className: "w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-400" })), element.type === "radio" && /* @__PURE__ */ React.createElement("div", { className: "w-4 h-4 border-2 border-line rounded-full" }), element.type === "checkbox" && /* @__PURE__ */ React.createElement("div", { className: "w-4 h-4 border-2 border-line rounded" }), element.type === "dropdown" && /* @__PURE__ */ React.createElement("div", { className: "w-6 h-3 border border-line rounded flex items-center justify-end px-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-dim text-xs" }, "\u25BC")), element.type === "table" && /* @__PURE__ */ React.createElement(Grid, { className: "w-6 h-6 text-dim" }), element.type === "chart" && /* @__PURE__ */ React.createElement(BarChart3, { className: "w-6 h-6 text-dim" }), element.type === "icon" && /* @__PURE__ */ React.createElement(Square, { className: "w-6 h-6 text-dim" }), element.type === "list" && /* @__PURE__ */ React.createElement(List, { className: "w-6 h-6 text-dim" }), element.type === "turnkey-workflow" && /* @__PURE__ */ React.createElement(Settings, { className: "w-6 h-6 text-info" }), element.type === "form-template" && /* @__PURE__ */ React.createElement("div", { className: "w-6 h-6 border-2 border-line rounded flex flex-col items-center justify-center space-y-0.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-4 h-0.5 bg-cta rounded" }), /* @__PURE__ */ React.createElement("div", { className: "w-3 h-0.5 bg-cta rounded" }), /* @__PURE__ */ React.createElement("div", { className: "w-4 h-0.5 bg-cta rounded" })), element.type === "flowchart" && /* @__PURE__ */ React.createElement(GitBranch, { className: "w-6 h-6 text-dim" }), element.type === "materials" && /* @__PURE__ */ React.createElement(Package, { className: "w-6 h-6 text-dim" }), element.type === "upload" && /* @__PURE__ */ React.createElement(React.Fragment, null, element.id === "upload-area" && /* @__PURE__ */ React.createElement(Upload, { className: "w-6 h-6 text-dim" }), element.fileType === "image" && /* @__PURE__ */ React.createElement(Image, { className: "w-6 h-6 text-dim" }), element.fileType === "document" && /* @__PURE__ */ React.createElement(FileText, { className: "w-6 h-6 text-dim" }), element.fileType === "spreadsheet" && /* @__PURE__ */ React.createElement(FileSpreadsheet, { className: "w-6 h-6 text-dim" }), !element.fileType && element.id !== "upload-area" && /* @__PURE__ */ React.createElement(FileText, { className: "w-6 h-6 text-dim" })), element.type === "cad-files" && /* @__PURE__ */ React.createElement(FileDigit, { className: "w-6 h-6 text-indigo-600" }), element.type === "cdr-files" && /* @__PURE__ */ React.createElement(FileDigit, { className: "w-6 h-6 text-orange-600" }), element.type === "floor-plan" && /* @__PURE__ */ React.createElement(Box, { className: "w-6 h-6 text-emerald-600" }), (element.type === "smart-note" || element.nodeType === "smartNote") && /* @__PURE__ */ React.createElement(StickyNote, { className: "w-6 h-6 text-warning" }), (element.type === "calendar-event" || element.nodeType === "calendarNode") && /* @__PURE__ */ React.createElement(Calendar, { className: "w-6 h-6 text-info" }), (element.type === "approval-board" || element.nodeType === "approvalBoard") && /* @__PURE__ */ React.createElement(ClipboardCheck, { className: "w-6 h-6 text-success" }), element.type === "divider" && /* @__PURE__ */ React.createElement(Minus, { className: "w-6 h-6 text-dim" }), element.type === "spacer" && /* @__PURE__ */ React.createElement(ArrowDown, { className: "w-6 h-6 text-dim" }), element.type === "container" && /* @__PURE__ */ React.createElement(Box, { className: "w-6 h-6 text-dim" }), element.type === "grid" && /* @__PURE__ */ React.createElement(LayoutGrid, { className: "w-6 h-6 text-dim" }), element.type === "task-card" && /* @__PURE__ */ React.createElement(CheckSquare, { className: "w-6 h-6 text-ink" }), element.type === "task-card-progress" && /* @__PURE__ */ React.createElement(TrendingUp, { className: "w-6 h-6 text-ink" }), element.type === "cost-calculator" && element.elementIcon && element.elementIcon, element.type === "boq-generator" && /* @__PURE__ */ React.createElement(FileDigit, { className: "w-6 h-6 text-indigo-600" }), element.type === "logistics-shipment" && /* @__PURE__ */ React.createElement(Package, { className: "w-6 h-6 text-info" }), element.type === "logistics-freight-cost" && /* @__PURE__ */ React.createElement(Calculator, { className: "w-6 h-6 text-ink" }), element.type === "logistics-route-optimization" && /* @__PURE__ */ React.createElement(TrendingUp, { className: "w-6 h-6 text-warning" }), element.type === "logistics-pod" && /* @__PURE__ */ React.createElement(FileCheck, { className: "w-6 h-6 text-success" }), element.type === "logistics-exception-report" && /* @__PURE__ */ React.createElement(AlertCircle, { className: "w-6 h-6 text-danger" }), element.type === "logistics-carrier-scorecard" && /* @__PURE__ */ React.createElement(BarChart3, { className: "w-6 h-6 text-info" })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-ink group-hover:text-info transition-colors truncate" }, element.name))),
    /* @__PURE__ */ React.createElement("div", { className: "text-left" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim leading-relaxed line-clamp-2" }, element.preview)),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between pt-2 border-t border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim group-hover:text-info transition-colors" }, "Drag or double-click"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" }, /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 bg-info rounded-full" }), /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 bg-info rounded-full" }), /* @__PURE__ */ React.createElement("div", { className: "w-1.5 h-1.5 bg-info rounded-full" })))
  );
};
const ElementsPanel = ({
  selectedCategory,
  elementOptions = {},
  onClose,
  onBackToCategories,
  onDocumentClick
}) => {
  const [showManageBOQ, setShowManageBOQ] = useState(false);
  const [showCustomBOQ, setShowCustomBOQ] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  console.log("\u{1F4CA} ElementsPanel props:", { selectedCategory, elementOptions });
  const handleDocumentClick = (document2) => {
    console.log("\u{1F4C4} Document click handler:", document2);
    if (onDocumentClick) {
      onDocumentClick(document2);
    }
  };
  const handleDocumentTypeFilter = (type) => {
    setDocumentTypeFilter(type);
  };
  const categories = {
    forms: {
      name: "Forms",
      icon: /* @__PURE__ */ React.createElement(Grid, { className: "w-5 h-5" }),
      elements: [
        { id: "form-template", name: "Form Template", type: "form-template", preview: "Ready-made form with basic fields" },
        { id: "textarea", name: "TextArea", type: "textarea", preview: "Large text input area" },
        { id: "textbox", name: "TextBox", type: "textbox", preview: "Single line text input" },
        { id: "dropdown", name: "Dropdown", type: "dropdown", preview: "Dropdown menu" }
      ]
    },
    tables: {
      name: "Tables",
      icon: /* @__PURE__ */ React.createElement(Table, { className: "w-5 h-5" }),
      elements: [
        { id: "basic-table", name: "Basic Table", type: "table", preview: "Simple data table" },
        { id: "sortable-table", name: "Sortable Table", type: "table", preview: "Table with sorting" },
        { id: "filterable-table", name: "Filterable Table", type: "table", preview: "Table with filters" },
        { id: "paginated-table", name: "Paginated Table", type: "table", preview: "Table with pagination" },
        { id: "editable-table", name: "Editable Table", type: "table", preview: "In-line editing table" },
        { id: "expandable-table", name: "Expandable Table", type: "table", preview: "Expandable rows" }
      ]
    },
    charts: {
      name: "Charts",
      icon: /* @__PURE__ */ React.createElement(BarChart3, { className: "w-5 h-5" }),
      elements: [
        { id: "bar-chart", name: "Bar Chart", type: "chart", preview: "Vertical bar chart" },
        { id: "line-chart", name: "Line Chart", type: "chart", preview: "Line graph" },
        { id: "pie-chart", name: "Pie Chart", type: "chart", preview: "Circular chart" },
        { id: "area-chart", name: "Area Chart", type: "chart", preview: "Filled area chart" },
        { id: "donut-chart", name: "Donut Chart", type: "chart", preview: "Ring chart" },
        { id: "scatter-plot", name: "Scatter Plot", type: "chart", preview: "Dot plot chart" }
      ]
    },
    "image-block": {
      name: "Image Block",
      icon: /* @__PURE__ */ React.createElement(Image, { className: "w-5 h-5" }),
      elements: elementOptions["image-block"]?.elements || [
        {
          id: "image-block-basic",
          name: "Image Block",
          type: "image-block",
          preview: "Upload and annotate project visuals",
          imageBlockData: {
            imageUrl: "",
            caption: "South elevation \u2013 week 6 progress",
            timestamp: "2025-11-20 10:30",
            geotag: "12.9716\xB0 N, 77.5946\xB0 E",
            annotations: [
              { id: "ann-1", text: "Facade glazing completed", position: "top-left" },
              { id: "ann-2", text: "Landscape pending", position: "bottom-right" }
            ],
            width: 80
          }
        }
      ]
    },
    "document-block": {
      name: "Document Block",
      icon: /* @__PURE__ */ React.createElement(FileText, { className: "w-5 h-5" }),
      elements: elementOptions["document-block"]?.elements || [
        {
          id: "document-block-basic",
          name: "Document Block",
          type: "document-block",
          preview: "Attach project documents with version history",
          documentBlockData: {
            fileName: "Project-Brief.pdf",
            fileType: "pdf",
            fileSize: "1.2 MB",
            fileUrl: "",
            versions: [
              {
                id: "ver-1",
                version: "v1.0",
                uploadedAt: "2025-11-15 09:45",
                uploadedBy: "Alex Johnson",
                notes: "Original brief shared with vendor team."
              }
            ],
            comments: [
              {
                id: "doc-comment-1",
                author: "Priya Patel",
                text: "Please review section 3 for updated specs.",
                timestamp: "2025-11-18 14:10"
              }
            ]
          }
        }
      ]
    },
    "cad-files": {
      name: "CAD Files",
      icon: /* @__PURE__ */ React.createElement(FileDigit, { className: "w-5 h-5" }),
      elements: elementOptions["cad-files"]?.elements || [
        {
          id: "cad-files-basic",
          name: "CAD Files",
          type: "cad-files",
          preview: "Upload CAD drawings \u2014 each file is scanned and shown as a card",
          cadFilesData: { files: [] }
        },
        {
          id: "cdr-files-basic",
          name: "CDR Files",
          type: "cdr-files",
          preview: "Upload CorelDRAW .cdr files \u2014 each file shows as a card with SVG preview",
          cdrFilesData: { files: [] }
        },
        {
          id: "floor-plan-basic",
          name: "Floor Plan 3D",
          type: "floor-plan",
          preview: "Upload a floor plan (.dwg .dxf .png .pdf) \u2014 extrude it into a 3D model with specs",
          floorPlanData: { files: [] }
        }
      ]
    },
    smart: {
      name: "Smart Elements",
      icon: /* @__PURE__ */ React.createElement(Sparkles, { className: "w-5 h-5" }),
      elements: [
        {
          id: "smart-note",
          name: "Smart Note",
          type: "smart-note",
          preview: "AI-powered sticky note with smart actions",
          icon: /* @__PURE__ */ React.createElement(StickyNote, { className: "w-4 h-4 mr-2 text-warning" }),
          color: "bg-warning/10 border-warning/20 text-warning hover:bg-warning/20",
          nodeType: "smartNote",
          data: { label: "Smart Note" }
        },
        {
          id: "calendar-event",
          name: "Calendar Event",
          type: "calendar-event",
          preview: "Schedule meetings and send invites",
          icon: /* @__PURE__ */ React.createElement(Calendar, { className: "w-4 h-4 mr-2 text-info" }),
          color: "bg-info/10 border-info/20 text-info hover:bg-info/10",
          nodeType: "calendarNode",
          data: { label: "Calendar Event" }
        },
        {
          id: "approval-board",
          name: "Approval Board",
          type: "approval-board",
          preview: "Track and manage approval workflows",
          icon: /* @__PURE__ */ React.createElement(ClipboardCheck, { className: "w-4 h-4 mr-2 text-success" }),
          color: "bg-success/10 border-success/20 text-success hover:bg-success/10",
          nodeType: "approvalBoard",
          data: { label: "Approval Board" }
        },
        {
          id: "ai-helper",
          name: "AI Helper",
          type: "ai-helper",
          preview: "Summarize, suggest next steps, or generate flows with AI",
          icon: /* @__PURE__ */ React.createElement(Sparkles, { className: "w-4 h-4 mr-2 text-ink" }),
          color: "bg-surface-hover border-line text-ink hover:bg-surface-hover",
          nodeType: "aiHelper",
          data: { label: "AI Helper" }
        }
      ]
    },
    icons: {
      name: "Icons",
      icon: /* @__PURE__ */ React.createElement(Square, { className: "w-5 h-5" }),
      elements: [
        { id: "arrow-icon", name: "Arrow", type: "icon", preview: "Direction arrow" },
        { id: "check-icon", name: "Check", type: "icon", preview: "Checkmark icon" },
        { id: "close-icon", name: "Close", type: "icon", preview: "X close icon" },
        { id: "menu-icon", name: "Menu", type: "icon", preview: "Hamburger menu" },
        { id: "star-icon", name: "Star", type: "icon", preview: "Star rating" },
        { id: "heart-icon", name: "Heart", type: "icon", preview: "Favorite icon" }
      ]
    },
    list: {
      name: "List",
      icon: /* @__PURE__ */ React.createElement(List, { className: "w-5 h-5" }),
      elements: [
        { id: "bullet-list", name: "Bullet List", type: "list", preview: "Unordered list" },
        { id: "numbered-list", name: "Numbered List", type: "list", preview: "Ordered list" },
        { id: "checklist", name: "Checklist", type: "list", preview: "Task list" },
        { id: "definition-list", name: "Definition List", type: "list", preview: "Term definitions" },
        { id: "nested-list", name: "Nested List", type: "list", preview: "Multi-level list" },
        { id: "timeline-list", name: "Timeline", type: "list", preview: "Chronological list" }
      ]
    },
    "task-card": {
      name: "Task Cards",
      icon: /* @__PURE__ */ React.createElement(ClipboardList, { className: "w-5 h-5" }),
      elements: [
        {
          id: "task-card-basic",
          name: "Task Card",
          type: "task-card",
          preview: "Jira-style tracker for daily work",
          taskCardData: {
            title: "Prepare kickoff deck",
            description: "Compile agenda, assign speakers, and share pre-read with stakeholders.",
            status: "todo",
            assignedTo: "Alex Johnson",
            priority: "high",
            dueDate: "",
            checklists: [
              { id: "tc-basic-1", text: "Outline key topics", completed: true },
              { id: "tc-basic-2", text: "Collect collateral", completed: false },
              { id: "tc-basic-3", text: "Share draft for review", completed: false }
            ],
            attachments: [],
            comments: [
              {
                id: "tc-basic-comment-1",
                author: "Alex Johnson",
                text: "Waiting on inputs from finance.",
                timestamp: "2025-11-18 14:22"
              }
            ],
            dependencies: ["Finalize project scope"],
            labels: ["Kickoff", "Client"],
            activityLog: [
              {
                id: "tc-basic-activity-1",
                action: "Task created",
                meta: { by: "Alex Johnson" },
                timestamp: "2025-11-17 09:30"
              },
              {
                id: "tc-basic-activity-2",
                action: "Checklist updated",
                meta: { item: "Outline key topics", completed: true },
                timestamp: "2025-11-17 15:45"
              }
            ]
          }
        },
        {
          id: "task-card-progress",
          name: "Task Card with Progress",
          type: "task-card-progress",
          preview: "Task card showing progress and due date",
          taskCardData: {
            title: "Implement vendor portal UI",
            description: "Finish responsive layout for workspace canvas and finalize QA notes.",
            status: "in-progress",
            assignedTo: "Priya Patel",
            priority: "critical",
            dueDate: "2025-11-30",
            checklists: [
              { id: "tc-progress-1", text: "Design review sign-off", completed: true },
              { id: "tc-progress-2", text: "Implement task card block", completed: true },
              { id: "tc-progress-3", text: "Cross-browser QA", completed: false }
            ],
            attachments: [
              { id: "tc-progress-attach-1", name: "ui-spec.pdf", size: 245760 },
              { id: "tc-progress-attach-2", name: "jira-export.xlsx", size: 512e3 }
            ],
            comments: [
              {
                id: "tc-progress-comment-1",
                author: "Priya Patel",
                text: "Need confirmation on responsive breakpoints.",
                timestamp: "2025-11-19 10:05"
              },
              {
                id: "tc-progress-comment-2",
                author: "Rahul Verma",
                text: "Backend API is ready for integration.",
                timestamp: "2025-11-19 18:42"
              }
            ],
            dependencies: ["Finalize design system tokens", "API contract v2.1"],
            labels: ["Sprint 11", "Frontend", "High impact"],
            activityLog: [
              {
                id: "tc-progress-activity-1",
                action: "Status updated",
                meta: { status: "In-Progress" },
                timestamp: "2025-11-18 11:02"
              },
              {
                id: "tc-progress-activity-2",
                action: "Assignee changed",
                meta: { assignee: "Priya Patel" },
                timestamp: "2025-11-18 13:26"
              },
              {
                id: "tc-progress-activity-3",
                action: "Attachment added",
                meta: { file: "ui-spec.pdf" },
                timestamp: "2025-11-19 09:15"
              }
            ]
          }
        }
      ]
    },
    materials: {
      name: "Materials",
      icon: /* @__PURE__ */ React.createElement(Package, { className: "w-5 h-5" }),
      elements: [
        { id: "raw-materials", name: "Raw Materials", type: "materials", preview: "Request raw materials" },
        { id: "semi-finished", name: "Semi-Finished", type: "materials", preview: "Request semi-finished goods" },
        { id: "finished-goods", name: "Finished Goods", type: "materials", preview: "Request finished products" },
        { id: "consumables", name: "Consumables", type: "materials", preview: "Request consumable items" },
        { id: "packaging", name: "Packaging", type: "materials", preview: "Request packaging materials" },
        { id: "tools-equipment", name: "Tools & Equipment", type: "materials", preview: "Request tools and equipment" }
      ]
    },
    uploads: {
      name: "Uploads",
      icon: /* @__PURE__ */ React.createElement(Upload, { className: "w-5 h-5" }),
      elements: []
      // This will be dynamically populated with uploaded files
    },
    "cost-calculators": {
      name: "Cost Calculators",
      icon: /* @__PURE__ */ React.createElement(Calculator, { className: "w-5 h-5" }),
      elements: [
        { id: "boq-generator", name: "BOQ Generator", type: "boq-generator", preview: "Generate professional Bill of Quantities with cost breakdown", elementIcon: /* @__PURE__ */ React.createElement(FileDigit, { className: "w-6 h-6 text-ink" }) },
        { id: "calc-bricks", name: "Bricks Calculator", type: "cost-calculator", preview: "Estimate bricks, cement bags & sand for a brick wall" },
        { id: "calc-concrete", name: "Concrete Calculator", type: "cost-calculator", preview: "Estimate cement, sand, and aggregate requirements" },
        { id: "calc-blocks", name: "Concrete Blocks Calculator", type: "cost-calculator", preview: "AAC/concrete block count with mortar estimate" },
        { id: "calc-flooring", name: "Flooring Calculator", type: "cost-calculator", preview: "Tile count, boxes, cement & sand for flooring" },
        { id: "calc-vinyl", name: "Vinyl Flooring Calculator", type: "cost-calculator", preview: "Vinyl planks/sheets required for a floor area" },
        { id: "calc-soil", name: "Soil Excavation Calculator", type: "cost-calculator", preview: "Excavation volume and soil disposal estimate" },
        { id: "calc-steel", name: "Steel Estimation Calculator", type: "cost-calculator", preview: "Rebar weight and steel quantity for RCC work" },
        { id: "calc-paint", name: "Painting Estimator", type: "cost-calculator", preview: "Calculate wall square footage and primer/paint coats" },
        { id: "calc-electrical", name: "Electrical Wiring Estimator", type: "cost-calculator", preview: "Conduit length and load point calculator" },
        { id: "calc-freight", name: "Freight Cost Calculator", type: "logistics-freight-cost", preview: "Calculate freight costs with fuel surcharge and tolls" }
      ]
    },
    "boq-generator": {
      name: "BOQ Generator",
      icon: /* @__PURE__ */ React.createElement(FileDigit, { className: "w-5 h-5" }),
      elements: [
        { id: "boq-tpl-blank", name: "Blank BOQ", type: "boq-generator", preview: "Start a Bill of Quantities from scratch" },
        { id: "boq-tpl-civil", name: "Civil Works BOQ", type: "boq-generator", preview: "Template \u2014 earthwork, RCC, masonry & finishing items" },
        { id: "boq-tpl-interior", name: "Interior Fit-Out BOQ", type: "boq-generator", preview: "Template \u2014 partitions, flooring, ceiling & joinery" },
        { id: "boq-tpl-electrical", name: "Electrical BOQ", type: "boq-generator", preview: "Template \u2014 wiring, panels, fixtures & load points" },
        { id: "boq-tpl-plumbing", name: "Plumbing & Sanitary BOQ", type: "boq-generator", preview: "Template \u2014 piping, fittings & sanitary fixtures" },
        { id: "boq-tpl-hvac", name: "HVAC BOQ", type: "boq-generator", preview: "Template \u2014 ducting, AHUs, diffusers & insulation" }
      ]
    },
    logistics: {
      name: "Logistics",
      icon: /* @__PURE__ */ React.createElement(Package, { className: "w-5 h-5" }),
      elements: [
        { id: "logistics-shipment", name: "Shipment Card", type: "logistics-shipment", preview: "Track shipment lifecycle from origin to delivery" },
        { id: "logistics-freight-cost", name: "Freight Cost Calculator", type: "logistics-freight-cost", preview: "Calculate freight costs with fuel surcharge and tolls" },
        { id: "logistics-route-optimization", name: "Route Optimization", type: "logistics-route-optimization", preview: "Compare multiple delivery routes by cost and time" },
        { id: "logistics-pod", name: "Proof of Delivery", type: "logistics-pod", preview: "Capture delivery signatures and photos" },
        { id: "logistics-exception-report", name: "Exception Report", type: "logistics-exception-report", preview: "Report delays with auto-calculated penalties" },
        { id: "logistics-carrier-scorecard", name: "Carrier Scorecard", type: "logistics-carrier-scorecard", preview: "Track carrier KPIs and performance metrics" }
      ]
    },
    flowcharts: {
      name: "Flowcharts",
      icon: /* @__PURE__ */ React.createElement(GitBranch, { className: "w-5 h-5" }),
      elements: [
        { id: "swot-analysis", name: "SWOT Analysis", type: "flowchart", preview: "Strengths, Weaknesses, Opportunities, Threats" },
        { id: "business-model-canvas", name: "Business Model Canvas", type: "flowchart", preview: "9-block business model framework" },
        { id: "goal-setting-framework", name: "Goal Setting Framework", type: "flowchart", preview: "SMART goals and action planning" },
        { id: "decision-tree", name: "Decision Tree", type: "flowchart", preview: "Decision-making process flow" },
        { id: "customer-journey-map", name: "Customer Journey Map", type: "flowchart", preview: "Customer experience touchpoints" },
        { id: "organizational-chart", name: "Organizational Chart", type: "flowchart", preview: "Company hierarchy structure" },
        { id: "process-flow", name: "Process Flow", type: "flowchart", preview: "Business process workflow" },
        { id: "project-timeline", name: "Project Timeline", type: "flowchart", preview: "Project milestones and phases" },
        { id: "risk-assessment-matrix", name: "Risk Assessment Matrix", type: "flowchart", preview: "Risk probability vs impact" },
        { id: "value-stream-map", name: "Value Stream Map", type: "flowchart", preview: "Lean process optimization" },
        { id: "stakeholder-map", name: "Stakeholder Map", type: "flowchart", preview: "Stakeholder influence and interest" },
        { id: "competitive-analysis", name: "Competitive Analysis", type: "flowchart", preview: "Competitor comparison matrix" }
      ]
    }
  };
  console.log("\u{1F50D} ElementsPanel Debug:", {
    selectedCategory,
    availableCategories: Object.keys(categories),
    elementOptions: Object.keys(elementOptions || {}),
    hasElementOptions: Boolean(elementOptions)
  });
  let currentCategory = null;
  if (selectedCategory) {
    currentCategory = categories[selectedCategory];
    if (!currentCategory && elementOptions && elementOptions[selectedCategory]) {
      const option = elementOptions[selectedCategory];
      const normalizedElements = Array.isArray(option) ? option : Array.isArray(option?.elements) ? option.elements : [];
      if (selectedCategory === "invoices-quotes") {
        console.log("\u{1F4CB} Handling invoices-quotes category");
        currentCategory = {
          name: "Invoices & Quotations",
          elements: normalizedElements
        };
      } else {
        console.log(`\u{1F504} Creating category from elementOptions for ${selectedCategory}`);
        currentCategory = {
          name: selectedCategory.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
          elements: normalizedElements
        };
      }
    }
  }
  if (!selectedCategory || !currentCategory) {
    console.log("\u274C No category selected or found for:", selectedCategory);
    return /* @__PURE__ */ React.createElement("div", { className: "fixed right-0 top-0 w-80 h-full bg-surface shadow-2xl border-l border-line z-40 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0 p-6 border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onBackToCategories,
        className: "p-2 hover:bg-surface-hover rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5 text-dim", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }))
    ), /* @__PURE__ */ React.createElement("h3", { className: "text-base font-semibold text-ink" }, "Elements")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onClose,
        className: "p-2 hover:bg-surface-hover rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-dim" })
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center p-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-dim" }, !selectedCategory ? "Please select a category" : `Category not found: ${selectedCategory}`)));
  }
  const currentElements = Array.isArray(currentCategory.elements) ? currentCategory.elements : [];
  const filteredElements = currentElements.filter(
    (element) => element.name.toLowerCase().includes(searchQuery.toLowerCase()) || element.preview && element.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );
  console.log("\u2705 Current category:", currentCategory);
  console.log("\u{1F4CB} Elements to render:", Array.isArray(filteredElements) ? filteredElements.length : 0);
  React.useEffect(() => {
    console.log("showManageBOQ state changed:", showManageBOQ);
  }, [showManageBOQ]);
  const handleBOQData = (tables) => {
    console.log("Extracted tables:", tables);
  };
  if (!selectedCategory) {
    return /* @__PURE__ */ React.createElement("div", { className: "fixed right-0 top-0 w-80 h-full bg-surface shadow-2xl border-l border-line z-40 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0 p-3 border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onBackToCategories,
        className: "p-0.5 hover:bg-surface-hover rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4 text-dim", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }))
    ), /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-ink" }, "Elements")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onClose,
        className: "p-0.5 hover:bg-surface-hover rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4 text-dim" })
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dim" }, "Please select a category")));
  }
  React.useEffect(() => {
    setSearchQuery("");
  }, [selectedCategory]);
  return /* @__PURE__ */ React.createElement("div", { className: "fixed right-0 top-0 w-80 h-full bg-surface shadow-2xl border-l border-line z-40 flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0 px-3 py-2.5 border-b border-line bg-surface" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onBackToCategories,
      className: "p-0.5 hover:bg-surface-hover rounded-lg transition-colors",
      title: "Back to categories"
    },
    /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4 text-dim", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 19l-7-7 7-7" }))
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "text-dim" }, currentCategory.icon), /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-ink" }, currentCategory.name)), selectedCategory === "tables" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Manage BOQ button clicked");
        setShowManageBOQ(true);
      },
      className: "ml-2 px-2 py-1 text-xs font-medium bg-info text-white rounded-lg hover:bg-info transition-colors flex items-center space-x-1 "
    },
    /* @__PURE__ */ React.createElement(FileSpreadsheetIcon, { size: 12 }),
    /* @__PURE__ */ React.createElement("span", null, "Manage BOQ")
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onClose,
      className: "p-0.5 hover:bg-surface-hover rounded-lg transition-colors",
      title: "Close panel"
    },
    /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4 text-dim" })
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0 px-3 pt-2.5 pb-2 border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: `Search ${currentCategory.name.toLowerCase()}...`,
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      className: "w-full pl-8 pr-3 py-1.5 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent bg-canvas focus:bg-surface transition-colors"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 transform " }, /* @__PURE__ */ React.createElement("svg", { className: "w-3.5 h-3.5 text-dim", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" }))))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-3" }, selectedCategory === "uploads" ? /* @__PURE__ */ React.createElement(UploadsSection, null) : selectedCategory === "invoices-quotes" ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-xs font-medium text-ink" }, "Recent Documents"), /* @__PURE__ */ React.createElement("button", { className: "text-xs text-info hover:text-info flex items-center" }, /* @__PURE__ */ React.createElement(Plus, { className: "w-2.5 h-2.5 mr-0.5" }), "New Document")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleDocumentTypeFilter("all"),
      className: `px-2 py-1 text-xs rounded-full font-medium transition-colors ${documentTypeFilter === "all" ? "bg-info text-white" : "bg-surface-hover text-ink hover:bg-surface-hover"}`
    },
    "All"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleDocumentTypeFilter("quotations"),
      className: `px-2 py-1 text-xs rounded-full font-medium transition-colors ${documentTypeFilter === "quotations" ? "bg-cta text-cta-foreground" : "bg-surface-hover text-ink hover:bg-surface-hover"}`
    },
    "Quotes"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleDocumentTypeFilter("invoices"),
      className: `px-2 py-1 text-xs rounded-full font-medium transition-colors ${documentTypeFilter === "invoices" ? "bg-info text-white" : "bg-surface-hover text-ink hover:bg-surface-hover"}`
    },
    "Invoices"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleDocumentTypeFilter("credit-notes"),
      className: `px-2 py-1 text-xs rounded-full font-medium transition-colors ${documentTypeFilter === "credit-notes" ? "bg-warning text-white" : "bg-surface-hover text-ink hover:bg-surface-hover"}`
    },
    "Credit Notes"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleDocumentTypeFilter("purchase-orders"),
      className: `px-2 py-1 text-xs rounded-full font-medium transition-colors ${documentTypeFilter === "purchase-orders" ? "bg-success text-white" : "bg-surface-hover text-ink hover:bg-surface-hover"}`
    },
    "POs"
  )), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-2" }, filteredElements.length > 0 ? filteredElements.filter((item) => documentTypeFilter === "all" || item.categoryId === documentTypeFilter).map((item) => /* @__PURE__ */ React.createElement(InvoiceQuoteCard, { key: item.id, item, onDocumentClick: handleDocumentClick })) : /* @__PURE__ */ React.createElement("div", { className: "text-center py-4 text-dim" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs" }, "No documents found")))) : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, selectedCategory === "boq-generator" && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowCustomBOQ(true);
      },
      className: "w-full flex items-center justify-center space-x-1.5 p-2 bg-black text-white rounded-lg hover:bg-slate-800 transition-all duration-200"
    },
    /* @__PURE__ */ React.createElement(Plus, { className: "w-3.5 h-3.5" }),
    /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium" }, "Custom BOQ")
  ), filteredElements.length > 0 ? filteredElements.map((element) => /* @__PURE__ */ React.createElement(DraggableElement, { key: element.id, element })) : /* @__PURE__ */ React.createElement("div", { className: "text-center py-6 text-dim" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs" }, 'No elements found matching "', searchQuery, '"')))), /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0 px-3 py-2 border-t border-line bg-gradient-to-b from-surface-hover to-surface" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-medium text-dim mb-0.5" }, "\u{1F4A1} Tip: Drag to canvas or double-click to add"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim" }, "Both methods supported"))), /* @__PURE__ */ React.createElement(
    ManageBOQModal,
    {
      key: `modal-${showManageBOQ}`,
      isOpen: showManageBOQ,
      onClose: () => {
        console.log("Modal close button clicked");
        setShowManageBOQ(false);
      },
      onTablesExtracted: handleBOQData
    }
  ), /* @__PURE__ */ React.createElement(
    CustomBOQModal,
    {
      isOpen: showCustomBOQ,
      onClose: () => setShowCustomBOQ(false)
    }
  ));
};
var ElementsPanel_default = ElementsPanel;
export {
  ElementsPanel_default as default
};
