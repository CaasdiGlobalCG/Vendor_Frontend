/**
 * Company-details helpers shared by the vendor dashboard prompt and the
 * portfolio Company view: the field checklist (matching the "Company details"
 * panel), missing-field detection, and the PDF download.
 */
import jsPDF from "jspdf";

export const COMPANY_DETAILS_CHECKLIST = [
  { key: 'companyName', label: 'Company name' },
  { key: 'industryType', label: 'Industry type' },
  { key: 'segments', label: 'Segments', isList: true },
  { key: 'yearOfEstablishment', label: 'Year of establishment' },
  { key: 'visionAndMission', label: 'Vision and mission' },
  { key: 'companyOverview', label: 'Company overview' },
  { key: 'industryOverview', label: 'Industry overview' },
  { key: 'coreValues', label: 'Core values', isList: true },
  { key: 'certifications', label: 'Certifications', isList: true },
  { key: 'teamSize', label: 'Team size' },
  { key: 'uniqueSellingProposition', label: 'Unique selling proposition' },
  { key: 'socialImpact', label: 'Social impact / ESG focus' },
];

export const getMissingCompanyFields = (companyDetails) =>
  COMPANY_DETAILS_CHECKLIST
    .filter(({ key, isList }) => {
      const value = companyDetails?.[key];
      return isList
        ? !Array.isArray(value) || value.length === 0
        : !value || (typeof value === 'string' && value.trim() === '');
    })
    .map(({ label }) => label);

const certName = (cert, index) =>
  typeof cert === 'string'
    ? cert
    : cert?.name || cert?.originalName || `Certification ${index + 1}`;

/**
 * Generate and save a PDF of the vendor's company details.
 * Callers should gate on getMissingCompanyFields() — this renders whatever
 * is present and marks gaps as "Not specified".
 */
export function downloadCompanyDetailsPdf(vendorData) {
  const cd = vendorData?.companyDetails || {};
  const vd = vendorData?.vendorDetails || {};

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed = 12) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ── Title bar ──
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(cd.companyName || "Company Details", margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const timestamp = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${timestamp}`, pageWidth - margin, 12, { align: "right" });
  y = 26;

  const addField = (label, value) => {
    const text = Array.isArray(value) ? value.join(', ') : (value || 'Not specified');
    checkPageBreak(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(label.toUpperCase(), margin, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55); // gray-800
    const lines = doc.splitTextToSize(text, maxWidth);
    checkPageBreak(lines.length * 4.5);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 3;
  };

  const location = [cd.state, cd.country].filter(Boolean).join(', ');

  addField('Company name', cd.companyName);
  addField('GST number', cd.gstNumber);
  addField('PAN number', cd.panNumber);
  addField('Location', location);
  addField('Primary contact', [vd.primaryContactName, vd.primaryContactEmail, vd.primaryContactPhone].filter(Boolean).join('  ·  '));
  addField('Industry type', cd.industryType);
  addField('Segments', cd.segments);
  addField('Year of establishment', cd.yearOfEstablishment);
  addField('Team size', cd.teamSize);
  addField('Vision and mission', cd.visionAndMission);
  addField('Company overview', cd.companyOverview);
  addField('Industry overview', cd.industryOverview);
  addField('Core values', cd.coreValues);
  addField(
    'Certifications',
    Array.isArray(cd.certifications) ? cd.certifications.map(certName) : cd.certifications
  );
  addField('Unique selling proposition', cd.uniqueSellingProposition);
  addField('Social impact / ESG focus', cd.socialImpact);

  // ── Footer on every page ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(156, 163, 175);
    doc.text(cd.companyName || "Company Details", margin, pageHeight - 6);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  const safeName = (cd.companyName || 'Company')
    .replace(/[^a-zA-Z0-9_\- ]/g, '')
    .replace(/\s+/g, '_');
  doc.save(`${safeName}_Company_Details.pdf`);
}
