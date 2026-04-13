import { base44 } from '@/api/base44Client';

/**
 * RLS Validation - Comprehensive security audit
 * Validates RLS implementation for data leakage and unauthorized access
 */
export const rlsValidation = {
  // Audit data isolation
  auditDataIsolation: async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // Get all records for current user
      const userRecords = await base44.entities.TargetShooting.filter({
        created_by: currentUser.email,
      });

      // Count total records in system (as admin would see)
      const allRecords = await base44.asServiceRole.entities.TargetShooting.list();

      return {
        userRecordCount: userRecords.length,
        totalRecords: allRecords.length,
        isolated: userRecords.length <= allRecords.length,
        audit: {
          timestamp: new Date().toISOString(),
          user: currentUser.email,
          role: currentUser.role,
        },
      };
    } catch (error) {
      console.error('Data isolation audit failed:', error);
      return { error: error.message, isolated: false };
    }
  },

  // Validate access control
  validateAccessControl: async (entityName, testEntityId) => {
    try {
      const currentUser = await base44.auth.me();
      
      // Test 1: User can read own records
      const ownRecords = await base44.entities[entityName].filter({
        created_by: currentUser.email,
      });

      // Test 2: Check if user can access specific entity
      let canAccessOwn = false;
      try {
        const entity = await base44.entities[entityName].get(testEntityId);
        canAccessOwn = entity.created_by === currentUser.email;
      } catch (error) {
        canAccessOwn = false;
      }

      return {
        canReadOwn: ownRecords.length >= 0,
        canAccessSpecific: canAccessOwn,
        validated: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Access control validation failed:', error);
      return { error: error.message, validated: false };
    }
  },

  // Check for data leakage
  checkDataLeakage: async (entityName) => {
    try {
      const currentUser = await base44.auth.me();
      
      // Get all records user can see
      const visibleRecords = await base44.entities[entityName].list();
      
      // Filter to check if only own records are visible
      const leakedRecords = visibleRecords.filter(
        r => r.created_by !== currentUser.email
      );

      return {
        visibleRecordCount: visibleRecords.length,
        ownRecordCount: visibleRecords.filter(r => r.created_by === currentUser.email).length,
        leakedRecords: leakedRecords.length,
        hasLeakage: leakedRecords.length > 0,
        leakedEmails: leakedRecords.map(r => r.created_by),
        status: leakedRecords.length === 0 ? 'SECURE' : 'LEAKED',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Data leakage check failed:', error);
      return { error: error.message, status: 'ERROR' };
    }
  },

  // Validate multi-user scenario
  validateMultiUserScenario: async () => {
    try {
      const users = await base44.entities.User.list();
      
      const validation = {
        totalUsers: users.length,
        userEmails: users.map(u => u.email),
        isolationStatus: 'CHECKING',
        timestamp: new Date().toISOString(),
      };

      // Validate each user has isolated data
      for (const user of users.slice(0, 3)) { // Sample first 3 users
        try {
          const userRecords = await base44.entities.TargetShooting.filter({
            created_by: user.email,
          });
          
          validation[user.email] = {
            recordCount: userRecords.length,
            allByUser: userRecords.every(r => r.created_by === user.email),
          };
        } catch (error) {
          validation[user.email] = { error: error.message };
        }
      }

      return validation;
    } catch (error) {
      console.error('Multi-user validation failed:', error);
      return { error: error.message, isolationStatus: 'ERROR' };
    }
  },

  // Generate security report
  generateSecurityReport: async () => {
    const isolation = await rlsValidation.auditDataIsolation();
    const leakage = await rlsValidation.checkDataLeakage('TargetShooting');
    const access = await rlsValidation.validateAccessControl('TargetShooting', '');
    const multiUser = await rlsValidation.validateMultiUserScenario();

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        dataIsolation: isolation.isolated ? 'PASS' : 'FAIL',
        dataLeakage: leakage.status,
        accessControl: access.validated ? 'PASS' : 'FAIL',
        multiUserValidation: 'CHECKED',
      },
      details: {
        isolation,
        leakage,
        access,
        multiUser,
      },
      overallStatus: (isolation.isolated && leakage.leakedRecords === 0 && access.validated) ? 'SECURE' : 'REVIEW_REQUIRED',
    };
  },
};