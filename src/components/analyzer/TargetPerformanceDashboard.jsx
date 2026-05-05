import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, BarChart3, Crosshair, Target, TrendingDown } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';

const card = 'bg-card border border-border rounded-2xl p-4';

function monthKey(date) {
  return format(new Date(date), 'yyyy-MM');
}

function monthLabel(key) {
  return format(new Date(`${key}-01T00:00:00`), 'MMM yy');
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export default function TargetPerformanceDashboard({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caliber, setCaliber] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const user = await base44.auth.me();
    const [targetSessions, sessionRecords, targetGroups] = await Promise.all([
      base44.entities.TargetSession.filter({ created_by: user.email }),
      base44.entities.SessionRecord.filter({ created_by: user.email, category: 'target_shooting' }),
      base44.entities.TargetGroup.list(),
    ]);
    setSessions(targetSessions || []);
    setRecords(sessionRecords || []);
    setGroups(targetGroups || []);
    setLoading(false);
  };

  const analytics = useMemo(() => {
    const sessionMap = new Map();
    sessions.forEach((session) => sessionMap.set(session.id, { ...session, source: 'target_session', caliber: session.caliber || '' }));
    records.forEach((record) => {
      const primaryRifle = record.rifles_used?.[0] || {};
      sessionMap.set(record.id, { ...record, source: 'session_record', caliber: primaryRifle.caliber || record.caliber || '' });
    });

    const enrichedGroups = groups
      .map((group) => {
        const session = sessionMap.get(group.session_id);
        return { ...group, session, caliber: session?.caliber || '', date: session?.date || group.created_date };
      })
      .filter((group) => group.session && group.group_size_moa > 0)
      .filter((group) => !caliber || group.caliber === caliber)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const filteredSessions = Array.from(sessionMap.values()).filter((session) => !caliber || session.caliber === caliber);
    const byMonth = new Map();

    filteredSessions.forEach((session) => {
      if (!session.date) return;
      const key = monthKey(session.date);
      if (!byMonth.has(key)) byMonth.set(key, { month: key, rounds: 0, groups: [], sessions: 0 });
      const row = byMonth.get(key);
      row.sessions += 1;
      if (session.source === 'session_record') {
        row.rounds += (session.rifles_used || []).reduce((sum, item) => sum + Number(item.rounds_fired || 0), 0);
      }
    });

    enrichedGroups.forEach((group) => {
      const key = monthKey(group.date);
      if (!byMonth.has(key)) byMonth.set(key, { month: key, rounds: 0, groups: [], sessions: 0 });
      byMonth.get(key).groups.push(group.group_size_moa);
    });

    const monthly = Array.from(byMonth.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        month: monthLabel(row.month),
        rounds: row.rounds,
        sessions: row.sessions,
        avgMoa: average(row.groups) ? Number(average(row.groups).toFixed(2)) : null,
        bestMoa: row.groups.length ? Number(Math.min(...row.groups).toFixed(2)) : null,
      }));

    const moas = enrichedGroups.map((group) => group.group_size_moa);
    const firstThree = moas.slice(0, 3);
    const lastThree = moas.slice(-3);
    const firstAvg = average(firstThree);
    const latestAvg = average(lastThree);
    const improvement = firstAvg && latestAvg ? firstAvg - latestAvg : null;
    const avgMoa = average(moas);
    const consistency = moas.length > 1 && avgMoa
      ? Math.sqrt(average(moas.map((value) => Math.pow(value - avgMoa, 2))))
      : null;

    return {
      monthly,
      groups: enrichedGroups,
      calibers: [...new Set(Array.from(sessionMap.values()).map((session) => session.caliber).filter(Boolean))].sort(),
      totalRounds: monthly.reduce((sum, row) => sum + row.rounds, 0),
      avgMoa,
      bestMoa: moas.length ? Math.min(...moas) : null,
      consistency,
      improvement,
    };
  }, [sessions, records, groups, caliber]);

  if (loading) {
    return <main className="max-w-5xl mx-auto px-4 py-8 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></main>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h2 className="text-xl font-bold">Visual Performance Dashboard</h2>
          <p className="text-xs text-muted-foreground">Accuracy trends, shot consistency and rounds per month</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Caliber filter</label>
        <select value={caliber} onChange={(e) => setCaliber(e.target.value)} className="w-full md:max-w-xs px-3 py-2.5 border border-border rounded-xl bg-background text-sm">
          <option value="">All calibers</option>
          {analytics.calibers.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className={card}><Crosshair className="w-4 h-4 text-primary mb-2" /><p className="text-2xl font-black">{analytics.bestMoa?.toFixed(2) || '—'}</p><p className="text-xs text-muted-foreground">Best MOA</p></div>
        <div className={card}><BarChart3 className="w-4 h-4 text-primary mb-2" /><p className="text-2xl font-black">{analytics.avgMoa?.toFixed(2) || '—'}</p><p className="text-xs text-muted-foreground">Average MOA</p></div>
        <div className={card}><Target className="w-4 h-4 text-primary mb-2" /><p className="text-2xl font-black">{analytics.consistency?.toFixed(2) || '—'}</p><p className="text-xs text-muted-foreground">Shot consistency</p></div>
        <div className={card}><TrendingDown className="w-4 h-4 text-primary mb-2" /><p className="text-2xl font-black">{analytics.improvement ? analytics.improvement.toFixed(2) : '—'}</p><p className="text-xs text-muted-foreground">MOA improvement</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className={card}>
          <h3 className="font-bold mb-3">Grouping accuracy over time</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} reversed />
                <Tooltip />
                <Line type="monotone" dataKey="avgMoa" name="Avg MOA" stroke="hsl(var(--primary))" strokeWidth={3} connectNulls />
                <Line type="monotone" dataKey="bestMoa" name="Best MOA" stroke="hsl(var(--chart-2))" strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={card}>
          <h3 className="font-bold mb-3">Total rounds fired per month</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="rounds" name="Rounds fired" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={card}>
        <h3 className="font-bold mb-3">Average shot consistency</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.monthly}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} reversed />
              <Tooltip />
              <Area type="monotone" dataKey="avgMoa" name="Average MOA" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}