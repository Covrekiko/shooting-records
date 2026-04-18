import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Edit2, Star, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">{title}</h3>
    {children}
  </div>
);

const Field = ({ label, value }) => {
  if (!value && value !== 0 && value !== false) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">{label}</p>
      <p className="text-sm font-medium">{String(value)}</p>
    </div>
  );
};

const StatBadge = ({ label, value }) => (
  <div className="bg-secondary/50 rounded-xl px-3 py-2.5 text-center">
    <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">{label}</p>
    <p className="text-base font-bold">{value ?? '—'}</p>
  </div>
);

const TABS = ['Overview', 'Variants', 'Results'];

export default function TestViewModal({ test, variants, results, onClose, onEdit, onExportPDF }) {
  const [tab, setTab] = useState('Overview');

  const getResult = (variantId) => results.find(r => r.variant_id === variantId);

  const STATUS_COLORS = {
    Draft: 'bg-slate-100 text-slate-600',
    Loaded: 'bg-blue-100 text-blue-700',
    Tested: 'bg-amber-100 text-amber-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Archived: 'bg-slate-200 text-slate-500',
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[60000] flex items-end sm:items-center justify-center">
      <div className="bg-card w-full sm:max-w-2xl h-[95vh] sm:h-[90vh] sm:rounded-2xl rounded-t-3xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h2 className="text-lg font-bold truncate">{test.name}</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[test.status] || STATUS_COLORS.Draft}`}>
                {test.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{test.caliber}{test.rifle_name ? ` · ${test.rifle_name}` : ''}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onExportPDF && (
              <button onClick={onExportPDF} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground hover:text-foreground" title="Export PDF">
                <Download className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-semibold hover:bg-primary/20 flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />Edit
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0 px-5">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {t}
              {t === 'Variants' && variants.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{variants.length}</span>
              )}
              {t === 'Results' && results.filter(r => r.tested).length > 0 && (
                <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{results.filter(r => r.tested).length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── OVERVIEW ── */}
          {tab === 'Overview' && (
            <div className="space-y-5">
              <Section title="Test Info">
                <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Test Name" value={test.name} />
                  <Field label="Test Type" value={test.test_type} />
                  <Field label="Caliber" value={test.caliber} />
                  <Field label="Rifle" value={test.rifle_name} />
                  <Field label="Status" value={test.status} />
                  <Field label="Variants" value={variants.length} />
                  <Field label="Test Date" value={test.test_date ? format(new Date(test.test_date), 'MMM d, yyyy') : null} />
                  <Field label="Range Date" value={test.range_date ? format(new Date(test.range_date), 'MMM d, yyyy') : null} />
                  <Field label="Created" value={test.created_date ? format(new Date(test.created_date), 'MMM d, yyyy') : null} />
                  <Field label="Last Updated" value={test.updated_date ? format(new Date(test.updated_date), 'MMM d, yyyy HH:mm') : null} />
                </div>
              </Section>

              <Section title="Components">
                <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Bullet Brand" value={test.bullet_brand} />
                  <Field label="Bullet Model" value={test.bullet_model} />
                  <Field label="Bullet Weight" value={test.bullet_weight} />
                  <Field label="Brass Brand" value={test.brass_brand} />
                  <Field label="Primer Brand" value={test.primer_brand} />
                  <Field label="Primer Model" value={test.primer_model} />
                  <Field label="Powder" value={test.powder_name} />
                </div>
              </Section>

              {test.notes && (
                <Section title="Notes">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm whitespace-pre-wrap">{test.notes}</p>
                  </div>
                </Section>
              )}

              {/* Quick stats */}
              <Section title="Summary">
                <div className="grid grid-cols-3 gap-3">
                  <StatBadge label="Variants" value={variants.length} />
                  <StatBadge label="Tested" value={results.filter(r => r.tested).length} />
                  <StatBadge label="Total Rounds" value={variants.reduce((s, v) => s + (v.round_count || 0), 0)} />
                </div>
              </Section>
            </div>
          )}

          {/* ── VARIANTS ── */}
          {tab === 'Variants' && (
            <div className="space-y-4">
              {variants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No variants added yet.</div>
              ) : variants.map((v, idx) => {
                const result = getResult(v.id);
                return (
                  <div key={v.id} className={`bg-card border rounded-xl overflow-hidden ${result?.is_best ? 'border-emerald-400 dark:border-emerald-500' : 'border-border'}`}>
                    {/* Card header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-secondary/20 border-b border-border">
                      <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                      <span className="font-semibold text-sm flex-1">{v.label}</span>
                      {result?.is_best && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      {v.stock_deducted && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full">Stock Deducted</span>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Powder */}
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Powder</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                          <Field label="Powder Name" value={v.powder_name} />
                          <Field label="Charge (gr)" value={v.powder_charge_grains} />
                          <Field label="Round Count" value={v.round_count || null} />
                        </div>
                      </div>

                      {/* Components */}
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Components</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                          <Field label="Bullet" value={v.bullet_brand} />
                          <Field label="Brass" value={v.brass_brand} />
                          <Field label="Primer" value={v.primer_brand} />
                        </div>
                      </div>

                      {/* Load Data */}
                      {[v.coal_oal, v.cbto, v.seating_depth, v.bullet_jump, v.neck_tension, v.case_trim_length].some(Boolean) && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Load / Seating Data</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                            <Field label="OAL / COAL" value={v.coal_oal} />
                            <Field label="CBTO" value={v.cbto} />
                            <Field label="Seating Depth" value={v.seating_depth} />
                            <Field label="Bullet Jump" value={v.bullet_jump} />
                            <Field label="Neck Tension" value={v.neck_tension} />
                            <Field label="Case Trim" value={v.case_trim_length} />
                          </div>
                        </div>
                      )}

                      {v.annealed && <p className="text-xs text-blue-600 font-medium">✓ Annealed</p>}
                      {v.case_prep_notes && (
                        <div className="text-xs">
                          <p className="text-muted-foreground font-semibold uppercase text-[10px] mb-0.5">Case Prep Notes</p>
                          <p>{v.case_prep_notes}</p>
                        </div>
                      )}
                      {v.notes && (
                        <div className="text-xs border-t border-border pt-3">
                          <p className="text-muted-foreground font-semibold uppercase text-[10px] mb-0.5">Notes</p>
                          <p>{v.notes}</p>
                        </div>
                      )}

                      {/* Result quick summary */}
                      {result?.tested && (
                        <div className="border-t border-border pt-3">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Result Summary</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {result.avg_velocity && <span className="bg-secondary rounded-md px-2 py-1 font-medium">{result.avg_velocity} fps avg</span>}
                            {result.group_size_moa && <span className="bg-secondary rounded-md px-2 py-1 font-medium">{result.group_size_moa} MOA</span>}
                            {result.es && <span className="bg-secondary rounded-md px-2 py-1 font-medium">ES: {result.es}</span>}
                            {result.sd && <span className="bg-secondary rounded-md px-2 py-1 font-medium">SD: {result.sd}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── RESULTS ── */}
          {tab === 'Results' && (
            <div className="space-y-4">
              {variants.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">No variants added yet.</div>
              ) : variants.map((v, idx) => {
                const result = getResult(v.id);
                return (
                  <div key={v.id} className={`bg-card border rounded-xl overflow-hidden ${result?.is_best ? 'border-emerald-400 dark:border-emerald-500' : 'border-border'}`}>
                    {/* Card header */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-secondary/20 border-b border-border">
                      <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                      <span className="font-semibold text-sm flex-1">{v.label}</span>
                      {result?.is_best && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />Best
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${result?.tested ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {result?.tested ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {result?.tested ? 'Tested' : 'Not Tested'}
                      </span>
                    </div>

                    {result?.tested ? (
                      <div className="p-4 space-y-4">
                        {/* Key metrics */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ['Avg Vel.', result.avg_velocity ? `${result.avg_velocity} fps` : '—'],
                            ['ES', result.es ?? '—'],
                            ['SD', result.sd ?? '—'],
                            ['Group MOA', result.group_size_moa ?? '—'],
                            ['Group mm', result.group_size_mm ?? '—'],
                            ['Distance', result.distance_yards ? `${result.distance_yards} yd` : '—'],
                          ].map(([label, value]) => (
                            <div key={label} className="bg-secondary/40 rounded-xl px-2.5 py-2.5 text-center">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">{label}</p>
                              <p className="text-sm font-bold">{value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Velocity readings */}
                        {[result.velocity_1, result.velocity_2, result.velocity_3, result.velocity_4, result.velocity_5].some(Boolean) && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Chronograph Readings</p>
                            <div className="flex gap-2 flex-wrap">
                              {[result.velocity_1, result.velocity_2, result.velocity_3, result.velocity_4, result.velocity_5].map((vel, i) =>
                                vel ? <span key={i} className="text-xs bg-secondary rounded-lg px-3 py-1.5 font-semibold">V{i + 1}: {vel} fps</span> : null
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {[
                          ['Pressure Signs', result.pressure_signs_notes],
                          ['Recoil Notes', result.recoil_notes],
                          ['Accuracy Notes', result.accuracy_notes],
                          ['Feeding / Chambering', result.feeding_notes],
                          ['Final Comments', result.final_comments],
                        ].filter(([, val]) => val).length > 0 && (
                          <div className="space-y-2.5 border-t border-border pt-3">
                            {[
                              ['Pressure Signs', result.pressure_signs_notes],
                              ['Recoil Notes', result.recoil_notes],
                              ['Accuracy Notes', result.accuracy_notes],
                              ['Feeding / Chambering', result.feeding_notes],
                              ['Final Comments', result.final_comments],
                            ].filter(([, val]) => val).map(([label, value]) => (
                              <div key={label}>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">{label}</p>
                                <p className="text-sm">{value}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {result.test_date && (
                          <p className="text-xs text-muted-foreground border-t border-border pt-2">
                            Tested: {format(new Date(result.test_date), 'MMM d, yyyy')}
                          </p>
                        )}

                        {/* Photos */}
                        {result.photos?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Range Photos</p>
                            <div className="flex gap-2 flex-wrap">
                              {result.photos.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                  <img src={url} alt={`Target ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-border hover:opacity-80 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-center text-sm text-muted-foreground italic">
                        No results recorded for this variant.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-between items-center flex-shrink-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary">
            Close
          </button>
          <div className="flex gap-2">
            {onExportPDF && (
              <button onClick={onExportPDF} className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />PDF
              </button>
            )}
            {onEdit && (
              <button onClick={onEdit} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}