import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Test function to validate the complete admin user creation flow.
 * Tests all roles and verifies profile data is saved correctly.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || admin.role !== 'admin') {
      return Response.json(
        { error: 'Admin only' },
        { status: 403 }
      );
    }

    const tests = {
      checks: [],
      summary: {
        passed: 0,
        failed: 0,
      },
    };

    try {
      // Test 1: Create a normal user
      console.log('Test 1: Creating normal user...');
      const normalUserRes = await base44.functions.invoke('createUserWithProfile', {
        email: `test-normal-${Date.now()}@example.com`,
        tempPassword: 'TestPassword123',
        role: 'normal_user',
        status: 'active',
        forcePasswordChange: false,
        firstName: 'Normal',
        lastName: 'User',
        dateOfBirth: '1990-01-15',
        addressLine1: '123 Test Street',
        city: 'Test City',
        postcode: 'TC1 1TC',
        country: 'United Kingdom',
      });

      if (normalUserRes.data.success) {
        tests.checks.push({ name: 'Create normal user', status: 'pass' });
        tests.summary.passed++;
      } else {
        tests.checks.push({ name: 'Create normal user', status: 'fail', error: normalUserRes.data.error });
        tests.summary.failed++;
      }

      // Test 2: Create a beta tester
      console.log('Test 2: Creating beta tester...');
      const betaTesterRes = await base44.functions.invoke('createUserWithProfile', {
        email: `test-beta-${Date.now()}@example.com`,
        tempPassword: 'TestPassword123',
        role: 'beta_tester',
        status: 'active',
        forcePasswordChange: false,
        firstName: 'Beta',
        lastName: 'Tester',
        dateOfBirth: '1985-06-20',
        addressLine1: '456 Beta Avenue',
        city: 'Beta City',
        postcode: 'BC2 2BC',
        country: 'United Kingdom',
        betaTesterNotes: 'Testing feedback system',
        betaTesterStatus: 'active',
      });

      if (betaTesterRes.data.success) {
        tests.checks.push({ name: 'Create beta tester', status: 'pass' });
        tests.summary.passed++;
      } else {
        tests.checks.push({ name: 'Create beta tester', status: 'fail', error: betaTesterRes.data.error });
        tests.summary.failed++;
      }

      // Test 3: Create an admin
      console.log('Test 3: Creating admin...');
      const adminUserRes = await base44.functions.invoke('createUserWithProfile', {
        email: `test-admin-${Date.now()}@example.com`,
        tempPassword: 'TestPassword123',
        role: 'admin',
        status: 'active',
        forcePasswordChange: true,
        firstName: 'Admin',
        lastName: 'User',
        dateOfBirth: '1980-03-10',
        addressLine1: '789 Admin Plaza',
        city: 'Admin City',
        postcode: 'AD3 3AD',
        country: 'United Kingdom',
      });

      if (adminUserRes.data.success) {
        tests.checks.push({ name: 'Create admin user', status: 'pass' });
        tests.summary.passed++;
      } else {
        tests.checks.push({ name: 'Create admin user', status: 'fail', error: adminUserRes.data.error });
        tests.summary.failed++;
      }

      // Test 4: Verify normal user was created correctly
      if (normalUserRes.data.success) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({
            email: normalUserRes.data.email,
          });
          if (users.length > 0) {
            const user = users[0];
            if (user.role === 'normal_user' && user.firstName === 'Normal' && user.profileComplete) {
              tests.checks.push({ name: 'Normal user profile data saved', status: 'pass' });
              tests.summary.passed++;
            } else {
              tests.checks.push({
                name: 'Normal user profile data saved',
                status: 'fail',
                error: `Role: ${user.role}, firstName: ${user.firstName}, profileComplete: ${user.profileComplete}`,
              });
              tests.summary.failed++;
            }
          }
        } catch (e) {
          tests.checks.push({
            name: 'Normal user profile data saved',
            status: 'fail',
            error: e.message,
          });
          tests.summary.failed++;
        }
      }

      // Test 5: Verify beta tester was created correctly
      if (betaTesterRes.data.success) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({
            email: betaTesterRes.data.email,
          });
          if (users.length > 0) {
            const user = users[0];
            if (
              user.role === 'beta_tester' &&
              user.beta_tester_status === 'active' &&
              user.beta_tester_notes === 'Testing feedback system'
            ) {
              tests.checks.push({ name: 'Beta tester profile data saved', status: 'pass' });
              tests.summary.passed++;
            } else {
              tests.checks.push({
                name: 'Beta tester profile data saved',
                status: 'fail',
                error: `Role: ${user.role}, status: ${user.beta_tester_status}, notes: ${user.beta_tester_notes}`,
              });
              tests.summary.failed++;
            }
          }
        } catch (e) {
          tests.checks.push({
            name: 'Beta tester profile data saved',
            status: 'fail',
            error: e.message,
          });
          tests.summary.failed++;
        }
      }

      // Test 6: Verify admin was created correctly
      if (adminUserRes.data.success) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({
            email: adminUserRes.data.email,
          });
          if (users.length > 0) {
            const user = users[0];
            if (user.role === 'admin' && user.forcePasswordChange) {
              tests.checks.push({ name: 'Admin profile data saved', status: 'pass' });
              tests.summary.passed++;
            } else {
              tests.checks.push({
                name: 'Admin profile data saved',
                status: 'fail',
                error: `Role: ${user.role}, forcePasswordChange: ${user.forcePasswordChange}`,
              });
              tests.summary.failed++;
            }
          }
        } catch (e) {
          tests.checks.push({
            name: 'Admin profile data saved',
            status: 'fail',
            error: e.message,
          });
          tests.summary.failed++;
        }
      }

      // Test 7: Verify password validation
      console.log('Test 7: Testing password validation...');
      const shortPasswordRes = await base44.functions.invoke('createUserWithProfile', {
        email: `test-short-${Date.now()}@example.com`,
        tempPassword: 'short',
        role: 'normal_user',
        status: 'active',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        addressLine1: 'Test',
        city: 'Test',
        postcode: 'T1 1T',
        country: 'UK',
      });

      if (!shortPasswordRes.data.success) {
        tests.checks.push({ name: 'Password validation (reject short)', status: 'pass' });
        tests.summary.passed++;
      } else {
        tests.checks.push({
          name: 'Password validation (reject short)',
          status: 'fail',
          error: 'Short password was accepted',
        });
        tests.summary.failed++;
      }

      // Test 8: Verify email validation
      console.log('Test 8: Testing email validation...');
      const invalidEmailRes = await base44.functions.invoke('createUserWithProfile', {
        email: 'not-an-email',
        tempPassword: 'ValidPassword123',
        role: 'normal_user',
        status: 'active',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01',
        addressLine1: 'Test',
        city: 'Test',
        postcode: 'T1 1T',
        country: 'UK',
      });

      if (!invalidEmailRes.data.success) {
        tests.checks.push({ name: 'Email validation (reject invalid)', status: 'pass' });
        tests.summary.passed++;
      } else {
        tests.checks.push({
          name: 'Email validation (reject invalid)',
          status: 'fail',
          error: 'Invalid email was accepted',
        });
        tests.summary.failed++;
      }
    } catch (testError) {
      tests.checks.push({
        name: 'Test execution',
        status: 'fail',
        error: testError.message,
      });
      tests.summary.failed++;
    }

    return Response.json({
      success: tests.summary.failed === 0,
      ...tests,
    });
  } catch (error) {
    console.error('Function error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});