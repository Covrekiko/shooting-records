import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update user roles
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return Response.json({ error: 'Missing userId or newRole' }, { status: 400 });
    }

    // Validate role value
    const validRoles = ['admin', 'normal_user', 'beta_tester'];
    if (!validRoles.includes(newRole)) {
      return Response.json({ error: 'Invalid role value' }, { status: 400 });
    }

    // Update user role using service role (admin permissions)
    const updated = await base44.asServiceRole.entities.User.update(userId, {
      role: newRole,
      status: 'active',
      // If promoting to beta_tester, set status to active
      ...(newRole === 'beta_tester' && { beta_tester_status: 'active' })
    });

    return Response.json({ 
      success: true, 
      user: updated,
      message: `User role updated to ${newRole}`
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});