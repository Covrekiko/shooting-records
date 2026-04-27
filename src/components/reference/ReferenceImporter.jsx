import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Duplicate key rules
const bulletKey = r => `${r.manufacturer}||${r.bullet_name}||${r.weight_grains}||${r.diameter_inch}`.toLowerCase();
const scopeKey = r => `${r.manufacturer}||${r.model}||${r.reticle_name}||${r.turret_unit}`.toLowerCase();

const BULLET_NUMERIC = ['diameter_inch','diameter_mm','weight_grains','weight_grams',
  'ballistic_coefficient_g1','ballistic_coefficient_g7','sectional_density',
  'bullet_length_mm','bullet_length_inch'];
const BULLET_BOOL = ['lead_free','boat_tail','flat_base','polymer_tip','hollow_point',
  'soft_point','bonded','monolithic','tipped','cannelure'];
const SCOPE_NUMERIC = ['magnification_min','magnification_max','objective_diameter_mm',
  'tube_diameter_mm','clicks_per_turn','total_elevation_travel_mrad','total_windage_travel_mrad',
  'total_elevation_travel_moa','total_windage_travel_moa','length_mm','weight_grams',
  'parallax_min_distance_m','eye_relief_mm'];
const SCOPE_BOOL = ['zero_stop','locking_turrets','capped_turrets','illumination','parallax_adjustable'];

function coerceBullet(row) {
  const r = { ...row };
  BULLET_NUMERIC.forEach(k => { if (r[k] !== undefined && r[k] !== '') r[k] = parseFloat(r[k]) || undefined; else delete r[k]; });
  BULLET_BOOL.forEach(k => { if (r[k] !== undefined) r[k] = r[k] === true || r[k] === 'true' || r[k] === '1' || r[k] === 'yes'; });
  return r;
}

function coerceScope(row) {
  const r = { ...row };
  SCOPE_NUMERIC.forEach(k => { if (r[k] !== undefined && r[k] !== '') r[k] = parseFloat(r[k]) || undefined; else delete r[k]; });
  SCOPE_BOOL.forEach(k => { if (r[k] !== undefined) r[k] = r[k] === true || r[k] === 'true' || r[k] === '1' || r[k] === 'yes'; });
  if (r.total_elevation_travel_mrad) r.elevation_travel_mrad = r.total_elevation_travel_mrad;
  if (r.total_windage_travel_mrad) r.windage_travel_mrad = r.total_windage_travel_mrad;
  return r;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => { if (values[i] !== undefined && values[i] !== '') obj[h] = values[i]; });
    return obj;
  }).filter(r => Object.keys(r).length > 0);
}

const BULLET_TEMPLATE_HEADERS = 'manufacturer,bullet_name,bullet_family,caliber,diameter_inch,diameter_mm,weight_grains,weight_grams,bullet_type,bullet_construction,lead_free,ballistic_coefficient_g1,ballistic_coefficient_g7,bc_model,sectional_density,bullet_length_mm,minimum_twist_rate,boat_tail,polymer_tip,hollow_point,soft_point,bonded,monolithic,source_name,source_date_checked,data_confidence,official_product_url,notes';
const SCOPE_TEMPLATE_HEADERS = 'manufacturer,model,model_family,magnification_min,magnification_max,objective_diameter_mm,tube_diameter_mm,focal_plane,reticle_name,turret_unit,click_value,clicks_per_turn,total_elevation_travel_mrad,total_windage_travel_mrad,zero_stop,illumination,parallax_adjustable,weight_grams,length_mm,source_name,source_date_checked,data_confidence,official_product_url,notes';

