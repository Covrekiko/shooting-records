import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { TrendingUp, Calendar } from 'lucide-react';

export default function AmmoSpendingBreakdown() {
  const [spending, setSpending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [timeframe, setTimeframe] = useState('all'); // all, month, quarter

  useEffect(() => {
    loadSpending();
  }, [timeframe]);

  const loadSpending = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      let records = await base44.entities.AmmoSpending.filter({ created_by: user.email });

      // Filter by timeframe
      const now = new Date();
      if (timeframe === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        records = records.filter(r => new Date(r.date_used) >= thirtyDaysAgo);
      } else if (timeframe === 'quarter') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        records = records.filter(r => new Date(r.date_used) >= ninetyDaysAgo);
      }

      // Group by ammunition type (brand + caliber + bullet_type to avoid duplicates)
       const grouped = {};
       records.forEach(r => {
         const key = `${r.brand}|${r.caliber}|${r.bullet_type || ''}`;
         if (!grouped[key]) {
           grouped[key] = { brand: r.brand, caliber: r.caliber, bullet_type: r.bullet_type, total: 0, quantity: 0, sessions: 0, dates: [] };
         }
         grouped[key].total += r.total_cost || 0;
         grouped[key].quantity += r.quantity_used || 0;
         grouped[key].sessions += 1;
         grouped[key].dates.push(r.date_used);
       });

      const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
      setSpending(sorted);
      setTotalSpent(sorted.reduce((sum, s) => sum + s.total, 0));
    } catch (error) {
      console.error('Error loading spending:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  if (spending.length === 0) {
    return (
      <div className="text-center py-8 bg-secondary/30 rounded-lg">
        <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No ammunition spending yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeframe selector */}
      <div className="flex gap-2">
        {['all', 'month', 'quarter'].map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              timeframe === tf
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {tf === 'all' ? 'All Time' : tf === 'month' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Total spent card */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-xs text-primary/70 font-semibold uppercase">Total Spent</p>
        </div>
        <p className="text-2xl font-bold text-primary">£{totalSpent.toFixed(2)}</p>
      </div>

      {/* Spending breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Ammunition</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Rounds Used</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Sessions</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600 dark:text-slate-300">Cost</th>
            </tr>
          </thead>
          <tbody>
            {spending.map((item, idx) => (
              <tr key={idx} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                <td className="py-3 px-3">
                   <div>
                     <p className="font-semibold text-foreground">{item.brand}</p>
                     <p className="text-xs text-muted-foreground">{item.caliber} {item.bullet_type && `• ${item.bullet_type}`}</p>
                   </div>
                 </td>
                <td className="text-right py-3 px-3 text-foreground">{item.quantity}</td>
                <td className="text-right py-3 px-3 text-foreground">{item.sessions}</td>
                <td className="text-right py-3 px-3">
                  <p className="font-semibold text-primary">£{item.total.toFixed(2)}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent spending dates */}
      {spending.length > 0 && (
        <div className="bg-secondary/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase">Recent Usage</p>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {spending.slice(0, 3).map((item, idx) => {
              const lastDate = item.dates[item.dates.length - 1];
              return (
                <p key={idx}>
                  {item.brand} ({item.caliber}) - {format(new Date(lastDate), 'MMM d, yyyy')}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}