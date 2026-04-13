import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * RLS Enforcement Endpoint
 * Validates all data access against user role and ownership
 * Prevents unauthorized data access at the backend level
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, entityName, entityId, userId } = await req.json();

    // Admin always has full access
    if (user.role === 'admin') {
      return Response.json({ allowed: true, reason: 'admin_access' });
    }

    // Regular users can only access their own records
    if (action === 'read' || action === 'update' || action === 'delete') {
      // Fetch the entity to check ownership
      const entity = await base44.entities[entityName].get(entityId);
      
      if (!entity) {
        return Response.json({ allowed: false, reason: 'entity_not_found' }, { status: 404 });
      }

      // User can only access records they created
      if (entity.created_by === user.email) {
        return Response.json({ allowed: true, reason: 'owner_access' });
      }

      return Response.json({ allowed: false, reason: 'unauthorized_access' }, { status: 403 });
    }

    // Create action - allowed for all authenticated users
    if (action === 'create') {
      return Response.json({ allowed: true, reason: 'authenticated_access' });
    }

    // List action - filter applied on query
    if (action === 'list') {
      return Response.json({ 
        allowed: true, 
        filter: { created_by: user.email },
        reason: 'user_filter_applied'
      });
    }

    return Response.json({ allowed: false, reason: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('RLS enforcement error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});