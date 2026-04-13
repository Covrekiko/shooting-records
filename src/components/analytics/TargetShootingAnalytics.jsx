import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Card } from '@/components/ui/card';

export default function TargetShootingAnalytics({ records }) {
  if (!records || records.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No target shooting records found</div>;
  }

  // Accuracy by range
  const accuracyByRange = {};
  records.forEach((record) => {
    if (record.rifles_used) {
      record.rifles_used.forEach((rifle) => {
        const range = rifle.meters_range || 'Unknown';
        if (!accuracyByRange[range]) {
          accuracyByRange[range] = { range: `${range}m`, sessions: 0, totalRounds: 0 };
        }
        accuracyByRange[range].sessions++;
        accuracyByRange[range].totalRounds += rifle.rounds_fired || 0;
      });
    }
  });
  const rangeData = Object.values(accuracyByRange).sort((a, b) => a.range.localeCompare(b.range));

  // Rounds by rifle
  const rifleData = {};
  records.forEach((record) => {
    if (record.rifles_used) {
      record.rifles_used.forEach((rifle) => {
        const rifleName = rifle.ammunition_brand || 'Unknown Rifle';
        if (!rifleData[rifleName]) {
          rifleData[rifleName] = { name: rifleName, rounds: 0, sessions: 0 };
        }
        rifleData[rifleName].rounds += rifle.rounds_fired || 0;
        rifleData[rifleName].sessions++;
      });
    }
  });
  const topRifles = Object.values(rifleData)
    .sort((a, b) => b.rounds - a.rounds)
    .slice(0, 8);

  // Sessions per month
  const monthlyData = {};
  records.forEach((record) => {
    const date = new Date(record.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { month: monthKey, sessions: 0, totalRounds: 0 };
    }
    monthlyData[monthKey].sessions++;
    monthlyData[monthKey].totalRounds += record.rifles_used?.reduce((sum, r) => sum + (r.rounds_fired || 0), 0) || 0;
  });
  const monthly = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // Ammunition brand distribution
  const ammoData = {};
  records.forEach((record) => {
    if (record.rifles_used) {
      record.rifles_used.forEach((rifle) => {
        const brand = rifle.ammunition_brand || 'Unknown';
        ammoData[brand] = (ammoData[brand] || 0) + (rifle.rounds_fired || 0);
      });
    }
  });
  const topAmmo = Object.entries(ammoData)
    .map(([name, rounds]) => ({ name, rounds }))
    .sort((a, b) => b.rounds - a.rounds)
    .slice(0, 6);

  // Extract accuracy from photos
  const photoAccuracies = [];
  records.forEach((record) => {
    if (record.photos && Array.isArray(record.photos)) {
      record.photos.forEach((photo) => {
        if (typeof photo === 'object' && photo.analysis?.accuracy_percentage) {
          photoAccuracies.push({
            accuracy: photo.analysis.accuracy_percentage,
            hits: photo.analysis.hits_count,
            assessment: photo.analysis.assessment
          });
        }
      });
    }
  });
  
  const avgAccuracy = photoAccuracies.length > 0 
    ? (photoAccuracies.reduce((sum, p) => sum + p.accuracy, 0) / photoAccuracies.length).toFixed(1)
    : 'N/A';
  const bestAccuracy = photoAccuracies.length > 0
    ? Math.max(...photoAccuracies.map(p => p.accuracy))
    : 'N/A';

  const totalSessions = records.length;
  const totalRounds = records.reduce((sum, r) => sum + (r.rifles_used?.reduce((s, rf) => s + (rf.rounds_fired || 0), 0) || 0), 0);
  const avgRoundsPerSession = (totalRounds / totalSessions).toFixed(1);

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
          <p className="text-sm text-muted-foreground">Avg Photo Accuracy</p>
          <p className="text-2xl font-bold text-primary">{avgAccuracy}%</p>
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
        <h3 className="font-bold text-lg mb-4">Top Firearms by Rounds Fired</h3>
        {topRifles.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topRifles}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rounds" fill="#ff7c00" name="Rounds" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Accuracy by Range Distance</h3>
        {rangeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rangeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="sessions" fill="#ff7c00" name="Sessions" />
              <Bar yAxisId="right" dataKey="totalRounds" fill="#2563eb" name="Rounds" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No range data available</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4">Ammunition Distribution</h3>
        {topAmmo.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topAmmo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rounds" fill="#2563eb" name="Rounds" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-sm">No data available</p>
        )}
      </Card>

      {photoAccuracies.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Photo-Based Accuracy Analysis</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/30 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">Photos Analyzed</p>
                <p className="text-xl font-bold text-primary">{photoAccuracies.length}</p>
              </div>
              <div className="bg-secondary/30 p-3 rounded">
                <p className="text-xs text-muted-foreground mb-1">Best Accuracy</p>
                <p className="text-xl font-bold text-primary">{bestAccuracy}%</p>
              </div>
            </div>
            <div className="text-sm space-y-2 max-h-40 overflow-y-auto">
              <p className="font-medium">Recent Analyses:</p>
              {photoAccuracies.slice(-5).map((pa, idx) => (
                <div key={idx} className="text-xs bg-secondary/20 p-2 rounded">
                  <span className="font-medium">{pa.accuracy}%</span> - {pa.hits} hits - {pa.assessment}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}