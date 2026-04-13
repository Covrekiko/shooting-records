import { base44 } from '@/api/base44Client';

/**
 * RLS Manager - Frontend access control
 * Enforces Row-Level Security rules on the client side
 * Complements backend RLS enforcement
 */
export const rlsManager = {
  // Check if user can access a record
  canAccess: async (entityName, entityId, action = 'read') => {
    try {
      const response = await base44.functions.invoke('enforceRLS', {
        action,
        entityName,
        entityId,
      });
      return response.data.allowed === true;
    } catch (error) {
      console.error('RLS check failed:', error);
      return false;
    }
  },

  // Check if user is admin
  isAdmin: async () => {
    try {
      const user = await base44.auth.me();
      return user?.role === 'admin';
    } catch (error) {
      console.error('Admin check failed:', error);
      return false;
    }
  },

  // Get filtered query based on user role
  getFilteredQuery: async () => {
    try {
      const user = await base44.auth.me();
      
      // Admin gets all records
      if (user?.role === 'admin') {
        return {};
      }

      // Regular users get only their records
      return { created_by: user.email };
    } catch (error) {
      console.error('Filter query failed:', error);
      return { created_by: null }; // Fail safe - no access
    }
  },

  // Log access violation
  logViolation: async (entityName, entityId, action, reason) => {
    try {
      await base44.functions.invoke('auditRLSViolation', {
        entityName,
        entityId,
        attemptedAction: action,
        reason,
      });
    } catch (error) {
      console.error('Failed to log RLS violation:', error);
    }
  },

  // Validate user can perform action on entity
  validateAccess: async (entityName, entityId, action) => {
    const canAccess = await rlsManager.canAccess(entityName, entityId, action);
    
    if (!canAccess) {
      await rlsManager.logViolation(entityName, entityId, action, 'unauthorized_access_attempt');
      throw new Error(`Access denied: ${action} on ${entityName}`);
    }

    return true;
  },
};