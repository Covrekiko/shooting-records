import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Package, Star } from 'lucide-react';

export default function AmmoComparison() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [selectedRifle, setSelectedRifle] = useState('all');
  const [loading, setLoading] = useState(true);

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

  const filteredSessions = selectedRifle === 'all' ? sessions : sessions.filter(s => s.rifle_id === selectedRifle);

  // Build ammo comparison data
  const ammoMap = {};
  filteredSessions.forEach(s => {
    if (!s.ammo_name) return;
    const key = s.ammo_name;
    if (!ammoMap[key]) {
      ammoMap[key] = { name: key, sessions: [], moas: [], distances: new Set() };
    }
    ammoMap[key].sessions.push(s);
    ammoMap[key].distances.add(`${s.distance}${s.distance_unit}`);

    const sg = groups.filter(g => g.session_id === s.id && g.group_size_moa);
    sg.forEach(g => ammoMap[key].moas.push(g.group_size_moa));
  });

  const ammoStats = Object.values(ammoMap).map(a => ({
    ...a,
    bestMoa: a.moas.length ? Math.min(...a.moas) : null,
    avgMoa: a.moas.length ? a.moas.reduce((x, y) => x + y, 0) / a.moas.length : null,
    sessionCount: a.sessions.length,
    distances: Array.from(a.distances),
    lastDate: a.sessions.sort((x, y) => y.date.localeCompare(x.date))[0]?.date,
  })).sort((a, b) => (a.bestMoa ?? 99) - (b.bestMoa ?? 99));

  const bestAmmo = ammoStats[0];

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/target-analyzer')} className="p-2 rounded-xl bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Ammo Comparison</h1>
        </div>

        {/* Rifle filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedRifle('all')}
            className={`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap flex-shrink-0 ${selectedRifle === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>
            All Rifles
          </button>
          {rifles.map(r => (
            <button key={r.id} onClick={() => setSelectedRifle(r.id)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium whitespace-nowrap flex-shrink-0 ${selectedRifle === r.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>
              {r.name || `${r.make} ${r.model}`}
            </button>
          ))}
        </div>

        {loading && <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}

        {!loading && ammoStats.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No ammo data yet. Add ammunition to your sessions.</p>
          </div>
        )}

        {ammoStats.map((ammo, i) => (
          <div key={ammo.name}
            className={`bg-card rounded-2xl border p-4 space-y-3 ${i === 0 && ammo.bestMoa ? 'border-amber-400' : 'border-border'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{ammo.name}</p>
                  {i === 0 && ammo.bestMoa && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                </div>
                <p className="text-sm text-muted-foreground">{ammo.sessionCount} sessions · Last: {ammo.lastDate}</p>
                <p className="text-xs text-muted-foreground">Distances: {ammo.distances.join(', ')}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-secondary rounded-xl p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Best Group</p>
                <p className="font-bold text-sm text-primary">{ammo.bestMoa?.toFixed(2) ?? '—'} MOA</p>
              </div>
              <div className="bg-secondary rounded-xl p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="font-bold text-sm">{ammo.avgMoa?.toFixed(2) ?? '—'} MOA</p>
              </div>
              <div className="bg-secondary rounded-xl p-2.5 text-center">
                <p className="text-xs text-muted-foreground">Groups</p>
                <p className="font-bold text-sm">{ammo.moas.length}</p>
              </div>
            </div>

            {/* Mini chart */}
            {ammo.moas.length > 1 && (
              <div className="flex items-end gap-1 h-10">
                {ammo.moas.slice(-12).map((moa, j) => {
                  const max = Math.max(...ammo.moas);
                  const h = Math.max(8, (moa / max) * 40);
                  return (
                    <div key={j} className="flex-1 rounded-sm bg-primary/60" style={{ height: h }} title={`${moa.toFixed(2)} MOA`} />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}