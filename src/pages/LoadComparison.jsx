import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import ComparisonScoreCard from '@/components/load-development/ComparisonScoreCard';
import { buildComparisonRows, formatMoney, formatMoa } from '@/lib/loadComparison';
import { ArrowLeft, BarChart3, RefreshCw, Trophy } from 'lucide-react';

export default function LoadComparison() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [rifleFilter, setRifleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    const [rifles, ammunition, reloadingSessions, targetSessions, targetGroups, tests, variants, results] = await Promise.all([
      base44.entities.Rifle.filter({ created_by: user.email }),
      base44.entities.Ammunition.filter({ created_by: user.email }),
      base44.entities.ReloadingSession.filter({ created_by: user.email }),
      base44.entities.TargetSession.filter({ created_by: user.email }),
      base44.entities.TargetGroup.filter({ created_by: user.email }),
      base44.entities.ReloadingTest.filter({ created_by: user.email }),
      base44.entities.ReloadingTestVariant.filter({ created_by: user.email }),
      base44.entities.ReloadingTestResult.filter({ created_by: user.email }),
    ]);
    setRows(buildComparisonRows({ rifles, ammunition, reloadingSessions, targetSessions, targetGroups, tests, variants, results }));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const rifles = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (row.rifleId) map.set(row.rifleId, row.rifleName);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filteredRows = rows.filter((row) => {
    const rifleMatch = !rifleFilter || row.rifleId === rifleFilter;
    const typeMatch = !typeFilter || row.sourceType === typeFilter;
    return rifleMatch && typeMatch;
  });

  const best = filteredRows[0];

  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <main className="max-w-6xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <Link to="/load-development" className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Load Development
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold">Load Comparison</h1>
            </div>
            <p className="text-muted-foreground text-sm">Rank ammunition and reload batches by accuracy, cost, reliability, and consistency.</p>
          </div>
          <button onClick={loadData} className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 flex items-center gap-2 font-semibold text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <select value={rifleFilter} onChange={(e) => setRifleFilter(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm">
            <option value="">All rifles</option>
            {rifles.map((rifle) => <option key={rifle.id} value={rifle.id}>{rifle.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-xl text-sm">
            <option value="">All load types</option>
            <option value="Factory ammo">Factory ammo</option>
            <option value="Reload batch">Reload batch</option>
            <option value="Load test variant">Load test variant</option>
          </select>
          <div className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center">
            {filteredRows.length} ranked option{filteredRows.length === 1 ? '' : 's'}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredRows.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-bold mb-1">No comparison data yet</h2>
            <p className="text-sm text-muted-foreground">Record target groups or load test results to build rankings.</p>
          </div>
        ) : (
          <>
            {best && (
              <div className="bg-primary text-primary-foreground rounded-2xl p-5 mb-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Trophy className="w-7 h-7 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold opacity-80 uppercase tracking-wide">Top recommendation</p>
                    <h2 className="text-xl font-black mt-1">{best.name}</h2>
                    <p className="text-sm opacity-90 mt-1">{best.rifleName} · {formatMoa(best.avgMoa)} · {formatMoney(best.costPerRound)} per round · {Math.round(best.reliability)}% reliability</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRows.map((row, index) => (
                <ComparisonScoreCard key={row.id} row={row} rank={index + 1} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}