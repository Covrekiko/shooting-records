import { RotateCcw, Undo2 } from 'lucide-react';

const STEP_LABELS = {
  setup: 'Setup',
  placingPointA: 'Place Point A',
  pointASet: 'Place Point B',
  placingPointB: 'Place Point B',
  pointBSet: 'Confirm',
  confirmed: 'Confirmed',
};

function ProgressDot({ active, done, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${done ? 'bg-primary' : active ? 'bg-amber-500' : 'bg-muted'}`} />
      <span className={`text-[10px] font-semibold ${active || done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

export default function MobileScaleCalibrationSheet({
  visible,
  step,
  scaleInput,
  scaleUnit,
  onScaleInputChange,
  onScaleUnitChange,
  onPreset,
  onStart,
  onPlaceA,
  onPlaceB,
  onConfirm,
  onUndo,
  onReset,
  pointCount,
  pixelDistance,
  scalePx,
}) {
  if (!visible) return null;

  const pointASet = pointCount >= 1;
  const pointBSet = pointCount >= 2;
  const isPlacingA = step === 'placingPointA';
  const isPlacingB = step === 'pointASet' || step === 'placingPointB';
  const isConfirming = step === 'pointBSet';

  return (
    <div className="md:hidden z-30 pointer-events-none">
      <div className="pointer-events-auto bg-card border border-border shadow-sm rounded-2xl p-3" style={{ touchAction: 'manipulation', paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Scale Reference</p>
            <h3 className="text-base font-bold text-foreground">{STEP_LABELS[step] || 'Setup'}</h3>
          </div>
          <button type="button" onClick={onReset} className="px-3 py-1.5 rounded-xl bg-secondary text-xs font-semibold flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3">
          <ProgressDot label="Point A" active={isPlacingA} done={pointASet} />
          <div className="h-px flex-1 bg-border" />
          <ProgressDot label="Point B" active={isPlacingB} done={pointBSet} />
          <div className="h-px flex-1 bg-border" />
          <ProgressDot label="Ready" active={isConfirming} done={step === 'confirmed' || !!scalePx} />
        </div>

        {(step === 'setup' || step === 'confirmed') && (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_92px] gap-2">
              <input
                value={scaleInput}
                onChange={(e) => onScaleInputChange(e.target.value)}
                type="number"
                min="0"
                step="any"
                placeholder="1"
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm"
              />
              <select value={scaleUnit} onChange={(e) => onScaleUnitChange(e.target.value)} className="px-2 py-2.5 border border-border rounded-xl bg-background text-sm">
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">inch</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onPreset('cm')} className="flex-1 px-3 py-2 rounded-xl bg-secondary text-xs font-semibold">1 cm grid</button>
              <button type="button" onClick={() => onPreset('in')} className="flex-1 px-3 py-2 rounded-xl bg-secondary text-xs font-semibold">1 inch grid</button>
            </div>
            <button type="button" onClick={onStart} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold">
              {scalePx ? 'Recalibrate Scale' : 'Start Calibration'}
            </button>
          </div>
        )}

        {isPlacingA && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Pan or pinch the photo until the centre crosshair sits exactly on the first reference point.</p>
            <button type="button" onClick={onPlaceA} className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold">Set Point A</button>
          </div>
        )}

        {isPlacingB && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Point A is set. Pan/zoom to the second reference point, then set Point B.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onUndo} className="py-3 rounded-2xl bg-secondary text-sm font-bold flex items-center justify-center gap-1">
                <Undo2 className="w-4 h-4" /> Undo Point
              </button>
              <button type="button" onClick={onPlaceB} className="py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold">Set Point B</button>
            </div>
          </div>
        )}

        {isConfirming && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-secondary/70 p-2">
                <p className="text-muted-foreground">Reference</p>
                <p className="font-bold">{scaleInput} {scaleUnit}</p>
              </div>
              <div className="rounded-xl bg-secondary/70 p-2">
                <p className="text-muted-foreground">Measured</p>
                <p className="font-bold">{pixelDistance ? `${pixelDistance.toFixed(1)} px` : '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onUndo} className="py-3 rounded-2xl bg-secondary text-sm font-bold">Undo Point</button>
              <button type="button" onClick={onConfirm} disabled={!pixelDistance} className="py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">Confirm Scale</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}