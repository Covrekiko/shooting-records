import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, FlaskConical, Trophy } from 'lucide-react';
import { format } from 'date-fns';

export default function AmmoComparison({ onBack }) {
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

  const getAmmoStats = (rifleId) => {
    const rifleSessions = sessions.filter(s => s.rifle_id === rifleId && s.ammo_name);
    const ammoMap = {};

    rifleSessions.forEach(s => {
      const key = s.ammo_name;
      if (!ammoMap[key]) ammoMap[key] = { ammo: key, sessions: [], groups: [], distances: new Set() };
      ammoMap[key].sessions.push(s);
      ammoMap[key].distances.add(`${s.distance}${s.distance_unit || 'm'}`);
      const sg = groups.filter(g => g.session_id === s.id && g.group_size_moa);
      ammoMap[key].groups.push(...sg);
    });

    return Object.values(ammoMap).map(a => {
      const moas = a.groups.map(g => g.group_size_moa);
      const best = moas.length ? Math.min(...moas) : null;
      const avg = moas.length ? moas.reduce((s, m) => s + m, 0) / moas.length : null;
      const lastSession = a.sessions.sort((x, y) => new Date(y.date) - new Date(x.date))[0];
      return {
        ammo: a.ammo,
        sessions: a.sessions.length,
        groups: a.groups.length,
        bestMoa: best ? Math.round(best * 100) / 100 : null,
        avgMoa: avg ? Math.round(avg * 100) / 100 : null,
        distances: Array.from(a.distances).join(', '),
        lastDate: lastSession?.date,
      };
    }).sort((a, b) => (a.avgMoa || 999) - (b.avgMoa || 999));
  };

  const ammoStats = selectedRifle ? getAmmoStats(selectedRifle) : [];
  const bestAmmo = ammoStats.find(a => a.avgMoa);
  const rifle = rifles.find(r => r.id === selectedRifle);

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
          <h2 className="text-xl font-bold">Ammo Comparison</h2>
          <p className="text-xs text-muted-foreground">Compare loads per rifle</p>
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

      {ammoStats.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No ammo data for {rifle?.name}</p>
          <p className="text-sm text-muted-foreground mt-1">Log sessions with different ammo to compare</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ammoStats.map((a, idx) => {
            const isBest = bestAmmo?.ammo === a.ammo && a.avgMoa;
            return (
              <div key={a.ammo} className={`rounded-2xl p-4 border ${isBest ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-card border-border'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base">{a.ammo}</span>
                      {isBest && <span className="flex items-center gap-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold"><Trophy className="w-3 h-3" />Best</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.distances} · {a.sessions} session{a.sessions !== 1 ? 's' : ''} · {a.lastDate ? format(new Date(a.lastDate), 'd MMM yyyy') : ''}</p>
                  </div>
                  <span className="text-2xl font-black text-primary ml-3">{a.avgMoa ?? '—'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div className="bg-background rounded-xl p-2">
                    <p className="font-bold text-base">{a.bestMoa ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Best MOA</p>
                  </div>
                  <div className="bg-background rounded-xl p-2">
                    <p className="font-bold text-base">{a.avgMoa ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">Avg MOA</p>
                  </div>
                  <div className="bg-background rounded-xl p-2">
                    <p className="font-bold text-base">{a.groups}</p>
                    <p className="text-xs text-muted-foreground">Groups</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}