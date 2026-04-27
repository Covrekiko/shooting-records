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

    // Advanced AI prompt with splatter detection and target region filtering
    const analysisPrompt = `You are a professional target analyst detecting ONLY REAL bullet impacts in a shooting target photograph.

CRITICAL RULES:
1. REJECT marks that are ONLY on grid lines, rings, or text - these are NOT bullet holes
2. REJECT marks above or far from the main target face without clear impact evidence
3. PRIORITIZE splatter marks: bright green, yellow, lime fluorescent colors = HIGH CONFIDENCE
4. Real impacts show: torn paper, dark hole, discolored area, fresh crisp damage edges
5. CLUSTER marks together - if marks form a tight group near bullseye, confidence increases
6. REJECT isolated marks on plain white paper far from any splatter

TARGET REGIONS:
- RED/BLACK CENTER AREA: Primary impact zone - most real bullets hit here
- SURROUNDING PAPER: Secondary zone - acceptable if splatter/hole visible
- ABOVE TARGET: ONLY accept if bright green/yellow splatter or torn hole present
- EDGE/GRID AREAS: REJECT unless clear splatter evidence

DETECTION PROCESS:
1. Find target centre (red bullseye or aiming mark)
2. Scan near target centre FIRST for green/yellow splatter or holes
3. Check each candidate: Is it near splatter? Is it on grid/text only? Is it clustered?
4. DOWNGRADE or REJECT candidates:
   - Alone on white paper, no splatter nearby → confidence < 0.5
   - On grid/ring line only → confidence < 0.4
   - Above target with no splatter → confidence < 0.3
   - Print text or number marks → REJECT
5. UPGRADE confidence for:
   - Clear green/yellow splatter → +0.2
   - Part of tight cluster (2-4 holes) → +0.1
   - Dark hole with ragged edges → +0.15

FINAL CHECK:
Before returning, verify:
- Most high-confidence marks cluster together or show splatter
- No stray marks above target without splatter evidence
- Grid intersections and printed marks are low/rejected

Return PIXEL COORDINATES. Include target_centre and point_of_aim.

JSON FORMAT:
{
  "image_width": 1920,
  "image_height": 1440,
  "bullet_holes": [
    {"x": 450, "y": 320, "confidence": 0.95, "reason": "green splatter on red center"},
    {"x": 480, "y": 315, "confidence": 0.92, "reason": "ragged edge impact clustered"},
    {"x": 475, "y": 325, "confidence": 0.88, "reason": "torn hole near splatter"}
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
    "confidence": 0.8,
    "reason": "crosshair visible"
  },
  "confidence": 0.88,
  "notes": "3 high-confidence impacts in tight cluster near bullseye, all with green splatter evidence",
  "warnings": []
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

    // Validate, filter, and deduplicate bullet holes with target region awareness
    const validateAndClean = (holes, imgWidth, imgHeight, targetCentre) => {
      if (!Array.isArray(holes)) return [];
      
      // Define acceptable target region (rough bounds around bullseye)
      const targetRadius = Math.min(imgWidth, imgHeight) * 0.35; // ~35% of image from center
      const centreX = targetCentre?.x || imgWidth * 0.5;
      const centreY = targetCentre?.y || imgHeight * 0.5;
      
      return holes
        .filter(h => {
          // Basic validation
          if (typeof h.x !== 'number' || typeof h.y !== 'number') return false;
          if (h.x < 0 || h.y < 0 || h.x > imgWidth || h.y > imgHeight) return false;
          
          const conf = parseFloat(h.confidence || 0);
          if (conf < 0.3) return false; // reject very low confidence
          
          // Region filtering: marks far from target with low confidence should be rejected
          const distFromCentre = Math.sqrt(
            Math.pow(h.x - centreX, 2) + Math.pow(h.y - centreY, 2)
          );
          
          // If mark is far from target centre AND low confidence, reject it
          if (distFromCentre > targetRadius && conf < 0.65) {
            return false;
          }
          
          // If mark is way outside target AND no splatter hint in reason, reject
          if (distFromCentre > targetRadius * 1.5 && !h.reason?.includes('splatter')) {
            return false;
          }
          
          return true;
        })
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0)) // sort by confidence desc
        .reduce((clean, hole) => {
          // Deduplicate: merge if < 25px apart AND high confidence match
          const isDuplicate = clean.some(c => {
            const pixelDist = Math.sqrt(
              Math.pow(c.x - hole.x, 2) + Math.pow(c.y - hole.y, 2)
            );
            const confDiff = Math.abs((c.confidence || 0) - (hole.confidence || 0));
            return pixelDist < 25 && confDiff < 0.15;
          });
          return isDuplicate ? clean : [...clean, hole];
        }, []);
    };

    const imgWidth = aiResult.image_width || 1920;
    const imgHeight = aiResult.image_height || 1440;
    
    const centre = aiResult.target_centre && 
                   aiResult.target_centre.x >= 0 && aiResult.target_centre.x <= imgWidth && 
                   aiResult.target_centre.y >= 0 && aiResult.target_centre.y <= imgHeight
                   ? aiResult.target_centre
                   : null;
    
    // Validate holes with target region awareness
    const validatedHoles = validateAndClean(aiResult.bullet_holes || [], imgWidth, imgHeight, centre)
      .map(h => ({
        x: h.x / imgWidth,      // normalize to 0-1
        y: h.y / imgHeight,
        confidence: Math.max(0, Math.min(1, parseFloat(h.confidence) || 0)),
        reason: h.reason || ''
      }));

    const normalisedCentre = centre ? {
                        x: centre.x / imgWidth,
                        y: centre.y / imgHeight,
                        confidence: Math.max(0, Math.min(1, parseFloat(centre.confidence) || 0)),
                        reason: centre.reason || ''
                      } : null;

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
      target_centre: normalisedCentre,
      point_of_aim: aim,
      confidence: Math.max(0, Math.min(1, aiResult.confidence || 0)),
      notes: aiResult.notes || '',
      warnings: Array.isArray(aiResult.warnings) ? aiResult.warnings : [],
      image_width: imgWidth,
      image_height: imgHeight,
      validated_count: validatedHoles.length,
      raw_count: (aiResult.bullet_holes || []).length,
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