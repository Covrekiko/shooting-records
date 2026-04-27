import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { calcGroupSizePixels, convertGroupSize } from '@/lib/groupSizeCalculations';

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

function calcCentroid(marks) {
  if (!marks.length) return { x: 0, y: 0 };
  const x = marks.reduce((s, m) => s + m.x, 0) / marks.length;
  const y = marks.reduce((s, m) => s + m.y, 0) / marks.length;
  return { x, y };
}

export default function AIPhotoComparison({
  session,
  photo,
  onBack,
  onSave,
  editGroup,
  rifles = [],
  ammunition = []
}) {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [userConfirmedMarks, setUserConfirmedMarks] = useState([]);
  const [centrePoint, setCentrePoint] = useState(null);
  const [scalePx, setScalePx] = useState(null);
  const [scaleInput, setScaleInput] = useState('1');
  const [scaleUnit, setScaleUnit] = useState('cm');
  const [distanceOverride, setDistanceOverride] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('meters');
  const [groupName, setGroupName] = useState(editGroup?.group_name || 'Group AI');
  const [confirmedZero, setConfirmedZero] = useState(editGroup?.confirmed || false);
  const [bestGroup, setBestGroup] = useState(editGroup?.best_group || false);
  const [notes, setNotes] = useState(editGroup?.notes || '');
  const [tab, setTab] = useState('scale'); // scale | ai | manual | compare
  const [comparison, setComparison] = useState(null);
  const [saving, setSaving] = useState(false);
  const [shootingPosition, setShootingPosition] = useState(editGroup?.shooting_position || '');
  const [selectedRifleId, setSelectedRifleId] = useState(editGroup?.rifle_id || '');
  const [selectedAmmoId, setSelectedAmmoId] = useState(editGroup?.ammunition_id || '');
  const [scaleMode, setScaleMode] = useState(false);
  const [scalePoints, setScalePoints] = useState([]);
  const imgRef = useRef(null);
  const POSITIONS = ['benchrest', 'prone', 'sticks', 'high_seat', 'standing', 'other'];

  // Ensure scale is set before AI analysis
  const canRunAI = scalePx && distanceOverride && distanceUnit;

  const convertToMm = (value, unit) => {
    const v = parseFloat(value);
    if (unit === 'mm') return v;
    if (unit === 'cm') return v * 10;
    if (unit === 'in' || unit === 'inches') return v * 25.4;
    return v;
  };

  // Normalize AI coordinates from (0-1) to pixel coordinates
  const normalizedToPixel = (normCoord) => {
    if (!imgRef.current || !normCoord) return null;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    return {
      x: normCoord.x * img.naturalWidth,
      y: normCoord.y * img.naturalHeight
    };
  };

  // Pixel to display coordinates
  const pixelToDisplay = (pixelCoord) => {
    if (!imgRef.current || !pixelCoord) return null;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    return {
      x: pixelCoord.x / img.naturalWidth * rect.width,
      y: pixelCoord.y / img.naturalHeight * rect.height
    };
  };

  const handleScaleTap = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const newPts = [...scalePoints, { x, y }];
    setScalePoints(newPts);
    
    if (newPts.length === 2) {
      const dist = Math.sqrt(
        Math.pow(newPts[1].x - newPts[0].x, 2) +
        Math.pow(newPts[1].y - newPts[0].y, 2)
      );
      if (dist > 0) {
        const valueInMm = convertToMm(scaleInput, scaleUnit);
        setScalePx(valueInMm / dist);
        setScaleMode(false);
        setScalePoints([]);
      }
    }
  };

  const analyzeWithAI = async () => {
    if (!photo || !canRunAI) {
      setAiError('Calibrate scale and enter distance before analyzing.');
      return;
    }
    
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);
    
    try {
      const res = await base44.functions.invoke('analyzeTargetPhotoWithAI', {
        photo_url: photo
      });
      
      if (res.data.success && res.data.analysis) {
        setAiAnalysis(res.data.analysis);
        setUserConfirmedMarks([]);
      } else {
        setAiError(res.data.error || 'AI analysis failed');
      }
    } catch (err) {
      setAiError(err.message || 'Error running AI analysis');
    } finally {
      setAiLoading(false);
    }
  };

  // Calculate metrics when marks/scale/distance change
  useEffect(() => {
    if (!scalePx || !userConfirmedMarks.length || userConfirmedMarks.length < 2) {
      setComparison(null);
      return;
    }

    const rawDist = distanceOverride ? parseFloat(distanceOverride) : null;
    if (!rawDist || rawDist <= 0) {
      setComparison(null);
      return;
    }

    const distM = distanceUnit === 'yards' ? rawDist * 0.9144 : rawDist;
    const groupPx = calcGroupSizePixels(userConfirmedMarks);
    const metrics = convertGroupSize(groupPx, scalePx, distM);

    if (!metrics) {
      setComparison(null);
      return;
    }

    setComparison({
      shots: userConfirmedMarks.length,
      groupMm: metrics.mm,
      groupMoa: metrics.moa,
      groupMrad: metrics.mrad,
      groupInches: metrics.inches,
    });
  }, [userConfirmedMarks, scalePx, distanceOverride, distanceUnit]);

  const handleAddAIMark = (aiMark) => {
    const pixelCoord = normalizedToPixel(aiMark);
    if (pixelCoord) {
      setUserConfirmedMarks(prev => [...prev, pixelCoord]);
    }
  };

  const handleAddManualMark = (e) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setUserConfirmedMarks(prev => [...prev, { x, y }]);
  };

  const handleSave = async () => {
    if (userConfirmedMarks.length < 2) {
      alert('Confirm at least 2 bullet marks before saving');
      return;
    }

    if (!comparison) {
      alert('Calibrate scale and enter distance before saving');
      return;
    }

    setSaving(true);
    
    try {
      const payload = {
        group_name: groupName,
        entry_method: 'ai_confirmed',
        photo_url: photo,
        
        // AI detected marks (raw, unconfirmed)
        ai_detected_marks_json: aiAnalysis ? JSON.stringify({
          bullet_holes: aiAnalysis.bullet_holes,
          target_centre: aiAnalysis.target_centre,
          point_of_aim: aiAnalysis.point_of_aim
        }) : null,
        ai_analysis_confirmed: true,
        
        // User confirmed marks (final)
        number_of_shots: userConfirmedMarks.length,
        group_size_mm: comparison.groupMm,
        group_size_moa: comparison.groupMoa,
        group_size_mrad: comparison.groupMrad,
        group_size_inches: comparison.groupInches,
        user_confirmed_group_size_mm: comparison.groupMm,
        user_confirmed_group_size_moa: comparison.groupMoa,
        user_confirmed_group_size_mrad: comparison.groupMrad,
        manual_marks_json: JSON.stringify(userConfirmedMarks),
        
        // Metadata
        bullet_holes: userConfirmedMarks,
        centre_x: centrePoint?.x || null,
        centre_y: centrePoint?.y || null,
        scale_mm_per_px: scalePx,
        confirmed: confirmedZero,
        best_group: bestGroup,
        notes,
        shooting_position: shootingPosition || null,
        distance_override: distanceOverride ? parseFloat(distanceOverride) : null,
        rifle_id: selectedRifleId || null,
        rifle_name: rifles.find(r => r.id === selectedRifleId)?.name || null,
        ammunition_id: selectedAmmoId || null,
        ammo_override: (() => {
          const a = ammunition.find(x => x.id === selectedAmmoId);
          return a ? `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.grain ? ` ${a.grain}gr` : ''}` : null;
        })(),
      };

      setSaving(false);
      onSave(payload);
    } catch (err) {
      alert('Error saving: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">AI Photo Analysis + Confirmation</h2>
          <p className="text-xs text-muted-foreground">Calibrate → Analyze → Confirm</p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">AI analysis is only an estimate</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">You must confirm all marks and results before saving.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setTab('scale')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${tab === 'scale' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          📏 Scale
        </button>
        <button
          onClick={() => setTab('ai')}
          disabled={!canRunAI}
          className={`px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${tab === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-secondary'} ${!canRunAI ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          🤖 AI Analysis
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${tab === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
        >
          ✏️ Confirm
        </button>
        <button
          onClick={() => setTab('compare')}
          disabled={!comparison}
          className={`px-4 py-2 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${tab === 'compare' ? 'bg-primary text-primary-foreground' : 'bg-secondary'} ${!comparison ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          ✓ Review
        </button>
      </div>

      {/* Scale Tab */}
      {tab === 'scale' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold text-sm mb-3">1. Set Scale Reference</p>
            <div className="flex gap-2 mb-2 items-center">
              <input
                type="number"
                value={scaleInput}
                onChange={e => setScaleInput(e.target.value)}
                placeholder="1"
                className={`${inp} flex-1`}
                step="any"
              />
              <select
                value={scaleUnit}
                onChange={e => setScaleUnit(e.target.value)}
                className="w-20 px-2 py-2.5 border border-border rounded-xl bg-background text-sm"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Common targets: 1cm grid, 10mm marks, 1 inch grid</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold text-sm mb-3">2. Calibrate by Tapping Two Points</p>
            <div className="relative rounded-2xl overflow-hidden border border-border bg-black cursor-crosshair" style={{ touchAction: 'none' }}>
              <img
                ref={imgRef}
                src={photo}
                className="w-full"
                alt="Target"
                onClick={() => {
                  if (scalePx) {
                    setTab('ai');
                  } else {
                    setScaleMode(true);
                  }
                }}
                onTouchEnd={(e) => {
                  if (scaleMode) {
                    e.preventDefault();
                    handleScaleTap(e);
                  }
                }}
                onClick={(e) => {
                  if (scaleMode) handleScaleTap(e);
                }}
              />
              {scalePoints.map((p, i) => {
                const d = pixelToDisplay(p);
                if (!d) return null;
                return (
                  <div key={i} className="absolute" style={{ left: d.x - 6, top: d.y - 6 }}>
                    <div className="w-3 h-3 bg-amber-500 border-2 border-white rounded-full" />
                  </div>
                );
              })}
            </div>
            
            <button
              type="button"
              onClick={() => {
                if (scalePx) {
                  setScaleMode(true);
                  setScalePoints([]);
                } else {
                  setScaleMode(!scaleMode);
                  setScalePoints([]);
                }
              }}
              className={`w-full mt-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                scaleMode ? 'bg-amber-500 text-white' : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {scaleMode
                ? `Tap 2 points (${scalePoints.length}/2)`
                : scalePx
                  ? `✓ Scale set (${scaleInput} ${scaleUnit} = ${Math.round(convertToMm(scaleInput, scaleUnit) / scalePx)}px) — Recalibrate`
                  : 'Start Calibration'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="font-semibold text-sm mb-3">3. Enter Distance</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={distanceOverride}
                onChange={e => setDistanceOverride(e.target.value)}
                placeholder="e.g. 100"
                className={`${inp} flex-1`}
              />
              <select
                value={distanceUnit}
                onChange={e => setDistanceUnit(e.target.value)}
                className="w-16 px-2 py-2.5 border border-border rounded-xl bg-background text-sm"
              >
                <option value="meters">m</option>
                <option value="yards">yd</option>
              </select>
            </div>
          </div>

          {canRunAI && (
            <button
              onClick={() => setTab('ai')}
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-base hover:opacity-90"
            >
              Next: Analyze with AI →
            </button>
          )}
        </div>
      )}

      {/* AI Analysis Tab */}
      {tab === 'ai' && (
        <div className="space-y-4">
          {!aiAnalysis && !aiLoading && (
            <button
              onClick={analyzeWithAI}
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold"
            >
              🤖 Run AI Analysis
            </button>
          )}

          {aiLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing photo…</p>
            </div>
          )}

          {aiError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">AI Analysis Failed</p>
                <p className="text-xs text-muted-foreground mt-1">{aiError}</p>
                <p className="text-xs text-muted-foreground mt-2">You can still mark the target manually.</p>
              </div>
            </div>
          )}

          {aiAnalysis && (
            <>
              <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">AI Detection Results</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-background rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">{aiAnalysis.bullet_holes?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Bullet Holes</p>
                  </div>
                  <div className="bg-background rounded-xl p-3 text-center">
                    <p className="text-lg font-semibold">{(aiAnalysis.confidence * 100).toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Confidence</p>
                  </div>
                </div>
                {aiAnalysis.warnings?.length > 0 && (
                  <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-2 mt-2">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-200 mb-1">Warnings:</p>
                    {aiAnalysis.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600 dark:text-amber-300">• {w}</p>
                    ))}
                  </div>
                )}
                {aiAnalysis.notes && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-primary/20">{aiAnalysis.notes}</p>
                )}
              </div>

              {aiAnalysis.confidence < 0.7 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">⚠️ Low Confidence Detection</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    Please carefully review and confirm all marks manually before saving.
                  </p>
                </div>
              )}

              <button
                onClick={() => setTab('manual')}
                className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold"
              >
                Next: Confirm Marks →
              </button>
            </>
          )}
        </div>
      )}

      {/* Manual Confirm Tab */}
      {tab === 'manual' && (
        <div className="space-y-4">
          <p className="text-sm font-semibold">Click detected marks (blue) to confirm, or add your own (green)</p>

          <div className="relative rounded-2xl overflow-hidden border border-border bg-black cursor-crosshair" style={{ touchAction: 'none' }}>
            <img
              ref={imgRef}
              src={photo}
              className="w-full"
              alt="Target"
              onClick={handleAddManualMark}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleAddManualMark(e);
              }}
            />
            {/* AI marks (clickable) */}
            {aiAnalysis?.bullet_holes?.map((mark, i) => {
              const d = pixelToDisplay(normalizedToPixel(mark));
              if (!d) return null;
              return (
                <button
                  key={`ai-${i}`}
                  type="button"
                  onClick={() => handleAddAIMark(mark)}
                  className="absolute transition-all hover:scale-125"
                  style={{ left: d.x - 12, top: d.y - 12 }}
                  title="Click to confirm this AI mark"
                >
                  <div className={`w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center ${mark.confidence < 0.6 ? 'bg-blue-500/20' : 'bg-blue-500/40'}`}>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  </div>
                </button>
              );
            })}
            {/* User confirmed marks */}
            {userConfirmedMarks.map((m, i) => {
              const d = pixelToDisplay(m);
              if (!d) return null;
              return (
                <div key={`user-${i}`} className="absolute" style={{ left: d.x - 10, top: d.y - 10 }}>
                  <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-[8px] font-bold shadow-lg">
                    {i + 1}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            🔵 Blue = AI detected · 🟢 Green = Confirmed marks
          </p>

          {userConfirmedMarks.length > 0 && (
            <button
              onClick={() => setUserConfirmedMarks(prev => prev.slice(0, -1))}
              className="w-full py-2 bg-secondary rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              ← Undo Last Mark
            </button>
          )}

          {userConfirmedMarks.length > 0 && (
            <button
              onClick={() => setUserConfirmedMarks([])}
              className="w-full py-2 bg-secondary rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}

          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Marks: {userConfirmedMarks.length}</p>
            {userConfirmedMarks.length < 2 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">Need at least 2 marks</p>
            )}
          </div>

          {userConfirmedMarks.length >= 2 && (
            <button
              onClick={() => setTab('compare')}
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold"
            >
              Next: Review Results →
            </button>
          )}
        </div>
      )}

      {/* Review/Compare Tab */}
      {tab === 'compare' && comparison && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Final Results</p>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div>
                  <p className="text-2xl font-black">{comparison.shots}</p>
                  <p className="text-xs text-muted-foreground">shots</p>
                </div>
                <div>
                  <p className="text-xl font-black">{comparison.groupMm}mm</p>
                  <p className="text-xs text-muted-foreground">group</p>
                </div>
                <div>
                  <p className="text-xl font-black">{comparison.groupMoa || '—'}</p>
                  <p className="text-xs text-muted-foreground">MOA</p>
                </div>
                <div>
                  <p className="text-xl font-black">{comparison.groupMrad || '—'}</p>
                  <p className="text-xs text-muted-foreground">MRAD</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div>
              <label className={lbl}>Group Name</label>
              <input value={groupName} onChange={e => setGroupName(e.target.value)} className={inp} />
            </div>
            {rifles.length > 0 && (
              <div>
                <label className={lbl}>Rifle</label>
                <select value={selectedRifleId} onChange={e => setSelectedRifleId(e.target.value)} className={inp}>
                  <option value="">— Select rifle —</option>
                  {rifles.map(r => <option key={r.id} value={r.id}>{r.name} {r.caliber ? `(${r.caliber})` : ''}</option>)}
                </select>
              </div>
            )}
            {ammunition.length > 0 && (
              <div>
                <label className={lbl}>Ammunition</label>
                <select value={selectedAmmoId} onChange={e => setSelectedAmmoId(e.target.value)} className={inp}>
                  <option value="">— Select ammunition —</option>
                  {ammunition
                    .filter(a => {
                      if (!selectedRifleId) return true;
                      const rifle = rifles.find(r => r.id === selectedRifleId);
                      return !rifle?.caliber || !a.caliber || a.caliber === rifle.caliber;
                    })
                    .map(a => <option key={a.id} value={a.id}>{a.brand}{a.caliber ? ` (${a.caliber})` : ''}{a.bullet_type ? ` - ${a.bullet_type}` : ''}{a.grain ? ` ${a.grain}gr` : ''}</option>)}
                </select>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={confirmedZero} onChange={e => setConfirmedZero(e.target.checked)} className="w-5 h-5" />
              <span className="font-semibold text-sm">Confirmed Zero ✓</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={bestGroup} onChange={e => setBestGroup(e.target.checked)} className="w-5 h-5" />
              <span className="font-semibold text-sm">Mark as Best Group ⭐</span>
            </label>
            <div>
              <label className={lbl}>Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="2" className={inp} placeholder="Optional notes…" />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {saving ? 'Saving…' : 'Save Confirmed Result'}
          </button>
        </div>
      )}
    </div>
  );
}