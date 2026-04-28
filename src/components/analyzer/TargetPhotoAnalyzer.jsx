import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Save, Loader2, Trash2, Plus, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AIPhotoComparison from './AIPhotoComparison';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import { mmToMoa, mmToMrad, calcGroupSizePixels, convertGroupSize } from '@/lib/groupSizeCalculations';

// FEATURE FLAG: AI Target Photo Analysis is currently disabled because detection accuracy needs further work.
// Manual marking remains the active production workflow. Keep AIPhotoComparison code for future AI improvements.
const FEATURE_AI_TARGET_ANALYSIS = false;

function calcCentroid(marks) {
  if (!marks.length) return { x: 0, y: 0 };
  const x = marks.reduce((s, m) => s + m.x, 0) / marks.length;
  const y = marks.reduce((s, m) => s + m.y, 0) / marks.length;
  return { x, y };
}

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

export default function TargetPhotoAnalyzer({ session, groups = [], editGroup, rifles = [], ammunition = [], onSave, onBack }) {
  const nextGroupNumber = (groups || []).length + 1;
  const [photo, setPhoto] = useState(editGroup?.photo_url || null);
  const [analysisMode, setAnalysisMode] = useState(null); // null | manual | ai
  const [marks, setMarks] = useState(editGroup?.bullet_marks || []);
  const [centrePoint, setCentrePoint] = useState(editGroup?.centre_mark || null);
  const [aimPoint, setAimPoint] = useState(editGroup?.aim_mark || null);
  const [mode, setMode] = useState(''); // bullets | centre | aim
  const [scaleRef, setScaleRef] = useState(editGroup?.scale_reference || '1cm grid');
  const [scaleInput, setScaleInput] = useState('1');
  const [scaleUnit, setScaleUnit] = useState(editGroup?.scale_unit || 'cm'); // mm, cm, in
  const [scalePx, setScalePx] = useState(editGroup?.scale_mm_per_px || null);
  const [calibPoints, setCalibPoints] = useState([]); // last two tapped calibration points (pixel coords)
  const [groupName, setGroupName] = useState(editGroup?.group_name || `Group ${nextGroupNumber}`);
  const [notes, setNotes] = useState(editGroup?.notes || '');
  const [confirmedZero, setConfirmedZero] = useState(editGroup?.confirmed || editGroup?.confirmed_zero || false);
  const [shootingPosition, setShootingPosition] = useState(editGroup?.shooting_position || session.shooting_position || '');
  const [distanceOverride, setDistanceOverride] = useState(editGroup?.distance_override || '');
  const [distanceUnit, setDistanceUnit] = useState(editGroup?.distance_unit || 'meters');
  const [selectedRifleId, setSelectedRifleId] = useState(editGroup?.rifle_id || session.rifle_id || '');
  const [selectedAmmoId, setSelectedAmmoId] = useState(editGroup?.ammunition_id || session.ammo_id || '');
  const POSITIONS = ['benchrest', 'prone', 'sticks', 'high_seat', 'standing', 'other'];
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [bestGroup, setBestGroup] = useState(editGroup?.best_group || false);
  const [setScaleMode, setSetScaleMode] = useState(false);
  const [scalePoints, setScalePoints] = useState([]);
  const [scaleDragPoint, setScaleDragPoint] = useState(null); // Live cursor position while drawing line
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState(null);

  // Pan/zoom state
  // Pan/zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef(null);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(null);
  const didPan = useRef(false);
  const containerRef = useRef(null);
  
  // Scale state - stored separately to persist independently
  const scaleStateRef = useRef({
    calibPoints: [],
    scalePx: editGroup?.scale_mm_per_px || null,
    scaleValue: editGroup?.scale_reference ? 
      parseFloat(editGroup.scale_reference.match(/\d+/)?.[0] || scaleInput) : 
      parseFloat(scaleInput),
    scaleUnitVal: editGroup?.scale_unit || 'cm'
  });

  useEffect(() => {
    if (!scalePx || marks.length < 2) {
      if (marks.length < 2) setResults(null);
      return;
    }

    let distM = null;
    const rawDist = distanceOverride !== '' ? parseFloat(distanceOverride) : parseFloat(session.distance);
    if (rawDist > 0) {
      const unit = distanceOverride !== '' ? distanceUnit : (session.distance_unit || 'meters');
      distM = unit === 'yards' ? rawDist * 0.9144 : rawDist;
    }

    // Use shared calculation
    const groupPx = calcGroupSizePixels(marks);
    const metrics = convertGroupSize(groupPx, scalePx, distM);

    if (!metrics) {
      setResults(null);
      return;
    }

    let poiX = 0, poiY = 0;
    if (centrePoint && marks.length) {
      const centroid = calcCentroid(marks);
      poiX = (centroid.x - centrePoint.x) * scalePx;
      poiY = -(centroid.y - centrePoint.y) * scalePx;
    }

    setResults({
      shots: marks.length,
      groupMm: metrics.mm,
      groupMoa: metrics.moa,
      groupMrad: metrics.mrad,
      groupInches: metrics.inches,
      groupCm: Math.round(metrics.mm / 10 * 10) / 10,
      poiX: Math.round(poiX * 10) / 10,
      poiY: Math.round(poiY * 10) / 10,
      hasDistance: distM !== null,
    });
  }, [marks, centrePoint, aimPoint, scalePx, distanceOverride, distanceUnit]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;

    console.log('[TargetPhotoAnalyzer] File selected:', file.name, file.type || '(no type)', file.size, 'bytes');

    // Show local preview immediately so user sees something
    const localPreviewUrl = URL.createObjectURL(file);
    setPhoto(localPreviewUrl);
    setMarks([]);
    setCentrePoint(null);
    setAimPoint(null);
    setScalePx(null);
    setResults(null);
    setUploading(true);
    if (!FEATURE_AI_TARGET_ANALYSIS) setAnalysisMode('manual');

    // 30-second timeout safety net
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      setUploading(false);
      console.error('[TargetPhotoAnalyzer] Upload timed out after 30s');
      alert('Upload timed out. Try choosing a smaller photo or select from gallery.');
    }, 30000);

    try {
      console.log('[TargetPhotoAnalyzer] Starting image compression…');
      const { compressImage } = await import('@/lib/imageUtils');
      const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.8 });
      console.log('[TargetPhotoAnalyzer] Compression done. Size:', compressed.size, 'bytes, type:', compressed.type);

      if (timedOut) return;

      console.log('[TargetPhotoAnalyzer] Starting upload…');
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
      console.log('[TargetPhotoAnalyzer] Upload success:', file_url);

      if (timedOut) return;

      URL.revokeObjectURL(localPreviewUrl);
      setPhoto(file_url);
      if (!FEATURE_AI_TARGET_ANALYSIS) setAnalysisMode('manual');
    } catch (error) {
      console.error('[TargetPhotoAnalyzer] Upload failed:', error);
      // Keep the local preview and show a retry option
      setUploadError(error.message || 'Upload failed');
      alert('Photo upload failed. Please try again or choose from gallery.\n\nError: ' + (error.message || 'Unknown error'));
    } finally {
      clearTimeout(timeout);
      if (!timedOut) {
        setUploading(false);
        console.log('[TargetPhotoAnalyzer] Loading stopped.');
      }
    }
  };

  // Sync scale state ref with component state on changes
  useEffect(() => {
    scaleStateRef.current.scaleValue = parseFloat(scaleInput) || 0;
    scaleStateRef.current.scaleUnitVal = scaleUnit;
    
    // Recalculate if calibration points exist
    if (scaleStateRef.current.calibPoints.length === 2) {
      const pts = scaleStateRef.current.calibPoints;
      const pixelDist = Math.sqrt(
        Math.pow(pts[1].x - pts[0].x, 2) + 
        Math.pow(pts[1].y - pts[0].y, 2)
      );
      if (pixelDist > 0) {
        const realWorldMm = convertToMm(scaleStateRef.current.scaleValue, scaleStateRef.current.scaleUnitVal);
        const newScalePx = realWorldMm / pixelDist;
        scaleStateRef.current.scalePx = newScalePx;
        setScalePx(newScalePx);
      }
    }
  }, [scaleInput, scaleUnit]);
  
  // Reset zoom/pan when a new photo is loaded
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    lastPan.current = { x: 0, y: 0 };
    
    // Reset scale state for new photo
    scaleStateRef.current = {
      calibPoints: [],
      scalePx: null,
      scaleValue: parseFloat(scaleInput) || 1,
      scaleUnitVal: scaleUnit
    };
  }, [photo]);

  const clampPan = useCallback((px, py, z, containerEl, imgEl) => {
    if (!containerEl || !imgEl) return { x: px, y: py };
    const cw = containerEl.offsetWidth;
    const ch = containerEl.offsetHeight;
    // image rendered at 100% width of container, aspect ratio preserved
    const naturalAspect = (imgEl.naturalHeight || 1) / (imgEl.naturalWidth || 1);
    const imgH = cw * naturalAspect;
    const scaledW = cw * z;
    const scaledH = imgH * z;
    const maxX = Math.max(0, (scaledW - cw) / 2);
    const maxY = Math.max(0, (scaledH - ch) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, px)),
      y: Math.min(maxY, Math.max(-maxY, py)),
    };
  }, []);

  const getRelativeCoords = (e) => {
    // Get coords in natural image pixel space, accounting for zoom/pan
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return { x: 0, y: 0 };
    const cRect = container.getBoundingClientRect();
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    // Position relative to container centre (since transform-origin is center)
    const relX = clientX - cRect.left - cRect.width / 2;
    const relY = clientY - cRect.top - cRect.height / 2;
    // Undo zoom and pan
    const imgX = (relX - pan.x) / zoom + cRect.width / 2;
    const imgY = (relY - pan.y) / zoom + cRect.height / 2;
    // Convert to natural image coords
    const displayedImgWidth = cRect.width; // img is w-full
    const naturalAspect = (img.naturalHeight || 1) / (img.naturalWidth || 1);
    const displayedImgHeight = displayedImgWidth * naturalAspect;
    const scaleX = img.naturalWidth / displayedImgWidth;
    const scaleY = img.naturalHeight / displayedImgHeight;
    return {
      x: imgX * scaleX,
      y: imgY * scaleY,
    };
  };

  const handleContainerTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Two-finger: zoom/pan start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      panStart.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      lastPan.current = { ...pan };
      return;
    }
    if (e.touches.length === 1) {
      // One finger: mark only (no panning)
      didPan.current = false;
      panStart.current = null;
    }
  };

  const handleContainerTouchMove = (e) => {
    e.preventDefault();
    // If in scale mode with first point, track cursor for line preview
    if (setScaleMode && scalePoints.length === 1) {
      const coords = getRelativeCoords(e);
      setScaleDragPoint(coords);
    }
    if (e.touches.length === 2) {
      // Pinch zoom + two-finger drag pan
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist.current) {
        const ratio = dist / lastPinchDist.current;
        setZoom(prev => Math.min(6, Math.max(1, prev * ratio)));
      }
      lastPinchDist.current = dist;
      // Pan with two fingers
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (panStart.current) {
        const panDx = centerX - panStart.current.x;
        const panDy = centerY - panStart.current.y;
        const newPan = clampPan(
          lastPan.current.x + panDx,
          lastPan.current.y + panDy,
          zoom,
          containerRef.current,
          imgRef.current
        );
        setPan(newPan);
      }
      return;
    }
    // One finger: do nothing (prevent accidental pans)
  };

  const handleContainerMouseMove = (e) => {
    // Live line preview when drawing scale on desktop
    if (setScaleMode && scalePoints.length === 1) {
      const coords = getRelativeCoords(e);
      setScaleDragPoint(coords);
    }
  };

  const handleContainerTouchEnd = (e) => {
    lastPinchDist.current = null;
    panStart.current = null;
    // Mark only if it was a one-finger tap (no zoom/pan in progress) and not in scale mode
    if (e.touches.length === 0 && e.changedTouches.length === 1 && !setScaleMode) {
      handleImageTap(e);
    }
  };

  const convertToMm = (value, unit) => {
    const v = parseFloat(value);
    if (unit === 'mm') return v;
    if (unit === 'cm') return v * 10;
    if (unit === 'in' || unit === 'inches') return v * 25.4;
    return v;
  };

  const handleImageTap = (e) => {
    if (!photo || !imgRef.current) return;
    const coords = getRelativeCoords(e);

    // Scale setting mode: only collect scale points, prevent other markings
    if (setScaleMode) {
      const newPts = [...scalePoints, coords];
      setScalePoints(newPts);
      setScaleDragPoint(null); // Clear preview line
      if (newPts.length === 2) {
        // Calculate pixel distance between tapped points
        const pixelDist = Math.sqrt(
          Math.pow(newPts[1].x - newPts[0].x, 2) + 
          Math.pow(newPts[1].y - newPts[0].y, 2)
        );
        if (pixelDist === 0) {
          alert('Points are too close. Please tap points further apart.');
          setScalePoints([]);
          return;
        }
        
        // Convert input value to mm
        const realWorldMm = convertToMm(scaleInput, scaleUnit);
        if (!realWorldMm || isNaN(realWorldMm) || realWorldMm <= 0) {
          alert('Invalid scale value. Please enter a positive number.');
          setScalePoints([]);
          return;
        }
        
        // Calculate mm per pixel
        const mmPerPx = realWorldMm / pixelDist;
        
        // Update state ref and component state atomically
        scaleStateRef.current.calibPoints = newPts;
        scaleStateRef.current.scalePx = mmPerPx;
        scaleStateRef.current.scaleValue = parseFloat(scaleInput);
        scaleStateRef.current.scaleUnitVal = scaleUnit;
        
        setScalePx(mmPerPx);
        setCalibPoints(newPts);
        setSetScaleMode(false);
        setScalePoints([]);
      }
      return;
    }

    // Normal marking mode: only add marks if a mode is selected
    if (mode === 'bullets') {
      setMarks(prev => [...prev, coords]);
    } else if (mode === 'centre') {
      setCentrePoint(coords);
    } else if (mode === 'aim') {
      setAimPoint(coords);
    }
  };

  const handleSave = async () => {
    if (!results && marks.length < 2) { alert('Add at least 2 bullet marks to calculate group size'); return; }
    setSaving(true);
    
    // Use current scalePx and scale state for persistence
    const activeScalePx = scaleStateRef.current.scalePx || scalePx;
    const scaleRefLabel = scaleStateRef.current.calibPoints.length === 2 
      ? `Calibrated: ${scaleInput} ${scaleUnit}`
      : scaleRef;
    
    const payload = {
      group_name: groupName || `Group ${marks.length > 0 ? 'Unknown' : 'Empty'}`,
      number_of_shots: marks.length,
      group_size_mm: results?.groupMm || 0,
      group_size_moa: results?.groupMoa || 0,
      group_size_mrad: results?.groupMrad || 0,
      group_size_inches: results?.groupInches || 0,
      point_of_impact_x: results?.poiX || 0,
      point_of_impact_y: results?.poiY || 0,
      clicks_up_down: 0,
      clicks_left_right: 0,
      confirmed: confirmedZero,
      best_group: bestGroup,
      entry_method: 'photo',
      photo_url: photo,
      bullet_holes: marks,
      centre_x: centrePoint?.x || null,
      centre_y: centrePoint?.y || null,
      scale_mm_per_px: activeScalePx,
      scale_unit: scaleUnit,
      scale_reference: scaleRefLabel,
      scale_calibration_points: scaleStateRef.current.calibPoints,
      shooting_position: shootingPosition || null,
      distance_override: distanceOverride ? parseFloat(distanceOverride) : null,
      distance_unit: distanceUnit,
      rifle_id: selectedRifleId || null,
      rifle_name: rifles.find(r => r.id === selectedRifleId)?.name || null,
      ammunition_id: selectedAmmoId || null,
      ammo_override: (() => {
        const a = ammunition.find(x => x.id === selectedAmmoId);
        return a ? `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.grain ? ` ${a.grain}gr` : ''}` : null;
      })(),
      notes,
    };
    setSaving(false);
    onSave(payload);
  };

  const getDisplayCoords = (point) => {
    if (!imgRef.current || !point) return null;
    const img = imgRef.current;
    // Use the img's rendered size (offsetWidth/Height) since marks are inside the transform div
    const w = img.offsetWidth || img.clientWidth || 1;
    const h = img.offsetHeight || img.clientHeight || 1;
    return {
      x: point.x / (img.naturalWidth || 1) * w,
      y: point.y / (img.naturalHeight || 1) * h,
    };
  };

  // If user chose AI mode, show AI comparison (disabled via feature flag)
  if (analysisMode === 'ai' && photo && FEATURE_AI_TARGET_ANALYSIS) {
    return (
      <AIPhotoComparison
        session={session}
        photo={photo}
        editGroup={editGroup}
        rifles={rifles}
        ammunition={ammunition}
        onBack={() => { setPhoto(null); setAnalysisMode(null); }}
        onSave={(payload) => { onSave(payload); }}
      />
    );
  }

  // Auto-route to manual mode if AI is disabled
  if (analysisMode === 'ai' && !FEATURE_AI_TARGET_ANALYSIS) {
    setAnalysisMode('manual');
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Analyze Target Photo</h2>
          <p className="text-xs text-muted-foreground">
            {[session.distance ? `${session.distance}${session.distance_unit || 'm'}` : null, session.rifle_name].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {/* Upload */}
      {!photo && (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-8 text-center mb-4">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-semibold mb-4">Upload your target photo</p>
          {uploading ? (
            <div className="flex flex-col items-center gap-2 mt-2">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processing photo…</p>
            </div>
          ) : (
            <div className="flex gap-3 justify-center flex-wrap">
              <label className="px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold cursor-pointer text-sm">
                📁 Choose from Gallery
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif,image/*"
                  className="hidden"
                  onChange={e => { setUploadError(null); handlePhotoUpload(e.target.files[0]); e.target.value = ''; }}
                />
              </label>
              <label className="px-5 py-3 bg-secondary rounded-xl font-semibold cursor-pointer text-sm">
                📷 Take Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif,image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => { setUploadError(null); handlePhotoUpload(e.target.files[0]); e.target.value = ''; }}
                />
              </label>
            </div>
          )}
          {uploadError && (
            <p className="mt-3 text-xs text-destructive font-medium">{uploadError}</p>
          )}
        </div>
      )}

      {/* Analysis Mode Choice - AI disabled via feature flag */}
      {photo && !analysisMode && FEATURE_AI_TARGET_ANALYSIS && (
        <div className="space-y-4 mb-4">
          <p className="font-semibold text-sm">How would you like to analyze this photo?</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setAnalysisMode('ai')}
              className="p-4 bg-card border-2 border-primary/40 rounded-2xl hover:border-primary transition-all text-center">
              <p className="text-3xl mb-2">🤖</p>
              <p className="font-bold text-sm">AI Analysis</p>
              <p className="text-xs text-muted-foreground mt-1">AI detects + you confirm</p>
            </button>
            <button onClick={() => setAnalysisMode('manual')}
              className="p-4 bg-card border-2 border-border rounded-2xl hover:border-primary transition-all text-center">
              <p className="text-3xl mb-2">✏️</p>
              <p className="font-bold text-sm">Manual Marking</p>
              <p className="text-xs text-muted-foreground mt-1">Full control</p>
            </button>
          </div>
        </div>
      )}

      {/* Auto-start manual mode when AI is disabled */}
      {photo && !analysisMode && !FEATURE_AI_TARGET_ANALYSIS && (
        <div className="text-sm text-muted-foreground mb-4 text-center">
          Opening manual marking mode…
        </div>
      )}

      {photo && analysisMode === 'manual' && (
        <>
          {/* Group name */}
          <div className="mb-3">
            <label className={lbl}>Group Name</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} className={inp} />
          </div>

          {/* Scale setup */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-3">
            <p className="font-semibold text-sm mb-2">Scale Reference</p>
            <div className="flex gap-2 mb-2 items-center">
              <input
                value={scaleInput}
                onChange={e => setScaleInput(e.target.value)}
                placeholder="e.g. 1"
                className={`${inp} flex-1`}
                type="number"
                min="0"
                step="any"
              />
              <select
                value={scaleUnit}
                onChange={e => setScaleUnit(e.target.value)}
                className="w-20 flex-shrink-0 px-2 py-2.5 border border-border rounded-xl bg-background text-sm"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
            <div className="flex gap-2 mb-2 flex-wrap">
              <button type="button" onClick={() => { setScaleInput('1'); setScaleUnit('cm'); setScaleRef('1cm grid'); }} className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold">1cm grid</button>
              <button type="button" onClick={() => { setScaleInput('1'); setScaleUnit('in'); setScaleRef('1in grid'); }} className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-semibold">1in grid</button>
            </div>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSetScaleMode(prev => !prev); setScalePoints([]); }}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${setScaleMode ? 'bg-amber-500 text-white' : 'bg-secondary hover:bg-secondary/80'}`}>
              {setScaleMode
                ? `Tap 2 points on photo (${scalePoints.length}/2 placed)`
                : scalePx
                  ? `✓ Scale set: ${scaleInput} ${scaleUnit} = ${Math.round(convertToMm(scaleInput, scaleUnit) / scalePx * 10) / 10}px — ${setScaleMode ? 'Cancel' : 'Recalibrate'}`
                  : 'Tap 2 known points to set scale'}
            </button>
          </div>

          {/* Interactive Image — pinch to zoom, hold+drag to pan, tap to mark */}
          <div
            ref={containerRef}
            className="relative mb-1 rounded-2xl overflow-hidden border border-border bg-black select-none max-h-96 md:max-h-none"
            style={{ touchAction: mode ? 'none' : 'auto', aspectRatio: 'auto' }}
            onTouchStart={handleContainerTouchStart}
            onTouchMove={handleContainerTouchMove}
            onTouchEnd={handleContainerTouchEnd}
            onMouseMove={handleContainerMouseMove}
          >
            {/* Zoom indicator */}
            {zoom > 1.05 && (
              <div className="absolute top-2 right-2 z-10 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg pointer-events-none">
                {zoom.toFixed(1)}×
              </div>
            )}
            {/* Gesture hints */}
            {zoom > 1.05 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg pointer-events-none">
                2 fingers to zoom & pan
              </div>
            )}
            {/* Image + marks — both transform together so marks stay aligned */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                willChange: 'transform',
              }}
            >
              <img
                ref={imgRef}
                src={photo}
                className="w-full block object-contain cursor-crosshair"
                alt="Target"
                draggable={false}
                onClick={handleImageTap}
                style={{ userSelect: 'none', pointerEvents: 'auto' }}
              />
              {/* Overlay marks — inside the transform div so they zoom/pan with the image */}
              <div className="absolute inset-0 pointer-events-none mark-overlay">
                {marks.map((m, i) => {
                  const d = getDisplayCoords(m);
                  if (!d) return null;
                  return (
                    <div key={i} className="absolute" style={{ left: d.x - 10, top: d.y - 10, width: 20, height: 20 }}>
                      <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-white text-[8px] font-bold shadow-lg">{i + 1}</div>
                    </div>
                  );
                })}
                {centrePoint && (() => {
                  const d = getDisplayCoords(centrePoint);
                  if (!d) return null;
                  return (
                    <div className="absolute" style={{ left: d.x - 12, top: d.y - 12 }}>
                      <div className="w-6 h-6 rounded-full border-3 border-blue-500 flex items-center justify-center bg-blue-500/30">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      </div>
                    </div>
                  );
                })()}
                {aimPoint && (() => {
                  const d = getDisplayCoords(aimPoint);
                  if (!d) return null;
                  return (
                    <div className="absolute" style={{ left: d.x - 12, top: d.y - 12 }}>
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="absolute w-6 h-0.5 bg-green-500" />
                        <div className="absolute w-0.5 h-6 bg-green-500" />
                      </div>
                    </div>
                  );
                })()}
                {scalePoints.map((p, i) => {
                  const d = getDisplayCoords(p);
                  if (!d) return null;
                  return (
                    <div key={i} className="absolute" style={{ left: d.x - 6, top: d.y - 6 }}>
                      <div className="w-3 h-3 bg-amber-500 border-2 border-white rounded-full" />
                    </div>
                  );
                })}
              </div>
              {/* Scale line preview — outside transform so it's always visible */}
              {setScaleMode && scalePoints.length === 1 && scaleDragPoint && (() => {
                const p1 = getDisplayCoords(scalePoints[0]);
                const p2 = getDisplayCoords(scaleDragPoint);
                if (!p1 || !p2) return null;
                const img = imgRef.current;
                if (!img) return null;
                const w = img.offsetWidth || 1;
                const h = img.offsetHeight || 1;
                return (
                  <svg className="absolute inset-0 pointer-events-none z-10" style={{ width: w, height: h }}>
                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fbbf24" strokeWidth="3" opacity="0.9" strokeLinecap="round" />
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* Zoom reset button */}
          {zoom > 1.05 && (
            <div className="flex justify-center mb-2">
              <button type="button"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); lastPan.current = { x: 0, y: 0 }; }}
                className="px-4 py-1.5 bg-secondary rounded-xl text-xs font-semibold">
                Reset Zoom
              </button>
            </div>
          )}

          {/* Mode selection - below image */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { id: 'centre', icon: '⊕', label: 'Centre', color: 'bg-blue-500 text-white', title: 'Mark centre of target' },
              { id: 'aim', icon: '✚', label: 'Aim Point', color: 'bg-green-500 text-white', title: 'Mark point of aim' },
              { id: 'bullets', icon: '🎯', label: 'Bullet Holes', color: 'bg-red-500 text-white', title: 'Mark bullet holes' },
            ].map(m => (
              <button key={m.id} type="button" onClick={() => setMode(mode === m.id ? '' : m.id)}
                className={`py-3 rounded-xl font-semibold text-sm flex flex-col items-center gap-1.5 transition-all ${mode === m.id ? m.color : 'bg-secondary hover:bg-secondary/80'}`}>
                <span className="text-2xl">{m.icon}</span>
                <span className="text-xs leading-tight">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setMarks(prev => prev.slice(0, -1))}
              className="flex-1 py-2 bg-secondary rounded-xl text-sm font-semibold flex items-center justify-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Undo
            </button>
            <button type="button" onClick={() => { setMarks([]); setCentrePoint(null); setAimPoint(null); }}
              className="flex-1 py-2 bg-secondary rounded-xl text-sm font-semibold flex items-center justify-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
            <label className="flex-1 py-2 bg-secondary rounded-xl text-sm font-semibold flex items-center justify-center gap-1 cursor-pointer">
              🔄 New Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/*"
                className="hidden"
                onChange={e => { setUploadError(null); setPhoto(null); handlePhotoUpload(e.target.files[0]); e.target.value = ''; }}
              />
            </label>
          </div>

          <p className="text-xs text-muted-foreground text-center mb-3">
            {marks.length} bullet hole{marks.length !== 1 ? 's' : ''} marked
            {centrePoint ? ' · Centre set ⊕' : ''}
            {!scalePx ? ' · ⚠️ Set scale to calculate' : ` · Scale: ${scaleInput} ${scaleUnit} ref`}
          </p>

          {/* Extra context fields */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
            {rifles.length > 0 && (
              <div>
                <label className={lbl}>Rifle</label>
                <BottomSheetSelect value={selectedRifleId} onChange={val => setSelectedRifleId(val)} placeholder="Select rifle" options={rifles.map(r => ({ value: r.id, label: `${r.name} ${r.caliber ? `(${r.caliber})` : ''}` }))} />
              </div>
            )}
            {ammunition.length > 0 && (
              <div>
                <label className={lbl}>Ammunition</label>
                <BottomSheetSelect value={selectedAmmoId} onChange={val => setSelectedAmmoId(val)} placeholder="Select ammunition" options={ammunition
                  .filter(a => {
                    if (!selectedRifleId) return true;
                    const rifle = rifles.find(r => r.id === selectedRifleId);
                    return !rifle?.caliber || !a.caliber || a.caliber === rifle.caliber;
                  })
                  .map(a => ({ value: a.id, label: `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.bullet_type ? ` - ${a.bullet_type}` : ''}${a.grain ? ` ${a.grain}gr` : ''}` }))} />
              </div>
            )}
            <div>
              <label className={lbl}>Distance</label>
              <div className="flex gap-2">
                <input type="number" value={distanceOverride} onChange={e => setDistanceOverride(e.target.value)}
                  placeholder={session.distance ? `${session.distance}` : 'e.g. 100'} className={`${inp} flex-1`} />
                <BottomSheetSelect value={distanceUnit} onChange={val => setDistanceUnit(val)} placeholder="Unit" options={[{ value: 'meters', label: 'Meters' }, { value: 'yards', label: 'Yards' }]} />
              </div>
            </div>
            <div>
              <label className={lbl}>Shooting Position</label>
              <BottomSheetSelect value={shootingPosition} onChange={val => setShootingPosition(val)} placeholder="Select position" options={POSITIONS.map(p => ({ value: p, label: p.replace('_', ' ') }))} />
            </div>
          </div>

          <div className="mb-4">
            <label className={lbl}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" placeholder="Notes about this group…" className={inp} />
          </div>
          <label className="flex items-center gap-3 mb-4 cursor-pointer">
             <input type="checkbox" checked={confirmedZero} onChange={e => setConfirmedZero(e.target.checked)} className="w-5 h-5" />
             <span className="font-semibold">Mark as Confirmed Zero</span>
           </label>
           <label className="flex items-center gap-3 mb-4 cursor-pointer">
             <input type="checkbox" checked={bestGroup} onChange={e => setBestGroup(e.target.checked)} className="w-5 h-5" />
             <span className="font-semibold">Mark as Best Group ⭐</span>
           </label>

          {/* Results — below Notes, above Save */}
          {results && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Results</p>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Group Size</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-background rounded-xl p-2.5 text-center">
                  <p className="text-lg font-black">{results.groupMm}mm</p>
                  <p className="text-xs text-muted-foreground">mm</p>
                </div>
                <div className="bg-background rounded-xl p-2.5 text-center">
                  <p className="text-lg font-black">{results.groupCm}cm</p>
                  <p className="text-xs text-muted-foreground">cm</p>
                </div>
                <div className="bg-background rounded-xl p-2.5 text-center">
                  <p className="text-lg font-black">{results.groupInches}"</p>
                  <p className="text-xs text-muted-foreground">inches</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 mt-2">Accuracy</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-background rounded-xl p-2.5 text-center">
                  {results.groupMoa !== null ? (
                    <p className="text-2xl font-black">{results.groupMoa}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">Enter distance</p>
                  )}
                  <p className="text-xs text-muted-foreground">MOA</p>
                </div>
                <div className="bg-background rounded-xl p-2.5 text-center">
                  {results.groupMrad !== null ? (
                    <p className="text-2xl font-black">{results.groupMrad}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-2">Enter distance</p>
                  )}
                  <p className="text-xs text-muted-foreground">MRAD</p>
                </div>
              </div>
              {!results.hasDistance && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">Enter distance above to calculate MOA/MRAD</p>
              )}
              {(results.poiX !== 0 || results.poiY !== 0) && (
                <div className="mt-2 bg-background rounded-xl p-3 text-sm">
                  <p className="font-semibold mb-1">Impact vs Centre</p>
                  <p>{results.poiX > 0 ? `${results.poiX}mm right` : results.poiX < 0 ? `${Math.abs(results.poiX)}mm left` : 'centred'}</p>
                  <p>{results.poiY > 0 ? `${results.poiY}mm high` : results.poiY < 0 ? `${Math.abs(results.poiY)}mm low` : 'centred'}</p>
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="flex items-center justify-center gap-2 py-2 mb-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading photo…
            </div>
          )}
          <button onClick={handleSave} disabled={saving || uploading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving…' : 'Save Group'}
          </button>
        </>
      )}
    </div>
  );
}