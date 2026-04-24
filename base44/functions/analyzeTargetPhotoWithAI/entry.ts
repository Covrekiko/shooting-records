import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photo_url, distance, distance_unit } = await req.json();

    if (!photo_url) {
      return Response.json({ error: 'photo_url required' }, { status: 400 });
    }

    // Call LLM to analyze the target photo
    const analysisPrompt = `Analyze this target shooting photo and detect:
1. The target center point (crosshairs, bull's eye, etc.)
2. All bullet holes in the target
3. Estimate the group size
4. Calculate point of impact relative to center

Provide response as JSON with:
{
  "detected_bullets": [{"x": 0.0-1.0, "y": 0.0-1.0}, ...],
  "center_point": {"x": 0.0-1.0, "y": 0.0-1.0},
  "confidence": 0.0-1.0,
  "notes": "description of what was found"
}

Use normalized coordinates (0.0-1.0) where 0,0 is top-left and 1,1 is bottom-right.
If uncertain about any detection, mark confidence < 0.7.`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          detected_bullets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' }
              }
            }
          },
          center_point: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            }
          },
          confidence: { type: 'number' },
          notes: { type: 'string' }
        }
      }
    });

    // Convert normalized coordinates to pixel coordinates (need image dimensions)
    // For now, return the normalized coords and let frontend handle conversion
    const analysis = {
      detected_bullets: aiResult.detected_bullets || [],
      center_point: aiResult.center_point || { x: 0.5, y: 0.5 },
      confidence: aiResult.confidence || 0,
      notes: aiResult.notes || '',
      distance: distance,
      distance_unit: distance_unit || 'm',
      timestamp: new Date().toISOString()
    };

    return Response.json({ success: true, analysis });
  } catch (error) {
    console.error('AI analysis error:', error);
    return Response.json({ 
      error: error.message || 'Analysis failed',
      success: false 
    }, { status: 500 });
  }
});