import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();

    // Log sensitive actions
    if (['delete', 'update'].includes(event.type)) {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        user_role: user.role,
        entity_name: event.entity_name,
        entity_id: event.entity_id,
        attempted_action: event.type,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        severity: event.type === 'delete' ? 'warning' : 'info'
      });
    }

    return Response.json({ logged: true });
  } catch (error) {
    console.error('Audit error:', error);
    // Don't fail the main operation if audit fails
    return Response.json({ logged: false, error: error.message }, { status: 500 });
  }
});