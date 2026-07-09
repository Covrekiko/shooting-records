import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Search } from 'lucide-react';

function haystack(item) { return Object.values(item || {}).filter((v) => typeof v === 'string' || typeof v === 'number').join(' ').toLowerCase(); }

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const sources = await Promise.all([
        base44.entities.Rifle.filter({ created_by: user.email }).then((rows) => rows.map((r) => ({ type: 'Rifle', title: r.name, subtitle: `${r.make || ''} ${r.model || ''} ${r.caliber || ''}`, to: '/settings/rifles', raw: r }))),
        base44.entities.Shotgun.filter({ created_by: user.email }).then((rows) => rows.map((r) => ({ type: 'Shotgun', title: r.name, subtitle: `${r.make || ''} ${r.model || ''} ${r.gauge || ''}`, to: '/settings/shotguns', raw: r }))),
        base44.entities.Ammunition.filter({ created_by: user.email }).then((rows) => rows.map((r) => ({ type: 'Ammunition', title: [r.brand, r.caliber].filter(Boolean).join(' · '), subtitle: `${r.quantity_in_stock || 0} ${r.units || 'rounds'}`, to: '/settings/ammunition', raw: r }))),
        base44.entities.ReloadingSession.filter({ created_by: user.email }).then((rows) => rows.map((r) => ({ type: 'Reload batch', title: r.batch_number || r.caliber, subtitle: `${r.rounds_loaded || 0} rounds`, to: '/reloading', raw: r }))),
        base44.entities.ReloadingTest.filter({ created_by: user.email }).then((rows) => rows.map((r) => ({ type: 'Load test', title: r.name, subtitle: `${r.caliber || ''} ${r.status || ''}`, to: '/load-development', raw: r }))),
        base44.entities.SessionRecord.filter({ created_by: user.email }).then((rows) => rows.map((r) => ({ type: 'Session', title: r.title || r.location_name || r.category, subtitle: `${r.date || ''} ${r.category || ''}`, to: '/records', raw: r }))),
        base44.entities.DeerOuting.filter({ created_by: user.email }).then((rows) => rows.map((r) => ({ type: 'Outing', title: r.location_name, subtitle: r.start_time || '', to: '/deer-management', raw: r }))),
      ]);
      setItems(sources.flat());
      setLoading(false);
    })();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items.filter((item) => `${item.type} ${item.title} ${item.subtitle} ${haystack(item.raw)}`.toLowerCase().includes(q)).slice(0, 50);
  }, [items, query]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <h1 className="text-2xl font-bold mb-1">Global Search</h1>
        <p className="text-sm text-muted-foreground mb-4">Search across your authorised records only.</p>
        <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search firearms, ammunition, reloads, sessions…" className="w-full pl-10 pr-3 py-3 rounded-xl border border-border bg-card outline-none focus:ring-2 focus:ring-ring/30" /></div>
        {loading ? <p className="text-sm text-muted-foreground">Loading searchable data…</p> : <div className="space-y-2">{results.map((item, index) => <Link key={`${item.type}-${item.raw?.id || index}`} to={item.to} className="block rounded-xl border border-border bg-card p-3 hover:bg-secondary/40"><p className="text-xs text-primary font-bold uppercase tracking-wide">{item.type}</p><p className="font-semibold text-sm mt-1">{item.title || 'Untitled'}</p><p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p></Link>)}</div>}
      </main>
    </div>
  );
}