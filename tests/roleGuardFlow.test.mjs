import assert from 'node:assert/strict';

function decideRoleGuardStep({ pathname, isHydratingUser, hasCurrentUser, hasRetried }) {
  if (pathname === '/login') return 'allow_login';
  if (isHydratingUser) return 'loading';
  if (hasCurrentUser) return 'allow';
  if (!hasRetried) return 'retry_hydration';
  return 'schedule_login_redirect';
}

function run() {
  assert.equal(
    decideRoleGuardStep({ pathname: '/login', isHydratingUser: false, hasCurrentUser: false, hasRetried: false }),
    'allow_login'
  );

  assert.equal(
    decideRoleGuardStep({ pathname: '/VendorDashboard', isHydratingUser: true, hasCurrentUser: false, hasRetried: false }),
    'loading'
  );

  assert.equal(
    decideRoleGuardStep({ pathname: '/VendorDashboard', isHydratingUser: false, hasCurrentUser: true, hasRetried: true }),
    'allow'
  );

  assert.equal(
    decideRoleGuardStep({ pathname: '/VendorDashboard', isHydratingUser: false, hasCurrentUser: false, hasRetried: false }),
    'retry_hydration'
  );

  assert.equal(
    decideRoleGuardStep({ pathname: '/VendorDashboard', isHydratingUser: false, hasCurrentUser: false, hasRetried: true }),
    'schedule_login_redirect'
  );

  console.log('roleGuardFlow tests passed');
}

run();
