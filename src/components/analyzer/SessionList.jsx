import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Target, Trash2, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function SessionList({ onBack, onView, onNew }) {
  const [sessions, setSessions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRifle, setFilterRifle] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [s, g, r] = await Promise.all([
      base44.entities.TargetSession.filter({ created_by: user.email }),
      base44.entities.TargetGroup.list(),
      base44.entities.Rifle.filter({ created_by: user.email }),
    ]);
    setSessions(s.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setGroups(g);
    setRifles(r);
    setLoading(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this session and all its groups?')) return;
    const sessionGroups = groups.filter(g => g.session_id === id);
    for (const g of sessionGroups) await base44.entities.TargetGroup.delete(g.id);
    await base44.entities.TargetSession.delete(id);
    loadData();
  };

  const getBestGroup = (sessionId) => {
    const sg = groups.filter(g => g.session_id === sessionId);
    if (!sg.length) return null;
    const withMoa = sg.filter(g => g.group_size_moa);
    if (!withMoa.length) return sg[0];
    return withMoa.reduce((best, g) => g.group_size_moa < best.group_size_moa ? g : best);
  };

  const filtered = filterRifle ? sessions.filter(s => s.rifle_id === filterRifle) : sessions;

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8 flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">Previous Sessions</h2>
            <p className="text-xs text-muted-foreground">{sessions.length} sessions recorded</p>
          </div>
        </div>
        <button onClick={onNew} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {rifles.length > 1 && (
        <select value={filterRifle} onChange={e => setFilterRifle(e.target.value)}
          className="w-full mb-4 px-3 py-2.5 border border-border rounded-xl bg-background text-sm">
          <option value="">All Rifles</option>
          {rifles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-lg mb-1">No sessions yet</p>
          <button onClick={onNew} className="mt-3 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm">
            Add First Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(session => {
            const bestGroup = getBestGroup(session.id);
            const groupCount = groups.filter(g => g.session_id === session.id).length;
            return (
              <button key={session.id} onClick={() => onView(session)}
                className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/30 transition-all active:scale-[0.99]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{session.rifle_name || 'Unknown Rifle'}</span>
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{session.distance}{session.distance_unit || 'm'}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{session.range_name || 'No range'} · {session.date ? format(new Date(session.date), 'd MMM yyyy') : '—'}</p>
                    {session.ammo_name && <p className="text-xs text-muted-foreground mt-0.5">🔶 {session.ammo_name}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      {bestGroup?.group_size_moa && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                          Best: {bestGroup.group_size_moa.toFixed(2)} MOA
                        </span>
                      )}
                      {groupCount > 0 && (
                        <span className="text-xs text-muted-foreground">{groupCount} group{groupCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <button onClick={(e) => handleDelete(session.id, e)}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}