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

    // STRICT evidence-based AI prompt - ONLY bullet impacts with splatter/damage evidence
    const analysisPrompt = `YOU ARE A BALLISTICS ANALYST. Your ONLY job is to find REAL BULLET IMPACTS.

=== WHAT IS A REAL BULLET IMPACT ===
A real bullet impact shows ONE OR MORE of these:
1. BRIGHT LIME/GREEN/YELLOW SPLATTER around a hole (fluorescent, vivid color)
2. TORN PAPER with ragged white/black edges and a dark hole in center
3. DARK HOLE with discolored/burned edges on red or black target
4. FRESH CRISP IMPACT MARK showing clear damage, not blur or smudge
5. CLUSTER of 2-4 holes within 20px of each other (tight grouping = real shooting)

=== WHAT IS NOT A REAL IMPACT ===
REJECT these immediately:
- Grid line intersections (black X marks)
- Printed scoring rings (concentric black circles)
- Printed numbers and text
- Dirt specks and dust (small, isolated, no splatter)
- Paper wrinkles and shadows (uniform, not distinct hole)
- Random black dots above the target face (no supporting evidence)
- Marks on printed lines without torn paper or color change
- Anything on white paper edges far from target face

=== HOW TO ANALYZE ===

STEP 1: LOCATE TARGET
Find the red/black bullseye center. This is where most impacts will be.
Estimate target radius = center ± 35% of image size.

STEP 2: SCAN FOR SPLATTER EVIDENCE FIRST
Look for bright lime/green/yellow pixels (high saturation, high brightness).
These are the easiest to confirm = HIGH CONFIDENCE (0.8+).
If you see splatter clusters, the center of each cluster is a bullet hole.

STEP 3: SCAN FOR TORN PAPER
Look for ragged white/black edges with a dark hole inside.
These are certain = HIGH CONFIDENCE (0.75+).
Dark hole + ragged edges + color change = real impact.

STEP 4: REJECT GRID/RING MARKS
Black grid lines? REJECT.
Black printed rings? REJECT.
Black numbers? REJECT.
Marks ONLY on these = confidence < 0.4 or REJECT.

STEP 5: CHECK CLUSTERING
Real shooting produces tight groups (2-5 holes within 20px).
If marks cluster together + show splatter, INCREASE confidence +0.1.
Isolated marks without splatter on white paper = LOW confidence (0.3-0.5).

STEP 6: REJECT MARKS OUTSIDE TARGET
Marks far above, left, or right of target face without splatter = REJECT.
Only accept outside marks if they have bright splatter or torn paper.

STEP 7: CONFIDENCE ASSIGNMENT
- Bright splatter (lime/green/yellow) = 0.85-0.95
- Torn paper + dark hole = 0.75-0.85
- Dark discolored mark on target = 0.60-0.75
- Uncertain but possible = 0.40-0.60
- Grid/ring marks = 0.10-0.30 (or REJECT)
- Marks above target no splatter = 0.10-0.30 (or REJECT)

=== OUTPUT ===
Return JSON with:
- image_width, image_height (from photo)
- bullet_holes: array of ALL candidates (even low confidence)
- target_centre: estimated red bullseye position
- point_of_aim: if visible
- confidence: overall assessment (0-1)
- warnings: list any suspicious findings

Example:
{
  "image_width": 3840,
  "image_height": 2880,
  "bullet_holes": [
    {
      "x": 1920,
      "y": 1440,
      "confidence": 0.92,
      "reason": "bright lime-green splatter on red center with dark hole"
    },
    {
      "x": 1945,
      "y": 1435,
      "confidence": 0.88,
      "reason": "torn paper clustered 25px from first impact"
    },
    {
      "x": 1500,
      "y": 900,
      "confidence": 0.25,
      "reason": "black mark on grid line - likely intersection, not hole"
    }
  ],
  "target_centre": {
    "x": 1920,
    "y": 1440,
    "confidence": 0.98,
    "reason": "red bullseye clearly visible"
  },
  "point_of_aim": null,
  "confidence": 0.88,
  "warnings": [
    "Grid line detected - may have grid marks in candidates"
  ]
}

IMPORTANT: Return ALL candidates, even low confidence ones. Do not silently drop marks.
The backend will filter based on confidence thresholds.
If unsure, mark as low confidence with reason - do not guess or skip.`;

    // Run main AI detection
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

    // Run splatter detection in parallel
    let splatDetection = null;
    try {
      const splatRes = await base44.functions.invoke('detectBulletSplatter', {
        photo_url: photo_url,
        image_width: aiResult.image_width || 1920,
        image_height: aiResult.image_height || 1440
      });
      if (splatRes.data.success) {
        splatDetection = splatRes.data.analysis;
      }
    } catch (err) {
      console.warn('Splatter detection failed, continuing with AI only:', err.message);
    }

    // Merge AI candidates with splatter evidence boost
    const mergeWithSplatterEvidence = (aiHoles, splatCandidates) => {
      if (!Array.isArray(aiHoles)) return aiHoles || [];
      if (!splatCandidates || !Array.isArray(splatCandidates.splatter_candidates)) {
        return aiHoles;
      }

      // Boost confidence of AI holes that match splatter clusters (within 30px)
      return aiHoles.map(hole => {
        const matchingSplat = splatCandidates.splatter_candidates.find(s => {
          const dist = Math.sqrt(Math.pow(s.x - hole.x, 2) + Math.pow(s.y - hole.y, 2));
          return dist < 30;
        });
        if (matchingSplat) {
          // Increase confidence by 0.15 if AI hole matches splatter evidence
          const boostedConf = Math.min(0.99, hole.confidence + 0.15);
          return { ...hole, confidence: boostedConf, hasSplatterEvidence: true };
        }
        return hole;
      });
    };

    // Validate, filter, and deduplicate bullet holes with target region awareness
    const validateAndClean = (holes, imgWidth, imgHeight, targetCentre) => {
      if (!Array.isArray(holes)) return [];
      
      // Define acceptable target region
      const targetRadius = Math.min(imgWidth, imgHeight) * 0.35; // 35% of image from center
      const centreX = targetCentre?.x || imgWidth * 0.5;
      const centreY = targetCentre?.y || imgHeight * 0.5;
      
      // Rejection reasons log (for audit)
      const rejectionLog = [];
      
      const filtered = holes
        .filter(h => {
          // Basic validation
          if (typeof h.x !== 'number' || typeof h.y !== 'number') {
            rejectionLog.push(`Invalid coordinates: ${h.x}, ${h.y}`);
            return false;
          }
          if (h.x < 0 || h.y < 0 || h.x > imgWidth || h.y > imgHeight) {
            rejectionLog.push(`Out of bounds: ${h.x}, ${h.y}`);
            return false;
          }
          
          const conf = parseFloat(h.confidence || 0);
          
          // Reject very low confidence (but still log it)
          if (conf < 0.2) {
            rejectionLog.push(`Very low conf (${conf}): ${h.reason || 'no reason'}`);
            return false;
          }
          
          const distFromCentre = Math.sqrt(
            Math.pow(h.x - centreX, 2) + Math.pow(h.y - centreY, 2)
          );
          
          // CRITICAL: Region filtering for marks outside target
          // If mark is far from center AND no splatter evidence AND low confidence → REJECT
          if (distFromCentre > targetRadius) {
            const hasSplatterEvidence = h.reason?.toLowerCase().includes('splatter') || 
                                       h.hasSplatterEvidence === true;
            
            if (!hasSplatterEvidence && conf < 0.65) {
              rejectionLog.push(`Outside target, no splatter, conf ${conf}: ${h.reason}`);
              return false;
            }
            
            // Way outside (1.5× radius) → require high confidence OR splatter
            if (distFromCentre > targetRadius * 1.5 && conf < 0.75 && !hasSplatterEvidence) {
              rejectionLog.push(`Way outside target: ${h.reason}`);
              return false;
            }
          }
          
          return true;
        })
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .reduce((clean, hole) => {
          // Deduplicate: merge if < 25px apart
          const isDuplicate = clean.some(c => {
            const pixelDist = Math.sqrt(
              Math.pow(c.x - hole.x, 2) + Math.pow(c.y - hole.y, 2)
            );
            return pixelDist < 25 && Math.abs((c.confidence || 0) - (hole.confidence || 0)) < 0.15;
          });
          return isDuplicate ? clean : [...clean, hole];
        }, []);

      return { validated: filtered, rejectionLog };
    };

    const imgWidth = aiResult.image_width || 1920;
    const imgHeight = aiResult.image_height || 1440;
    
    const centre = aiResult.target_centre && 
                   aiResult.target_centre.x >= 0 && aiResult.target_centre.x <= imgWidth && 
                   aiResult.target_centre.y >= 0 && aiResult.target_centre.y <= imgHeight
                   ? aiResult.target_centre
                   : null;
    
    // Step 1: Merge AI candidates with splatter evidence boost
    const aiWithSplatterBoost = mergeWithSplatterEvidence(aiResult.bullet_holes || [], splatDetection);
    
    // Step 2: Validate and filter with detailed rejection logging
    const { validated: validatedHolesArray, rejectionLog } = validateAndClean(
      aiWithSplatterBoost, 
      imgWidth, 
      imgHeight, 
      centre
    );
    
    // Step 3: Normalize to 0-1 coordinates for frontend
    const validatedHoles = validatedHolesArray
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

    // Add detailed rejection audit info
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
      rejection_log: rejectionLog,
      splatter_detection_used: !!splatDetection,
      splatter_candidates_count: splatDetection?.splatter_candidates?.length || 0,
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