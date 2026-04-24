import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

export default function RifleAccuracyHistory({ onBack }) {
  const [rifles, setRifles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRifle, setSelectedRifle] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [r, s, g] = await Promise.all([
      base44.entities.Rifle.filter({ created_by: user.email }),
      base44.entities.TargetSession.filter({ created_by: user.email }),
      base44.entities.TargetGroup.list(),
    ]);
    setRifles(r);
    setSessions(s);
    setGroups(g);
    if (r.length > 0) setSelectedRifle(r[0].id);
    setLoading(false);
  };

  const getRifleStats = (rifleId) => {
    const rifleSessions = sessions.filter(s => s.rifle_id === rifleId);
    const sessionIds = rifleSessions.map(s => s.id);
    const rifleGroups = groups.filter(g => sessionIds.includes(g.session_id) && g.group_size_moa);

    if (!rifleGroups.length) return null;

    const bestMoa = Math.min(...rifleGroups.map(g => g.group_size_moa));
    const avgMoa = rifleGroups.reduce((s, g) => s + g.group_size_moa, 0) / rifleGroups.length;
    const bestGroup = rifleGroups.find(g => g.group_size_moa === bestMoa);
    const bestSession = rifleSessions.find(s => s.id === bestGroup?.session_id);

    // Best ammo
    const ammoGroups = {};
    rifleSessions.forEach(s => {
      if (!s.ammo_name) return;
      const sg = groups.filter(g => g.session_id === s.id && g.group_size_moa);
      if (!sg.length) return;
      if (!ammoGroups[s.ammo_name]) ammoGroups[s.ammo_name] = [];
      ammoGroups[s.ammo_name].push(...sg.map(g => g.group_size_moa));
    });
    let bestAmmo = null, bestAmmoAvg = Infinity;
    for (const [ammo, moas] of Object.entries(ammoGroups)) {
      const avg = moas.reduce((s, m) => s + m, 0) / moas.length;
      if (avg < bestAmmoAvg) { bestAmmoAvg = avg; bestAmmo = ammo; }
    }

    // Last zero confirmation
    const zeroGroups = groups.filter(g => sessionIds.includes(g.session_id) && g.confirmed_zero);
    const lastZeroSession = zeroGroups.length ? rifleSessions.find(s => s.id === zeroGroups[zeroGroups.length - 1]?.session_id) : null;

    return {
      totalSessions: rifleSessions.length,
      totalGroups: rifleGroups.length,
      bestMoa: Math.round(bestMoa * 100) / 100,
      avgMoa: Math.round(avgMoa * 100) / 100,
      bestGroup,
      bestSession,
      bestAmmo,
      bestAmmoAvg: Math.round(bestAmmoAvg * 100) / 100,
      lastZeroSession,
    };
  };

  const rifle = rifles.find(r => r.id === selectedRifle);
  const stats = selectedRifle ? getRifleStats(selectedRifle) : null;
  const rifleSessions = sessions.filter(s => s.rifle_id === selectedRifle).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (loading) return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-8 flex justify-center min-h-[40vh] items-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </main>
  );

  return (
    <main className="max-w-2xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Rifle Accuracy History</h2>
          <p className="text-xs text-muted-foreground">Per-rifle performance stats</p>
        </div>
      </div>

      {/* Rifle Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {rifles.map(r => (
          <button key={r.id} onClick={() => setSelectedRifle(r.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${selectedRifle === r.id ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:bg-secondary'}`}>
            {r.name}
          </button>
        ))}
      </div>

      {!stats ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No data for {rifle?.name}</p>
          <p className="text-sm text-muted-foreground mt-1">Log some target sessions to see accuracy history</p>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black">{stats.bestMoa}</p>
              <p className="text-sm font-semibold text-primary">Best MOA Ever</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-black">{stats.avgMoa}</p>
              <p className="text-sm font-semibold text-muted-foreground">Average MOA</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-black">{stats.totalSessions}</p>
              <p className="text-sm font-semibold text-muted-foreground">Sessions</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-black">{stats.totalGroups}</p>
              <p className="text-sm font-semibold text-muted-foreground">Groups</p>
            </div>
          </div>

          {stats.bestAmmo && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Best Ammunition</p>
              <p className="font-bold text-base">{stats.bestAmmo}</p>
              <p className="text-sm text-muted-foreground">Average: {stats.bestAmmoAvg} MOA</p>
            </div>
          )}

          {stats.lastZeroSession && (
            <div className="bg-card border border-border rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Last Zero Confirmation</p>
              <p className="font-semibold">{format(new Date(stats.lastZeroSession.date), 'd MMM yyyy')} · {stats.lastZeroSession.distance}{stats.lastZeroSession.distance_unit || 'm'}</p>
              <p className="text-sm text-muted-foreground">{stats.lastZeroSession.range_name}</p>
            </div>
          )}

          {/* Session History */}
          <h3 className="font-bold mb-3">Session History</h3>
          <div className="space-y-2">
            {rifleSessions.map(s => {
              const sg = groups.filter(g => g.session_id === s.id && g.group_size_moa);
              const best = sg.length ? Math.min(...sg.map(g => g.group_size_moa)) : null;
              return (
                <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{s.date ? format(new Date(s.date), 'd MMM yyyy') : '—'} · {s.distance}{s.distance_unit || 'm'}</p>
                    <p className="text-xs text-muted-foreground">{s.range_name || 'No range'} · {s.ammo_name || 'Unknown ammo'}</p>
                  </div>
                  {best && (
                    <div className="text-right">
                      <p className="font-black text-primary">{best.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">MOA</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}