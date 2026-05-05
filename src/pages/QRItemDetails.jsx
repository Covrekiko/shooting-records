import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Droplet, Package, Shield, Target } from 'lucide-react';

const card = 'bg-card border border-border rounded-2xl p-5 shadow-sm';

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="py-2 border-b border-border last:border-0">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export default function QRItemDetails() {
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [reloadSession, setReloadSession] = useState(null);
  const [loadTest, setLoadTest] = useState(null);
  const [loadResult, setLoadResult] = useState(null);
  const [error, setError] = useState('');
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  const id = params.get('id');

  useEffect(() => {
    loadItem();
  }, []);

  const loadItem = async () => {
    if (!type || !id) {
      setError('Missing QR item details.');
      setLoading(false);
      return;
    }

    const entityMap = {
      rifle: 'Rifle',
      shotgun: 'Shotgun',
      ammunition: 'Ammunition',
      reload_batch: 'ReloadingSession',
      load_variant: 'ReloadingTestVariant',
    };
    const entityName = entityMap[type];
    if (!entityName) {
      setError('This QR item type is not supported.');
      setLoading(false);
      return;
    }

    const records = await base44.entities[entityName].filter({ id });
    const found = records?.[0];
    if (!found) {
      setError('Item not found or you do not have access to it.');
      setLoading(false);
      return;
    }

    setItem(found);

    if (type === 'rifle' || type === 'shotgun') {
      const cleaning = await base44.entities.CleaningHistory.filter({ firearm_id: id, firearm_type: type }, '-cleaning_date');
      setHistory(cleaning || []);
    }

    if (type === 'ammunition' && (found.reload_session_id || found.source_id)) {
      const reloadId = found.reload_session_id || found.source_id;
      const sessions = await base44.entities.ReloadingSession.filter({ id: reloadId });
      setReloadSession(sessions?.[0] || null);
    }

    if (type === 'reload_batch') {
      setReloadSession(found);
    }

    if (type === 'load_variant') {
      const [tests, results] = await Promise.all([
        found.test_id ? base44.entities.ReloadingTest.filter({ id: found.test_id }) : Promise.resolve([]),
        base44.entities.ReloadingTestResult.filter({ variant_id: found.id }),
      ]);
      setLoadTest(tests?.[0] || null);
      setLoadResult(results?.[0] || null);
    }

    setLoading(false);
  };

  const title = item?.name || item?.brand || item?.batch_number || item?.label || 'QR Item';
  const isFirearm = type === 'rifle' || type === 'shotgun';
  const isReloadBatch = type === 'reload_batch';
  const isLoadVariant = type === 'load_variant';
  const totalCount = type === 'rifle' ? item?.total_rounds_fired : item?.total_cartridges_fired;
  const lastCleanCount = type === 'rifle' ? item?.rounds_at_last_cleaning : item?.cartridges_at_last_cleaning;
  const sinceClean = Math.max(0, (totalCount || 0) - (lastCleanCount || 0));
  const threshold = item?.cleaning_reminder_threshold || 100;

  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-8 mobile-page-padding space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : error ? (
          <div className={card}>
            <AlertCircle className="w-8 h-8 text-destructive mb-3" />
            <h1 className="text-xl font-bold">QR item unavailable</h1>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        ) : (
          <>
            <div className={card}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  {isFirearm ? <Shield className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{type}</p>
                  <h1 className="text-2xl font-bold">{title}</h1>
                  {type === 'ammunition' && <p className="text-sm text-muted-foreground">{item.caliber} {item.bullet_type} {item.grain && `${item.grain}gr`}</p>}
                  {isReloadBatch && <p className="text-sm text-muted-foreground">{item.caliber} · {item.rounds_loaded || 0} rounds</p>}
                  {isLoadVariant && <p className="text-sm text-muted-foreground">{loadTest?.name || 'Load development'} · {item.powder_charge_grains ? `${item.powder_charge_grains}gr` : ''}</p>}
                  {isFirearm && <p className="text-sm text-muted-foreground">{item.make} {item.model}</p>}
                </div>
              </div>
            </div>

            <div className={card}>
              <h2 className="font-bold mb-3">Item details</h2>
              {isFirearm ? (
                <>
                  <Field label="Caliber / Gauge" value={item.caliber || item.gauge} />
                  <Field label="Serial number" value={item.serial_number} />
                  <Field label="Total fired" value={`${totalCount || 0} ${type === 'rifle' ? 'rounds' : 'cartridges'}`} />
                  <Field label="Cleaning reminder" value={`Every ${threshold} ${type === 'rifle' ? 'rounds' : 'cartridges'}`} />
                  <Field label="Last cleaned" value={item.last_cleaning_date ? format(new Date(item.last_cleaning_date), 'MMM d, yyyy') : 'Not recorded'} />
                  <Field label="Notes" value={item.notes} />
                </>
              ) : isReloadBatch ? (
                <>
                  <Field label="Batch number" value={item.batch_number} />
                  <Field label="Caliber" value={item.caliber} />
                  <Field label="Reloaded date" value={item.date ? format(new Date(item.date), 'MMM d, yyyy') : ''} />
                  <Field label="Rounds loaded" value={item.rounds_loaded} />
                  <Field label="Cost per round" value={item.cost_per_round ? `£${Number(item.cost_per_round).toFixed(2)}` : ''} />
                  <Field label="Total cost" value={item.total_cost ? `£${Number(item.total_cost).toFixed(2)}` : ''} />
                  <Field label="Brass use" value={item.brass_use_type} />
                  <Field label="Brass cycle" value={item.brass_reload_cycle_count} />
                  <Field label="Notes" value={item.notes} />
                </>
              ) : isLoadVariant ? (
                <>
                  <Field label="Test" value={loadTest?.name} />
                  <Field label="Caliber" value={loadTest?.caliber} />
                  <Field label="Rifle" value={loadTest?.rifle_name} />
                  <Field label="Variant" value={item.label} />
                  <Field label="Powder" value={item.powder_name || loadTest?.powder_name} />
                  <Field label="Powder charge" value={item.powder_charge_grains ? `${item.powder_charge_grains} gr` : ''} />
                  <Field label="Bullet" value={[item.bullet_brand || loadTest?.bullet_brand, loadTest?.bullet_model, loadTest?.bullet_weight].filter(Boolean).join(' ')} />
                  <Field label="Primer" value={[item.primer_brand || loadTest?.primer_brand, loadTest?.primer_model].filter(Boolean).join(' ')} />
                  <Field label="Case / brass" value={item.brass_brand || loadTest?.brass_brand} />
                  <Field label="Round count" value={item.round_count} />
                  <Field label="OAL / COAL" value={item.coal_oal} />
                  <Field label="CBTO" value={item.cbto} />
                  <Field label="Seating depth" value={item.seating_depth} />
                  <Field label="Bullet jump" value={item.bullet_jump} />
                  <Field label="Neck tension" value={item.neck_tension} />
                  <Field label="Case trim" value={item.case_trim_length} />
                  <Field label="Annealed" value={item.annealed ? 'Yes' : ''} />
                  <Field label="Case prep notes" value={item.case_prep_notes} />
                  <Field label="Notes" value={item.notes} />
                </>
              ) : (
                <>
                  <Field label="Brand" value={item.brand} />
                  <Field label="Caliber" value={item.caliber} />
                  <Field label="Bullet" value={[item.bullet_type, item.grain && `${item.grain}gr`].filter(Boolean).join(' · ')} />
                  <Field label="Stock" value={`${item.quantity_in_stock || 0} rounds`} />
                  <Field label="Lot / batch" value={item.lot_number || item.batch_number} />
                  <Field label="Supplier" value={item.supplier} />
                  <Field label="Cost" value={item.cost_per_unit ? `£${Number(item.cost_per_unit).toFixed(2)} per round` : ''} />
                  <Field label="Notes" value={item.notes} />
                </>
              )}
            </div>

            {isFirearm && (
              <div className={card}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="font-bold flex items-center gap-2"><Droplet className="w-4 h-4 text-primary" /> Maintenance history</h2>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${sinceClean >= threshold ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    {sinceClean}/{threshold} since clean
                  </span>
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cleaning history recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => (
                      <div key={entry.id} className="rounded-xl bg-secondary/40 p-3">
                        <p className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {format(new Date(entry.cleaning_date), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground mt-1">{entry.maintenance_summary || entry.notes || 'Cleaning recorded'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isLoadVariant && loadResult?.tested && (
              <div className={card}>
                <h2 className="font-bold flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-primary" /> Test result</h2>
                <Field label="Tested date" value={loadResult.test_date ? format(new Date(loadResult.test_date), 'MMM d, yyyy') : ''} />
                <Field label="Average velocity" value={loadResult.avg_velocity ? `${loadResult.avg_velocity} fps` : ''} />
                <Field label="ES" value={loadResult.es} />
                <Field label="SD" value={loadResult.sd} />
                <Field label="Group size" value={loadResult.group_size_moa ? `${loadResult.group_size_moa} MOA` : ''} />
                <Field label="Distance" value={loadResult.distance_yards ? `${loadResult.distance_yards} yd` : ''} />
                <Field label="Pressure signs" value={loadResult.pressure_signs_notes} />
                <Field label="Accuracy notes" value={loadResult.accuracy_notes} />
                <Field label="Final comments" value={loadResult.final_comments} />
              </div>
            )}

            {(type === 'ammunition' || type === 'reload_batch') && reloadSession && (
              <div className={card}>
                <h2 className="font-bold flex items-center gap-2 mb-3"><Target className="w-4 h-4 text-primary" /> Reloading specifications</h2>
                <Field label="Batch number" value={reloadSession.batch_number} />
                <Field label="Date loaded" value={reloadSession.date ? format(new Date(reloadSession.date), 'MMM d, yyyy') : ''} />
                <Field label="Rounds loaded" value={reloadSession.rounds_loaded} />
                <Field label="Cost per round" value={reloadSession.cost_per_round ? `£${Number(reloadSession.cost_per_round).toFixed(2)}` : ''} />
                {reloadSession.components?.length > 0 && (
                  <div className="pt-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Components</p>
                    <div className="space-y-2">
                      {reloadSession.components.map((component, index) => (
                        <div key={index} className="rounded-xl bg-secondary/40 p-3 text-sm space-y-1">
                          <p className="font-semibold capitalize">{component.type}</p>
                          <p className="text-muted-foreground text-xs">{[component.brand, component.name, component.quantity_used && `${component.quantity_used} ${component.unit || ''}`].filter(Boolean).join(' · ')}</p>
                          <p className="text-muted-foreground text-xs">{[component.lot_number && `Lot ${component.lot_number}`, component.cost_per_unit && `£${Number(component.cost_per_unit).toFixed(4)}/unit`, component.total_cost && `£${Number(component.total_cost).toFixed(2)} total`].filter(Boolean).join(' · ')}</p>
                          {(component.brass_use_type || component.brass_reload_cycle_count || component.brass_new_quantity_used || component.brass_used_quantity_used) && (
                            <p className="text-muted-foreground text-xs">{[component.brass_use_type && `Brass: ${component.brass_use_type}`, component.brass_reload_cycle_count && `Cycle ${component.brass_reload_cycle_count}`, component.brass_new_quantity_used && `${component.brass_new_quantity_used} new`, component.brass_used_quantity_used && `${component.brass_used_quantity_used} used`].filter(Boolean).join(' · ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}