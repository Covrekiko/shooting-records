import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * BulletReferencePicker
 * Props:
 *   onSelect(bullet) — called with the BulletReference record when user picks one
 *   onClear()        — called when user clears selection
 *   selectedId       — currently selected BulletReference id (optional, for display)
 *   filterCaliber    — optional caliber string to pre-filter list
 */
export default function BulletReferencePicker({ onSelect, onClear, selectedId, filterCaliber }) {
  const [bullets, setBullets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBullets();
  }, []);

  useEffect(() => {
    // When selectedId changes externally, find and display the record
    if (selectedId && bullets.length) {
      const b = bullets.find(b => b.id === selectedId);
      if (b) setSelected(b);
    }
    if (!selectedId) setSelected(null);
  }, [selectedId, bullets]);

  const loadBullets = async () => {
    setLoading(true);
    const list = await base44.entities.BulletReference.list('-updated_date', 500);
    setBullets(list);
    setFiltered(list);
    setLoading(false);
  };

  useEffect(() => {
    let list = bullets;
    if (filterCaliber) {
      list = list.filter(b =>
        b.caliber?.toLowerCase().includes(filterCaliber.toLowerCase()) ||
        filterCaliber.toLowerCase().includes(b.caliber?.toLowerCase() || '')
      );
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(b =>
        b.manufacturer?.toLowerCase().includes(q) ||
        b.bullet_name?.toLowerCase().includes(q) ||
        b.caliber?.toLowerCase().includes(q) ||
        String(b.weight_grains || '').includes(q) ||
        b.bullet_type?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [query, bullets, filterCaliber]);

  const handleSelect = (bullet) => {
    setSelected(bullet);
    setOpen(false);
    setQuery('');
    onSelect(bullet);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelected(null);
    setQuery('');
    if (onClear) onClear();
  };

  const label = selected
    ? `${selected.manufacturer} ${selected.bullet_name || ''} ${selected.weight_grains}gr ${selected.caliber}`.trim()
    : 'Select from bullet database (optional)';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl bg-background text-sm transition-colors ${
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
                placeholder="Search manufacturer, caliber, weight…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {bullets.length === 0 ? 'No bullets in database yet. Add some via Settings → Bullet Reference.' : 'No matches found'}
              </p>
            ) : (
              filtered.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border/50 last:border-0 ${
                    selected?.id === b.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {b.manufacturer} {b.bullet_name || ''} {b.bullet_family && b.bullet_family !== b.bullet_name ? `(${b.bullet_family})` : ''} — {b.weight_grains}gr
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.caliber}{b.bullet_type ? ` · ${b.bullet_type}` : ''}
                        {b.lead_free ? ' · Lead-Free' : ''}
                        {b.ballistic_coefficient_g1 ? ` · G1: ${b.ballistic_coefficient_g1}` : ''}
                        {b.ballistic_coefficient_g7 ? ` · G7: ${b.ballistic_coefficient_g7}` : ''}
                        {!b.ballistic_coefficient_g1 && !b.ballistic_coefficient_g7 ? ' · No BC data' : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 mt-0.5">
                      {b.ballistic_coefficient_g7 && <span className="text-[9px] bg-primary/10 text-primary rounded px-1 font-bold">G7</span>}
                      {b.ballistic_coefficient_g1 && !b.ballistic_coefficient_g7 && <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded px-1 font-bold">G1 only</span>}
                      {b.data_confidence === 'High' && <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded px-1 font-bold">✓</span>}
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