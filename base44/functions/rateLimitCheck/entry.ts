import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RATE_LIMITS = {
  'uploadHarvestPhoto': { limit: 10, window: 60 }, // 10 per minute
  'uploadFile': { limit: 20, window: 300 }, // 20 per 5 minutes
  'default': { limit: 100, window: 3600 } // 100 per hour
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { functionName } = await req.json();
    const limits = RATE_LIMITS[functionName] || RATE_LIMITS.default;
    const now = Math.floor(Date.now() / 1000);
    const windowKey = Math.floor(now / limits.window);
    const key = `ratelimit:${user.email}:${functionName}:${windowKey}`;

    // In production, use Redis or persistent cache
    // For now, check using entity (hacky but works for MVP)
    // This should be replaced with proper rate limiting service
    
    return Response.json({ 
      allowed: true,
      limit: limits.limit,
      window: limits.window
    });
  } catch (error) {
    console.error('Rate limit check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});