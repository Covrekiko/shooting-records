import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Wind, Target, ChevronDown, ChevronUp, Plus, Trash2, Save } from 'lucide-react';
import BulletReferencePicker from '@/components/reference/BulletReferencePicker';
import { base44 } from '@/api/base44Client';

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

const DISTANCES_DEFAULT = [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300];

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

// Unit conversion helpers
const gramsToGrains = (g) => g * 15.4324;
const grainsToGrams = (gr) => gr / 15.4324;
const msToFps = (ms) => ms * 3.28084;
const fpsToMs = (fps) => fps / 3.28084;
const metersToYards = (m) => m * 1.09361;
const yardsToMeters = (y) => y / 1.09361;
const cmToInches = (cm) => cm / 2.54;
const inchesToCm = (inches) => inches * 2.54;

export default function BallisticCalculator({ session, onBack }) {
  const caliber = session?.caliber || '';
  const bulletWeight = parseFloat(session?.bullet_weight) || null;

  const [tab, setTab] = useState('input'); // 'input', 'profiles', 'table', 'reticle', 'turret', 'shots'
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  
  // Manual input state
  const [bcInput, setBcInput] = useState('');
  const [mvFpsInput, setMvFpsInput] = useState('');
  const [mvMsInput, setMvMsInput] = useState('');
  const [massGrInput, setMassGrInput] = useState(bulletWeight ? String(bulletWeight) : '');
  const [massGInput, setMassGInput] = useState('');
  const [windSpeed, setWindSpeed] = useState('10'); // mph
  const [windAngle, setWindAngle] = useState('90');
  const [zeroDistance, setZeroDistance] = useState('100');
  const [zeroDistanceYards, setZeroDistanceYards] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sightHeight, setSightHeight] = useState('5');
  const [scopeClickValue, setScopeClickValue] = useState('0.25_MOA');
  const [bcModel, setBcModel] = useState('G1');
  const [temperature, setTemperature] = useState('');
  const [pressure, setPressure] = useState('');
  const [humidity, setHumidity] = useState('');
  const [altitude, setAltitude] = useState('');

  // Load profiles from entity
  const loadProfiles = async () => {
    try {
      const profs = await base44.entities.BallisticProfile.list();
      setProfiles(profs);
    } catch (e) {
      console.warn('Could not load ballistic profiles:', e);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Auto-sync unit conversion
  const handleMvFpsChange = (val) => {
    setMvFpsInput(val);
    if (val) setMvMsInput(String(Math.round(fpsToMs(parseFloat(val)) * 10) / 10));
    else setMvMsInput('');
  };

  const handleMvMsChange = (val) => {
    setMvMsInput(val);
    if (val) setMvFpsInput(String(Math.round(msToFps(parseFloat(val)))));
    else setMvFpsInput('');
  };

  const handleMassGrChange = (val) => {
    setMassGrInput(val);
    if (val) setMassGInput(String(Math.round(grainsToGrams(parseFloat(val)) * 100) / 100));
    else setMassGInput('');
  };

  const handleMassGChange = (val) => {
    setMassGInput(val);
    if (val) setMassGrInput(String(Math.round(gramsToGrains(parseFloat(val)))));
    else setMassGrInput('');
  };

  const handleZeroMetersChange = (val) => {
    setZeroDistance(val);
    if (val) setZeroDistanceYards(String(Math.round(metersToYards(parseInt(val)))));
    else setZeroDistanceYards('');
  };

  const handleZeroYardsChange = (val) => {
    setZeroDistanceYards(val);
    if (val) setZeroDistance(String(Math.round(yardsToMeters(parseInt(val)))));
    else setZeroDistance('');
  };

  // Resolve values from either input or selected profile
  const bc = parseFloat(bcInput) || (selectedProfile?.ballistic_coefficient_g1 ? parseFloat(selectedProfile.ballistic_coefficient_g1) : null);
  const mvFps = parseFloat(mvFpsInput) || (selectedProfile?.muzzle_velocity_fps ? parseFloat(selectedProfile.muzzle_velocity_fps) : null);
  const mvMs = mvFps ? fpsToMs(mvFps) : null;
  const massGr = parseFloat(massGrInput) || (selectedProfile?.bullet_weight_grains ? parseFloat(selectedProfile.bullet_weight_grains) : null);
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
            {selectedProfile?.rifle_name || session?.rifle_name || 'Rifle'}{selectedProfile?.caliber || caliber ? ` · ${selectedProfile?.caliber || caliber}` : ''}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { id: 'input', label: 'Input' },
          { id: 'profiles', label: 'Profiles' },
          { id: 'table', label: 'Table' },
          { id: 'reticle', label: 'Reticle' },
          { id: 'turret', label: 'Turret' },
          { id: 'shots', label: 'Shots' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* INPUT TAB */}
      {tab === 'input' && (
        <>
          <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
            <p className="font-semibold text-sm">Ammunition</p>
            <div>
              <label className={lbl}>From bullet database <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
              <BulletReferencePicker
                onSelect={(b) => {
                  if (b.ballistic_coefficient_g1) setBcInput(String(b.ballistic_coefficient_g1));
                  else if (b.ballistic_coefficient_g7) setBcInput(String(b.ballistic_coefficient_g7));
                  if (b.weight_grains) handleMassGrChange(String(b.weight_grains));
                }}
                onClear={() => {}}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className={`${lbl} mb-0`}>Ballistic Coefficient</label>
                <select value={bcModel} onChange={e => setBcModel(e.target.value)} className="px-2 py-1 border border-border rounded-lg bg-background text-xs font-semibold">
                  <option value="G1">G1</option>
                  <option value="G7">G7 reference</option>
                </select>
              </div>
              <input type="number" step="0.001" value={bcInput} onChange={e => setBcInput(e.target.value)}
                placeholder="e.g. 0.475" className={inp} />
              <p className="text-[11px] text-muted-foreground mt-1">The current solver uses the existing simplified G1-style reference model; G7 is stored here as a reference label only.</p>
            </div>

            <div>
              <label className={lbl}>Muzzle Velocity</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">fps</label>
                  <input type="number" value={mvFpsInput} onChange={e => handleMvFpsChange(e.target.value)}
                    placeholder="e.g. 2700" className={inp} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">m/s</label>
                  <input type="number" step="0.1" value={mvMsInput} onChange={e => handleMvMsChange(e.target.value)}
                    placeholder="e.g. 823" className={inp} />
                </div>
              </div>
            </div>

            <div>
              <label className={lbl}>Bullet Weight</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">grains</label>
                  <input type="number" value={massGrInput} onChange={e => handleMassGrChange(e.target.value)}
                    placeholder="e.g. 140" className={inp} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">grams</label>
                  <input type="number" step="0.1" value={massGInput} onChange={e => handleMassGChange(e.target.value)}
                    placeholder="e.g. 9.1" className={inp} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PROFILES TAB */}
      {tab === 'profiles' && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Ballistic Profiles</p>
            <button className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1">
              <Plus className="w-3 h-3" />
              New
            </button>
          </div>
          {profiles.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No profiles saved yet</p>
          ) : (
            <div className="space-y-2">
              {profiles.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProfile(p);
                    setBcInput(String(p.ballistic_coefficient_g1 || ''));
                    handleMvFpsChange(String(p.muzzle_velocity_fps || ''));
                    handleMassGrChange(String(p.bullet_weight_grains || ''));
                    handleZeroMetersChange(String(p.zero_distance_meters || '100'));
                    setSightHeight(String(p.sight_height_cm || '5'));
                    setScopeClickValue(p.scope_click_value || '0.25_MOA');
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedProfile?.id === p.id
                      ? 'bg-primary/10 border-primary'
                      : 'bg-secondary/30 border-border hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold text-sm">{p.profile_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.rifle_name} · {p.bullet_weight_grains}gr {p.caliber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    BC {p.ballistic_coefficient_g1} · MV {p.muzzle_velocity_fps} fps · Zero {p.zero_distance_meters}m
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONDITIONS & RANGES (for all tabs) */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
        <p className="font-semibold text-sm">Zero & Range</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Zero distance</label>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1">meters</label>
                <input type="number" value={zeroDistance} onChange={e => handleZeroMetersChange(e.target.value)}
                  className={inp} />
              </div>
              <div>
                <label className="text-muted-foreground block mb-1">yards</label>
                <input type="number" value={zeroDistanceYards} onChange={e => handleZeroYardsChange(e.target.value)}
                  className={inp} />
              </div>
            </div>
          </div>
          <div>
            <label className={lbl}>Scope height (cm)</label>
            <input type="number" step="0.5" value={sightHeight} onChange={e => setSightHeight(e.target.value)}
              placeholder="5" className={inp} />
          </div>
        </div>

        {tab !== 'profiles' && (
          <>
            <div>
              <label className={lbl}>Ballistic Reference Details <span className="normal-case font-normal text-muted-foreground">(optional notes only)</span></label>
              <div className="grid grid-cols-2 gap-2">
                <input value={temperature} onChange={e => setTemperature(e.target.value)} placeholder="Temp e.g. 12°C" className={inp} />
                <input value={pressure} onChange={e => setPressure(e.target.value)} placeholder="Pressure e.g. 1013 hPa" className={inp} />
                <input value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="Humidity %" className={inp} />
                <input value={altitude} onChange={e => setAltitude(e.target.value)} placeholder="Altitude e.g. 120m" className={inp} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">These reference details do not change the calculation yet. Confirm all DOPE with live firing.</p>
            </div>

            <div>
              <label className={lbl}>Scope click value</label>
              <select value={scopeClickValue} onChange={e => setScopeClickValue(e.target.value)} className={inp}>
                <option value="0.25_MOA">1/4 MOA</option>
                <option value="0.125_MOA">1/8 MOA</option>
                <option value="0.1_MRAD">0.1 MRAD</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className={lbl}>Wind speed (mph)</label>
              <input type="number" value={windSpeed} onChange={e => setWindSpeed(e.target.value)}
                placeholder="10" className={inp} />
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
          </>
        )}
      </div>

      {/* TABLE TAB */}
      {tab === 'table' && (
        canCalculate && rows.length > 0 ? (
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
                    <th className="px-3 py-2 text-left">Distance</th>
                    <th className="px-3 py-2 text-right">Drop (cm)</th>
                    <th className="px-3 py-2 text-right">Drop (in)</th>
                    <th className="px-3 py-2 text-right">
                      <span className="flex items-center justify-end gap-1"><Wind className="w-3 h-3" />Drift (cm)</span>
                    </th>
                    <th className="px-3 py-2 text-right">Velocity</th>
                    <th className="px-3 py-2 text-right">ToF</th>
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
                        {Math.abs(cmToInches(r.dropCm)).toFixed(1)}"
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${Math.abs(r.driftCm) > 5 ? 'text-amber-500' : ''}`}>
                        {r.driftCm > 0 ? '+' : ''}{r.driftCm}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground text-xs">
                        {Math.round(msToFps(r.velocityMs))} fps
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
            Enter or select BC, muzzle velocity, and bullet weight to generate table.
          </div>
        ) : null
      )}

      {/* RETICLE TAB */}
      {tab === 'reticle' && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-4">
          <div className="text-center mb-6">
            <p className="text-sm font-semibold mb-2">Reticle Reference</p>
            <p className="text-xs text-muted-foreground mb-4">Zero: {zero}m | Caliber: {selectedProfile?.caliber || 'N/A'}</p>
            <div className="w-32 h-32 mx-auto border-2 border-muted rounded-full flex items-center justify-center bg-muted/10">
              <div className="w-0.5 h-full bg-muted/30" />
              <div className="h-0.5 w-full absolute bg-muted/30" />
              <span className="text-xs font-bold">○</span>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <p><span className="font-semibold">Zero Distance:</span> {zero}m</p>
            {canCalculate && rows.length > 0 && (
              <>
                <p><span className="font-semibold">Hold-over marks:</span> First few target rows show drop (↓) and drift (→)</p>
                {rows.slice(0, 3).map(r => (
                  <div key={r.distance} className="pl-4 text-muted-foreground">
                    {r.distance}m: Drop {r.dropCm}cm, Drift {r.driftCm}cm
                  </div>
                ))}
              </>
            )}
            <p className="mt-3 text-muted-foreground">Keep data on target for reference at range.</p>
          </div>
        </div>
      )}

      {/* TURRET TAB */}
      {tab === 'turret' && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
          <p className="font-semibold text-sm">Scope / Turret Clicks</p>
          {canCalculate && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-bold text-muted-foreground uppercase bg-secondary/50">
                    <th className="px-3 py-2 text-left">Distance</th>
                    <th className="px-3 py-2 text-right">Clicks</th>
                    <th className="px-3 py-2 text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const clickMultiplier = scopeClickValue === '0.25_MOA' ? 4 : scopeClickValue === '0.125_MOA' ? 8 : 10;
                    const dropMOA = (r.dropCm / 2.54 / (r.distance * 0.032808)) * 60;
                    const clicks = Math.round(dropMOA * clickMultiplier);
                    return (
                      <tr key={r.distance} className={`border-t border-border ${r.isZero ? 'bg-primary/10' : i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                        <td className="px-3 py-2.5 font-bold">{r.distance}m</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{clicks}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">{dropMOA.toFixed(2)} MOA</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Enter ammunition data and zero distance to calculate scope clicks.</p>
          )}
        </div>
      )}

      {/* SHOTS TAB */}
      {tab === 'shots' && (
        <div className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
          <p className="font-semibold text-sm">Shot Pictures</p>
          <p className="text-xs text-muted-foreground">Attach target photos to this profile for tracking performance over time.</p>
          <label className="block px-4 py-3 bg-secondary/30 border border-dashed border-border rounded-xl text-center cursor-pointer hover:bg-secondary/50 transition-colors">
            <input type="file" accept="image/*" multiple className="hidden" onChange={() => {}} />
            <p className="text-xs font-semibold">+ Add Target Photo</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Coming soon: storage integration</p>
          </label>
        </div>
      )}
    </div>
  );
}