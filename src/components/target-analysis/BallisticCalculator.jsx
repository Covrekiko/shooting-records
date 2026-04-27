import { useState, useMemo } from 'react';
import { ArrowLeft, Wind, Target, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Physics ──────────────────────────────────────────────────────────────────
// G1 drag model — simplified point-mass trajectory
// Returns drop (cm) and drift (cm) at each distance (m)

const G = 9.81; // m/s²
const RHO_SEA = 1.225; // kg/m³ sea-level air density
const DT = 0.002; // time step (s)

function grToKg(gr) { return gr * 0.0000647989; }

function simulate({ muzzleVelocityMs, bulletMassKg, bcG1, windSpeedMs, windAngleDeg, distances }) {
  // Retardation factor
  const K = (0.5 * RHO_SEA * 0.4521 * bcG1) / bulletMassKg; // simplified retard coeff

  let x = 0, y = 0, z = 0;
  let vx = muzzleVelocityMs, vy = 0, vz = 0;

  // Wind vector (crosswind component only, perpendicular to bore)
  const windRad = (windAngleDeg * Math.PI) / 180;
  const windCross = windSpeedMs * Math.sin(windRad); // m/s crosswind

  const results = [];
  const targetDistances = [...distances].sort((a, b) => a - b);
  let targetIdx = 0;
  let t = 0;

  while (x < targetDistances[targetDistances.length - 1] + 1 && t < 10) {
    const v = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const drag = K * v * v; // drag deceleration magnitude

    // Drag decelerates in direction of travel
    const ax = -drag * (vx / v);
    const ay = -G - drag * (vy / v);
    const az = -drag * (vz / v) + (windCross * K * v); // crosswind push

    vx += ax * DT;
    vy += ay * DT;
    vz += az * DT;
    x += vx * DT;
    y += vy * DT;
    z += vz * DT;
    t += DT;

    while (targetIdx < targetDistances.length && x >= targetDistances[targetIdx]) {
      results.push({
        distance: targetDistances[targetIdx],
        dropCm: -y * 100,       // positive = down
        driftCm: z * 100,       // positive = right
        velocityMs: Math.round(v),
        timeOfFlightS: Math.round(t * 1000) / 1000,
      });
      targetIdx++;
    }

    if (targetIdx >= targetDistances.length) break;
  }

  return results;
}

// ─── BC lookup table (G1) for common calibers / bullets ───────────────────────
const BC_PRESETS = {
  '.223 / 5.56': { bc: 0.243, mv: 930, mass_gr: 55 },
  '.243 Win 90gr': { bc: 0.365, mv: 930, mass_gr: 90 },
  '6.5 Creedmoor 140gr': { bc: 0.585, mv: 860, mass_gr: 140 },
  '.308 Win 168gr': { bc: 0.475, mv: 820, mass_gr: 168 },
  '.308 Win 175gr': { bc: 0.505, mv: 800, mass_gr: 175 },
  '7mm Rem Mag 160gr': { bc: 0.531, mv: 960, mass_gr: 160 },
  '.300 Win Mag 180gr': { bc: 0.507, mv: 930, mass_gr: 180 },
  '.30-06 165gr': { bc: 0.435, mv: 860, mass_gr: 165 },
  '6.5 PRC 143gr': { bc: 0.625, mv: 900, mass_gr: 143 },
  '.270 Win 130gr': { bc: 0.430, mv: 960, mass_gr: 130 },
  '7.62×39 124gr': { bc: 0.275, mv: 720, mass_gr: 124 },
};

const DISTANCES_DEFAULT = [50, 100, 150, 200, 250, 300, 400, 500];

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

export default function BallisticCalculator({ session, onBack }) {
  const caliber = session?.caliber || '';
  const bulletWeight = parseFloat(session?.bullet_weight) || null;

  // Guess best preset from caliber string
  const guessPreset = () => {
    if (!caliber) return null;
    const cal = caliber.toLowerCase();
    for (const [name] of Object.entries(BC_PRESETS)) {
      if (name.toLowerCase().includes(cal.replace(' ', '')) || cal.includes(name.split(' ')[0].toLowerCase())) return name;
    }
    return null;
  };

  const [preset, setPreset] = useState(guessPreset() || '');
  const [bcInput, setBcInput] = useState('');
  const [mvInput, setMvInput] = useState('');      // fps
  const [massInput, setMassInput] = useState(bulletWeight ? String(bulletWeight) : '');
  const [windSpeed, setWindSpeed] = useState('10'); // mph
  const [windAngle, setWindAngle] = useState('90'); // degrees — full crosswind
  const [zeroDistance, setZeroDistance] = useState('100');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const applyPreset = (name) => {
    setPreset(name);
    if (!name) return;
    const p = BC_PRESETS[name];
    setBcInput(String(p.bc));
    setMvInput(String(Math.round(p.mv * 3.28084)));
    setMassInput(String(p.mass_gr));
  };

  const bc = parseFloat(bcInput) || (preset ? BC_PRESETS[preset]?.bc : null);
  const mvFps = parseFloat(mvInput) || (preset ? Math.round(BC_PRESETS[preset]?.mv * 3.28084) : null);
  const mvMs = mvFps ? mvFps / 3.28084 : null;
  const massGr = parseFloat(massInput) || (preset ? BC_PRESETS[preset]?.mass_gr : null);
  const windMs = parseFloat(windSpeed) * 0.44704;
  const zero = parseInt(zeroDistance) || 100;

  const rows = useMemo(() => {
    if (!bc || !mvMs || !massGr) return [];
    const massKg = grToKg(massGr);

    const allDist = Array.from(new Set([...DISTANCES_DEFAULT, zero])).sort((a, b) => a - b);
    const raw = simulate({ muzzleVelocityMs: mvMs, bulletMassKg: massKg, bcG1: bc, windSpeedMs: windMs, windAngleDeg: parseFloat(windAngle) || 90, distances: allDist });

    // Find zero row to offset drop
    const zeroRow = raw.find(r => r.distance === zero);
    const zeroDropCm = zeroRow?.dropCm ?? 0;

    return raw.map(r => ({
      ...r,
      dropCm: Math.round((r.dropCm - zeroDropCm) * 10) / 10,
      driftCm: Math.round(r.driftCm * 10) / 10,
      isZero: r.distance === zero,
    }));
  }, [bc, mvMs, massGr, windMs, windAngle, zero]);

  const canCalculate = bc && mvMs && massGr;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Ballistic Calculator</h2>
          <p className="text-xs text-muted-foreground">
            {session?.rifle_name || 'Rifle'}{caliber ? ` · ${caliber}` : ''}
          </p>
        </div>
      </div>

      {/* Preset selector */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
        <p className="font-semibold text-sm">Bullet / Caliber</p>
        <div>
          <label className={lbl}>Quick-select preset</label>
          <select value={preset} onChange={e => applyPreset(e.target.value)} className={inp}>
            <option value="">— Select or enter manually below —</option>
            {Object.keys(BC_PRESETS).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={lbl}>BC (G1)</label>
            <input type="number" step="0.001" value={bcInput || (preset ? BC_PRESETS[preset]?.bc : '')}
              onChange={e => { setPreset(''); setBcInput(e.target.value); }}
              placeholder="e.g. 0.475" className={inp} />
          </div>
          <div>
            <label className={lbl}>MV (fps)</label>
            <input type="number" value={mvInput || (preset ? Math.round(BC_PRESETS[preset]?.mv * 3.28084) : '')}
              onChange={e => { setPreset(''); setMvInput(e.target.value); }}
              placeholder="e.g. 2700" className={inp} />
          </div>
          <div>
            <label className={lbl}>Weight (gr)</label>
            <input type="number" value={massInput || (preset ? BC_PRESETS[preset]?.mass_gr : '')}
              onChange={e => { setPreset(''); setMassInput(e.target.value); }}
              placeholder="e.g. 168" className={inp} />
          </div>
        </div>
      </div>

      {/* Conditions */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
        <p className="font-semibold text-sm">Conditions</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Zero distance (m)</label>
            <div className="flex gap-1 flex-wrap">
              {[50, 100, 200, 300].map(d => (
                <button key={d} type="button" onClick={() => setZeroDistance(String(d))}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${zeroDistance === String(d) ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                  {d}m
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={lbl}>Wind speed (mph)</label>
            <input type="number" value={windSpeed} onChange={e => setWindSpeed(e.target.value)}
              placeholder="10" className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Wind direction</label>
          <div className="flex gap-1 flex-wrap">
            {[
              { label: 'Full (90°)', val: '90' },
              { label: 'Half (45°)', val: '45' },
              { label: 'Quarter (22°)', val: '22' },
              { label: 'Head/Tail (0°)', val: '0' },
            ].map(w => (
              <button key={w.val} type="button" onClick={() => setWindAngle(w.val)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${windAngle === w.val ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results table */}
      {canCalculate && rows.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <p className="font-semibold text-sm">Drop & Drift Table</p>
            <span className="text-xs text-muted-foreground ml-auto">Zeroed at {zero}m</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-bold text-muted-foreground uppercase tracking-wide bg-secondary/50">
                  <th className="px-3 py-2 text-left">Dist</th>
                  <th className="px-3 py-2 text-right">Drop (cm)</th>
                  <th className="px-3 py-2 text-right">Drop (in)</th>
                  <th className="px-3 py-2 text-right">
                    <span className="flex items-center justify-end gap-1"><Wind className="w-3 h-3" />Drift (cm)</span>
                  </th>
                  <th className="px-3 py-2 text-right">Vel (fps)</th>
                  <th className="px-3 py-2 text-right">ToF (s)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.distance}
                    className={`border-t border-border ${r.isZero ? 'bg-primary/10 font-semibold' : i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                    <td className="px-3 py-2.5 font-bold">
                      {r.distance}m {r.isZero && <span className="text-[10px] text-primary ml-1">ZERO</span>}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${r.dropCm > 0 ? 'text-red-500' : r.dropCm < 0 ? 'text-green-500' : ''}`}>
                      {r.dropCm > 0 ? '-' : r.dropCm < 0 ? '+' : ''}{Math.abs(r.dropCm)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                      {Math.abs(r.dropCm / 2.54).toFixed(1)}"
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${Math.abs(r.driftCm) > 5 ? 'text-amber-500' : ''}`}>
                      {r.driftCm > 0 ? '+' : ''}{r.driftCm}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {Math.round(r.velocityMs * 3.28084)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                      {r.timeOfFlightS}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-secondary/30">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Drop is relative to your {zero}m zero. Drift is for a {windSpeed}mph {windAngle}° crosswind from the right.
              Based on G1 ballistic model at sea level, standard conditions. For reference only — confirm with live firing.
            </p>
          </div>
        </div>
      ) : !canCalculate ? (
        <div className="bg-secondary/50 rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Select a preset or enter BC, muzzle velocity, and bullet weight to calculate.
        </div>
      ) : null}
    </div>
  );
}