import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

// Conversion helpers
function mmToMoa(mm, distanceM) {
  if (!mm || !distanceM) return 0;
  // 1 MOA = 29.088mm at 100m, scales linearly
  return (mm / (distanceM / 100)) / 29.088;
}
function mmToMrad(mm, distanceM) {
  if (!mm || !distanceM) return 0;
  return mm / distanceM; // 1 MRAD = 1mm per 1m
}
function inchesToMm(inches) { return inches * 25.4; }
function cmToMm(cm) { return cm * 10; }

function calcClicksFromMoa(moa, clickValue) {
  if (!moa || !clickValue) return 0;
  // parse click value like "1/4 MOA" or "0.1 MRAD"
  if (clickValue.includes('/')) {
    const [num, den] = clickValue.replace(/\s*MOA/i, '').split('/').map(Number);
    return Math.round(moa / (num / den) * 10) / 10;
  }
  const val = parseFloat(clickValue);
  return val ? Math.round(moa / val * 10) / 10 : 0;
}

const POSITIONS = ['benchrest', 'prone', 'sticks', 'high_seat', 'standing', 'other'];

export default function ManualGroupForm({ session, editGroup, scopeProfile, groupNumber, rifles = [], ammunition = [], onSave, onBack }) {
  const [form, setForm] = useState({
    group_name: `Group ${groupNumber}`,
    number_of_shots: '',
    group_size_mm: '',
    group_size_input: '',
    group_size_unit: 'mm',
    point_of_impact_x: 0,
    point_of_impact_y: 0,
    confirmed: false,
    notes: '',
    entry_method: 'manual',
    shooting_position: session.shooting_position || '',
    distance_override: '',
    rifle_id: editGroup?.rifle_id || session.rifle_id || '',
    ammunition_id: editGroup?.ammunition_id || session.ammo_id || '',
  });
  const [calculated, setCalculated] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (editGroup) setForm(f => ({ ...f, ...editGroup, group_size_input: editGroup.group_size_mm || '', group_size_unit: 'mm', rifle_id: editGroup.rifle_id || session.rifle_id || '', ammunition_id: editGroup.ammunition_id || session.ammo_id || '' }));
  }, [editGroup]);

  useEffect(() => {
    recalculate();
  }, [form.group_size_input, form.group_size_unit, form.point_of_impact_x, form.point_of_impact_y, form.distance_override]);

  const recalculate = () => {
    const input = parseFloat(form.group_size_input);
    const effectiveDistance = parseFloat(form.distance_override) || parseFloat(session.distance);
    if (!input || !effectiveDistance || effectiveDistance <= 0) return;

    let mm;
    if (form.group_size_unit === 'mm') mm = input;
    else if (form.group_size_unit === 'cm') mm = cmToMm(input);
    else if (form.group_size_unit === 'inches') mm = inchesToMm(input);
    else mm = input;

    // Convert distance to meters
    const rawDist = parseFloat(form.distance_override) || parseFloat(session.distance);
    const distM = session.distance_unit === 'yards' ? rawDist * 0.9144 : rawDist;
    const moa = mmToMoa(mm, distM);
    const mrad = mmToMrad(mm, distM);

    // Click calculations
    const clickVal = scopeProfile?.click_value || '1/4 MOA';
    const isMrad = clickVal.toLowerCase().includes('mrad');
    const clicksElev = isMrad ? Math.round((parseFloat(form.point_of_impact_y) / distM) / parseFloat(clickVal) * 10) / 10
      : calcClicksFromMoa(mmToMoa(Math.abs(parseFloat(form.point_of_impact_y) || 0), distM), clickVal);
    const clicksWind = isMrad ? Math.round((parseFloat(form.point_of_impact_x) / distM) / parseFloat(clickVal) * 10) / 10
      : calcClicksFromMoa(mmToMoa(Math.abs(parseFloat(form.point_of_impact_x) || 0), distM), clickVal);

    if (!isFinite(moa) || !isFinite(mrad)) return;

    setCalculated({
      mm: Math.round(mm * 10) / 10,
      moa: Math.round(moa * 100) / 100,
      mrad: Math.round(mrad * 1000) / 1000,
      inches: Math.round(mm / 25.4 * 100) / 100,
      clicksUp: form.point_of_impact_y < 0 ? Math.round(Math.abs(clicksElev) * 10) / 10 : 0,
      clicksDown: form.point_of_impact_y > 0 ? Math.round(Math.abs(clicksElev) * 10) / 10 : 0,
      clicksRight: form.point_of_impact_x < 0 ? Math.round(Math.abs(clicksWind) * 10) / 10 : 0,
      clicksLeft: form.point_of_impact_x > 0 ? Math.round(Math.abs(clicksWind) * 10) / 10 : 0,
      clickValue: clickVal,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const input = parseFloat(form.group_size_input);
    let mm = input;
    if (form.group_size_unit === 'cm') mm = cmToMm(input);
    if (form.group_size_unit === 'inches') mm = inchesToMm(input);

    const selectedAmmo = ammunition.find(a => a.id === form.ammunition_id);
    const selectedRifle = rifles.find(r => r.id === form.rifle_id);
    const payload = {
      group_name: form.group_name,
      number_of_shots: parseInt(form.number_of_shots) || 0,
      group_size_mm: calculated?.mm || mm,
      group_size_moa: calculated?.moa || 0,
      group_size_mrad: calculated?.mrad || 0,
      group_size_inches: calculated?.inches || 0,
      point_of_impact_x: parseFloat(form.point_of_impact_x) || 0,
      point_of_impact_y: parseFloat(form.point_of_impact_y) || 0,
      clicks_up_down: (calculated?.clicksUp || 0) - (calculated?.clicksDown || 0),
      clicks_left_right: (calculated?.clicksRight || 0) - (calculated?.clicksLeft || 0),
      confirmed: form.confirmed,
      notes: form.notes,
      entry_method: 'manual',
      shooting_position: form.shooting_position,
      distance_override: form.distance_override ? parseFloat(form.distance_override) : null,
      rifle_id: form.rifle_id || null,
      rifle_name: selectedRifle?.name || null,
      ammunition_id: form.ammunition_id || null,
      ammo_override: selectedAmmo ? `${selectedAmmo.brand}${selectedAmmo.caliber ? ` (${selectedAmmo.caliber})` : ''}${selectedAmmo.grain ? ` ${selectedAmmo.grain}gr` : ''}` : null,
    };
    setSaving(false);
    onSave(payload);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">{editGroup ? 'Edit Group' : 'Add Group Manually'}</h2>
          <p className="text-xs text-muted-foreground">{session.distance}{session.distance_unit || 'm'} · {session.rifle_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Group Name</label>
              <input value={form.group_name} onChange={e => set('group_name', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Number of Shots</label>
              <input type="number" value={form.number_of_shots} onChange={e => set('number_of_shots', e.target.value)} placeholder="e.g. 5" className={inp} />
            </div>
          </div>

          {/* Rifle selector */}
          {rifles.length > 0 && (
            <div>
              <label className={lbl}>Rifle</label>
              <select value={form.rifle_id} onChange={e => set('rifle_id', e.target.value)} className={inp}>
                <option value="">— Select rifle —</option>
                {rifles.map(r => <option key={r.id} value={r.id}>{r.name} {r.caliber ? `(${r.caliber})` : ''}</option>)}
              </select>
            </div>
          )}

          {/* Ammo selector */}
          {ammunition.length > 0 && (
            <div>
              <label className={lbl}>Ammunition</label>
              <select value={form.ammunition_id} onChange={e => set('ammunition_id', e.target.value)} className={inp}>
                <option value="">— Select ammunition —</option>
                {ammunition
                  .filter(a => {
                    if (!form.rifle_id) return true;
                    const rifle = rifles.find(r => r.id === form.rifle_id);
                    return !rifle?.caliber || !a.caliber || a.caliber === rifle.caliber;
                  })
                  .map(a => <option key={a.id} value={a.id}>{a.brand}{a.caliber ? ` (${a.caliber})` : ''}{a.bullet_type ? ` - ${a.bullet_type}` : ''}{a.grain ? ` ${a.grain}gr` : ''}</option>)}
              </select>
            </div>
          )}

          {/* Distance override */}
          <div>
            <label className={lbl}>Distance (m) <span className="text-muted-foreground normal-case font-normal">override</span></label>
            <input type="number" value={form.distance_override} onChange={e => set('distance_override', e.target.value)}
              placeholder={session.distance ? `${session.distance}m` : 'e.g. 100'} className={inp} />
          </div>

          {/* Shooting position */}
          <div>
            <label className={lbl}>Shooting Position</label>
            <select value={form.shooting_position} onChange={e => set('shooting_position', e.target.value)}
              className={inp}>
              <option value="">— Select —</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Group Size</label>
            <div className="flex gap-2">
              <input type="number" step="0.1" value={form.group_size_input} onChange={e => set('group_size_input', e.target.value)}
                placeholder="e.g. 24" className={`${inp} flex-1`} />
              <select value={form.group_size_unit} onChange={e => set('group_size_unit', e.target.value)}
                className="px-3 py-3 border border-border rounded-xl bg-background text-sm w-24">
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="inches">inches</option>
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Point of Impact (mm from centre)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Horizontal: + = right, − = left</p>
                <input type="number" step="0.1" value={form.point_of_impact_x} onChange={e => set('point_of_impact_x', e.target.value)}
                  placeholder="0" className={inp} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vertical: + = high, − = low</p>
                <input type="number" step="0.1" value={form.point_of_impact_y} onChange={e => set('point_of_impact_y', e.target.value)}
                  placeholder="0" className={inp} />
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Results */}
        {calculated && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Calculated Results</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background rounded-xl p-3 text-center">
                <p className="text-2xl font-black">{calculated.moa}</p>
                <p className="text-xs text-muted-foreground">MOA</p>
              </div>
              <div className="bg-background rounded-xl p-3 text-center">
                <p className="text-2xl font-black">{calculated.mrad}</p>
                <p className="text-xs text-muted-foreground">MRAD</p>
              </div>
              <div className="bg-background rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{calculated.mm}mm</p>
                <p className="text-xs text-muted-foreground">Group Size</p>
              </div>
              <div className="bg-background rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{calculated.inches}"</p>
                <p className="text-xs text-muted-foreground">Inches</p>
              </div>
            </div>
            {(calculated.clicksUp || calculated.clicksDown || calculated.clicksLeft || calculated.clicksRight) ? (
              <div className="mt-3 bg-background rounded-xl p-3">
                <p className="text-xs font-semibold mb-1">Scope Correction ({calculated.clickValue})</p>
                <p className="text-base font-bold">
                  {calculated.clicksUp ? `↑ ${calculated.clicksUp} clicks up` : ''}
                  {calculated.clicksDown ? `↓ ${calculated.clicksDown} clicks down` : ''}
                  {(calculated.clicksUp || calculated.clicksDown) && (calculated.clicksLeft || calculated.clicksRight) ? ', ' : ''}
                  {calculated.clicksRight ? `→ ${calculated.clicksRight} clicks right` : ''}
                  {calculated.clicksLeft ? `← ${calculated.clicksLeft} clicks left` : ''}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.confirmed} onChange={e => set('confirmed', e.target.checked)} className="w-5 h-5" />
            <span className="font-semibold">Confirmed Zero ✓</span>
          </label>
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows="3" placeholder="e.g. Windy, first cold bore shot excluded" className={inp} />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving…' : 'Save Group'}
        </button>
      </form>
    </div>
  );
}