export default function ReferenceImporter({ tab, onDone, onClose }) {
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [rawRecords, setRawRecords] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [localTab, setLocalTab] = useState(tab);

  const handleFile = async (file) => {
    const text = await file.text();
    let records = [];
    try {
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        records = Array.isArray(parsed) ? parsed : parsed.data || parsed.records || [];
      } else {
        records = parseCSV(text);
      }
    } catch (e) {
      alert('Failed to parse file: ' + e.message);
      return;
    }
    setRawRecords(records);
    setStep('preview');
  };

  const validate = (records) => {
    const errs = [];
    records.forEach((r, i) => {
      if (localTab === 'bullets') {
        if (!r.manufacturer) errs.push(`Row ${i+1}: manufacturer is required`);
        if (!r.caliber) errs.push(`Row ${i+1}: caliber is required`);
        if (!r.weight_grains) errs.push(`Row ${i+1}: weight_grains is required`);
      } else {
        if (!r.manufacturer) errs.push(`Row ${i+1}: manufacturer is required`);
        if (!r.model) errs.push(`Row ${i+1}: model is required`);
      }
    });
    return errs;
  };

  const handleImport = async () => {
    const validationErrs = validate(rawRecords);
    if (validationErrs.length > 0) { setErrors(validationErrs); return; }
    setImporting(true);
    setStep('importing');

    let created = 0, updated = 0, skipped = 0, failed = 0;

    // Fetch existing for dedup
    const existing = localTab === 'bullets'
      ? await base44.entities.BulletReference.list('-created_date', 2000)
      : await base44.entities.ScopeReference.list('-created_date', 2000);

    const existingMap = {};
    existing.forEach(e => {
      const k = localTab === 'bullets' ? bulletKey(e) : scopeKey(e);
      existingMap[k] = e;
    });

    for (const rawRow of rawRecords) {
      try {
        const row = localTab === 'bullets' ? coerceBullet(rawRow) : coerceScope(rawRow);
        const k = localTab === 'bullets' ? bulletKey(row) : scopeKey(row);
        if (existingMap[k]) {
          // Update existing — only overwrite blank fields
          const existing = existingMap[k];
          const patch = {};
          Object.keys(row).forEach(key => {
            if ((existing[key] === undefined || existing[key] === null || existing[key] === '') && row[key] !== undefined) {
              patch[key] = row[key];
            }
          });
          if (Object.keys(patch).length > 0) {
            if (localTab === 'bullets') await base44.entities.BulletReference.update(existing.id, patch);
            else await base44.entities.ScopeReference.update(existing.id, patch);
            updated++;
          } else {
            skipped++;
          }
        } else {
          if (localTab === 'bullets') await base44.entities.BulletReference.create(row);
          else await base44.entities.ScopeReference.create(row);
          created++;
        }
      } catch (e) {
        console.error('Import row failed:', e);
        failed++;
      }
    }

    setResult({ created, updated, skipped, failed, total: rawRecords.length });
    setStep('done');
    setImporting(false);
  };

  const downloadTemplate = () => {
    const headers = localTab === 'bullets' ? BULLET_TEMPLATE_HEADERS : SCOPE_TEMPLATE_HEADERS;
    const blob = new Blob([headers + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localTab}_reference_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60000] bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-bold text-lg">Import Reference Data</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Tab selector */}
          <div className="flex gap-2">
            {['bullets','scopes'].map(t => (
              <button key={t} onClick={() => { setLocalTab(t); setRawRecords([]); setStep('upload'); setErrors([]); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${localTab === t ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                {t === 'bullets' ? '🔵 Bullets' : '🔭 Scopes'}
              </button>
            ))}
          </div>

          {step === 'upload' && (
            <div className="space-y-4">
              <div className="bg-secondary/40 rounded-xl p-4 text-sm space-y-2">
                <p className="font-semibold">Accepted formats: CSV or JSON</p>
                <p className="text-muted-foreground text-xs">
                  JSON: array of objects, or <code>{'{"data": [...]}'}</code><br/>
                  CSV: first row = column headers matching field names
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Duplicate rule:</strong> {localTab === 'bullets'
                    ? 'manufacturer + bullet_name + weight_grains + diameter_inch'
                    : 'manufacturer + model + reticle_name + turret_unit'}
                  <br/>Existing records will only have <strong>blank fields</strong> filled in — user data is never overwritten.
                </p>
              </div>
              <button onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Download className="w-4 h-4" /> Download CSV template for {localTab}
              </button>
              <label className="block border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-semibold mb-1">Choose CSV or JSON file</p>
                <p className="text-xs text-muted-foreground">Any calibre, any manufacturer</p>
                <input type="file" accept=".csv,.json" className="hidden"
                  onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
              </label>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{rawRecords.length} records to import</p>
                <button onClick={() => { setStep('upload'); setRawRecords([]); setErrors([]); }}
                  className="text-xs text-muted-foreground hover:underline">← Change file</button>
              </div>
              {errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-1">
                  {errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
                </div>
              )}
              <div className="max-h-64 overflow-y-auto border border-border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      {localTab === 'bullets' ? (
                        <>
                          <th className="px-3 py-2 text-left">Manufacturer</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Caliber</th>
                          <th className="px-3 py-2 text-left">Weight</th>
                          <th className="px-3 py-2 text-left">G1 BC</th>
                          <th className="px-3 py-2 text-left">Confidence</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 text-left">Manufacturer</th>
                          <th className="px-3 py-2 text-left">Model</th>
                          <th className="px-3 py-2 text-left">Mag</th>
                          <th className="px-3 py-2 text-left">Turret</th>
                          <th className="px-3 py-2 text-left">Click</th>
                          <th className="px-3 py-2 text-left">Confidence</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRecords.slice(0, 100).map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-secondary/20'}>
                        {localTab === 'bullets' ? (
                          <>
                            <td className="px-3 py-1.5">{r.manufacturer}</td>
                            <td className="px-3 py-1.5">{r.bullet_name}</td>
                            <td className="px-3 py-1.5">{r.caliber}</td>
                            <td className="px-3 py-1.5">{r.weight_grains}gr</td>
                            <td className="px-3 py-1.5">{r.ballistic_coefficient_g1 || '—'}</td>
                            <td className="px-3 py-1.5">{r.data_confidence || '—'}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-1.5">{r.manufacturer}</td>
                            <td className="px-3 py-1.5">{r.model}</td>
                            <td className="px-3 py-1.5">{r.magnification_min}–{r.magnification_max}x</td>
                            <td className="px-3 py-1.5">{r.turret_unit}</td>
                            <td className="px-3 py-1.5">{r.click_value}</td>
                            <td className="px-3 py-1.5">{r.data_confidence || '—'}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rawRecords.length > 100 && <p className="text-center text-xs text-muted-foreground py-2">…and {rawRecords.length - 100} more rows</p>}
              </div>
              <button onClick={handleImport}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Import {rawRecords.length} Records
              </button>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold">Importing records…</p>
              <p className="text-xs text-muted-foreground">Checking for duplicates and updating existing records</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-6 gap-3">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="font-bold text-lg">Import Complete</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Created', value: result.created, color: 'text-green-600' },
                  { label: 'Updated', value: result.updated, color: 'text-blue-600' },
                  { label: 'Skipped (no changes)', value: result.skipped, color: 'text-muted-foreground' },
                  { label: 'Failed', value: result.failed, color: 'text-destructive' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-secondary rounded-xl p-4 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
              <button onClick={onDone} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}