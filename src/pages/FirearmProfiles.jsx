import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { AlertTriangle } from 'lucide-react';
import { filterOwnedRows, getSafeCurrentUser, loadOwnedEntity } from '@/lib/professionalPageData';

export default function FirearmProfiles() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setError('');
      try {
        const user = await getSafeCurrentUser();
        const [rifles, shotguns, records, tests, cleanings] = await Promise.all([
          loadOwnedEntity('Rifle', user.email), loadOwnedEntity('Shotgun', user.email), loadOwnedEntity('SessionRecord', user.email),
          loadOwnedEntity('ReloadingTest', user.email), loadOwnedEntity('CleaningHistory', user.email),
        ]);
        setData({ rifles: filterOwnedRows(rifles, user.email), shotguns: filterOwnedRows(shotguns, user.email), records: filterOwnedRows(records, user.email), tests: filterOwnedRows(tests, user.email), cleanings: filterOwnedRows(cleanings, user.email) });
      } catch (err) { setError(err.message || 'Firearm profiles could not be loaded.'); setData({ rifles: [], shotguns: [], records: [], tests: [], cleanings: [] }); }
    })();
  }, []);

  const firearms = useMemo(() => {
    if (!data) return [];
    const rifleProfiles = data.rifles.map((firearm) => ({ firearm, type: 'rifle', count: firearm.total_rounds_fired || 0, unit: 'rounds', sessions: data.records.filter((r) => r.rifle_id === firearm.id || r.rifles_used?.some((u) => u.rifle_id === firearm.id)), tests: data.tests.filter((t) => t.rifle_id === firearm.id), cleanings: data.cleanings.filter((c) => c.firearm_id === firearm.id) }));
    const shotgunProfiles = data.shotguns.map((firearm) => ({ firearm, type: 'shotgun', count: firearm.total_cartridges_fired || 0, unit: 'cartridges', sessions: data.records.filter((r) => r.shotgun_id === firearm.id), tests: [], cleanings: data.cleanings.filter((c) => c.firearm_id === firearm.id) }));
    return [...rifleProfiles, ...shotgunProfiles];
  }, [data]);

  return <div className="min-h-screen bg-background"><Navigation /><main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding"><h1 className="text-2xl font-bold">Firearm Profiles</h1><p className="text-sm text-muted-foreground mt-1 mb-5">Unified read-only firearm history without changing counter semantics.</p>{error && <div className="rounded-2xl border border-border bg-card p-5 mb-4 text-sm text-destructive flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</div>}{!data ? <p className="text-sm text-muted-foreground">Loading profiles…</p> : firearms.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><p className="font-semibold">No firearms found</p><p className="text-sm text-muted-foreground mt-1">Add rifles or shotguns to see profiles here.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{firearms.map(({ firearm, type, count, unit, sessions, tests, cleanings }) => <div key={`${type}-${firearm.id}`} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-primary font-bold uppercase tracking-wide">{type}</p><h2 className="text-lg font-bold mt-1">{firearm.name}</h2><p className="text-sm text-muted-foreground">{firearm.make} {firearm.model} · {firearm.caliber || firearm.gauge}</p><div className="grid grid-cols-3 gap-2 mt-4"><div className="rounded-xl bg-secondary/50 p-2 text-center"><p className="font-bold">{count}</p><p className="text-[10px] text-muted-foreground">{unit}</p></div><div className="rounded-xl bg-secondary/50 p-2 text-center"><p className="font-bold">{sessions.length}</p><p className="text-[10px] text-muted-foreground">sessions</p></div><div className="rounded-xl bg-secondary/50 p-2 text-center"><p className="font-bold">{cleanings.length}</p><p className="text-[10px] text-muted-foreground">cleanings</p></div></div>{tests.length > 0 && <p className="text-xs text-muted-foreground mt-3">Linked load tests: {tests.length}</p>}</div>)}</div>}</main></div>;
}