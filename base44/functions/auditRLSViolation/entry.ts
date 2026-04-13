import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Audit RLS Violations
 * Logs unauthorized access attempts and suspicious activity
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityName, entityId, attemptedAction, reason } = await req.json();

    // Log the violation attempt
    const auditEntry = {
      user_email: user.email,
      user_role: user.role,
      entity_name: entityName,
      entity_id: entityId,
      attempted_action: attemptedAction,
      violation_reason: reason,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
      severity: 'warning'
    };

    // Store in audit log (if AuditLog entity exists)
    try {
      await base44.asServiceRole.entities.AuditLog.create(auditEntry);
    } catch (error) {
      console.error('Failed to log RLS violation:', error);
      // Continue even if audit logging fails
    }

    return Response.json({ logged: true, violation_id: entityId });
  } catch (error) {
    console.error('Audit RLS violation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});