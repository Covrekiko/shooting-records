import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';

function dateValue(value) { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? d : new Date(0); }

export default function ActivityTimeline() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const [records, reloads, tests, cleanings, outings] = await Promise.all([
        base44.entities.SessionRecord.filter({ created_by: user.email }),
        base44.entities.ReloadingSession.filter({ created_by: user.email }),
        base44.entities.ReloadingTest.filter({ created_by: user.email }),
        base44.entities.CleaningHistory.filter({ created_by: user.email }),
        base44.entities.DeerOuting.filter({ created_by: user.email }),
      ]);
      setItems([
        ...records.map((r) => ({ date: r.date || r.created_date, type: 'Shooting activity', title: r.title || r.location_name || r.category, detail: r.category })),
        ...reloads.map((r) => ({ date: r.date || r.created_date, type: 'Reload batch', title: r.batch_number || r.caliber, detail: `${r.rounds_loaded || 0} rounds` })),
        ...tests.map((r) => ({ date: r.test_date || r.created_date, type: 'Load Development', title: r.name, detail: r.status || r.caliber })),
        ...cleanings.map((r) => ({ date: r.cleaning_date || r.created_date, type: 'Cleaning', title: r.firearm_name, detail: r.maintenance_summary || 'Maintenance recorded' })),
        ...outings.map((r) => ({ date: r.start_time || r.created_date, type: 'Deer outing', title: r.location_name, detail: r.active ? 'Active' : 'Completed' })),
      ]);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => [...items].sort((a, b) => dateValue(b.date) - dateValue(a.date)).slice(0, 100), [items]);

  return (
    <div className="min-h-screen bg-background"><Navigation /><main className="max-w-3xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding"><h1 className="text-2xl font-bold">Activity Timeline</h1><p className="text-sm text-muted-foreground mb-5 mt-1">A chronological view derived from your existing records.</p>{loading ? <p className="text-sm text-muted-foreground">Loading timeline…</p> : <div className="space-y-3">{sorted.map((item, index) => <div key={`${item.type}-${index}`} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-primary font-bold uppercase tracking-wide">{item.type}</p><p className="font-semibold mt-1">{item.title || 'Untitled'}</p><p className="text-sm text-muted-foreground mt-1">{item.detail}</p><p className="text-xs text-muted-foreground mt-2">{dateValue(item.date).getTime() ? format(dateValue(item.date), 'd MMM yyyy') : 'Date unknown'}</p></div>)}</div>}</main></div>
  );
}