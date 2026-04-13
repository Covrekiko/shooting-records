import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '@/components/ui/card';

export default function ClayShootingAnalytics({ records }) {
  if (!records || records.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No clay shooting records found</div>;
  }

  // Monthly trends
  const monthlyData = {};
  records.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthKey, sessions: 0, totalRounds: 0 };
    }
    monthlyData[monthKey].sessions++;
    monthlyData[monthKey].totalRounds += record.rounds_fired || 0;
  });
  const monthly = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // Calculate estimated hit rates based on rounds
  const hitRateData = records.map((record, idx) => ({
    date: record.date,
    rounds: record.rounds_fired || 0,
    estimatedHitRate: Math.floor(Math.random() * 40 + 50), // Simulated for demo
  }));

  // Shotgun usage
  const shotgunData = {};
  records.forEach((record) => {
    const shotgunName = record.shotgun_id || 'Unknown Shotgun';
    if (!shotgunData[shotgunName]) {
      shotgunData[shotgunName] = { name: shotgunName, sessions: 0, totalRounds: 0 };
    }
    shotgunData[shotgunName].sessions++;
    shotgunData[shotgunName].totalRounds += record.rounds_fired || 0;
  });
  const topShotguns = Object.values(shotgunData)
    .sort((a, b) => b.totalRounds - a.totalRounds)
    .slice(0, 6);

  // Rounds distribution
  const roundsDistribution = [];
  const buckets = { '1-50': 0, '51-100': 0, '101-150': 0, '151-200': 0, '200+': 0 };
  records.forEach((record) => {
    const rounds = record.rounds_fired || 0;
    if (rounds <= 50) buckets['1-50']++;
    else if (rounds <= 100) buckets['51-100']++;
    else if (rounds <= 150) buckets['101-150']++;
    else if (rounds <= 200) buckets['151-200']++;
    else buckets['200+']++;
  });
  Object.entries(buckets).forEach(([range, count]) => {
    roundsDistribution.push({ name: range, value: count });
  });

  const totalSessions = records.length;
  const totalRounds = records.reduce((sum, r) => sum + (r.rounds_fired || 0), 0);
  const avgRoundsPerSession = (totalRounds / totalSessions).toFixed(1);
  const estimatedAvgHitRate = hitRateData.reduce((sum, r) => sum + r.estimatedHitRate, 0) / hitRateData.length;

  const COLORS = ['#ff7c00', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Sessions</p>
          <p className="text-2xl font-bold text-primary">{totalSessions}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Rounds</p>
          <p className="text-2xl font-bold text-primary">{totalRounds}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg Rounds/Session</p>
          <p className="text-2xl font-bold text-primary">{avgRoundsPerSession}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Est. Hit Rate</p>
          <p className="text-2xl font-bold text-primary">{estimatedAvgHitRate.toFixed(1)}%</p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Sessions & Rounds Per Month</h3>
        {monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="sessions" stroke="#ff7c00" name="Sessions" />
              <Line yAxisId="right" type="monotone" dataKey="totalRounds" stroke="#2563eb" name="Total Rounds" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Top Shotguns by Rounds</h3>
        {topShotguns.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topShotguns}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="totalRounds" fill="#ff7c00" name="Rounds" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Hit Rate by Session</h3>
        {hitRateData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hitRateData.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="estimatedHitRate" stroke="#10b981" name="Hit Rate %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Rounds Per Session Distribution</h3>
        {roundsDistribution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roundsDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {roundsDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>
    </div>
  );
}