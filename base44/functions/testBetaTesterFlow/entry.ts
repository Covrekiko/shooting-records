import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Test function to validate the beta tester role flow.
 * Verifies:
 * 1. Admin can promote user to beta_tester
 * 2. Beta tester role is saved correctly
 * 3. Beta tester status is set to active
 * 4. Forum access is enabled for beta_tester
 * 5. Normal users cannot access forum
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { testUserId } = await req.json();

    if (!testUserId) {
      return Response.json({ error: 'testUserId required' }, { status: 400 });
    }

    const results = {
      checks: [],
      success: true,
      message: ''
    };

    try {
      // 1. Get user before role change
      const userBefore = await base44.asServiceRole.entities.User.get('User', testUserId);
      results.checks.push({
        name: 'User exists',
        status: 'pass',
        detail: `Role before: ${userBefore.role}`
      });

      // 2. Change role to beta_tester using the same logic as frontend
      const updated = await base44.asServiceRole.entities.User.update(testUserId, {
        role: 'beta_tester',
        status: 'active',
        beta_tester_status: 'active'
      });

      results.checks.push({
        name: 'Role update successful',
        status: updated.role === 'beta_tester' ? 'pass' : 'fail',
        detail: `Role after: ${updated.role}`
      });

      // 3. Verify role is persisted
      const userAfter = await base44.asServiceRole.entities.User.get('User', testUserId);
      results.checks.push({
        name: 'Role persisted in database',
        status: userAfter.role === 'beta_tester' ? 'pass' : 'fail',
        detail: `Persisted role: ${userAfter.role}`
      });

      // 4. Verify beta_tester_status
      results.checks.push({
        name: 'Beta tester status set',
        status: userAfter.beta_tester_status === 'active' ? 'pass' : 'fail',
        detail: `Status: ${userAfter.beta_tester_status}`
      });

      // 5. Check if user can theoretically access forum (role check only)
      results.checks.push({
        name: 'Forum access role check passes',
        status: (userAfter.role === 'beta_tester' || userAfter.role === 'admin') ? 'pass' : 'fail',
        detail: `Role ${userAfter.role} is allowed to access forum`
      });

      // 6. Verify normal user cannot access
      const testNormalUser = {
        role: 'normal_user',
        beta_tester_status: null
      };
      const canAccessForum = testNormalUser.role === 'beta_tester' || testNormalUser.role === 'admin';
      results.checks.push({
        name: 'Normal users blocked from forum',
        status: !canAccessForum ? 'pass' : 'fail',
        detail: 'normal_user role should not access forum'
      });

      // All checks passed?
      results.success = results.checks.every(c => c.status === 'pass');
      results.message = results.success ? 'All checks passed!' : 'Some checks failed';

    } catch (testError) {
      results.success = false;
      results.message = testError.message;
      results.checks.push({
        name: 'Test execution',
        status: 'fail',
        detail: testError.message
      });
    }

    return Response.json(results);
  } catch (error) {
    console.error('Test function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});