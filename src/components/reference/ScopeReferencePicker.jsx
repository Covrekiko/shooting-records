import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * ScopeReferencePicker
 * Props:
 *   onSelect(scope) — called with the ScopeReference record when user picks one
 *   onClear()       — called when user clears selection
 *   selectedId      — currently selected ScopeReference id (optional)
 */
export default function ScopeReferencePicker({ onSelect, onClear, selectedId }) {
  const [scopes, setScopes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadScopes();
  }, []);

  useEffect(() => {
    if (selectedId && scopes.length) {
      const s = scopes.find(s => s.id === selectedId);
      if (s) setSelected(s);
    }
    if (!selectedId) setSelected(null);
  }, [selectedId, scopes]);

  const loadScopes = async () => {
    setLoading(true);
    const list = await base44.entities.ScopeReference.list('-updated_date', 500);
    setScopes(list);
    setFiltered(list);
    setLoading(false);
  };

  useEffect(() => {
    if (!query) { setFiltered(scopes); return; }
    const q = query.toLowerCase();
    setFiltered(scopes.filter(s =>
      s.manufacturer?.toLowerCase().includes(q) ||
      s.model?.toLowerCase().includes(q) ||
      s.reticle_name?.toLowerCase().includes(q) ||
      s.turret_unit?.toLowerCase().includes(q) ||
      s.click_value?.toLowerCase().includes(q)
    ));
  }, [query, scopes]);

  const handleSelect = (scope) => {
    setSelected(scope);
    setOpen(false);
    setQuery('');
    onSelect(scope);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelected(null);
    setQuery('');
    if (onClear) onClear();
  };

  const mag = selected
    ? (selected.magnification_min && selected.magnification_max
        ? ` ${selected.magnification_min}-${selected.magnification_max}x`
        : '')
    : '';

  const label = selected
    ? `${selected.manufacturer} ${selected.model}${mag}`.trim()
    : 'Select from scope database (optional)';

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
                placeholder="Search manufacturer, model, reticle…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {scopes.length === 0 ? 'No scopes in database yet. Add some via Settings → Scope Reference.' : 'No matches found'}
              </p>
            ) : (
              filtered.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-secondary transition-colors border-b border-border/50 last:border-0 ${
                    selected?.id === s.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {s.manufacturer} {s.model}{s.magnification_min && s.magnification_max ? ` ${s.magnification_min}-${s.magnification_max}x` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.turret_unit || ''}{s.click_value ? ` · ${s.click_value}` : ''}{s.focal_plane ? ` · ${s.focal_plane}` : ''}{s.reticle_name ? ` · ${s.reticle_name}` : ''}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}