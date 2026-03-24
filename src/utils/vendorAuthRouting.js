export function normalizeVendorStatus(status) {
  return String(status || '').trim().toLowerCase();
}

/**
 * Resolve the correct vendor app destination based on user state.
 * Team members are always routed to dashboard.
 */
export function getVendorDestination({ status, hasFilledForm, isTeamMember }) {
  if (isTeamMember === true) return '/VendorDashboard';

  const normalizedStatus = normalizeVendorStatus(status);
  const filled = hasFilledForm === true;

  if (normalizedStatus === 'approved') return '/VendorDashboard';
  if (normalizedStatus === 'pending' && filled) return '/Auditorapprove';

  // rejected, pending-without-form, missing status => onboarding
  return '/Form1';
}

export function isRejectedVendor(status) {
  return normalizeVendorStatus(status) === 'rejected';
}
