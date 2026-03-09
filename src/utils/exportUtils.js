/**
 * Export Utilities — Generate PDF and Excel files from AI response text.
 *
 * Uses jsPDF for PDF generation and SheetJS (xlsx) for Excel generation.
 * Parses markdown-formatted AI responses into structured documents.
 */
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ─── Markdown parsing helpers ───────────────────────────────────────────────

/**
 * Parse markdown text into structured blocks for export.
 * Handles: headings (#), bullets (- * •), numbered lists (1.), tables (|),
 *          bold (**), italic (*), code (`), and plain text paragraphs.
 */
function parseMarkdown(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks = [];
  let tableBuffer = [];
  let inTable = false;

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const rows = tableBuffer
        .filter((l) => !/^\s*\|[\s:-]+\|\s*$/.test(l)) // remove separator row
        .map((l) =>
          l
            .split("|")
            .map((c) => stripInline(c.trim()))
            .filter((c) => c !== "")
        );
      if (rows.length > 0) {
        blocks.push({ type: "table", header: rows[0], rows: rows.slice(1) });
      }
      tableBuffer = [];
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table row detection (starts & ends with |)
    if (/^\s*\|.+\|\s*$/.test(line)) {
      inTable = true;
      tableBuffer.push(line);
      continue;
    }

    // If we were in a table and hit a non-table line, flush
    if (inTable) flushTable();

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: stripInline(headingMatch[2]),
      });
      continue;
    }

    // Bullet list item  
    if (/^\s*[-*•]\s/.test(line)) {
      blocks.push({
        type: "bullet",
        text: stripInline(line.replace(/^\s*[-*•]\s*/, "")),
      });
      continue;
    }

    // Numbered list item
    const numMatch = line.match(/^\s*(\d+)[.)]\s*(.*)/);
    if (numMatch) {
      blocks.push({
        type: "numbered",
        num: numMatch[1],
        text: stripInline(numMatch[2]),
      });
      continue;
    }

    // Empty line
    if (!line.trim()) {
      blocks.push({ type: "empty" });
      continue;
    }

    // Regular paragraph
    blocks.push({ type: "paragraph", text: stripInline(line) });
  }

  // Flush any remaining table
  if (inTable) flushTable();

  return blocks;
}

/**
 * Strip inline markdown markers (**bold**, *italic*, `code`) from text.
 * Returns plain text for PDF/Excel output.
 */
function stripInline(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/`(.+?)`/g, "$1")          // `code`
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .trim();
}

/**
 * Try to detect bold segments within text for PDF styling.
 * Returns an array of { text, bold } segments.
 */
function parseInlineSegments(text) {
  if (!text) return [{ text: "", bold: false }];
  const segments = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: stripInline(text.slice(lastIndex, match.index)), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: stripInline(text.slice(lastIndex)), bold: false });
  }

  return segments.length > 0 ? segments : [{ text: stripInline(text), bold: false }];
}

// ─── PDF Export ─────────────────────────────────────────────────────────────

/**
 * Export AI response text as a formatted PDF.
 *
 * @param {string} text - Raw markdown text from AI response
 * @param {string} [title] - Optional document title
 */
