import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { ArrowLeft, Plus, Download, Star, Trash2, Edit2, ChevronDown, ChevronUp, Eye, EyeOff, BookOpen } from 'lucide-react';
import TestViewModal from './TestViewModal';
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
  const [expandedVariants, setExpandedVariants] = useState({});
  const [expandedResults, setExpandedResults] = useState({});
  const [showViewModal, setShowViewModal] = useState(false);

  const toggleVariant = (id) => setExpandedVariants(p => ({ ...p, [id]: !p[id] }));
  const toggleResult = (id) => setExpandedResults(p => ({ ...p, [id]: !p[id] }));

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
            <button onClick={() => setShowViewModal(true)} className="p-2 hover:bg-primary/10 text-primary rounded-xl" title="View Summary">
              <BookOpen className="w-4 h-4" />
            </button>
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
                  const isExpanded = expandedVariants[v.id];
                  return (
                    <div key={v.id} className={`bg-card border rounded-xl overflow-hidden ${result?.is_best ? 'border-emerald-400 dark:border-emerald-500' : 'border-border'}`}>
                      {/* Header row */}
                      <div className="flex items-center justify-between px-4 py-3 bg-secondary/20">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground font-medium flex-shrink-0">#{idx + 1}</span>
                          <span className="font-semibold text-sm truncate">{v.label}</span>
                          {result?.is_best && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                          {v.stock_deducted && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full flex-shrink-0 hidden sm:inline">Stock Deducted</span>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => toggleVariant(v.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`} title={isExpanded ? 'Collapse' : 'View Details'}>
                            {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => { setResultVariant(v); setEditingResult(result || null); setShowResultForm(true); }}
                            className="p-1.5 hover:bg-primary/10 text-primary rounded-lg" title="Add/Edit Results">
                            <Star className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setEditingVariant(v); setShowVariantForm(true); }}
                            className="p-1.5 hover:bg-secondary rounded-lg" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteVariant(v)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Collapsed summary */}
                      {!isExpanded && (
                        <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border">
                          {v.powder_name && <span><span className="font-medium text-foreground">{v.powder_name}</span>{v.powder_charge_grains ? ` · ${v.powder_charge_grains}gr` : ''}</span>}
                          {v.round_count > 0 && <span>{v.round_count} rounds</span>}
                          {v.coal_oal && <span>OAL: {v.coal_oal}</span>}
                          {result?.tested && <span className="text-emerald-600 font-medium">✓ Tested{result.avg_velocity ? ` · ${result.avg_velocity} fps` : ''}{result.group_size_moa ? ` · ${result.group_size_moa} MOA` : ''}</span>}
                        </div>
                      )}

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="p-4 space-y-3 border-t border-border">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                            {[
                              ['Powder', v.powder_name],
                              ['Charge', v.powder_charge_grains ? `${v.powder_charge_grains} gr` : null],
                              ['Rounds', v.round_count > 0 ? v.round_count : null],
                              ['Bullet', v.bullet_brand],
                              ['Brass', v.brass_brand],
                              ['Primer', v.primer_brand],
                              ['OAL / COAL', v.coal_oal],
                              ['CBTO', v.cbto],
                              ['Seating Depth', v.seating_depth],
                              ['Bullet Jump', v.bullet_jump],
                              ['Neck Tension', v.neck_tension],
                              ['Case Trim', v.case_trim_length],
                            ].filter(([, val]) => val).map(([label, value]) => (
                              <div key={label}>
                                <p className="text-muted-foreground">{label}</p>
                                <p className="font-semibold">{value}</p>
                              </div>
                            ))}
                          </div>
                          {v.annealed && <p className="text-xs text-blue-600 font-medium">✓ Annealed</p>}
                          {v.case_prep_notes && <p className="text-xs text-muted-foreground italic">{v.case_prep_notes}</p>}
                          {v.notes && <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{v.notes}</p>}

                          {result?.tested && (
                            <div className="mt-1 pt-2 border-t border-border">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Result Summary</p>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {result.avg_velocity && <span className="bg-secondary rounded-md px-2 py-1 font-medium">{result.avg_velocity} fps</span>}
                                {result.group_size_moa && <span className="bg-secondary rounded-md px-2 py-1 font-medium">{result.group_size_moa} MOA</span>}
                                {result.es && <span className="bg-secondary rounded-md px-2 py-1 font-medium">ES: {result.es}</span>}
                                {result.sd && <span className="bg-secondary rounded-md px-2 py-1 font-medium">SD: {result.sd}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                  const isExpanded = expandedResults[v.id];
                  return (
                    <div key={v.id} className={`bg-card border rounded-xl overflow-hidden ${result?.is_best ? 'border-emerald-400 dark:border-emerald-500' : 'border-border'}`}>
                      {/* Header */}
                      <div className="flex justify-between items-center px-4 py-3 bg-secondary/20">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">#{idx + 1}</span>
                          <span className="font-semibold text-sm">{v.label}</span>
                          {result?.is_best && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                        </div>
                        <div className="flex items-center gap-1">
                          {result?.tested && (
                            <button onClick={() => toggleResult(v.id)}
                              className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`} title={isExpanded ? 'Collapse' : 'View Results'}>
                              {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button onClick={() => { setResultVariant(v); setEditingResult(result || null); setShowResultForm(true); }}
                            className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 flex items-center gap-1">
                            <Edit2 className="w-3 h-3" />
                            {result?.tested ? 'Edit' : 'Add Results'}
                          </button>
                        </div>
                      </div>

                      {/* Collapsed summary row */}
                      {!isExpanded && result?.tested && (
                        <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs border-t border-border">
                          {result.avg_velocity && <span><span className="text-muted-foreground">Avg Vel:</span> <span className="font-semibold">{result.avg_velocity} fps</span></span>}
                          {result.es && <span><span className="text-muted-foreground">ES:</span> <span className="font-semibold">{result.es}</span></span>}
                          {result.sd && <span><span className="text-muted-foreground">SD:</span> <span className="font-semibold">{result.sd}</span></span>}
                          {result.group_size_moa && <span><span className="text-muted-foreground">Group:</span> <span className="font-semibold">{result.group_size_moa} MOA</span></span>}
                        </div>
                      )}

                      {!isExpanded && !result?.tested && (
                        <div className="px-4 py-2.5 border-t border-border">
                          <p className="text-xs text-muted-foreground italic">No results recorded yet — tap "Add Results".</p>
                        </div>
                      )}

                      {/* Expanded full details */}
                      {isExpanded && result?.tested && (
                        <div className="p-4 border-t border-border space-y-3">
                          {v.powder_name && (
                            <p className="text-xs text-muted-foreground">{v.powder_name}{v.powder_charge_grains ? ` · ${v.powder_charge_grains}gr` : ''}</p>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              ['Avg Vel.', result.avg_velocity ? `${result.avg_velocity} fps` : '—'],
                              ['ES', result.es ?? '—'],
                              ['SD', result.sd ?? '—'],
                              ['Group MOA', result.group_size_moa ?? '—'],
                              ['Group mm', result.group_size_mm ?? '—'],
                              ['Distance', result.distance_yards ? `${result.distance_yards} yd` : '—'],
                            ].map(([label, value]) => (
                              <div key={label} className="bg-secondary/40 rounded-lg px-2.5 py-2 text-center">
                                <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-0.5">{label}</p>
                                <p className="text-sm font-bold">{value}</p>
                              </div>
                            ))}
                          </div>

                          {[result.velocity_1, result.velocity_2, result.velocity_3, result.velocity_4, result.velocity_5].some(Boolean) && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Chronograph Readings</p>
                              <div className="flex gap-1.5 flex-wrap">
                                {[result.velocity_1, result.velocity_2, result.velocity_3, result.velocity_4, result.velocity_5].map((vel, i) => vel ? (
                                  <span key={i} className="text-xs bg-secondary rounded-md px-2 py-1 font-medium">V{i+1}: {vel}</span>
                                ) : null)}
                              </div>
                            </div>
                          )}

                          {[
                            ['Pressure Signs', result.pressure_signs_notes],
                            ['Recoil', result.recoil_notes],
                            ['Accuracy', result.accuracy_notes],
                            ['Feeding', result.feeding_notes],
                            ['Comments', result.final_comments],
                          ].filter(([, val]) => val).map(([label, value]) => (
                            <div key={label}>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</p>
                              <p className="text-sm mt-0.5">{value}</p>
                            </div>
                          ))}

                          {result.test_date && (
                            <p className="text-xs text-muted-foreground">Tested: {format(new Date(result.test_date), 'MMM d, yyyy')}</p>
                          )}

                          {result.photos?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Range Photos</p>
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

      {showViewModal && (
        <TestViewModal
          test={test}
          variants={variants}
          results={results}
          onClose={() => setShowViewModal(false)}
          onEdit={() => { setShowViewModal(false); setActiveTab('overview'); setEditingTest(true); }}
          onExportPDF={handleExportPDF}
        />
      )}

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
          <div className="bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-xl h-[92vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
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