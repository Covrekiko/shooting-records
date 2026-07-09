import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { filterOwnedRows, getSafeCurrentUser, loadOwnedEntity } from '@/lib/professionalPageData';

function dateValue(value) { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? d : new Date(0); }

export default function ActivityTimeline() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const user = await getSafeCurrentUser();
        const [records, reloads, tests, cleanings, outings] = await Promise.all([
          loadOwnedEntity('SessionRecord', user.email), loadOwnedEntity('ReloadingSession', user.email), loadOwnedEntity('ReloadingTest', user.email),
          loadOwnedEntity('CleaningHistory', user.email), loadOwnedEntity('DeerOuting', user.email),
        ]);
        setItems([
          ...filterOwnedRows(records, user.email).map((r) => ({ id: r.id, date: r.date || r.created_date, type: 'Shooting activity', title: r.title || r.location_name || r.category, detail: r.category })),
          ...filterOwnedRows(reloads, user.email).map((r) => ({ id: r.id, date: r.date || r.created_date, type: 'Reload batch', title: r.batch_number || r.caliber, detail: `${r.rounds_loaded || 0} rounds` })),
          ...filterOwnedRows(tests, user.email).map((r) => ({ id: r.id, date: r.test_date || r.created_date, type: 'Load Development', title: r.name || r.test_name, detail: r.status || r.caliber })),
          ...filterOwnedRows(cleanings, user.email).map((r) => ({ id: r.id, date: r.cleaning_date || r.created_date, type: 'Cleaning', title: r.firearm_name, detail: r.maintenance_summary || 'Maintenance recorded' })),
          ...filterOwnedRows(outings, user.email).map((r) => ({ id: r.id, date: r.start_time || r.created_date, type: 'Deer outing', title: r.location_name, detail: r.active ? 'Active' : 'Completed' })),
        ]);
      } catch (err) { setError(err.message || 'Timeline could not be loaded.'); }
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => [...items].sort((a, b) => dateValue(b.date).getTime() - dateValue(a.date).getTime()).slice(0, 100), [items]);

  return <div className="min-h-screen bg-background"><Navigation /><main className="max-w-3xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding"><h1 className="text-2xl font-bold">Activity Timeline</h1><p className="text-sm text-muted-foreground mb-5 mt-1">A chronological view derived from your existing records.</p>{loading ? <p className="text-sm text-muted-foreground">Loading timeline…</p> : error ? <div className="rounded-2xl border border-border bg-card p-5 text-sm text-destructive flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</div> : sorted.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-semibold">No activity yet</p><p className="text-sm text-muted-foreground mt-1">Your shooting, reloading, field and maintenance history will appear here.</p></div> : <div className="space-y-3">{sorted.map((item) => <div key={`${item.type}-${item.id}`} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-primary font-bold uppercase tracking-wide">{item.type}</p><p className="font-semibold mt-1">{item.title || 'Untitled'}</p><p className="text-sm text-muted-foreground mt-1">{item.detail}</p><p className="text-xs text-muted-foreground mt-2">{dateValue(item.date).getTime() ? format(dateValue(item.date), 'd MMM yyyy') : 'Date unknown'}</p></div>)}</div>}</main></div>;
}