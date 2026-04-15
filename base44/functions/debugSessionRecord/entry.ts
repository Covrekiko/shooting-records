import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Fetch the record
    const record = await base44.entities.SessionRecord.get(sessionId);

    // Return full details for inspection
    return Response.json({
      success: true,
      record: {
        id: record.id,
        category: record.category,
        ammunition_id: record.ammunition_id,
        ammunition_used: record.ammunition_used,
        rounds_fired: record.rounds_fired,
        total_count: record.total_count,
        rifles_used: record.rifles_used,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});