export function exportToPdf(text, title = "AI Response") {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed = 12) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Title bar ──
  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin, 12);

  // Timestamp
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const timestamp = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${timestamp}`, pageWidth - margin, 12, { align: "right" });

  y = 26;

  // ── Parse and render blocks ──
  const blocks = parseMarkdown(text);

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        checkPageBreak(14);
        const sizes = { 1: 14, 2: 12, 3: 11 };
        doc.setFont("helvetica", "bold");
        doc.setFontSize(sizes[block.level] || 11);
        doc.setTextColor(31, 41, 55); // gray-800
        y += 4;
        const headLines = doc.splitTextToSize(block.text, maxWidth);
        doc.text(headLines, margin, y);
        y += headLines.length * (sizes[block.level] || 11) * 0.45 + 3;
        break;
      }

      case "bullet": {
        checkPageBreak(10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81); // gray-700

        // Teal bullet
        doc.setFillColor(20, 184, 166);
        doc.circle(margin + 1.5, y - 1.2, 0.8, "F");

        const bulletLines = doc.splitTextToSize(block.text, maxWidth - 8);
        doc.text(bulletLines, margin + 6, y);
        y += bulletLines.length * 4.5 + 1.5;
        break;
      }

      case "numbered": {
        checkPageBreak(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(13, 148, 136); // teal-600
        doc.text(`${block.num}.`, margin, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(55, 65, 81);
        const numLines = doc.splitTextToSize(block.text, maxWidth - 10);
        doc.text(numLines, margin + 8, y);
        y += numLines.length * 4.5 + 1.5;
        break;
      }

      case "table": {
        checkPageBreak(20);
        y += 2;

        doc.autoTable({
          startY: y,
          head: [block.header],
          body: block.rows,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 2.5,
            textColor: [55, 65, 81],
            lineColor: [229, 231, 235],
            lineWidth: 0.3,
          },
          headStyles: {
            fillColor: [20, 184, 166],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
          },
          alternateRowStyles: {
            fillColor: [240, 253, 250], // teal-50
          },
          didDrawPage: () => {
            y = margin;
          },
        });

        y = doc.lastAutoTable.finalY + 4;
        break;
      }

      case "paragraph": {
        checkPageBreak(10);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        const paraLines = doc.splitTextToSize(block.text, maxWidth);
        doc.text(paraLines, margin, y);
        y += paraLines.length * 4.5 + 1;
        break;
      }

      case "empty": {
        y += 3;
        break;
      }

      default:
        break;
    }
  }

  // ── Footer on every page ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text("CaaS AI Assistant", margin, pageH - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageH - 6, { align: "right" });
  }

  // ── Save ──
  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
  doc.save(`${safeTitle}_${Date.now()}.pdf`);
}

// ─── Excel Export ───────────────────────────────────────────────────────────

/**
 * Export AI response text as an Excel file.
 *
 * Strategy:
 * 1. If the response contains markdown tables → each table becomes a sheet
 * 2. All structured data (headings, bullets, numbered) → "Report" sheet
 * 3. Raw text → "Raw Response" sheet
 *
 * @param {string} text - Raw markdown text from AI response
 * @param {string} [title] - Optional document/sheet title
 */
export function exportToExcel(text, title = "AI Response") {
  const blocks = parseMarkdown(text);
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Structured Report ──
  const reportData = [];
  reportData.push([title]);
  reportData.push([`Generated: ${new Date().toLocaleString("en-IN")}`]);
  reportData.push([]); // empty row

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        reportData.push([]); // gap before heading
        reportData.push([block.text]);
        break;
      case "bullet":
        reportData.push(["  •", block.text]);
        break;
      case "numbered":
        reportData.push([`  ${block.num}.`, block.text]);
        break;
      case "paragraph":
        reportData.push([block.text]);
        break;
      case "empty":
        reportData.push([]);
        break;
      case "table":
        // Add table inline in report sheet too
        reportData.push([]);
        reportData.push(block.header);
        for (const row of block.rows) {
          reportData.push(row);
        }
        reportData.push([]);
        break;
      default:
        break;
    }
  }

  const wsReport = XLSX.utils.aoa_to_sheet(reportData);

  // Auto-size columns
  const maxCols = Math.max(...reportData.map((r) => r.length), 1);
  wsReport["!cols"] = Array.from({ length: maxCols }, (_, i) => {
    const maxLen = reportData.reduce((max, row) => {
      const cell = row[i];
      return Math.max(max, cell ? String(cell).length : 0);
    }, 10);
    return { wch: Math.min(maxLen + 4, 60) };
  });

  // Bold title row
  if (wsReport["A1"]) {
    wsReport["A1"].s = { font: { bold: true, sz: 14 } };
  }

  XLSX.utils.book_append_sheet(wb, wsReport, "Report");

  // ── Additional sheets for each table found ──
  const tables = blocks.filter((b) => b.type === "table");
  tables.forEach((table, idx) => {
    const tableData = [table.header, ...table.rows];
    const wsTable = XLSX.utils.aoa_to_sheet(tableData);

    // Auto-size columns for table sheet
    wsTable["!cols"] = table.header.map((_, colIdx) => {
      const maxLen = tableData.reduce((max, row) => {
        const cell = row[colIdx];
        return Math.max(max, cell ? String(cell).length : 0);
      }, 10);
      return { wch: Math.min(maxLen + 4, 50) };
    });

    const sheetName = table.header[0]
      ? `Table_${idx + 1}_${table.header[0].slice(0, 20)}`
      : `Table_${idx + 1}`;
    // Sheet name max 31 chars, no special chars
    const safeName = sheetName.replace(/[\\/*?:\[\]]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, wsTable, safeName);
  });

  // ── Save ──
  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_");
  saveAs(new Blob([wbOut], { type: "application/octet-stream" }), `${safeTitle}_${Date.now()}.xlsx`);
}
