// Resubmit-permission helpers for the vendor KYC re-submission flow.
//
// When the auditor requests changes after a KYC submission, the vendor record
// gets status 'resubmit_requested' plus a resubmitPermissions map:
//   { <sectionKey>: { granted: true, grantedAt, grantedBy, remarks } }
// Only granted sections are editable; everything else is read-only.

export const RESUBMIT_SECTION_KEYS = [
  'vendor',
  'company',
  'service',
  'bank',
  'compliance',
  'additional',
];

// Display labels + the KYC form each section maps to.
export const RESUBMIT_SECTION_LABELS = {
  vendor: 'Vendor Details',
  company: 'Business Details',
  service: 'Product & Service',
  bank: 'Bank Details',
  compliance: 'Compliance & Certifications',
  additional: 'Additional Details',
};

export function isResubmitMode(user) {
  return String(user?.status || '').trim().toLowerCase() === 'resubmit_requested';
}

export function getResubmitPermissions(user) {
  if (!isResubmitMode(user)) return {};
  return user?.resubmitPermissions || {};
}

// True when the vendor may edit the given KYC section. Outside resubmit mode
// everything is editable; inside resubmit mode only granted sections are.
export function isSectionEditable(user, sectionKey) {
  if (!isResubmitMode(user)) return true;
  return Boolean(user?.resubmitPermissions?.[sectionKey]?.granted);
}

export function getGrantedResubmitSections(user) {
  const perms = getResubmitPermissions(user);
  return RESUBMIT_SECTION_KEYS.filter((key) => perms[key]?.granted);
}
