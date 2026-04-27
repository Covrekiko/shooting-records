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
  const [manualInput, setManualInput] = useState('');

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

  // Extract numeric caliber for sorting (e.g., ".308" → 0.308, "6.5mm" → 6.5)
  const getCaliberNumeric = (cal) => {
    if (!cal) return 0;
    const match = cal.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const loadBullets = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.BulletReference.list('-updated_date', 1000);
      const sorted = [...list].sort((a, b) => {
        const mfr = (a.manufacturer || '').localeCompare(b.manufacturer || '');
        if (mfr !== 0) return mfr;
        const cal = getCaliberNumeric(a.calibre) - getCaliberNumeric(b.calibre);
        if (cal !== 0) return cal;
        const fam = (a.bullet_family || '').localeCompare(b.bullet_family || '');
        if (fam !== 0) return fam;
        return (a.weight_grains || 0) - (b.weight_grains || 0);
      });
      setBullets(sorted);
      setFiltered(sorted);
    } catch (error) {
      console.error('Error loading bullet reference:', error);
      setBullets([]);
      setFiltered([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    let list = bullets;
    if (filterCaliber) {
      list = list.filter(b =>
        b.calibre?.toLowerCase().includes(filterCaliber.toLowerCase()) ||
        filterCaliber.toLowerCase().includes(b.calibre?.toLowerCase() || '')
      );
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(b =>
        b.manufacturer?.toLowerCase().includes(q) ||
        b.bullet_family?.toLowerCase().includes(q) ||
        b.calibre?.toLowerCase().includes(q) ||
        String(b.weight_grains || '').includes(q) ||
        b.bullet_type?.toLowerCase().includes(q) ||
        b.use?.toLowerCase().includes(q)
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
    setManualInput('');
    if (onClear) onClear();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      setSelected({ manual: true, bullet_name: manualInput });
      setOpen(false);
      setQuery('');
      setManualInput('');
      onSelect({ manual: true, bullet_name: manualInput });
    }
  };

  const label = selected
    ? selected.manual
      ? selected.bullet_name
      : `${selected.manufacturer} ${selected.bullet_family || ''} ${selected.weight_grains}gr ${selected.calibre}`.trim()
    : 'Select bullet';

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
              <div className="p-3 space-y-3 border-t border-border">
                {bullets.length > 0 && (
                  <p className="text-xs text-muted-foreground">No matches found. Type your own:</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="e.g. Hornady ELD-M 168gr"
                    className="flex-1 px-2.5 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={!manualInput.trim()}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Add
                  </button>
                </div>
              </div>
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
                        {b.manufacturer} {b.bullet_family} — {b.weight_grains}gr
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.calibre}{b.bullet_type ? ` · ${b.bullet_type}` : ''}{b.use ? ` · ${b.use}` : ''}{b.source_type ? ` · ${b.source_type}` : ''}
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