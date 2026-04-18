import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { ArrowLeft, Plus, Download, Star, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';
import VariantFormModal from './VariantFormModal';
import ResultFormModal from './ResultFormModal';
import { generateLoadTestPDF } from '@/utils/loadTestPDF';

const STATUS_COLORS = {
  Draft: 'bg-slate-100 text-slate-600',
  Loaded: 'bg-blue-100 text-blue-700',
  Tested: 'bg-amber-100 text-amber-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Archived: 'bg-slate-200 text-slate-500',
};

const STATUSES = ['Draft', 'Loaded', 'Tested', 'Completed', 'Archived'];

export default function TestDetailPage({ test, onBack, onUpdated }) {
  const [variants, setVariants] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultVariant, setResultVariant] = useState(null);
  const [editingResult, setEditingResult] = useState(null);
  const [editingTest, setEditingTest] = useState(false);
  const [testForm, setTestForm] = useState({ ...test });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, [test.id]);

  const loadData = async () => {
    try {
      const [vs, rs] = await Promise.all([
        base44.entities.ReloadingTestVariant.filter({ test_id: test.id }),
        base44.entities.ReloadingTestResult.filter({ test_id: test.id }),
      ]);
      setVariants(vs);
      setResults(rs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getResultForVariant = (variantId) => results.find(r => r.variant_id === variantId);

  const handleDeleteVariant = async (v) => {
    if (!confirm(`Delete variant "${v.label}"? Stock will be restored.`)) return;
    try {
      // Restore stock if deducted
      if (v.stock_deducted) {
        const user = await base44.auth.me();
        const restoreStock = async (componentId, qty, isPowder, chargeGrains) => {
          if (!componentId) return;
          const comp = await base44.entities.ReloadingComponent.filter({ created_by: user.email })
            .then(list => list.find(c => c.id === componentId));
          if (!comp) return;
          if (isPowder) {
            const gramsPerGrain = 0.06479891;
            const usedGrams = chargeGrains * qty * gramsPerGrain;
            await base44.entities.ReloadingComponent.update(componentId, {
              quantity_remaining: comp.quantity_remaining + usedGrams,
            });
          } else {
            await base44.entities.ReloadingComponent.update(componentId, {
              quantity_remaining: comp.quantity_remaining + qty,
            });
          }
        };
        await Promise.all([
          restoreStock(v.bullet_component_id, v.bullet_quantity_used || 0, false),
          restoreStock(v.primer_component_id, v.primer_quantity_used || 0, false),
          restoreStock(v.brass_component_id, v.brass_quantity_used || 0, false),
          restoreStock(v.powder_component_id, v.round_count || 0, true, v.powder_charge_grains || 0),
        ]);
      }
      // Delete result if exists
      const res = getResultForVariant(v.id);
      if (res) await base44.entities.ReloadingTestResult.delete(res.id);
      await base44.entities.ReloadingTestVariant.delete(v.id);
      // Update variant count
      await base44.entities.ReloadingTest.update(test.id, { variant_count: Math.max(0, variants.length - 1) });
      loadData();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const handleSaveTest = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.ReloadingTest.update(test.id, testForm);
      onUpdated({ ...test, ...testForm });
      setEditingTest(false);
    } catch (e) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleExportPDF = () => {
    const doc = generateLoadTestPDF(test, variants, results);
    doc.save(`load-test-${test.name.replace(/\s+/g, '-')}.pdf`);
  };

  const handleStatusChange = async (status) => {
    try {
      await base44.entities.ReloadingTest.update(test.id, { status });
      onUpdated({ ...test, status });
    } catch (e) { alert('Error: ' + e.message); }
  };

  const tabs = ['overview', 'variants', 'results', 'export'];

  return (
    <div>
      <Navigation />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{test.name}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[test.status] || STATUS_COLORS.Draft}`}>
                {test.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{test.caliber}{test.rifle_name ? ` · ${test.rifle_name}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={test.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="text-xs px-2 py-1.5 bg-card border border-border rounded-lg focus:outline-none hidden sm:block"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleExportPDF} className="p-2 hover:bg-primary/10 text-primary rounded-xl" title="Export PDF">
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 capitalize whitespace-nowrap transition-colors ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {tab === 'export' ? 'PDF / Export' : tab}
              {tab === 'variants' && variants.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{variants.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Test Details</h2>
              <button onClick={() => setEditingTest(!editingTest)} className="text-xs text-primary font-semibold flex items-center gap-1">
                <Edit2 className="w-3 h-3" />{editingTest ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editingTest ? (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                {[
                  ['name', 'Test Name'],
                  ['caliber', 'Caliber'],
                  ['rifle_name', 'Rifle Name'],
                  ['bullet_brand', 'Bullet Brand'],
                  ['bullet_model', 'Bullet Model'],
                  ['bullet_weight', 'Bullet Weight'],
                  ['brass_brand', 'Brass Brand'],
                  ['primer_brand', 'Primer Brand'],
                  ['primer_model', 'Primer Model'],
                  ['powder_name', 'Powder Name'],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">{label}</label>
                    <input value={testForm[k] || ''} onChange={e => setTestForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Notes</label>
                  <textarea value={testForm.notes || ''} onChange={e => setTestForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none resize-none" />
                </div>
                <button onClick={handleSaveTest} disabled={saving}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {[
                  ['Test Type', test.test_type],
                  ['Caliber', test.caliber],
                  ['Rifle', test.rifle_name],
                  ['Bullet', [test.bullet_brand, test.bullet_model, test.bullet_weight].filter(Boolean).join(' ')],
                  ['Brass', test.brass_brand],
                  ['Primer', [test.primer_brand, test.primer_model].filter(Boolean).join(' ')],
                  ['Powder', test.powder_name],
                  ['Test Date', test.test_date ? format(new Date(test.test_date), 'MMM d, yyyy') : null],
                  ['Range Date', test.range_date ? format(new Date(test.range_date), 'MMM d, yyyy') : null],
                  ['Variants', `${variants.length}`],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p>
                    <p className="text-sm font-medium mt-0.5">{value}</p>
                  </div>
                ))}
                {test.notes && (
                  <div className="col-span-2 mt-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">Notes</p>
                    <p className="text-sm mt-0.5">{test.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Quick stats */}
            {variants.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{variants.length}</p>
                  <p className="text-xs text-muted-foreground">Variants</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{results.filter(r => r.tested).length}</p>
                  <p className="text-xs text-muted-foreground">Tested</p>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{variants.reduce((s, v) => s + (v.round_count || 0), 0)}</p>
                  <p className="text-xs text-muted-foreground">Total Rounds</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Variants Tab */}
        {activeTab === 'variants' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Test Variants</h2>
              <button onClick={() => { setEditingVariant(null); setShowVariantForm(true); }}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />Add Variant
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground mb-3">No variants yet. Add your first test variant.</p>
                <button onClick={() => { setEditingVariant(null); setShowVariantForm(true); }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
                  Add Variant
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {variants.map((v, idx) => {
                  const result = getResultForVariant(v.id);
                  return (
                    <div key={v.id} className={`bg-card border rounded-xl p-4 ${result?.is_best ? 'border-emerald-400 dark:border-emerald-500' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                            <span className="font-semibold text-sm">{v.label}</span>
                            {result?.is_best && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            {v.stock_deducted && (
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Stock Deducted</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {v.powder_name && <p>Powder: {v.powder_name} {v.powder_charge_grains ? `— ${v.powder_charge_grains}gr` : ''}</p>}
                            {v.round_count > 0 && <p>Rounds: {v.round_count}</p>}
                            {v.coal_oal && <p>OAL: {v.coal_oal}</p>}
                            {v.seating_depth && <p>Seating Depth: {v.seating_depth}</p>}
                            {v.notes && <p className="mt-1 italic">{v.notes}</p>}
                          </div>
                          {result?.tested && (
                            <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                              <span className="text-emerald-600 font-medium">Tested</span>
                              {result.avg_velocity && <span> · {result.avg_velocity} fps avg</span>}
                              {result.group_size_moa && <span> · {result.group_size_moa} MOA</span>}
                              {result.es && <span> · ES: {result.es}</span>}
                              {result.sd && <span> · SD: {result.sd}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setResultVariant(v); setEditingResult(result || null); setShowResultForm(true); }}
                            className="p-2 hover:bg-primary/10 text-primary rounded-lg" title="Add/Edit Results">
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setEditingVariant(v); setShowVariantForm(true); }}
                            className="p-2 hover:bg-secondary rounded-lg" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteVariant(v)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <h2 className="font-semibold">Test Results</h2>
            {variants.length === 0 ? (
              <p className="text-muted-foreground text-sm">Add variants first, then record results.</p>
            ) : (
              <div className="space-y-3">
                {variants.map((v, idx) => {
                  const result = getResultForVariant(v.id);
                  return (
                    <div key={v.id} className={`bg-card border rounded-xl p-4 ${result?.is_best ? 'border-emerald-400' : 'border-border'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{v.label}</span>
                            {result?.is_best && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                          </div>
                          {v.powder_name && <p className="text-xs text-muted-foreground">{v.powder_name} {v.powder_charge_grains ? `${v.powder_charge_grains}gr` : ''}</p>}
                        </div>
                        <button onClick={() => { setResultVariant(v); setEditingResult(result || null); setShowResultForm(true); }}
                          className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20">
                          {result ? 'Edit Results' : 'Add Results'}
                        </button>
                      </div>
                      {result?.tested ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                          {[
                            ['Avg Velocity', result.avg_velocity ? `${result.avg_velocity} fps` : null],
                            ['ES', result.es],
                            ['SD', result.sd],
                            ['Group Size', result.group_size_moa ? `${result.group_size_moa} MOA` : (result.group_size_mm ? `${result.group_size_mm}mm` : null)],
                            ['Distance', result.distance_yards ? `${result.distance_yards} yds` : null],
                            ['Test Date', result.test_date ? format(new Date(result.test_date), 'MMM d, yyyy') : null],
                          ].filter(([, v]) => v).map(([label, value]) => (
                            <div key={label}>
                              <p className="text-muted-foreground">{label}</p>
                              <p className="font-semibold">{value}</p>
                            </div>
                          ))}
                          {result.accuracy_notes && (
                            <div className="col-span-2 sm:col-span-4">
                              <p className="text-muted-foreground">Accuracy Notes</p>
                              <p>{result.accuracy_notes}</p>
                            </div>
                          )}
                          {result.final_comments && (
                            <div className="col-span-2 sm:col-span-4">
                              <p className="text-muted-foreground">Comments</p>
                              <p>{result.final_comments}</p>
                            </div>
                          )}
                          {result.photos && result.photos.length > 0 && (
                            <div className="col-span-2 sm:col-span-4">
                              <p className="text-muted-foreground mb-1">Range Photos</p>
                              <div className="flex gap-2 flex-wrap">
                                {result.photos.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                    <img src={url} alt={`Target ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No results recorded yet</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <h2 className="font-semibold">PDF Export</h2>
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Export a full load development report including:</p>
                <ul className="list-disc list-inside space-y-0.5 mt-2">
                  <li>Test overview and details</li>
                  <li>All {variants.length} variant(s) with full component data</li>
                  <li>Results for each variant (velocity, ES, SD, group size)</li>
                  <li>Best variant highlighted</li>
                  <li>Final notes and comments</li>
                </ul>
              </div>
              <button onClick={handleExportPDF}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90">
                <Download className="w-4 h-4" />
                Export PDF Report
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Audit Info</p>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>Created: {test.created_date ? format(new Date(test.created_date), 'MMM d, yyyy HH:mm') : 'N/A'}</p>
                <p>Last Updated: {test.updated_date ? format(new Date(test.updated_date), 'MMM d, yyyy HH:mm') : 'N/A'}</p>
                <p>Status: {test.status}</p>
                <p>Variants: {variants.length}</p>
                <p>Results Recorded: {results.filter(r => r.tested).length}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {showVariantForm && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[50000] flex items-end sm:items-center justify-center">
          <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <VariantFormModal
              test={test}
              variant={editingVariant}
              variantCount={variants.length}
              onClose={() => { setShowVariantForm(false); setEditingVariant(null); }}
              onSaved={() => {
                setShowVariantForm(false);
                setEditingVariant(null);
                loadData();
              }}
            />
          </div>
        </div>,
        document.body
      )}

      {showResultForm && resultVariant && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[50000] flex items-end sm:items-center justify-center">
          <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <ResultFormModal
              test={test}
              variant={resultVariant}
              result={editingResult}
              onClose={() => { setShowResultForm(false); setResultVariant(null); setEditingResult(null); }}
              onSaved={() => {
                setShowResultForm(false);
                setResultVariant(null);
                setEditingResult(null);
                loadData();
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}