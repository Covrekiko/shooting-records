import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photo_url } = await req.json();

    if (!photo_url) {
      return Response.json({ error: 'photo_url required' }, { status: 400 });
    }

    // Comprehensive AI analysis prompt
    const analysisPrompt = `You are analyzing a target shooting photograph to detect bullet holes.

TASK:
1. Find all bullet holes in the target (dark circles/punctures in paper)
2. Identify the target center (bullseye, crosshairs, or center mark if visible)
3. Identify the point of aim if visible (aiming mark, aim dot)
4. Rate your confidence (0.0 = guessing, 1.0 = certain)

RULES:
- Only detect ACTUAL bullet holes (dark penetrations), not:
  - Target rings or scoring circles (printed lines)
  - Text or numbers on target
  - Shadows, reflections, or stains
  - Corner marks or registration marks
- Return coordinates as normalized (0.0 to 1.0 range)
- 0,0 = top-left corner; 1,1 = bottom-right corner
- If confidence < 0.5 for any detection, include warning in "warnings" array
- If you see <2 bullet holes, still return what you detect
- Confidence: rate overall confidence in detection accuracy

RESPONSE FORMAT (must be valid JSON):
{
  "bullet_holes": [
    {"x": 0.0-1.0, "y": 0.0-1.0, "confidence": 0.0-1.0}
  ],
  "target_centre": {
    "x": 0.0-1.0,
    "y": 0.0-1.0,
    "confidence": 0.0-1.0
  },
  "point_of_aim": {
    "x": 0.0-1.0,
    "y": 0.0-1.0,
    "confidence": 0.0-1.0
  },
  "confidence": 0.0-1.0,
  "notes": "brief description of what you detected",
  "warnings": ["warning 1", "warning 2"]
}`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          bullet_holes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                confidence: { type: 'number' }
              },
              required: ['x', 'y']
            }
          },
          target_centre: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              confidence: { type: 'number' }
            }
          },
          point_of_aim: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              confidence: { type: 'number' }
            }
          },
          confidence: { type: 'number' },
          notes: { type: 'string' },
          warnings: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    // Validate and deduplicate bullet holes
    const validateAndClean = (holes) => {
      if (!Array.isArray(holes)) return [];
      
      return holes
        .filter(h => {
          // Check bounds
          if (h.x < 0 || h.x > 1 || h.y < 0 || h.y > 1) return false;
          // Check required fields
          if (typeof h.x !== 'number' || typeof h.y !== 'number') return false;
          return true;
        })
        .reduce((clean, hole) => {
          // Deduplicate: skip if similar hole already exists
          const isDuplicate = clean.some(c => 
            Math.abs(c.x - hole.x) < 0.03 && Math.abs(c.y - hole.y) < 0.03
          );
          return isDuplicate ? clean : [...clean, hole];
        }, []);
    };

    const validatedHoles = validateAndClean(aiResult.bullet_holes || []);
    const centre = aiResult.target_centre && aiResult.target_centre.x >= 0 && aiResult.target_centre.x <= 1 && 
                   aiResult.target_centre.y >= 0 && aiResult.target_centre.y <= 1 
                   ? aiResult.target_centre 
                   : null;
    const aim = aiResult.point_of_aim && aiResult.point_of_aim.x >= 0 && aiResult.point_of_aim.x <= 1 && 
                aiResult.point_of_aim.y >= 0 && aiResult.point_of_aim.y <= 1 
                ? aiResult.point_of_aim 
                : null;

    const analysis = {
      bullet_holes: validatedHoles,
      target_centre: centre,
      point_of_aim: aim,
      confidence: Math.max(0, Math.min(1, aiResult.confidence || 0)),
      notes: aiResult.notes || '',
      warnings: Array.isArray(aiResult.warnings) ? aiResult.warnings : [],
      timestamp: new Date().toISOString()
    };

    return Response.json({ success: true, analysis });
  } catch (error) {
    console.error('AI analysis error:', error);
    return Response.json({ 
      error: error.message || 'Analysis failed',
      success: false,
      analysis: null
    }, { status: 500 });
  }
});