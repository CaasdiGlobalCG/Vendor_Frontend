import assert from 'node:assert/strict';
import { getVendorDestination, normalizeVendorStatus, isRejectedVendor } from '../src/utils/vendorAuthRouting.js';

function run() {
  // normalization
  assert.equal(normalizeVendorStatus(' Approved '), 'approved');
  assert.equal(normalizeVendorStatus(null), '');

  // team member always dashboard
  assert.equal(
    getVendorDestination({ status: 'pending', hasFilledForm: false, isTeamMember: true }),
    '/VendorDashboard'
  );

  // approved vendor
  assert.equal(
    getVendorDestination({ status: 'approved', hasFilledForm: false, isTeamMember: false }),
    '/VendorDashboard'
  );

  // pending with completed onboarding
  assert.equal(
    getVendorDestination({ status: 'pending', hasFilledForm: true, isTeamMember: false }),
    '/Auditorapprove'
  );

  // pending without form
  assert.equal(
    getVendorDestination({ status: 'pending', hasFilledForm: false, isTeamMember: false }),
    '/Form1'
  );

  // rejected goes to onboarding route (with message handled by caller)
  assert.equal(
    getVendorDestination({ status: 'rejected', hasFilledForm: true, isTeamMember: false }),
    '/Form1'
  );

  // unknown status defaults safe onboarding
  assert.equal(
    getVendorDestination({ status: 'something_else', hasFilledForm: true, isTeamMember: false }),
    '/Form1'
  );

  assert.equal(isRejectedVendor('rejected'), true);
  assert.equal(isRejectedVendor('approved'), false);

  console.log('vendorAuthRouting tests passed');
}

run();
