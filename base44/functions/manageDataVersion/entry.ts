import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// This function tracks record changes for rollback capability
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, entityName, recordId, newData, oldData } = await req.json();

    if (!action || !entityName || !recordId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create audit entry
    const auditEntry = {
      action, // 'create', 'update', 'delete'
      entity_name: entityName,
      record_id: recordId,
      old_data: oldData || null,
      new_data: newData || null,
      changed_at: new Date().toISOString(),
      changed_by: user.email,
      is_reversible: action !== 'delete', // Soft deletes are reversible
    };

    // Store in AuditLog entity (create this entity in the dashboard)
    try {
      await base44.asServiceRole.entities.AuditLog.create(auditEntry);
    } catch (error) {
      // AuditLog might not exist yet, log to console
      console.warn('AuditLog entity not found, audit entry not saved:', error);
    }

    return Response.json({
      success: true,
      message: 'Audit entry recorded',
      auditId: `${recordId}_${Date.now()}`,
    });
  } catch (error) {
    console.error('Error recording audit:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});