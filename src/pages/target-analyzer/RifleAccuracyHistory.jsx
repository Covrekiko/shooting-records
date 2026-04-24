import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Star, BarChart2, Target } from 'lucide-react';

export default function RifleAccuracyHistory() {
  const navigate = useNavigate();
  const [rifles, setRifles] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const [r, s, g] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: user.email }),
        base44.entities.TargetSession.list('-date', 500),
        base44.entities.TargetGroup.list('-created_date', 1000),
      ]);
      setRifles(r || []);
      setSessions(s || []);
      setGroups(g || []);
      setLoading(false);
    };
    load();
  }, []);

  const rifleStats = rifles.map(rifle => {
    const rifleSessions = sessions.filter(s => s.rifle_id === rifle.id);
    const sessionIds = new Set(rifleSessions.map(s => s.id));
    const rifleGroups = groups.filter(g => sessionIds.has(g.session_id) && g.group_size_moa);
    const moas = rifleGroups.map(g => g.group_size_moa).filter(Boolean);
    const bestMoa = moas.length ? Math.min(...moas) : null;
    const avgMoa = moas.length ? moas.reduce((a, b) => a + b, 0) / moas.length : null;
    const bestGroup = rifleGroups.find(g => g.group_size_moa === bestMoa);
    const bestSession = bestGroup ? rifleSessions.find(s => s.id === bestGroup.session_id) : null;
    const lastSession = rifleSessions.sort((a, b) => b.date.localeCompare(a.date))[0];

    // Ammo breakdown
    const ammoMap = {};
    rifleSessions.forEach(s => {
      if (!s.ammo_name) return;
      if (!ammoMap[s.ammo_name]) ammoMap[s.ammo_name] = [];
      const sGroups = groups.filter(g => g.session_id === s.id && g.group_size_moa);
      sGroups.forEach(g => ammoMap[s.ammo_name].push(g.group_size_moa));
    });
    const bestAmmoName = Object.entries(ammoMap).sort((a, b) => Math.min(...a[1]) - Math.min(...b[1]))[0]?.[0];

    return {
      rifle,
      totalSessions: rifleSessions.length,
      bestMoa,
      avgMoa,
      bestAmmoName,
      bestSession,
      lastSession,
      photos: rifleSessions.flatMap(s => s.photos || []).slice(0, 4),
      allGroups: rifleGroups,
    };
  }).filter(r => r.totalSessions > 0);

  const selectedStats = selected ? rifleStats.find(r => r.rifle.id === selected) : null;

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/target-analyzer')} className="p-2 rounded-xl bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Rifle Accuracy History</h1>
        </div>

        {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}

        {!loading && rifleStats.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No session data yet. Record some sessions first.</p>
          </div>
        )}

        {rifleStats.map(stats => (
          <div key={stats.rifle.id} className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => setSelected(selected === stats.rifle.id ? null : stats.rifle.id)}
              className="w-full flex items-center gap-4 p-4 text-left active:scale-98 transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{stats.rifle.name || `${stats.rifle.make} ${stats.rifle.model}`}</p>
                <p className="text-sm text-muted-foreground">{stats.rifle.caliber} · {stats.totalSessions} sessions</p>
              </div>
              {stats.bestMoa && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Best</p>
                  <p className="font-bold text-primary">{stats.bestMoa.toFixed(2)} MOA</p>
                </div>
              )}
            </button>

            {selected === stats.rifle.id && (
              <div className="border-t border-border p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Best Group</p>
                    <p className="font-bold text-lg text-primary">{stats.bestMoa?.toFixed(2) ?? '—'} MOA</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Average MOA</p>
                    <p className="font-bold text-lg">{stats.avgMoa?.toFixed(2) ?? '—'}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Sessions</p>
                    <p className="font-bold text-lg">{stats.totalSessions}</p>
                  </div>
                  <div className="bg-secondary rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">Last Session</p>
                    <p className="font-bold text-sm">{stats.lastSession?.date ?? '—'}</p>
                  </div>
                </div>

                {stats.bestAmmoName && (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Best Ammunition</p>
                      <p className="text-sm font-bold">{stats.bestAmmoName}</p>
                    </div>
                  </div>
                )}

                {/* Group history table */}
                {stats.allGroups.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">All Groups</p>
                    <div className="space-y-2">
                      {stats.allGroups.sort((a, b) => a.group_size_moa - b.group_size_moa).slice(0, 10).map(g => (
                        <div key={g.id} className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2 text-sm">
                          <span className="font-medium">{g.group_name}</span>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>{g.group_size_mm?.toFixed(1)}mm</span>
                            <span className="font-bold text-foreground">{g.group_size_moa?.toFixed(2)} MOA</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Target Photos</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {stats.photos.map((url, i) => (
                        <img key={i} src={url} className="h-24 w-24 object-cover rounded-xl flex-shrink-0" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}