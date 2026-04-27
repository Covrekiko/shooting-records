import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Search, Upload, Download, Trash2, Edit2, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import BulletForm from '@/components/reference/BulletForm';
import ScopeForm from '@/components/reference/ScopeForm';
import ReferenceImporter from '@/components/reference/ReferenceImporter';

const TABS = ['bullets', 'scopes'];

export default function ReferenceDatabase() {
  const [tab, setTab] = useState('bullets');
  const [bullets, setBullets] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showImporter, setShowImporter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [b, s] = await Promise.all([
      base44.entities.BulletReference.list('-created_date', 500),
      base44.entities.ScopeReference.list('-created_date', 500),
    ]);
    setBullets(b);
    setScopes(s);
    setLoading(false);
  };

  const handleDelete = async (entity, id) => {
    if (!confirm('Delete this record?')) return;
    if (entity === 'bullet') {
      await base44.entities.BulletReference.delete(id);
      setBullets(prev => prev.filter(b => b.id !== id));
    } else {
      await base44.entities.ScopeReference.delete(id);
      setScopes(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditItem(null);
    loadAll();
  };

  // Bullet filters
  const bulletManufacturers = [...new Set(bullets.map(b => b.manufacturer).filter(Boolean))].sort();
  const bulletCalibers = [...new Set(bullets.map(b => b.caliber).filter(Boolean))].sort();

  const filteredBullets = bullets.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || [b.manufacturer, b.bullet_name, b.caliber, b.bullet_type, b.bullet_construction, b.bullet_family]
      .some(v => v?.toLowerCase().includes(q));
    const matchMfr = !filters.manufacturer || b.manufacturer === filters.manufacturer;
    const matchCal = !filters.caliber || b.caliber === filters.caliber;
    const matchType = !filters.bullet_type || b.bullet_type === filters.bullet_type;
    const matchHuntMatch = !filters.hunting_or_match || b.hunting_or_match === filters.hunting_or_match;
    const matchLeadFree = !filters.lead_free || b.lead_free === true;
    const matchG1 = !filters.has_g1 || b.ballistic_coefficient_g1;
    const matchG7 = !filters.has_g7 || b.ballistic_coefficient_g7;
    const matchDia = !filters.diameter || (b.diameter_inch && Math.abs(b.diameter_inch - parseFloat(filters.diameter)) < 0.002);
    return matchSearch && matchMfr && matchCal && matchType && matchHuntMatch && matchLeadFree && matchG1 && matchG7 && matchDia;
  });

  // Scope filters
  const scopeManufacturers = [...new Set(scopes.map(s => s.manufacturer).filter(Boolean))].sort();

  const scopeTubeDiameters = [...new Set(scopes.map(s => s.tube_diameter_mm).filter(Boolean))].sort((a,b) => a-b);

  const filteredScopes = scopes.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || [s.manufacturer, s.model, s.model_family, s.reticle_name, s.turret_unit]
      .some(v => v?.toLowerCase().includes(q));
    const matchMfr = !filters.scope_manufacturer || s.manufacturer === filters.scope_manufacturer;
    const matchTurret = !filters.turret_unit || s.turret_unit === filters.turret_unit;
    const matchFP = !filters.focal_plane || s.focal_plane === filters.focal_plane;
    const matchTube = !filters.tube_diameter_mm || s.tube_diameter_mm === parseFloat(filters.tube_diameter_mm);
    const matchMagMin = !filters.mag_min || s.magnification_max >= parseFloat(filters.mag_min);
    const matchReticle = !filters.reticle || s.reticle_name?.toLowerCase().includes(filters.reticle.toLowerCase());
    return matchSearch && matchMfr && matchTurret && matchFP && matchTube && matchMagMin && matchReticle;
  });

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val || undefined }));

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <main className="max-w-6xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Reference Database</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bullets.length} bullets · {scopes.length} scopes
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowImporter(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary transition-colors">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={() => { setEditItem(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Add {tab === 'bullets' ? 'Bullet' : 'Scope'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-secondary rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); setFilters({}); }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'bullets' ? `🔵 Bullets (${bullets.length})` : `🔭 Scopes (${scopes.length})`}
            </button>
          ))}
        </div>

        {/* Search + Filter bar */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'bullets' ? 'Search manufacturer, caliber, name…' : 'Search manufacturer, model…'}
              className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-colors ${showFilters ? 'border-primary text-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}>
            <Filter className="w-4 h-4" /> Filters
            {Object.keys(filters).length > 0 && <span className="bg-primary text-primary-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">{Object.keys(filters).length}</span>}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {tab === 'bullets' ? (
              <>
                <FilterSelect label="Manufacturer" value={filters.manufacturer} onChange={v => setFilter('manufacturer', v)} options={bulletManufacturers} />
                <FilterSelect label="Caliber" value={filters.caliber} onChange={v => setFilter('caliber', v)} options={bulletCalibers} />
                <FilterSelect label="Type" value={filters.bullet_type} onChange={v => setFilter('bullet_type', v)} options={['Match/Target','Hunting','Varmint','Plinking','Lead-Free','Solid','Rimfire','Slug','Other']} />
                <FilterSelect label="Use" value={filters.hunting_or_match} onChange={v => setFilter('hunting_or_match', v)} options={['Hunting','Match','Both','Varmint','Other']} />
                <FilterSelect label="Diameter (inch)" value={filters.diameter} onChange={v => setFilter('diameter', v)}
                  options={[...new Set(bullets.map(b => b.diameter_inch).filter(Boolean))].sort((a,b)=>a-b).map(d => String(d))} />
                <div className="flex flex-col gap-2 justify-end col-span-2 md:col-span-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!filters.lead_free} onChange={e => setFilter('lead_free', e.target.checked || undefined)} className="w-4 h-4" />
                    Lead-Free only
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!filters.has_g1} onChange={e => setFilter('has_g1', e.target.checked || undefined)} className="w-4 h-4" />
                    Has G1 BC
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={!!filters.has_g7} onChange={e => setFilter('has_g7', e.target.checked || undefined)} className="w-4 h-4" />
                    Has G7 BC
                  </label>
                </div>
                <button onClick={() => setFilters({})} className="text-xs text-destructive hover:underline self-end pb-1">Clear all</button>
              </>
            ) : (
              <>
                <FilterSelect label="Manufacturer" value={filters.scope_manufacturer} onChange={v => setFilter('scope_manufacturer', v)} options={scopeManufacturers} />
                <FilterSelect label="Turret Unit" value={filters.turret_unit} onChange={v => setFilter('turret_unit', v)} options={['MOA','MRAD']} />
                <FilterSelect label="Focal Plane" value={filters.focal_plane} onChange={v => setFilter('focal_plane', v)} options={['FFP','SFP']} />
                <FilterSelect label="Tube Ø (mm)" value={filters.tube_diameter_mm} onChange={v => setFilter('tube_diameter_mm', v)} options={scopeTubeDiameters.map(String)} />
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Min Magnification</label>
                  <input type="number" min="1" max="50" value={filters.mag_min || ''} onChange={e => setFilter('mag_min', e.target.value)}
                    placeholder="e.g. 5" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Reticle contains</label>
                  <input type="text" value={filters.reticle || ''} onChange={e => setFilter('reticle', e.target.value)}
                    placeholder="e.g. MRAD" className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
                </div>
                <button onClick={() => setFilters({})} className="text-xs text-destructive hover:underline self-end pb-1">Clear all</button>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'bullets' ? (
          <BulletTable bullets={filteredBullets} onEdit={b => { setEditItem(b); setShowForm(true); }} onDelete={id => handleDelete('bullet', id)} />
        ) : (
          <ScopeTable scopes={filteredScopes} onEdit={s => { setEditItem(s); setShowForm(true); }} onDelete={id => handleDelete('scope', id)} />
        )}

        {/* Forms */}
        {showForm && tab === 'bullets' && (
          <BulletForm item={editItem} onSaved={handleSaved} onClose={() => { setShowForm(false); setEditItem(null); }} />
        )}
        {showForm && tab === 'scopes' && (
          <ScopeForm item={editItem} onSaved={handleSaved} onClose={() => { setShowForm(false); setEditItem(null); }} />
        )}
        {showImporter && (
          <ReferenceImporter tab={tab} onDone={() => { setShowImporter(false); loadAll(); }} onClose={() => setShowImporter(false)} />
        )}
      </main>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm">
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function BulletTable({ bullets, onEdit, onDelete }) {
  if (bullets.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-4xl mb-3">🔵</p>
      <p className="font-semibold">No bullets found</p>
      <p className="text-sm mt-1">Add bullets manually or import from CSV/JSON</p>
    </div>
  );

  // Sort: manufacturer → bullet_name → weight_grains
  const sorted = [...bullets].sort((a, b) => {
    const mfr = (a.manufacturer || '').localeCompare(b.manufacturer || '');
    if (mfr !== 0) return mfr;
    const name = (a.bullet_name || '').localeCompare(b.bullet_name || '');
    if (name !== 0) return name;
    return (a.weight_grains || 0) - (b.weight_grains || 0);
  });

  // Group by manufacturer
  const groups = [];
  let currentMfr = null;
  sorted.forEach(b => {
    if (b.manufacturer !== currentMfr) {
      currentMfr = b.manufacturer;
      groups.push({ manufacturer: currentMfr, items: [] });
    }
    groups[groups.length - 1].items.push(b);
  });

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.manufacturer} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/50 border-b border-border flex items-center justify-between">
            <span className="font-bold text-sm">{group.manufacturer}</span>
            <span className="text-xs text-muted-foreground">{group.items.length} bullet{group.items.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-border/50">
            {group.items.map(b => (
              <div key={b.id} className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-secondary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{b.bullet_name || '—'}</span>
                    {b.caliber && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{b.caliber}</span>}
                    {b.weight_grains && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{b.weight_grains}gr</span>}
                    {b.bullet_type && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{b.bullet_type}</span>}
                    {b.lead_free && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">Lead-Free</span>}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {b.ballistic_coefficient_g1 && <span>G1: {b.ballistic_coefficient_g1}</span>}
                    {b.ballistic_coefficient_g7 && <span>G7: {b.ballistic_coefficient_g7}</span>}
                    {b.bullet_construction && <span>{b.bullet_construction}</span>}
                    {b.diameter_inch && <span>Ø {b.diameter_inch}"</span>}
                    {b.data_confidence && <span className={`font-semibold ${b.data_confidence === 'High' ? 'text-green-600' : b.data_confidence === 'Low' ? 'text-amber-500' : ''}`}>{b.data_confidence}</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(b)} className="p-2 hover:bg-secondary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDelete(b.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ScopeTable({ scopes, onEdit, onDelete }) {
  if (scopes.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-4xl mb-3">🔭</p>
      <p className="font-semibold">No scopes found</p>
      <p className="text-sm mt-1">Add scopes manually or import from CSV/JSON</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {scopes.map(s => (
        <div key={s.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{s.manufacturer}</span>
              {s.model && <span className="text-sm text-muted-foreground">— {s.model}</span>}
              {s.magnification_min && s.magnification_max && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{s.magnification_min}–{s.magnification_max}x</span>}
              {s.objective_diameter_mm && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{s.objective_diameter_mm}mm obj</span>}
              {s.focal_plane && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s.focal_plane}</span>}
              {s.turret_unit && <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{s.turret_unit}</span>}
            </div>
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {s.click_value && <span>Click: {s.click_value}</span>}
              {s.reticle_name && <span>Reticle: {s.reticle_name}</span>}
              {s.zero_stop && <span className="text-primary font-medium">Zero Stop</span>}
              {s.total_elevation_travel_mrad && <span>↕ {s.total_elevation_travel_mrad} MRAD</span>}
              {s.data_confidence && <span className={`font-semibold ${s.data_confidence === 'High' ? 'text-green-600' : s.data_confidence === 'Low' ? 'text-amber-500' : ''}`}>{s.data_confidence} confidence</span>}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={() => onEdit(s)} className="p-2 hover:bg-secondary rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(s.id)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}