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

    // Advanced AI prompt for target analysis with splatter/impact detection
    const analysisPrompt = `You are a professional target analyst detecting ALL bullet impacts in a shooting target photograph.

TASK: Find every bullet hole/impact in this target photo, no matter how small or faint.

KEY DETECTION TARGETS:
A) BULLET HOLES on white/light paper:
   - Dark circular or irregular holes/tears
   - Ragged edges where bullet penetrated
   - Multiple holes clustered = tight group
   - Even small or partially torn holes

B) BULLET IMPACTS on black bullseye:
   - Bright green, yellow, or white splatter marks
   - Holes punched through black area
   - Secondary splatter around impact zone
   - Look for ANY color change from pure black

C) BULLET MARKS on red center:
   - Dark holes or tears
   - Green/yellow splatter
   - Irregular impact marks
   - Scuff or bright marks

CRITICAL - DO NOT MARK (False Positives):
- Printed target rings (concentric black circles) = measurement guides, NOT bullet holes
- Printed numbers (5, 7, 8, 9, 10) = text labels
- Grid lines on background paper = reference grid
- Crosshair center mark = aiming guide (not a hole)
- Dirt, dust, or stains without clear impact signature
- Shadows or shading gradients
- Target edge marks or tape

DETECTION PROCESS:
1. Identify white paper background - look for dark holes here first
2. Identify black bullseye area - look for bright splatter/impacts
3. Identify red center area - look for any deviation from pure red
4. Look for tight clusters (groups of 2-5 holes close together)
5. Rate confidence for each hole independently
6. Include LOW confidence candidates (0.4+) with confidence value

OUTPUT: Return EVERY possible bullet impact, sorted by confidence.
Include candidates even if uncertain - confidence value is key!

Return PIXEL COORDINATES relative to image dimensions (not normalized 0-1).
Include image_width and image_height so frontend can normalize correctly.

JSON FORMAT:
{
  "image_width": 1920,
  "image_height": 1440,
  "bullet_holes": [
    {"x": 450, "y": 320, "confidence": 0.95, "reason": "dark hole on white"},
    {"x": 480, "y": 315, "confidence": 0.92, "reason": "ragged edge impact"},
    {"x": 320, "y": 450, "confidence": 0.65, "reason": "green splatter on black"},
    {"x": 880, "y": 590, "confidence": 0.45, "reason": "possible faint splatter"}
  ],
  "target_centre": {
    "x": 960,
    "y": 720,
    "confidence": 0.98,
    "reason": "red bullseye center"
  },
  "point_of_aim": {
    "x": 960,
    "y": 700,
    "confidence": 0.7,
    "reason": "crosshair or aiming mark"
  },
  "confidence": 0.82,
  "notes": "Found 4 holes in tight vertical group on white paper. Black bullseye has 2 green splatter marks",
  "warnings": ["Low confidence on splatter marks - verify visually", "Grid lines may be confusing detection"]
}`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          image_width: { type: 'number' },
          image_height: { type: 'number' },
          bullet_holes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                confidence: { type: 'number' },
                reason: { type: 'string' }
              },
              required: ['x', 'y', 'confidence']
            }
          },
          target_centre: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              confidence: { type: 'number' },
              reason: { type: 'string' }
            }
          },
          point_of_aim: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              confidence: { type: 'number' },
              reason: { type: 'string' }
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

    // Validate and deduplicate bullet holes with relaxed clustering
    const validateAndClean = (holes, imgWidth, imgHeight) => {
      if (!Array.isArray(holes)) return [];
      
      // AI returns pixel coords, convert to normalized for storage + validation
      return holes
        .filter(h => {
          // Validate pixel ranges
          if (typeof h.x !== 'number' || typeof h.y !== 'number') return false;
          if (h.x < 0 || h.y < 0) return false;
          if (imgWidth && h.x > imgWidth) return false;
          if (imgHeight && h.y > imgHeight) return false;
          // Confidence must be 0-1
          const conf = parseFloat(h.confidence || 0);
          if (conf < 0.35) return false; // skip very low confidence
          return true;
        })
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0)) // sort by confidence desc
        .reduce((clean, hole) => {
          // Deduplicate: only merge if < 20px apart AND confidence difference < 0.1
          const isDuplicate = clean.some(c => {
            const pixelDist = Math.sqrt(
              Math.pow(c.x - hole.x, 2) + Math.pow(c.y - hole.y, 2)
            );
            const confDiff = Math.abs((c.confidence || 0) - (hole.confidence || 0));
            return pixelDist < 20 && confDiff < 0.1;
          });
          return isDuplicate ? clean : [...clean, hole];
        }, []);
    };

    const imgWidth = aiResult.image_width || 1920;
    const imgHeight = aiResult.image_height || 1440;
    
    const validatedHoles = validateAndClean(aiResult.bullet_holes || [], imgWidth, imgHeight)
      .map(h => ({
        x: h.x / imgWidth,      // normalize to 0-1
        y: h.y / imgHeight,
        confidence: Math.max(0, Math.min(1, parseFloat(h.confidence) || 0)),
        reason: h.reason || ''
      }));

    const centre = aiResult.target_centre && 
                   aiResult.target_centre.x >= 0 && aiResult.target_centre.x <= imgWidth && 
                   aiResult.target_centre.y >= 0 && aiResult.target_centre.y <= imgHeight
                   ? {
                       x: aiResult.target_centre.x / imgWidth,
                       y: aiResult.target_centre.y / imgHeight,
                       confidence: Math.max(0, Math.min(1, parseFloat(aiResult.target_centre.confidence) || 0)),
                       reason: aiResult.target_centre.reason || ''
                     }
                   : null;

    const aim = aiResult.point_of_aim && 
                aiResult.point_of_aim.x >= 0 && aiResult.point_of_aim.x <= imgWidth && 
                aiResult.point_of_aim.y >= 0 && aiResult.point_of_aim.y <= imgHeight
                ? {
                    x: aiResult.point_of_aim.x / imgWidth,
                    y: aiResult.point_of_aim.y / imgHeight,
                    confidence: Math.max(0, Math.min(1, parseFloat(aiResult.point_of_aim.confidence) || 0)),
                    reason: aiResult.point_of_aim.reason || ''
                  }
                : null;

    const analysis = {
      bullet_holes: validatedHoles,
      target_centre: centre,
      point_of_aim: aim,
      confidence: Math.max(0, Math.min(1, aiResult.confidence || 0)),
      notes: aiResult.notes || '',
      warnings: Array.isArray(aiResult.warnings) ? aiResult.warnings : [],
      image_width: imgWidth,
      image_height: imgHeight,
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