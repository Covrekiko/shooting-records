import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { AlertTriangle, Search } from 'lucide-react';
import { filterOwnedRows, getSafeCurrentUser, loadOwnedEntity } from '@/lib/professionalPageData';

function haystack(item) {
  return Object.values(item || {}).filter((v) => typeof v === 'string' || typeof v === 'number').join(' ').toLowerCase();
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const user = await getSafeCurrentUser();
        const [rifles, shotguns, ammo, reloads, tests, records, outings] = await Promise.all([
          loadOwnedEntity('Rifle', user.email), loadOwnedEntity('Shotgun', user.email), loadOwnedEntity('Ammunition', user.email),
          loadOwnedEntity('ReloadingSession', user.email), loadOwnedEntity('ReloadingTest', user.email), loadOwnedEntity('SessionRecord', user.email), loadOwnedEntity('DeerOuting', user.email),
        ]);
        setItems([
          ...filterOwnedRows(rifles, user.email).map((r) => ({ type: 'Rifle', title: r.name, subtitle: `${r.make || ''} ${r.model || ''} ${r.caliber || ''}`, to: '/settings/rifles', raw: r })),
          ...filterOwnedRows(shotguns, user.email).map((r) => ({ type: 'Shotgun', title: r.name, subtitle: `${r.make || ''} ${r.model || ''} ${r.gauge || ''}`, to: '/settings/shotguns', raw: r })),
          ...filterOwnedRows(ammo, user.email).map((r) => ({ type: 'Ammunition', title: [r.brand, r.caliber].filter(Boolean).join(' · '), subtitle: `${r.quantity_in_stock || 0} ${r.units || 'rounds'}`, to: '/settings/ammunition', raw: r })),
          ...filterOwnedRows(reloads, user.email).map((r) => ({ type: 'Reload batch', title: r.batch_number || r.caliber, subtitle: `${r.rounds_loaded || 0} rounds`, to: '/reloading', raw: r })),
          ...filterOwnedRows(tests, user.email).map((r) => ({ type: 'Load test', title: r.name || r.test_name, subtitle: `${r.caliber || ''} ${r.status || ''}`, to: '/load-development', raw: r })),
          ...filterOwnedRows(records, user.email).map((r) => ({ type: 'Session', title: r.title || r.location_name || r.category, subtitle: `${r.date || ''} ${r.category || ''}`, to: '/records', raw: r })),
          ...filterOwnedRows(outings, user.email).map((r) => ({ type: 'Outing', title: r.location_name, subtitle: r.start_time || '', to: '/deer-management', raw: r })),
        ]);
      } catch (err) { setError(err.message || 'Search data could not be loaded.'); }
      setLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items.filter((item) => `${item.type} ${item.title} ${item.subtitle} ${haystack(item.raw)}`.toLowerCase().includes(q)).slice(0, 50);
  }, [items, query]);

  return <div className="min-h-screen bg-background"><Navigation /><main className="max-w-3xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding"><h1 className="text-2xl font-bold mb-1">Global Search</h1><p className="text-sm text-muted-foreground mb-4">Search across your authorised records only, including cached data when offline.</p><div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search firearms, ammunition, reloads, sessions…" className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-card outline-none focus:ring-2 focus:ring-ring/30" /></div>{loading ? <p className="text-sm text-muted-foreground">Loading searchable data…</p> : error ? <div className="rounded-2xl border border-border bg-card p-5 text-sm text-destructive flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</div> : results.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-semibold">No results found</p><p className="text-sm text-muted-foreground mt-1">Try a different search term.</p></div> : <div className="space-y-2">{results.map((item, index) => <Link key={`${item.type}-${item.raw?.id || index}`} to={item.to} className="block rounded-xl border border-border bg-card p-3 hover:bg-secondary/40"><p className="text-xs text-primary font-bold uppercase tracking-wide">{item.type}</p><p className="font-semibold text-sm mt-1">{item.title || 'Untitled'}</p><p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p></Link>)}</div>}</main></div>;
}