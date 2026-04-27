import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * LOCAL SPLATTER DETECTION
 * Analyzes image for lime/green/yellow fluorescent splatter clusters
 * Returns candidates as additional detection data for merging with AI results
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { photo_url, image_width, image_height } = await req.json();

    if (!photo_url || !image_width || !image_height) {
      return Response.json({ 
        error: 'photo_url, image_width, and image_height required', 
        success: false 
      }, { status: 400 });
    }

    // Invoke LLM with specialized splatter detection instructions
    const splatDetectionPrompt = `You are analyzing a paper shooting target to find bullet impacts via SPLATTER EVIDENCE ONLY.

TASK: Find ALL lime/green/yellow fluorescent splatter clusters. These are caused by bullet impacts.

SPLATTER CHARACTERISTICS:
- Lime green, yellow-green, or bright yellow color
- High saturation (vivid, not dull)
- High brightness (not dark green)
- Clustered pixels forming blobs or rings
- Usually 5-20px diameter minimum
- Often in clusters of 2-5 impacts near target center

REJECT (NOT SPLATTER):
- Black lines (target rings, grid)
- Gray/dark spots (shadows, dirt)
- Printed text/numbers (black)
- Uniform white paper
- Dark holes without color change

PROCESS:
1. Scan the image for lime/green/yellow pixels
2. Group nearby similar-color pixels into candidate blobs
3. Find centroid of each blob
4. Filter by size (reject tiny noise < 3px)
5. Reject long lines (>2:1 aspect ratio) - these are grid lines
6. Estimate blob confidence by color intensity and cluster tightness
7. Return pixel coordinates of blob centroids

DO NOT return grid intersections or paper defects.
ONLY return splatter cluster centers.

Return JSON:
{
  "splatter_candidates": [
    {"x": 450, "y": 320, "confidence": 0.9, "blob_size_px": 12, "color_evidence": "bright_lime_green"},
    {"x": 480, "y": 315, "confidence": 0.85, "blob_size_px": 9, "color_evidence": "yellow_green"}
  ],
  "processing_notes": "Found 2 major splatter clusters near image center"
}`;

    const splatResult = await base44.integrations.Core.InvokeLLM({
      prompt: splatDetectionPrompt,
      file_urls: [photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          splatter_candidates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                confidence: { type: 'number' },
                blob_size_px: { type: 'number' },
                color_evidence: { type: 'string' }
              },
              required: ['x', 'y', 'confidence']
            }
          },
          processing_notes: { type: 'string' }
        }
      }
    });

    // Validate splatter candidates
    const validatedSplatter = (splatResult.splatter_candidates || [])
      .filter(c => {
        if (typeof c.x !== 'number' || typeof c.y !== 'number') return false;
        if (c.x < 0 || c.y < 0 || c.x >= image_width || c.y >= image_height) return false;
        const conf = parseFloat(c.confidence || 0);
        return conf >= 0.5; // Only high-confidence splatter clusters
      })
      .map(c => ({
        x: c.x,
        y: c.y,
        confidence: Math.max(0, Math.min(1, parseFloat(c.confidence) || 0)),
        blob_size_px: c.blob_size_px || 0,
        color_evidence: c.color_evidence || 'splatter'
      }));

    const analysis = {
      splatter_candidates: validatedSplatter,
      processing_notes: splatResult.processing_notes || '',
      image_width,
      image_height,
      candidate_count: validatedSplatter.length
    };

    return Response.json({ success: true, analysis });
  } catch (error) {
    console.error('Splatter detection error:', error);
    return Response.json({ 
      error: error.message || 'Splatter detection failed',
      success: false,
      analysis: null
    }, { status: 500 });
  }
});