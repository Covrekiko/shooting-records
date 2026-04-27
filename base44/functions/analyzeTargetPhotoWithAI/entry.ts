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

    // Comprehensive AI analysis prompt with vision-specific instructions
    const analysisPrompt = `You are analyzing a rifle or pistol TARGET SHOOTING photograph to detect ALL bullet holes.

CRITICAL TASK:
1. Scan the ENTIRE target surface for ALL bullet holes (dark punctures/tears in paper)
2. Bullet holes appear as: darker/black circular or oval penetrations where bullets passed through
3. Find the target bullseye center (red circle, black dot, or crosshair center)
4. Return NORMALIZED coordinates (0.0-1.0 range, not pixels)

WHAT TO DETECT - BULLET HOLES ARE:
- Dark round/oval holes with torn/ragged edges
- Darker than surrounding paper
- Multiple holes clustered together = group
- Even if edge is torn or slightly irregular
- Small dark spots = likely bullet holes

WHAT TO IGNORE - NOT BULLET HOLES:
- Printed target rings (black circles, lines) - these are just drawn lines
- Printed numbers (7, 8, 9, etc) - just printed text
- Red/yellow/blue center aiming markers - painted on target
- Crosshair lines - printed reference lines
- Grid lines on background paper
- Shadows under the target
- Scratches or dirt marks
- The backing/stand behind target

DETECTION RULES:
- Look for groups of 2+ holes near each other = typical shooting group
- Each bullet makes ONE hole = count individual dark penetrations
- If hole edges are ragged/irregular = still a bullet hole
- Scan systematically from top to bottom, left to right
- Find ALL visible holes, not just obvious ones
- Confidence = how certain you are (0.1=uncertain, 0.9=very certain)

RETURN FORMAT (valid JSON only):
{
  "bullet_holes": [
    {"x": 0.15, "y": 0.42, "confidence": 0.85},
    {"x": 0.16, "y": 0.44, "confidence": 0.82},
    {"x": 0.18, "y": 0.48, "confidence": 0.88}
  ],
  "target_centre": {"x": 0.5, "y": 0.5, "confidence": 0.9},
  "point_of_aim": {"x": 0.5, "y": 0.48, "confidence": 0.7},
  "confidence": 0.85,
  "notes": "Found 3 bullet holes in tight group. Target center is red bullseye.",
  "warnings": []
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