export function normalizeVendorStatus(status) {
  return String(status || '').trim().toLowerCase();
}

const FORM_DATA_SECTIONS = [
  'vendorDetails',
  'companyDetails',
  'serviceProductDetails',
  'bankDetails',
  'complianceCertifications',
  'additionalDetails',
];

function hasMeaningfulValue(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  // Recurse so structurally pre-seeded but empty objects (e.g. the draft's
  // serviceProviderDetails skeleton) don't count as "started".
  if (value && typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
  return Boolean(value);
}

/**
 * True when a vendor record (or a saved form draft) already contains real
 * onboarding data in any section — i.e. the user actually started the KYC
 * forms rather than just landing on them after role selection.
 */
export function hasStartedVendorForm(record) {
  if (!record || typeof record !== 'object') return false;
  return FORM_DATA_SECTIONS.some(
    (section) =>
      record[section] &&
      typeof record[section] === 'object' &&
      Object.values(record[section]).some(hasMeaningfulValue)
  );
}

/**
 * Resolve the correct vendor app destination based on user state.
 * Team members are always routed to dashboard.
 */
export function getVendorDestination({ status, hasFilledForm, isTeamMember, hasStartedForm }) {
  if (isTeamMember === true) return '/VendorDashboard';

  const normalizedStatus = normalizeVendorStatus(status);
  const filled = hasFilledForm === true;

  if (normalizedStatus === 'approved') return '/VendorDashboard';
  if (normalizedStatus === 'pending' && filled) return '/Auditorapprove';
  // Auditor granted re-edit access to specific KYC sections — send the vendor
  // back into the form flow (per-section edit gating happens in the forms).
  if (normalizedStatus === 'resubmit_requested') return '/Form1';

  // rejected, pending-without-form, missing status => onboarding.
  // Users who never started filling go back to role selection so they can
  // re-confirm vendor/client before continuing the KYC forms.
  return hasStartedForm === true ? '/Form1' : '/role-selection';
}

export function isRejectedVendor(status) {
  return normalizeVendorStatus(status) === 'rejected';
}
