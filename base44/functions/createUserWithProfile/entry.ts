import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backend function to create a user with full profile details.
 * Only callable by admins. Handles:
 * - User creation via API
 * - Profile data storage
 * - Role assignment (with validation)
 * - Account status
 * - Force password change flag
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    // Security: Only admins can create users
    if (!admin || admin.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const payload = await req.json();
    const {
      email,
      tempPassword,
      role,
      status,
      forcePasswordChange,
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      phone,
      addressLine1,
      addressLine2,
      city,
      county,
      postcode,
      country,
      facNumber,
      shotgunCertificate,
      certificateExpiryDate,
      dscLevel,
      betaTesterNotes,
      betaTesterStatus,
      betaTesterExpiresAt,
    } = payload;

    // Validation
    if (!email || !tempPassword || !role || !firstName || !lastName) {
      return Response.json(
        { error: 'Missing required fields: email, password, role, firstName, lastName' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'normal_user', 'beta_tester'];
    if (!validRoles.includes(role)) {
      return Response.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    if (!['active', 'suspended', 'banned'].includes(status || 'active')) {
      return Response.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Check if email already exists
    try {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers.length > 0) {
        return Response.json(
          { error: 'Email already exists' },
          { status: 400 }
        );
      }
    } catch {
      // If filter fails, continue (might be a new app with no users)
    }

    // Create user via SDK
    try {
      // First invite the user with temporary password
      await base44.users.inviteUser(email, role, tempPassword);

      // Fetch the created user
      const createdUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (createdUsers.length === 0) {
        return Response.json(
          { error: 'User was created but could not be retrieved' },
          { status: 500 }
        );
      }

      const userId = createdUsers[0].id;

      // Update user with full profile
      const profileData = {
        role,
        status: status || 'active',
        firstName,
        middleName: middleName || null,
        lastName,
        dateOfBirth: dateOfBirth || null,
        phone: phone || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        county: county || null,
        postcode,
        country,
        profileComplete: true,
        forcePasswordChange: forcePasswordChange || false,
        createdByAdmin: true,
        facNumber: facNumber || null,
        shotgunCertificate: shotgunCertificate || null,
        certificateExpiryDate: certificateExpiryDate || null,
        dscLevel: dscLevel || null,
      };

      // Add beta tester fields if role is beta_tester
      if (role === 'beta_tester') {
        profileData.beta_tester_status = betaTesterStatus || 'active';
        profileData.beta_tester_notes = betaTesterNotes || null;
        profileData.beta_tester_expires_at = betaTesterExpiresAt || null;
      }

      // Update with service role to ensure all fields are set
      await base44.asServiceRole.entities.User.update(userId, profileData);

      return Response.json({
        success: true,
        message: `User ${email} created successfully`,
        userId,
        email,
        role,
      });
    } catch (createError) {
      console.error('User creation error:', createError);
      return Response.json(
        { error: `Failed to create user: ${createError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Function error:', error);
    return Response.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
});