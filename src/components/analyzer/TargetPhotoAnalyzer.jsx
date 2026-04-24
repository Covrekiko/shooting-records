import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Trash2, Plus, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// MOA/MRAD calculations
function mmToMoa(mm, distanceM) { return mm / (distanceM / 100) / 29.088; }
function mmToMrad(mm, distanceM) { return mm / distanceM; }

function calcGroupSize(marks) {
  if (marks.length < 2) return 0;
  let maxDist = 0;
  for (let i = 0; i < marks.length; i++) {
    for (let j = i + 1; j < marks.length; j++) {
      const d = Math.sqrt(Math.pow(marks[i].x - marks[j].x, 2) + Math.pow(marks[i].y - marks[j].y, 2));
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

function calcCentroid(marks) {
  if (!marks.length) return { x: 0, y: 0 };
  const x = marks.reduce((s, m) => s + m.x, 0) / marks.length;
  const y = marks.reduce((s, m) => s + m.y, 0) / marks.length;
  return { x, y };
}

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

export default function TargetPhotoAnalyzer({ session, editGroup, rifles = [], ammunition = [], onSave, onBack }) {
  const [photo, setPhoto] = useState(editGroup?.photo_url || null);
  const [marks, setMarks] = useState(editGroup?.bullet_marks || []);
  const [centrePoint, setCentrePoint] = useState(editGroup?.centre_mark || null);
  const [aimPoint, setAimPoint] = useState(editGroup?.aim_mark || null);
  const [mode, setMode] = useState('bullets'); // bullets | centre | aim
  const [scaleRefType, setScaleRefType] = useState(editGroup?.scale_ref_type || '1cm');
  const [scaleRef, setScaleRef] = useState(editGroup?.scale_ref_custom || '10');
  const [scalePx, setScalePx] = useState(editGroup?.scale_mm_per_px || null);
  const [groupName, setGroupName] = useState(editGroup?.group_name || '');
  const [notes, setNotes] = useState(editGroup?.notes || '');
  const [confirmedZero, setConfirmedZero] = useState(editGroup?.confirmed || editGroup?.confirmed_zero || false);
  const [shootingPosition, setShootingPosition] = useState(editGroup?.shooting_position || session.shooting_position || '');
  const [distanceValue, setDistanceValue] = useState(editGroup?.distance_value || session.distance || '');
  const [distanceUnit, setDistanceUnit] = useState(editGroup?.distance_unit || session.distance_unit || 'm');
  const [selectedRifleId, setSelectedRifleId] = useState(editGroup?.rifle_id || session.rifle_id || '');
  const [selectedAmmoId, setSelectedAmmoId] = useState(editGroup?.ammunition_id || session.ammo_id || '');
  const POSITIONS = ['benchrest', 'prone', 'sticks', 'high_seat', 'standing', 'other'];
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [setScaleMode, setSetScaleMode] = useState(false);
  const [scalePoints, setScalePoints] = useState([]);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState(null);

  useEffect(() => { if (marks.length >= 2 || centrePoint) recalculate(); }, [marks, centrePoint, aimPoint, scalePx]);

  const getScaleRefMm = () => {
    const presets = {
      '1cm': 10,
      '1in': 25.4,
      'bullseye': 45,
    };
    if (presets[scaleRefType]) return presets[scaleRefType];
    if (scaleRefType === 'custom_cm') return parseFloat(scaleRef) * 10;
    if (scaleRefType === 'custom_in') return parseFloat(scaleRef) * 25.4;
    return parseFloat(scaleRef);
  };

  const recalculate = () => {
    if (!scalePx || marks.length < 2) return;
    const groupPx = calcGroupSize(marks);
    const groupMm = groupPx * scalePx;
    const distM = distanceUnit === 'yards' ? parseFloat(distanceValue) * 0.9144 : parseFloat(distanceValue);
    const moa = mmToMoa(groupMm, distM);
    const mrad = mmToMrad(groupMm, distM);

    let poiX = 0, poiY = 0;
    if (centrePoint && marks.length) {
      const centroid = calcCentroid(marks);
      const dxPx = centroid.x - centrePoint.x;
      const dyPx = centroid.y - centrePoint.y;
      poiX = dxPx * scalePx; // mm, positive = right
      poiY = -dyPx * scalePx; // mm, positive = up (canvas Y is inverted)
    }

    setResults({
      shots: marks.length,
      groupMm: Math.round(groupMm * 10) / 10,
      groupMoa: Math.round(moa * 100) / 100,
      groupMrad: Math.round(mrad * 1000) / 1000,
      groupInches: Math.round(groupMm / 25.4 * 100) / 100,
      poiX: Math.round(poiX * 10) / 10,
      poiY: Math.round(poiY * 10) / 10,
    });
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhoto(file_url);
    setMarks([]);
    setCentrePoint(null);
    setAimPoint(null);
    setScalePx(null);
    setResults(null);
    setUploading(false);
  };

  const getRelativeCoords = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / rect.width;
    const scaleY = imgRef.current.naturalHeight / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleImageTap = (e) => {
    if (!photo) return;
    const coords = getRelativeCoords(e);

    if (setScaleMode) {
      const newPts = [...scalePoints, coords];
      setScalePoints(newPts);
      if (newPts.length === 2) {
        const dist = Math.sqrt(Math.pow(newPts[1].x - newPts[0].x, 2) + Math.pow(newPts[1].y - newPts[0].y, 2));
        const mmPerPx = parseFloat(scaleInput) / dist;
        setScalePx(mmPerPx);
        setSetScaleMode(false);
        setScalePoints([]);
      }
      return;
    }

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
    if (!groupName.trim()) { alert('Group name is required'); return; }
    setSaving(true);
    const payload = {
      group_name: groupName,
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
      entry_method: 'photo',
      photo_url: photo,
      bullet_holes: marks,
      centre_x: centrePoint?.x || null,
      centre_y: centrePoint?.y || null,
      scale_mm_per_px: scalePx,
      scale_ref_type: scaleRefType,
      scale_ref_custom: scaleRefType.startsWith('custom') ? scaleRef : null,
      shooting_position: shootingPosition || null,
      distance_value: parseFloat(distanceValue),
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
    const rect = img.getBoundingClientRect();
    return {
      x: point.x / img.naturalWidth * rect.width,
      y: point.y / img.naturalHeight * rect.height,
    };
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Analyze Target Photo</h2>
          <p className="text-xs text-muted-foreground">{session.distance}{session.distance_unit || 'm'} · {session.rifle_name}</p>
        </div>
      </div>

      {/* Upload */}
      {!photo && (
        <div className="bg-card border-2 border-dashed border-border rounded-2xl p-8 text-center mb-4">
          <p className="text-4xl mb-3">🎯</p>
          <p className="font-semibold mb-4">Upload your target photo</p>
          <div className="flex gap-3 justify-center">
            <label className="px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold cursor-pointer text-sm">
              📁 Choose Photo
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files[0])} />
            </label>
            <label className="px-5 py-3 bg-secondary rounded-xl font-semibold cursor-pointer text-sm">
              📷 Take Photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoUpload(e.target.files[0])} />
            </label>
          </div>
          {uploading && <p className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Uploading…</p>}
        </div>
      )}

      {photo && (
        <>
          {/* Group name */}
          <div className="mb-3">
            <label className={lbl}>Group Name</label>
            <input value={groupName} onChange={e => setGroupName(e.target.value)} className={inp} />
          </div>

          {/* Scale setup */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
            <p className="font-semibold text-sm">Scale Reference</p>
            <div className="flex flex-col gap-2">
              {[
                { id: '1cm', label: '1 cm grid' },
                { id: '1in', label: '1 inch square' },
                { id: 'bullseye', label: 'Known bullseye (45mm)' },
                { id: 'custom_mm', label: 'Custom (mm)' },
                { id: 'custom_cm', label: 'Custom (cm)' },
                { id: 'custom_in', label: 'Custom (inches)' },
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => setScaleRefType(opt.id)}
                  className={`text-left px-3 py-2 rounded-lg border transition-colors text-sm ${scaleRefType === opt.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {scaleRefType.startsWith('custom') && (
              <div>
                <label className={lbl}>Size</label>
                <input type="number" value={scaleRef} onChange={e => setScaleRef(e.target.value)} placeholder="e.g. 10" className={inp} />
              </div>
            )}
            <div>
              <label className={lbl}>Pixel width of that feature</label>
              <input type="number" value={scalePixels} onChange={e => setScalePixels(e.target.value)} placeholder="e.g. 50" className={inp} />
            </div>
            {scalePx && <p className="text-xs text-primary font-medium">Scale: {scalePx.toFixed(3)} mm/px</p>}
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {[
              { id: 'bullets', label: '🎯 Bullet Holes', color: 'bg-red-500 text-white' },
              { id: 'centre', label: '⊕ Centre of Target', color: 'bg-blue-500 text-white' },
              { id: 'aim', label: '✚ Point of Aim', color: 'bg-green-500 text-white' },
            ].map(m => (
              <button key={m.id} type="button" onClick={() => setMode(m.id)}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex-shrink-0 transition-all ${mode === m.id ? m.color : 'bg-secondary hover:bg-secondary/80'}`}>
                {m.label}
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
              <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e.target.files[0])} />
            </label>
          </div>

          {/* Interactive Image */}
          <div className="relative mb-3 rounded-2xl overflow-hidden border border-border bg-black select-none"
            style={{ touchAction: 'none' }}>
            <img
              ref={imgRef}
              src={photo}
              className="w-full"
              alt="Target"
              onClick={handleImageTap}
              onTouchEnd={(e) => { e.preventDefault(); handleImageTap(e); }}
              style={{ cursor: setScaleMode ? 'crosshair' : (mode === 'bullets' ? 'crosshair' : 'crosshair'), userSelect: 'none' }}
              draggable={false}
            />
            {/* Overlay marks */}
            <div className="absolute inset-0 pointer-events-none">
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
          </div>

          <p className="text-xs text-muted-foreground text-center mb-3">
            {marks.length} bullet hole{marks.length !== 1 ? 's' : ''} marked
            {centrePoint ? ' · Centre set ⊕' : ''}
            {!scalePx ? ' · ⚠️ Set scale to calculate' : ` · Scale: ${Math.round(scalePx * 1000) / 1000}mm/px`}
          </p>

          {/* Results */}
          {results && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-3">
              <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Results</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{results.groupMoa}</p>
                  <p className="text-xs text-muted-foreground">MOA</p>
                </div>
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{results.groupMrad}</p>
                  <p className="text-xs text-muted-foreground">MRAD</p>
                </div>
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{results.groupMm}mm</p>
                  <p className="text-xs text-muted-foreground">Group Size</p>
                </div>
                <div className="bg-background rounded-xl p-3 text-center">
                  <p className="text-xl font-bold">{results.shots} shots</p>
                  <p className="text-xs text-muted-foreground">Number of Shots</p>
                </div>
              </div>
              {(results.poiX !== 0 || results.poiY !== 0) && (
                <div className="mt-3 bg-background rounded-xl p-3 text-sm">
                  <p className="font-semibold mb-1">Impact vs Centre</p>
                  <p>{results.poiX > 0 ? `${results.poiX}mm right` : results.poiX < 0 ? `${Math.abs(results.poiX)}mm left` : 'centred'}</p>
                  <p>{results.poiY > 0 ? `${results.poiY}mm high` : results.poiY < 0 ? `${Math.abs(results.poiY)}mm low` : 'centred'}</p>
                </div>
              )}
            </div>
          )}

          {/* Extra context fields */}
          <div className="bg-card border border-border rounded-2xl p-4 mb-3 space-y-3">
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
            <div>
              <label className={lbl}>Distance Value</label>
              <input type="number" value={distanceValue} onChange={e => setDistanceValue(e.target.value)} placeholder="e.g. 100" className={inp} />
            </div>
            <div>
              <label className={lbl}>Distance Unit</label>
              <div className="flex gap-2 mt-1">
                {['m', 'yards'].map(u => (
                  <button key={u} type="button" onClick={() => setDistanceUnit(u)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${distanceUnit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                    {u === 'm' ? 'meters' : 'yards'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Shooting Position</label>
              <select value={shootingPosition} onChange={e => setShootingPosition(e.target.value)} className={inp}>
                <option value="">— Select —</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
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