import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { photo_url } = body;

    if (!photo_url) {
      return Response.json({ error: 'photo_url required' }, { status: 400 });
    }

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this target shooting photo and extract accuracy information. 
      
      Identify:
      1. The number of visible bullet holes/hits
      2. The grouping pattern (tight cluster, spread, etc)
      3. Estimated accuracy percentage (0-100%) based on how close hits are to center/bullseye
      4. Overall assessment
      
      Return as JSON with fields: hits_count, grouping_pattern, accuracy_percentage (0-100), assessment`,
      file_urls: [photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          hits_count: { type: 'number' },
          grouping_pattern: { type: 'string' },
          accuracy_percentage: { type: 'number' },
          assessment: { type: 'string' }
        },
        required: ['hits_count', 'grouping_pattern', 'accuracy_percentage', 'assessment']
      }
    });

    return Response.json({
      success: true,
      analysis: response
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});