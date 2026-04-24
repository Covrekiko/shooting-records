import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, Target, X } from 'lucide-react';

const MM_PER_PX_DEFAULT = 0.5; // fallback

function calcGroupSize(holes) {
  if (holes.length < 2) return 0;
  let maxDist = 0;
  for (let i = 0; i < holes.length; i++) {
    for (let j = i + 1; j < holes.length; j++) {
      const dx = holes[i].x - holes[j].x;
      const dy = holes[i].y - holes[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

function centroid(holes) {
  if (!holes.length) return { x: 0, y: 0 };
  return {
    x: holes.reduce((s, h) => s + h.x, 0) / holes.length,
    y: holes.reduce((s, h) => s + h.y, 0) / holes.length,
  };
}

export default function PhotoGroupAnalyzer({ session, onSave, onBack, defaultGroupName = 'Group 1' }) {
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [holes, setHoles] = useState([]);
  const [centre, setCentre] = useState(null);
  const [mode, setMode] = useState('holes'); // 'holes' | 'centre'
  const [groupName, setGroupName] = useState(defaultGroupName);
  const [scaleRef, setScaleRef] = useState('25'); // mm reference
  const [scaleUnit, setScaleUnit] = useState('mm'); // 'mm' or 'in'
  const [scalePixels, setScalePixels] = useState(''); // how many px is that reference
  const [numberOfShots, setNumberOfShots] = useState('');
  const [notes, setNotes] = useState('');
  const [clickValue, setClickValue] = useState('0.25');
  const [turretUnit, setTurretUnit] = useState('MOA');
  const [distanceUnit, setDistanceUnit] = useState(session?.distance_unit || 'm');
  const [imgSize, setImgSize] = useState({ w: 1, h: 1, natW: 1, natH: 1 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const scaleRefMm = scaleUnit === 'in' ? parseFloat(scaleRef) * 25.4 : parseFloat(scaleRef);
  const mmPerPx = scaleRef && scalePixels ? scaleRefMm / parseFloat(scalePixels) : MM_PER_PX_DEFAULT;

  const distanceM = distanceUnit === 'yards'
    ? parseFloat(session?.distance) * 0.9144
    : parseFloat(session?.distance);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setHoles([]);
    setCentre(null);
    setUploading(false);
  };

  useEffect(() => { drawCanvas(); }, [holes, centre, imgSize, photoUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !photoUrl) return;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;
    if (!img || !img.complete) return;

    canvas.width = imgSize.w;
    canvas.height = imgSize.h;
    ctx.drawImage(img, 0, 0, imgSize.w, imgSize.h);

    // Draw holes
    holes.forEach((h, i) => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,68,68,0.85)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, h.x, h.y);
    });

    // Draw centroid of holes
    if (holes.length >= 2) {
      const c = centroid(holes);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw centre of target
    if (centre) {
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.stroke();
      // crosshair
      ctx.beginPath();
      ctx.moveTo(centre.x - 15, centre.y);
      ctx.lineTo(centre.x + 15, centre.y);
      ctx.moveTo(centre.x, centre.y - 15);
      ctx.lineTo(centre.x, centre.y + 15);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const handleCanvasClick = (e) => {
    if (!photoUrl) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = imgSize.w / rect.width;
    const scaleY = imgSize.h / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (mode === 'holes') {
      setHoles(h => [...h, { x, y }]);
    } else if (mode === 'centre') {
      setCentre({ x, y });
      setMode('holes');
    }
  };

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const container = containerRef.current;
    const maxW = container?.clientWidth || 400;
    const scale = Math.min(1, maxW / img.naturalWidth);
    setImgSize({
      w: img.naturalWidth * scale,
      h: img.naturalHeight * scale,
      natW: img.naturalWidth,
      natH: img.naturalHeight,
    });
  };

  // Calculated stats
  const groupSizePx = calcGroupSize(holes);
  const groupSizeMm = groupSizePx * mmPerPx;
  const groupSizeMoa = distanceM ? (groupSizeMm / distanceM) * (10000 / 290.888) : null;
  const groupSizeMrad = distanceM ? groupSizeMm / distanceM : null;
  const groupSizeInches = groupSizeMm / 25.4;

  const avg = centroid(holes);
  const poiX = centre ? (avg.x - centre.x) * mmPerPx : 0;
  const poiY = centre ? (centre.y - avg.y) * mmPerPx : 0; // invert Y

  const clicksV = distanceM && Math.abs(poiY) > 0.1
    ? (turretUnit === 'MRAD' ? (Math.abs(poiY) / distanceM) / (parseFloat(clickValue) * 0.1) : ((Math.abs(poiY) / distanceM) * (10000 / 290.888)) / parseFloat(clickValue))
    : 0;
  const clicksH = distanceM && Math.abs(poiX) > 0.1
    ? (turretUnit === 'MRAD' ? (Math.abs(poiX) / distanceM) / (parseFloat(clickValue) * 0.1) : ((Math.abs(poiX) / distanceM) * (10000 / 290.888)) / parseFloat(clickValue))
    : 0;

  const elevClicks = poiY < 0 ? -clicksV : clicksV;   // negative y means low, need to go up = positive clicks
  const windClicks = -poiX < 0 ? -clicksH : clicksH;  // negative x means left, need to go right

  const handleSave = () => {
    onSave({
      group_name: groupName,
      number_of_shots: holes.length || parseInt(numberOfShots) || null,
      group_size_mm: groupSizeMm ? parseFloat(groupSizeMm.toFixed(1)) : null,
      group_size_moa: groupSizeMoa ? parseFloat(groupSizeMoa.toFixed(2)) : null,
      group_size_mrad: groupSizeMrad ? parseFloat(groupSizeMrad.toFixed(3)) : null,
      group_size_inches: parseFloat(groupSizeInches.toFixed(2)),
      point_of_impact_x: parseFloat(poiX.toFixed(1)),
      point_of_impact_y: parseFloat(poiY.toFixed(1)),
      clicks_up_down: parseFloat(elevClicks.toFixed(1)),
      clicks_left_right: parseFloat(windClicks.toFixed(1)),
      click_value: clickValue,
      turret_unit: turretUnit,
      bullet_holes: holes,
      centre_x: centre?.x,
      centre_y: centre?.y,
      scale_mm_per_px: mmPerPx,
      photo_url: photoUrl,
      entry_method: 'photo',
      notes,
    });
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-primary underline">← Change method</button>

      {/* Upload */}
      {!photoUrl && (
        <label className="flex flex-col items-center justify-center gap-3 p-10 bg-card border-2 border-dashed border-border rounded-2xl cursor-pointer">
          <Upload className="w-10 h-10 text-muted-foreground" />
          <span className="font-semibold">{uploading ? 'Uploading...' : 'Upload Target Photo'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      )}

      {photoUrl && (
        <>
          {/* Group Name */}
          <div className="bg-card rounded-2xl p-4 border border-border">
            <Label>Group Name</Label>
            <Input value={groupName} onChange={e => setGroupName(e.target.value)} />
          </div>

          {/* Scale calibration */}
          <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase">Scale Reference</h2>
            <p className="text-xs text-muted-foreground">Measure a known feature on the image (e.g. 10mm grid square) in pixels on screen.</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Size</Label>
                <Input type="number" value={scaleRef} onChange={e => setScaleRef(e.target.value)} />
              </div>
              <div>
                <Label>Unit</Label>
                <select value={scaleUnit} onChange={e => setScaleUnit(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium">
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                </select>
              </div>
              <div>
                <Label>Pixels</Label>
                <Input type="number" value={scalePixels} onChange={e => setScalePixels(e.target.value)} placeholder="e.g. 50" />
              </div>
            </div>
            {mmPerPx && <p className="text-xs text-primary font-medium">Scale: {mmPerPx.toFixed(3)} mm/px</p>}
          </div>

          {/* Mode selector */}
          <div className="flex gap-2">
            <button onClick={() => setMode('holes')}
              className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${mode === 'holes' ? 'bg-red-500 text-white border-red-500' : 'bg-secondary border-border'}`}>
              🎯 Tap Bullet Holes
            </button>
            <button onClick={() => setMode('centre')}
              className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${mode === 'centre' ? 'bg-green-500 text-white border-green-500' : 'bg-secondary border-border'}`}>
              ＋ Set Centre
            </button>
            <button onClick={() => setHoles([])}
              className="px-4 py-3 rounded-xl border border-border bg-secondary text-destructive text-sm">
              Clear
            </button>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-border bg-black">
            <img
              ref={imgRef}
              src={photoUrl}
              onLoad={handleImgLoad}
              className="hidden"
              crossOrigin="anonymous"
            />
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="w-full cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* Remove last hole */}
          {holes.length > 0 && (
            <button onClick={() => setHoles(h => h.slice(0, -1))}
              className="text-sm text-destructive underline">
              ← Remove last hole ({holes.length} holes)
            </button>
          )}

          {/* Stats */}
          {holes.length >= 2 && (
            <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
              <h2 className="font-bold">Group Analysis</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Group Size</p>
                  <p className="font-bold text-primary text-lg">{groupSizeMm.toFixed(1)}mm</p>
                </div>
                {groupSizeMoa && <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">MOA</p>
                  <p className="font-bold text-primary text-lg">{groupSizeMoa.toFixed(2)}</p>
                </div>}
                {groupSizeMrad && <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">MRAD</p>
                  <p className="font-bold text-primary text-lg">{groupSizeMrad.toFixed(3)}</p>
                </div>}
                <div className="bg-primary/10 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Inches</p>
                  <p className="font-bold text-primary text-lg">{groupSizeInches.toFixed(2)}"</p>
                </div>
              </div>

              {/* Scope correction */}
              <div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <Label>Turret Unit</Label>
                    <div className="flex gap-2 mt-1">
                      {['MOA', 'MRAD'].map(u => (
                        <button key={u} onClick={() => setTurretUnit(u)}
                          className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${turretUnit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Distance Override</Label>
                    <div className="flex gap-2 mt-1">
                      {['m', 'yards'].map(u => (
                        <button key={u} onClick={() => setDistanceUnit(u)}
                          className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${distanceUnit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <Label>Click Value</Label>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {(turretUnit === 'MOA' ? ['0.25', '0.5', '1'] : ['0.1', '0.05']).map(v => (
                      <button key={v} onClick={() => setClickValue(v)}
                        className={`px-2 py-2 rounded-lg border text-xs ${clickValue === v ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {centre && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">Correction Required</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Math.abs(elevClicks) > 0.01 && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                          <p className="text-muted-foreground text-xs">Elevation</p>
                          <p className="font-bold">{Math.abs(elevClicks).toFixed(1)} clicks {elevClicks > 0 ? '▲ Up' : '▼ Down'}</p>
                        </div>
                      )}
                      {Math.abs(windClicks) > 0.01 && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                          <p className="text-muted-foreground text-xs">Windage</p>
                          <p className="font-bold">{Math.abs(windClicks).toFixed(1)} clicks {windClicks > 0 ? '▶ Right' : '◀ Left'}</p>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">POI: {poiX.toFixed(1)}mm right, {poiY.toFixed(1)}mm high from centre</p>
                  </div>
                )}
                {!centre && holes.length >= 2 && (
                  <p className="text-xs text-muted-foreground bg-secondary rounded-xl p-3">Tap "Set Centre" to mark the bullseye and get correction clicks.</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl p-4 border border-border space-y-2">
            <Label>Notes</Label>
            <input className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." />
          </div>

          <Button onClick={handleSave} disabled={holes.length === 0} className="w-full py-6 text-lg rounded-2xl">
            Save Group ({holes.length} holes)
          </Button>
        </>
      )}
    </div>
  );
}