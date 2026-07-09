import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';

export default function FirearmProfiles() {
  const [data, setData] = useState(null);
  useEffect(() => {
    (async () => {
      const user = await base44.auth.me();
      const [rifles, shotguns, records, tests, cleanings] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: user.email }),
        base44.entities.Shotgun.filter({ created_by: user.email }),
        base44.entities.SessionRecord.filter({ created_by: user.email }),
        base44.entities.ReloadingTest.filter({ created_by: user.email }),
        base44.entities.CleaningHistory.filter({ created_by: user.email }),
      ]);
      setData({ rifles, shotguns, records, tests, cleanings });
    })();
  }, []);

  const firearms = useMemo(() => {
    if (!data) return [];
    const rifleProfiles = data.rifles.map((firearm) => ({ firearm, type: 'rifle', count: firearm.total_rounds_fired || 0, unit: 'rounds', sessions: data.records.filter((r) => r.rifle_id === firearm.id || r.rifles_used?.some((u) => u.rifle_id === firearm.id)), tests: data.tests.filter((t) => t.rifle_id === firearm.id), cleanings: data.cleanings.filter((c) => c.firearm_id === firearm.id) }));
    const shotgunProfiles = data.shotguns.map((firearm) => ({ firearm, type: 'shotgun', count: firearm.total_cartridges_fired || 0, unit: 'cartridges', sessions: data.records.filter((r) => r.shotgun_id === firearm.id), tests: [], cleanings: data.cleanings.filter((c) => c.firearm_id === firearm.id) }));
    return [...rifleProfiles, ...shotgunProfiles];
  }, [data]);

  return (
    <div className="min-h-screen bg-background"><Navigation /><main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding"><h1 className="text-2xl font-bold">Firearm Profiles</h1><p className="text-sm text-muted-foreground mt-1 mb-5">Unified read-only firearm history without changing counter semantics.</p>{!data ? <p className="text-sm text-muted-foreground">Loading profiles…</p> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{firearms.map(({ firearm, type, count, unit, sessions, tests, cleanings }) => <div key={`${type}-${firearm.id}`} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-primary font-bold uppercase tracking-wide">{type}</p><h2 className="text-lg font-bold mt-1">{firearm.name}</h2><p className="text-sm text-muted-foreground">{firearm.make} {firearm.model} · {firearm.caliber || firearm.gauge}</p><div className="grid grid-cols-3 gap-2 mt-4"><div className="rounded-xl bg-secondary/50 p-2 text-center"><p className="font-bold">{count}</p><p className="text-[10px] text-muted-foreground">{unit}</p></div><div className="rounded-xl bg-secondary/50 p-2 text-center"><p className="font-bold">{sessions.length}</p><p className="text-[10px] text-muted-foreground">sessions</p></div><div className="rounded-xl bg-secondary/50 p-2 text-center"><p className="font-bold">{cleanings.length}</p><p className="text-[10px] text-muted-foreground">cleanings</p></div></div>{tests.length > 0 && <p className="text-xs text-muted-foreground mt-3">Linked load tests: {tests.length}</p>}</div>)}</div>}</main></div>
  );
}