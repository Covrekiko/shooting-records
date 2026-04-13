import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { points } = await req.json();

    if (!Array.isArray(points) || points.length < 3) {
      return Response.json(
        { error: 'Need at least 3 points' },
        { status: 400 }
      );
    }

    // Validate lat/lng ranges
    for (const point of points) {
      const [lat, lng] = point;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return Response.json(
          { error: 'Invalid coordinates: lat must be -90 to 90, lng must be -180 to 180' },
          { status: 400 }
        );
      }
    }

    // Check for duplicates
    const uniquePoints = new Set(points.map(p => `${p[0]},${p[1]}`));
    if (uniquePoints.size !== points.length) {
      return Response.json(
        { error: 'Duplicate points not allowed' },
        { status: 400 }
      );
    }

    // Check polygon is reasonably sized
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);

    if (latRange > 10 || lngRange > 10) {
      return Response.json(
        { error: 'Area too large (max 10° × 10°)' },
        { status: 400 }
      );
    }

    return Response.json({ valid: true });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});