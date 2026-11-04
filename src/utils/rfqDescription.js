// ============================================================
// FILE: utils/rfqDescription.js
// PURPOSE: The text stored as the description of a request raised from a
//          workspace. It used to be one block of JSON, which is what procurement
//          and the vendors the request is sent to ended up reading. This writes
//          plain, labelled lines instead.
// CONNECTS TO: pages/WorkspacePage/components/modals/ProcurementRFQModal.jsx
//              (the same layout is applied to older requests on the Employee side)
// ============================================================

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const text = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

/** 2026-10-14 -> 14 Oct 2026. Anything else is shown as written. */
const day = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(text(v));
  if (!m) return text(v);
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : text(v);
};

const money = (n) => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v.toLocaleString('en-IN') : '';
};

const section = (title, rows) => {
  const lines = rows.filter(([, value]) => text(value)).map(([label, value]) => `${label}: ${text(value)}`);
  return lines.length ? `${title}\n${lines.join('\n')}` : '';
};

/** The readable text for an RFQ's details. Empty fields and empty sections are left out. */
export const describeRfq = (p = {}) => {
  const pd = p.productDetails || {};
  const qp = p.quantityPricing || {};
  const tl = p.tradeLogistics || {};
  const sr = p.supplierRequirements || {};
  const an = p.attachmentsAndNotes || {};
  const by = p.submittedBy || {};

  const budgetMin = money(qp.budgetMin);
  const budgetMax = money(qp.budgetMax);
  const budget = budgetMin && budgetMax ? `${budgetMin} – ${budgetMax}` : budgetMin || budgetMax;
  const currency = text(qp.currency) || 'INR';

  return [
    text(pd.title),
    section('PRODUCT', [
      ['Name', pd.productName],
      ['Category', pd.category],
      ['Brand preference', pd.brandPreference],
      ['Details', pd.productDescription],
      ['Technical specifications', pd.technicalSpecifications],
    ]),
    section('QUANTITY AND PRICE', [
      ['Quantity', [text(qp.quantity), text(qp.quantityUnit)].filter(Boolean).join(' ')],
      ['Budget', budget ? `${budget} ${currency}` : ''],
      ['Pricing', qp.pricingType],
    ]),
    section('DELIVERY', [
      ['Deliver to', tl.deliveryLocation],
      ['Required by', day(tl.requiredByDate)],
      ['Incoterm', tl.incoterm],
      ['Shipping', tl.shippingMethod],
      ['Packaging', tl.packagingRequirements],
    ]),
    section('SUPPLIER REQUIREMENTS', [
      ['Minimum experience', text(sr.minimumExperienceYears) ? `${text(sr.minimumExperienceYears)} years` : ''],
      ['Minimum rating', sr.minimumRating],
      ['Certifications', sr.requiredCertifications],
      ['Preferred regions', sr.preferredRegions],
      ['Payment terms', sr.paymentTerms],
      ['Warranty', sr.warrantyRequirement],
    ]),
    section('NOTES', [
      ['Notes', an.notes],
      ['Attachments', Array.isArray(an.attachmentNames) ? an.attachmentNames.join(', ') : ''],
    ]),
    section('REQUESTED BY', [
      ['Name', by.name],
      ['Email', by.email],
      ['Vendor ID', by.vendorId],
      ['Workspace', p.workspaceName],
    ]),
  ].filter(Boolean).join('\n\n');
};
