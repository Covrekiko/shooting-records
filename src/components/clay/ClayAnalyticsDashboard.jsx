import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Target, Zap } from 'lucide-react';

export default function ClayAnalyticsDashboard({ sessions, stands }) {
  // Calculate monthly trends
  const monthlyData = useMemo(() => {
    const months = {};
    
    sessions.forEach(session => {
      const date = new Date(session.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = {
          month: new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          sessions: 0,
          totalHits: 0,
          totalValid: 0,
          totalClays: 0,
        };
      }
      
      months[monthKey].sessions += 1;
      
      // Get stands for this session
      const sessionStands = stands.filter(s => s.clay_scorecard_id === session.scorecard_id);
      months[monthKey].totalHits += sessionStands.reduce((sum, s) => sum + (s.hits || 0), 0);
      months[monthKey].totalValid += sessionStands.reduce((sum, s) => sum + ((s.hits || 0) + (s.misses || 0)), 0);
      months[monthKey].totalClays += sessionStands.reduce((sum, s) => sum + (s.clays_total || 0), 0);
    });

    return Object.values(months)
      .sort((a, b) => new Date(a.month) - new Date(b.month))
      .map(m => ({
        ...m,
        hitPercentage: m.totalValid > 0 ? Math.round((m.totalHits / m.totalValid) * 100) : 0,
      }));
  }, [sessions, stands]);

  // Top performing stands
  const topStands = useMemo(() => {
    return stands
      .map(stand => {
        const valid = (stand.hits || 0) + (stand.misses || 0);
        return {
          ...stand,
          valid,
          percentage: valid > 0 ? Math.round(((stand.hits || 0) / valid) * 100) : 0,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  }, [stands]);

  // Hit distribution
  const hitDistribution = useMemo(() => {
    const excellent = stands.filter(s => {
      const v = (s.hits || 0) + (s.misses || 0);
      return v > 0 && ((s.hits || 0) / v) >= 0.75;
    }).length;
    const good = stands.filter(s => {
      const v = (s.hits || 0) + (s.misses || 0);
      return v > 0 && ((s.hits || 0) / v) >= 0.50 && ((s.hits || 0) / v) < 0.75;
    }).length;
    const fair = stands.filter(s => {
      const v = (s.hits || 0) + (s.misses || 0);
      return v > 0 && ((s.hits || 0) / v) < 0.50;
    }).length;

    return [
      { name: 'Excellent (75%+)', value: excellent, color: '#22c55e' },
      { name: 'Good (50-75%)', value: good, color: '#eab308' },
      { name: 'Fair (<50%)', value: fair, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [stands]);

  // Summary stats
  const totalHits = stands.reduce((s, st) => s + (st.hits || 0), 0);
  const totalValid = stands.reduce((s, st) => s + ((st.hits || 0) + (st.misses || 0)), 0);
  const overallPercentage = totalValid > 0 ? Math.round((totalHits / totalValid) * 100) : 0;
  const avgClaysPerSession = stands.length > 0 ? Math.round(stands.reduce((s, st) => s + (st.clays_total || 0), 0) / sessions.length) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Hit Rate</p>
          </div>
          <p className="text-2xl font-black text-primary">{overallPercentage}%</p>
          <p className="text-xs text-muted-foreground mt-1">{totalHits}/{totalValid} clays</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avg per Session</p>
          </div>
          <p className="text-2xl font-black text-amber-500">{avgClaysPerSession}</p>
          <p className="text-xs text-muted-foreground mt-1">clays fired</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Stands</p>
          </div>
          <p className="text-2xl font-black text-emerald-500">{stands.length}</p>
          <p className="text-xs text-muted-foreground mt-1">recorded</p>
        </div>
      </div>

      {/* Hit Percentage Trend */}
      {monthlyData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-bold mb-4">Monthly Hit Percentage Trend</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
              <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                formatter={(value) => `${value}%`}
              />
              <Line
                type="monotone"
                dataKey="hitPercentage"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: 'var(--primary)', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Clays Fired */}
      {monthlyData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-bold mb-4">Monthly Clays Fired</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
              <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Bar dataKey="totalClays" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hit Distribution Pie Chart */}
      {hitDistribution.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-bold mb-4">Stand Performance Distribution</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={hitDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {hitDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Performing Stands */}
      {topStands.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-bold mb-3">Top 5 Performing Stands</p>
          <div className="space-y-2">
            {topStands.map((stand, idx) => (
              <div key={stand.id} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Stand {stand.stand_number}</p>
                    <p className="text-[10px] text-muted-foreground">{stand.hits || 0}/{stand.valid} clays</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">{stand.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stands.length === 0 && (
        <div className="bg-secondary/30 border border-border rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">No stand data available yet. Complete a clay shooting session to see analytics.</p>
        </div>
      )}
    </div>
  );
}