import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * UserAmmoSelector
 * Displays only ammunition the user has added to their own Ammunition Inventory
 * and saved loads from Reloading Records / Load Development.
 * 
 * Does NOT show the global Bullet Reference Database.
 * 
 * Props:
 *   onSelect(ammoData) — called with { id, source, brand, name, caliber, weight_grains, ... }
 *   onClear()
 *   selectedId — currently selected ammo id
 *   filterCaliber — optional caliber to pre-filter
 */
export default function UserAmmoSelector({ onSelect, onClear, selectedId, filterCaliber }) {
  const [ammo, setAmmo] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserAmmo();
  }, []);

  useEffect(() => {
    if (selectedId && ammo.length) {
      const a = ammo.find(a => a.id === selectedId && a.source === (selectedId.startsWith('reload_') ? 'reloading' : 'ammunition'));
      if (a) setSelected(a);
    }
    if (!selectedId) setSelected(null);
  }, [selectedId, ammo]);

  const loadUserAmmo = async () => {
    setLoading(true);
    try {
      // Load user's ammunition inventory
      const ammunition = await base44.entities.Ammunition.list('-updated_date', 500);
      const ammoList = ammunition.map(a => ({
        id: a.id,
        source: 'ammunition',
        brand: a.brand || '',
        name: a.bullet_type ? `${a.brand} ${a.bullet_type}` : a.brand,
        caliber: a.caliber || '',
        weight_grains: a.grain ? parseInt(a.grain) : null,
        bullet_type: a.bullet_type || '',
        cost_per_unit: a.cost_per_unit,
        quantity_in_stock: a.quantity_in_stock,
      }));

      // Load user's reloading records with saved loads
      const reloading = await base44.entities.ReloadingSession.list('-updated_date', 500);
      const reloadList = reloading
        .filter(r => r.rounds_loaded > 0)
        .map((r, idx) => ({
          id: `reload_${r.id}`,
          source: 'reloading',
          brand: 'Handload',
          name: `${r.caliber} Load ${idx + 1}`,
          caliber: r.caliber || '',
          weight_grains: null,
          batch_number: r.batch_number,
          rounds_loaded: r.rounds_loaded,
        }));

      const combined = [...ammoList, ...reloadList].sort((a, b) => {
        const cal = (a.caliber || '').localeCompare(b.caliber || '');
        if (cal !== 0) return cal;
        return (a.brand || '').localeCompare(b.brand || '');
      });

      setAmmo(combined);
      setFiltered(combined);
    } catch (e) {
      console.error('Failed to load user ammo:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    let list = ammo;
    if (filterCaliber) {
      list = list.filter(a =>
        a.caliber?.toLowerCase().includes(filterCaliber.toLowerCase()) ||
        filterCaliber.toLowerCase().includes(a.caliber?.toLowerCase() || '')
      );
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a =>
        a.brand?.toLowerCase().includes(q) ||
        a.name?.toLowerCase().includes(q) ||
        a.caliber?.toLowerCase().includes(q) ||
        String(a.weight_grains || '').includes(q)
      );
    }
    setFiltered(list);
  }, [query, ammo, filterCaliber]);

  const handleSelect = (ammoItem) => {
    setSelected(ammoItem);
    setOpen(false);
    setQuery('');
    onSelect(ammoItem);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelected(null);
    setQuery('');
    if (onClear) onClear();
  };

  const label = selected
    ? selected.source === 'reloading'
      ? `${selected.name} (${selected.caliber})`
      : `${selected.brand}${selected.weight_grains ? ` ${selected.weight_grains}gr` : ''}${selected.caliber ? ` ${selected.caliber}` : ''}`
    : 'Select from your ammunition (optional)';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl bg-background text-sm transition-colors select-none ${
          selected ? 'border-primary/50 text-foreground' : 'border-border text-muted-foreground'
        }`}
      >
        <span className="truncate">{label}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected && (
            <span onClick={handleClear} className="p-0.5 hover:text-destructive transition-colors">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search your ammo, caliber…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {ammo.length === 0 ? 'No ammunition added yet. Add ammo via Ammunition Inventory.' : 'No matches found'}
              </p>
            ) : (
              filtered.map(a => (
                <button
                   key={`${a.source}-${a.id}`}
                   type="button"
                   onClick={() => handleSelect(a)}
                   className={`w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border/50 last:border-0 select-none ${
                     selected?.id === a.id && selected?.source === a.source ? 'bg-primary/10' : ''
                   }`}
                 >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {a.source === 'reloading' ? '🔨' : '📦'} {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.caliber}
                        {a.weight_grains ? ` · ${a.weight_grains}gr` : ''}
                        {a.source === 'reloading' && a.batch_number ? ` · Batch: ${a.batch_number}` : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}