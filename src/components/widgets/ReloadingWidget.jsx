import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ReloadingWidget() {
  const [stats, setStats] = useState({
    totalRounds: 0,
    monthlyCost: 0,
    avgCostPerRound: 0,
    mostUsedCaliber: '-',
    lowStockItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const user = await base44.auth.me();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [sessions, inventory] = await Promise.all([
        base44.entities.ReloadingSession.filter({ created_by: user.email }),
        base44.entities.ReloadingInventory.filter({ created_by: user.email }),
      ]);

      const totalRounds = sessions.reduce((sum, s) => sum + (s.rounds_loaded || 0), 0);
      const monthlySessions = sessions.filter(s => new Date(s.date) >= monthStart);
      const monthlyCost = monthlySessions.reduce((sum, s) => sum + (s.total_cost || 0), 0);
      const avgCostPerRound = totalRounds > 0 ? sessions.reduce((sum, s) => sum + (s.total_cost || 0), 0) / totalRounds : 0;

      const caliberCounts = {};
      sessions.forEach(s => {
        caliberCounts[s.caliber] = (caliberCounts[s.caliber] || 0) + 1;
      });
      const mostUsed = Object.entries(caliberCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

      const lowStock = inventory.filter(i => i.quantity_total < i.low_stock_threshold).length;

      setStats({
        totalRounds,
        monthlyCost,
        avgCostPerRound,
        mostUsedCaliber: mostUsed,
        lowStockItems: lowStock,
      });
    } catch (error) {
      console.error('Error loading reloading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="w-full h-32 bg-secondary/20 rounded-lg animate-pulse" />;
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-200/90 dark:hover:border-slate-600 transition-all duration-100">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center">
            <span className="text-base leading-none text-slate-700 dark:text-slate-200">Ⓡ</span>
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reloading Stats</h3>
        </div>
        <Link to="/reloading" className="text-primary hover:opacity-80 transition-opacity text-xs font-semibold">
          Manage
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">Total Rounds Loaded</span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">{stats.totalRounds.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">This Month</span>
          <span className="text-lg font-bold text-primary">£{stats.monthlyCost.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">Avg Cost/Round</span>
          <span className="font-semibold text-slate-900 dark:text-white">£{stats.avgCostPerRound.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-400">Most Used Caliber</span>
          <span className="font-semibold text-slate-900 dark:text-white">{stats.mostUsedCaliber}</span>
        </div>

        {stats.lowStockItems > 0 && (
          <div className="flex items-center gap-2 pt-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{stats.lowStockItems} components low in stock</span>
          </div>
        )}
      </div>
    </div>
  );
}