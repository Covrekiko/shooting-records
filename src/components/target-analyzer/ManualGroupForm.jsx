import { useState } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function mmToMoa(mm, distanceM) {
  if (!mm || !distanceM) return null;
  return (mm / distanceM) * (10000 / 290.888);
}
function mmToMrad(mm, distanceM) {
  if (!mm || !distanceM) return null;
  return mm / distanceM;
}
function mmToInches(mm) {
  return mm / 25.4;
}
function calcClicks(corrMm, distanceM, clickValueStr, turretUnit) {
  if (!corrMm || !distanceM) return 0;
  const clickVal = parseFloat(clickValueStr) || 0.25;
  if (turretUnit === 'MRAD') {
    const mrad = corrMm / distanceM;
    return mrad / (clickVal * 0.1);
  } else {
    const moa = (corrMm / distanceM) * (10000 / 290.888);
    return moa / clickVal;
  }
}

export default function ManualGroupForm({ session, onSave, onBack, defaultGroupName = 'Group 1' }) {
  const [uploading, setUploading] = useState(false);
  const [distanceValue, setDistanceValue] = useState(session?.distance || '');
  const [distanceUnit, setDistanceUnit] = useState(session?.distance_unit || 'm');
  const [form, setForm] = useState({
    group_name: defaultGroupName,
    number_of_shots: '',
    group_size_mm: '',
    group_size_inches: '',
    point_of_impact_x: '',
    point_of_impact_y: '',
    click_value: '0.25',
    turret_unit: 'MOA',
    confirmed: false,
    entry_method: 'manual',
    notes: '',
    photo_url: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [sizeUnit, setSizeUnit] = useState('mm'); // 'mm' or 'inches'
  const [sizeInput, setSizeInput] = useState('');

  const handleSizeInput = (val) => {
    setSizeInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      if (sizeUnit === 'mm') {
        set('group_size_mm', val);
        set('group_size_inches', (num / 25.4).toFixed(3));
      } else {
        set('group_size_mm', (num * 25.4).toFixed(1));
        set('group_size_inches', val);
      }
    } else {
      set('group_size_mm', '');
      set('group_size_inches', '');
    }
  };

  const handleUnitSwitch = (unit) => {
    setSizeUnit(unit);
    const mm = parseFloat(form.group_size_mm);
    if (!isNaN(mm) && mm > 0) {
      setSizeInput(unit === 'mm' ? form.group_size_mm : (mm / 25.4).toFixed(3));
    } else {
      setSizeInput('');
    }
  };

  const distanceM = distanceUnit === 'yards'
    ? parseFloat(distanceValue) * 0.9144
    : parseFloat(distanceValue);

  const derived = (() => {
    const mm = parseFloat(form.group_size_mm);
    if (!mm || !distanceM) return null;
    const moa = mmToMoa(mm, distanceM);
    const mrad = mmToMrad(mm, distanceM);
    const inches = mmToInches(mm);
    const elev = parseFloat(form.point_of_impact_y) || 0;
    const wind = parseFloat(form.point_of_impact_x) || 0;
    const clicksV = calcClicks(Math.abs(elev), distanceM, form.click_value, form.turret_unit);
    const clicksH = calcClicks(Math.abs(wind), distanceM, form.click_value, form.turret_unit);
    return {
      moa: moa?.toFixed(2),
      mrad: mrad?.toFixed(3),
      inches: inches?.toFixed(2),
      clicksUp: elev > 0 ? 0 : -clicksV,
      clicksDown: elev > 0 ? clicksV : 0,
      clicksRight: wind < 0 ? 0 : -clicksH,
      clicksLeft: wind < 0 ? clicksH : 0,
      elevClicks: elev < 0 ? clicksV : (elev > 0 ? -clicksV : 0),
      windClicks: wind > 0 ? -clicksH : (wind < 0 ? clicksH : 0),
    };
  })();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('photo_url', file_url);
    setUploading(false);
  };

  const handleSave = () => {
    const mm = parseFloat(form.group_size_mm);
    const inches = parseFloat(form.group_size_inches) || (mm ? mm / 25.4 : null);
    onSave({
      ...form,
      number_of_shots: parseInt(form.number_of_shots) || null,
      group_size_mm: mm || null,
      group_size_moa: derived?.moa ? parseFloat(derived.moa) : null,
      group_size_mrad: derived?.mrad ? parseFloat(derived.mrad) : null,
      group_size_inches: inches ? parseFloat(inches.toFixed(3)) : null,
      point_of_impact_x: parseFloat(form.point_of_impact_x) || 0,
      point_of_impact_y: parseFloat(form.point_of_impact_y) || 0,
      clicks_up_down: derived?.elevClicks ? parseFloat(derived.elevClicks.toFixed(1)) : 0,
      clicks_left_right: derived?.windClicks ? parseFloat(derived.windClicks.toFixed(1)) : 0,
      distance_value: parseFloat(distanceValue),
      distance_unit: distanceUnit,
    });
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-primary underline">← Change method</button>

      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Group Info</h2>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Group Name</Label><Input value={form.group_name} onChange={e => set('group_name', e.target.value)} /></div>
          <div><Label>Number of Shots</Label><Input type="number" value={form.number_of_shots} onChange={e => set('number_of_shots', e.target.value)} /></div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Group Size</h2>
        <div className="flex gap-2 mb-2">
          {['mm', 'inches'].map(u => (
            <button key={u} type="button" onClick={() => handleUnitSwitch(u)}
              className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${sizeUnit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
              {u}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
           <div>
             <Label>Group Size ({sizeUnit})</Label>
             <Input type="number" step={sizeUnit === 'mm' ? '0.1' : '0.001'} value={sizeInput}
               onChange={e => handleSizeInput(e.target.value)}
               placeholder={sizeUnit === 'mm' ? 'e.g. 24' : 'e.g. 0.95'} />
           </div>
           <div>
             <Label>Distance Value</Label>
             <Input type="number" value={distanceValue} onChange={e => setDistanceValue(e.target.value)} placeholder="e.g. 100" />
           </div>
         </div>
         <div className="grid grid-cols-2 gap-3">
           <div></div>
           <div>
             <Label>Distance Unit</Label>
             <div className="flex gap-2 mt-1">
               {['m', 'yards'].map(u => (
                 <button key={u} onClick={() => setDistanceUnit(u)}
                   className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${distanceUnit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                   {u === 'm' ? 'meters' : 'yards'}
                 </button>
               ))}
             </div>
           </div>
         </div>
        {sizeInput && form.group_size_mm && (
          <p className="text-xs text-muted-foreground">
            {sizeUnit === 'mm'
              ? `= ${(parseFloat(form.group_size_mm) / 25.4).toFixed(3)} inches`
              : `= ${parseFloat(form.group_size_mm).toFixed(1)} mm`}
          </p>
        )}
        {derived && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">MOA</p>
              <p className="font-bold text-primary text-lg">{derived.moa}</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">MRAD</p>
              <p className="font-bold text-primary text-lg">{derived.mrad}</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground">Inches</p>
              <p className="font-bold text-primary text-lg">{derived.inches}"</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Point of Impact</h2>
        <p className="text-xs text-muted-foreground">Offset from centre in mm. Positive = up/right. Negative = down/left.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Windage offset (mm)</Label><Input type="number" value={form.point_of_impact_x} onChange={e => set('point_of_impact_x', e.target.value)} placeholder="+ right / - left" /></div>
          <div><Label>Elevation offset (mm)</Label><Input type="number" value={form.point_of_impact_y} onChange={e => set('point_of_impact_y', e.target.value)} placeholder="+ high / - low" /></div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Scope Turret</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Turret Unit</Label>
            <div className="flex gap-2 mt-1">
              {['MOA', 'MRAD'].map(u => (
                <button key={u} onClick={() => set('turret_unit', u)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold ${form.turret_unit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Click Value</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {(form.turret_unit === 'MOA' ? ['0.25', '0.5', '1'] : ['0.1', '0.05']).map(v => (
                <button key={v} onClick={() => set('click_value', v)}
                  className={`px-3 py-2 rounded-xl border text-sm ${form.click_value === v ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        {derived && (parseFloat(form.point_of_impact_x) !== 0 || parseFloat(form.point_of_impact_y) !== 0) && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">Scope Correction Required</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Math.abs(derived.elevClicks) > 0.01 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground text-xs">Elevation</p>
                  <p className="font-bold">{Math.abs(derived.elevClicks).toFixed(1)} clicks {derived.elevClicks > 0 ? '▲ Up' : '▼ Down'}</p>
                </div>
              )}
              {Math.abs(derived.windClicks) > 0.01 && (
                <div className="bg-white dark:bg-slate-800 rounded-lg p-2 text-center">
                  <p className="text-muted-foreground text-xs">Windage</p>
                  <p className="font-bold">{Math.abs(derived.windClicks).toFixed(1)} clicks {derived.windClicks > 0 ? '▶ Right' : '◀ Left'}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Photo (Optional)</h2>
        <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-dashed border-border cursor-pointer">
          <Camera className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm">{uploading ? 'Uploading...' : 'Add Target Photo'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
        {form.photo_url && <img src={form.photo_url} className="w-full h-40 object-cover rounded-xl" />}
      </div>

      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
        <div className="flex items-center gap-3">
          <input type="checkbox" id="conf" checked={form.confirmed} onChange={e => set('confirmed', e.target.checked)} />
          <label htmlFor="conf" className="text-sm font-medium">Mark as confirmed zero</label>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full py-6 text-lg rounded-2xl">Save Group</Button>
    </div>
  );
}